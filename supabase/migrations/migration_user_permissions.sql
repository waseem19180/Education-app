-- ==============================================================================
-- Migration: User Permissions & Parent-Student Managed Linking System
-- File: supabase/migrations/migration_user_permissions.sql
-- Description: Idempotent migration to add user approval tracking, 
--              last active admin protection, multi-parent linking with audit,
--              and scoped teacher parent-student relationship management.
-- ==============================================================================

BEGIN;

-- 1. Alter profiles: Add approval_status if not present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'approval_status'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN approval_status TEXT NOT NULL DEFAULT 'approved' 
        CHECK (approval_status IN ('approved', 'pending_approval', 'rejected', 'suspended'));
    END IF;
END $$;

-- 2. Make students.parent_id nullable to support parent_student_links as primary
ALTER TABLE public.students ALTER COLUMN parent_id DROP NOT NULL;

-- 3. Create parent_student_links table
CREATE TABLE IF NOT EXISTS public.parent_student_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    relationship TEXT NOT NULL DEFAULT 'guardian' CHECK (relationship IN ('father', 'mother', 'guardian', 'other')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'rejected', 'revoked')),
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    verified_by UUID REFERENCES public.profiles(id),
    verified_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES public.profiles(id),
    revoked_at TIMESTAMPTZ,
    notes TEXT
);

-- Partial unique index preventing duplicate pending or active links for same parent-student
CREATE UNIQUE INDEX IF NOT EXISTS idx_parent_student_unique_active
ON public.parent_student_links(parent_id, student_id)
WHERE status IN ('pending', 'active');

CREATE INDEX IF NOT EXISTS idx_parent_student_parent_id ON public.parent_student_links(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_student_student_id ON public.parent_student_links(student_id);

-- 4. Safe Parent Search Function (Minimal disclosure, prevents leaking national_id or phone)
CREATE OR REPLACE FUNCTION public.search_parent_profiles(search_query TEXT)
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    email TEXT,
    role public.user_role,
    avatar_url TEXT
) AS $$
BEGIN
    IF NOT (public.is_admin() OR public.is_teacher()) THEN
        RAISE EXCEPTION 'رفض أمني: غير مصرح بالبحث في حسابات أولياء الأمور.';
    END IF;

    RETURN QUERY
    SELECT p.id, p.full_name, p.email, p.role, p.avatar_url
    FROM public.profiles p
    WHERE p.role = 'parent'
      AND p.is_active = TRUE
      AND (
          p.email ILIKE '%' || search_query || '%'
          OR p.full_name ILIKE '%' || search_query || '%'
          OR p.id::TEXT = search_query
      )
    LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public, pg_temp;

-- 5. Trigger: Enforce 'student' role & pending_approval status on new self-registrations
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, approval_status)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        'student'::public.user_role,
        'pending_approval'
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);

    INSERT INTO public.profile_confidential_details (id)
    VALUES (NEW.id)
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- 6. Trigger: Prevent Removing or Demoting the Last Active Admin
CREATE OR REPLACE FUNCTION public.prevent_last_admin_removal()
RETURNS TRIGGER AS $$
DECLARE
    v_admin_count INT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.role = 'admin' THEN
            SELECT COUNT(*) INTO v_admin_count
            FROM public.profiles
            WHERE role = 'admin' AND is_active = TRUE AND id <> OLD.id;

            IF v_admin_count < 1 THEN
                RAISE EXCEPTION 'إجراء أمني محظور: لا يمكن حذف آخر مدير نظام نشط في المنصة.';
            END IF;
        END IF;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.role = 'admin' AND (NEW.role <> 'admin' OR NEW.is_active = FALSE OR NEW.approval_status = 'rejected') THEN
            SELECT COUNT(*) INTO v_admin_count
            FROM public.profiles
            WHERE role = 'admin' AND is_active = TRUE AND id <> OLD.id;

            IF v_admin_count < 1 THEN
                RAISE EXCEPTION 'إجراء أمني محظور: لا يمكن تعديل رتبة أو تعطيل آخر مدير نظام نشط في المنصة.';
            END IF;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_prevent_last_admin_removal ON public.profiles;
CREATE TRIGGER trg_prevent_last_admin_removal
    BEFORE UPDATE OR DELETE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.prevent_last_admin_removal();

-- 7. Update can_communicate to recognize parent_student_links
CREATE OR REPLACE FUNCTION public.can_communicate(user_a UUID, user_b UUID)
RETURNS BOOLEAN AS $$
DECLARE
    role_a public.user_role;
    role_b public.user_role;
BEGIN
    SELECT role INTO role_a FROM public.profiles WHERE id = user_a;
    SELECT role INTO role_b FROM public.profiles WHERE id = user_b;

    IF role_a = 'admin' OR role_b = 'admin' THEN
        RETURN TRUE;
    END IF;

    IF (role_a = 'teacher' AND role_b = 'parent') OR (role_a = 'parent' AND role_b = 'teacher') THEN
        RETURN EXISTS (
            SELECT 1 FROM public.students s
            JOIN public.teacher_subjects ts ON ts.class_id = s.class_id
            JOIN public.teachers t ON t.id = ts.teacher_id
            LEFT JOIN public.parents p ON p.id = s.parent_id
            LEFT JOIN public.parent_student_links psl ON psl.student_id = s.id AND psl.status = 'active'
            WHERE ((t.profile_id = user_a AND (p.profile_id = user_b OR psl.parent_id = user_b))
               OR (t.profile_id = user_b AND (p.profile_id = user_a OR psl.parent_id = user_a)))
        );
    END IF;

    IF (role_a = 'teacher' AND role_b = 'student') OR (role_a = 'student' AND role_b = 'teacher') THEN
        RETURN EXISTS (
            SELECT 1 FROM public.students s
            JOIN public.teacher_subjects ts ON ts.class_id = s.class_id
            JOIN public.teachers t ON t.id = ts.teacher_id
            WHERE (t.profile_id = user_a AND s.profile_id = user_b)
               OR (t.profile_id = user_b AND s.profile_id = user_a)
        );
    END IF;

    IF role_a = 'teacher' AND role_b = 'teacher' THEN
        RETURN TRUE;
    END IF;

    IF role_a = 'student' AND role_b = 'student' THEN
        RETURN EXISTS (
            SELECT 1 FROM public.students s1
            JOIN public.students s2 ON s1.class_id = s2.class_id
            WHERE s1.profile_id = user_a AND s2.profile_id = user_b
        );
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public, pg_temp;

-- 8. Enable Row Level Security and setup policies on parent_student_links
ALTER TABLE public.parent_student_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parent_links_admin_all" ON public.parent_student_links;
CREATE POLICY "parent_links_admin_all" ON public.parent_student_links
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "parent_links_teacher_select" ON public.parent_student_links;
CREATE POLICY "parent_links_teacher_select" ON public.parent_student_links
    FOR SELECT USING (
        public.is_teacher() AND student_id IN (
            SELECT s.id FROM public.students s
            JOIN public.teacher_subjects ts ON ts.class_id = s.class_id
            JOIN public.teachers t ON t.id = ts.teacher_id
            WHERE t.profile_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "parent_links_teacher_insert" ON public.parent_student_links;
CREATE POLICY "parent_links_teacher_insert" ON public.parent_student_links
    FOR INSERT WITH CHECK (
        public.is_teacher() AND
        student_id IN (
            SELECT s.id FROM public.students s
            JOIN public.teacher_subjects ts ON ts.class_id = s.class_id
            JOIN public.teachers t ON t.id = ts.teacher_id
            WHERE t.profile_id = auth.uid()
        ) AND
        parent_id IN (
            SELECT id FROM public.profiles WHERE role = 'parent'
        )
    );

DROP POLICY IF EXISTS "parent_links_teacher_update" ON public.parent_student_links;
CREATE POLICY "parent_links_teacher_update" ON public.parent_student_links
    FOR UPDATE USING (
        public.is_teacher() AND student_id IN (
            SELECT s.id FROM public.students s
            JOIN public.teacher_subjects ts ON ts.class_id = s.class_id
            JOIN public.teachers t ON t.id = ts.teacher_id
            WHERE t.profile_id = auth.uid()
        )
    ) WITH CHECK (
        public.is_teacher() AND student_id IN (
            SELECT s.id FROM public.students s
            JOIN public.teacher_subjects ts ON ts.class_id = s.class_id
            JOIN public.teachers t ON t.id = ts.teacher_id
            WHERE t.profile_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "parent_links_parent_select" ON public.parent_student_links;
CREATE POLICY "parent_links_parent_select" ON public.parent_student_links
    FOR SELECT USING (parent_id = auth.uid());

DROP POLICY IF EXISTS "parent_links_student_select" ON public.parent_student_links;
CREATE POLICY "parent_links_student_select" ON public.parent_student_links
    FOR SELECT USING (
        status = 'active' AND student_id IN (
            SELECT id FROM public.students WHERE profile_id = auth.uid()
        )
    );

-- 9. Update students policy for parents to include parent_student_links
DROP POLICY IF EXISTS "Parents view only own children" ON public.students;
CREATE POLICY "Parents view only own children" ON public.students
    FOR SELECT USING (
        parent_id IN (SELECT id FROM public.parents WHERE profile_id = auth.uid())
        OR id IN (SELECT student_id FROM public.parent_student_links WHERE parent_id = auth.uid() AND status = 'active')
    );

-- 10. Grants and Revokes
REVOKE ALL ON FUNCTION public.prevent_last_admin_removal() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_parent_profiles(TEXT) TO authenticated;

COMMIT;
