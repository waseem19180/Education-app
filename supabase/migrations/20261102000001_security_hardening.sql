-- ==============================================================================
-- EduConnect: Standalone Security Hardening & Architecture Alignment Migration
-- File: supabase/migrations/20261102000001_security_hardening.sql
-- Description:
--   1. Harden Parent-Student link state machine, scope teacher permissions (pending only, no self-verification),
--      and enforce parent approval (auth.uid() = parent_id) with audit logging.
--   2. Restrict search_parent_profiles: prevent platform-wide teacher enumeration, enforce exact email matching,
--      mask outputs, and secure search_path = pg_catalog, public.
--   3. Secure First Admin Bootstrap & Role Escalation: eliminate insecure GUC tokens, apply exclusive locks,
--      block API calls, and enforce trusted superuser / active admin controls.
--   4. Unify all parent access to child data via active parent_student_links across all RLS policies.
--   5. Enforce audit log integrity (forbid actor spoofing, trigger-override caller identity, forbid update/delete).
--   6. Pessimistic concurrency control and comprehensive status check for last active admin protection.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. HARDEN SEARCH_PATH ON ALL EXISTING FUNCTIONS
-- ------------------------------------------------------------------------------
ALTER FUNCTION public.current_user_role() SET search_path = pg_catalog, public;
ALTER FUNCTION public.is_admin() SET search_path = pg_catalog, public;
ALTER FUNCTION public.is_teacher() SET search_path = pg_catalog, public;
ALTER FUNCTION public.can_join_conversation(UUID, UUID) SET search_path = pg_catalog, public;

-- ------------------------------------------------------------------------------
-- 2. HARDEN CAN_COMMUNICATE TO USE PARENT_STUDENT_LINKS EXCLUSIVELY
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_communicate(user_a UUID, user_b UUID)
RETURNS BOOLEAN AS $$
DECLARE
    role_a public.user_role;
    role_b public.user_role;
BEGIN
    SELECT role INTO role_a FROM public.profiles WHERE id = user_a;
    SELECT role INTO role_b FROM public.profiles WHERE id = user_b;

    -- Admins can communicate with anyone
    IF role_a = 'admin' OR role_b = 'admin' THEN
        RETURN TRUE;
    END IF;

    -- Teacher <-> Parent communication: must share a common student via active parent_student_links
    IF (role_a = 'teacher' AND role_b = 'parent') OR (role_a = 'parent' AND role_b = 'teacher') THEN
        RETURN EXISTS (
            SELECT 1 FROM public.students s
            JOIN public.teacher_subjects ts ON ts.class_id = s.class_id
            JOIN public.teachers t ON t.id = ts.teacher_id
            JOIN public.parent_student_links psl ON psl.student_id = s.id AND psl.status = 'active'
            WHERE ((t.profile_id = user_a AND psl.parent_id = user_b)
               OR (t.profile_id = user_b AND psl.parent_id = user_a))
        );
    END IF;

    -- Teacher <-> Student communication: student must be in teacher's class
    IF (role_a = 'teacher' AND role_b = 'student') OR (role_a = 'student' AND role_b = 'teacher') THEN
        RETURN EXISTS (
            SELECT 1 FROM public.students s
            JOIN public.teacher_subjects ts ON ts.class_id = s.class_id
            JOIN public.teachers t ON t.id = ts.teacher_id
            WHERE (t.profile_id = user_a AND s.profile_id = user_b)
               OR (t.profile_id = user_b AND s.profile_id = user_a)
        );
    END IF;

    -- Teachers can communicate with fellow teachers
    IF role_a = 'teacher' AND role_b = 'teacher' THEN
        RETURN TRUE;
    END IF;

    -- Students in the same class can communicate
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
SET search_path = pg_catalog, public;

-- ------------------------------------------------------------------------------
-- 3. AUDIT LOGS INTEGRITY ENFORCEMENT
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_audit_log_integrity()
RETURNS TRIGGER AS $$
BEGIN
    -- Override caller claims with authentic session identity
    IF auth.uid() IS NOT NULL THEN
        NEW.actor_id := auth.uid();
        NEW.actor_role := COALESCE(public.current_user_role(), 'student'::public.user_role);
    END IF;
    NEW.timestamp := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public;

DROP TRIGGER IF EXISTS trg_enforce_audit_log_integrity ON public.audit_logs;
CREATE TRIGGER trg_enforce_audit_log_integrity
    BEFORE INSERT ON public.audit_logs
    FOR EACH ROW EXECUTE FUNCTION public.enforce_audit_log_integrity();

DROP POLICY IF EXISTS "System insert audit logs" ON public.audit_logs;
CREATE POLICY "System insert audit logs" ON public.audit_logs
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND
        (actor_id IS NULL OR actor_id = auth.uid())
    );

-- ------------------------------------------------------------------------------
-- 4. HARDEN FIRST ADMIN BOOTSTRAP & PREVENT ROLE ESCALATION
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bootstrap_initial_admin(admin_email TEXT)
RETURNS TEXT AS $$
DECLARE
    v_target_id UUID;
    v_admin_count INT;
BEGIN
    -- Explicit caller check: MUST be executed by database superuser or service_role in SQL Editor
    IF current_user NOT IN ('postgres', 'supabase_admin') AND 
       COALESCE(current_setting('request.jwt.claim.role', true), '') <> 'service_role' THEN
        RAISE EXCEPTION 'رفض أمني: دالة التهيئة الأولية مخصصة لمالك قاعدة البيانات فقط من خلال SQL Editor.';
    END IF;

    -- Pessimistic Lock on profiles table to prevent concurrent race condition
    LOCK TABLE public.profiles IN EXCLUSIVE MODE;

    -- Strict Check: Allow ONLY if ZERO admins exist
    SELECT COUNT(*) INTO v_admin_count FROM public.profiles WHERE role = 'admin';
    IF v_admin_count > 0 THEN
        RAISE EXCEPTION 'خطأ أمني: يوجد مسؤول نظام مسجل بالفعل في المنصة (% مسجل). تم تعطيل آلية التهيئة نهائياً.', v_admin_count;
    END IF;

    -- Locate target user by email
    SELECT id INTO v_target_id FROM public.profiles WHERE LOWER(email) = LOWER(TRIM(admin_email));
    IF v_target_id IS NULL THEN
        RAISE EXCEPTION 'المستخدم بالبريد الإلكتروني % غير مسجل بعد في جدول profiles. يرجى إنشاء الحساب أولاً عبر واجهة التسجيل.', admin_email;
    END IF;

    -- Upgrade role to admin and mark approved and active
    UPDATE public.profiles
    SET role = 'admin',
        approval_status = 'approved',
        is_active = TRUE,
        updated_at = NOW()
    WHERE id = v_target_id;

    -- Audit Log
    INSERT INTO public.audit_logs (actor_id, actor_name, actor_role, action, table_name, record_id, details)
    VALUES (v_target_id, admin_email, 'admin', 'INITIAL_ADMIN_BOOTSTRAP', 'profiles', v_target_id::TEXT, 'تهيئة أول مدير نظام للمنصة بواسطة مالك قاعدة البيانات في SQL Editor');

    RETURN 'تم تعيين أول مدير نظام بنجاح: ' || admin_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public;

REVOKE ALL ON FUNCTION public.bootstrap_initial_admin(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_initial_admin(TEXT) TO postgres, service_role;

CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role <> OLD.role THEN
        -- Allow if DB superuser / service_role is executing initial bootstrap or admin migration
        IF current_user IN ('postgres', 'supabase_admin') OR 
           COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role' THEN
            NULL;
        ELSE
            -- Normal client: Must be an existing, approved, active administrator
            IF NOT (public.is_admin() AND (SELECT is_active = TRUE AND approval_status = 'approved' FROM public.profiles WHERE id = auth.uid())) THEN
                RAISE EXCEPTION 'محاولة اختراق أمني محظورة: لا يمكنك تعديل رتبتك أو رتبة غيرك. تعديل الصلاحيات مقتصر حصراً على مسؤولي النظام المعتمدين النشطين.';
            END IF;
        END IF;
    END IF;

    -- Prevent self-activation or approval tampering by non-admins
    IF (NEW.approval_status <> OLD.approval_status OR NEW.is_active <> OLD.is_active) THEN
        IF current_user NOT IN ('postgres', 'supabase_admin') AND 
           COALESCE(current_setting('request.jwt.claim.role', true), '') <> 'service_role' AND
           NOT public.is_admin() THEN
            RAISE EXCEPTION 'محاولة اختراق أمني محظورة: لا يمكنك تعديل حالة التفعيل أو الاعتماد.';
        END IF;
    END IF;

    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public;

-- ------------------------------------------------------------------------------
-- 5. HARDEN PREVENT LAST ADMIN REMOVAL (PESSIMISTIC LOCKING & STRICT CHECKS)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_last_admin_removal()
RETURNS TRIGGER AS $$
DECLARE
    v_admin_count INT;
BEGIN
    -- Pessimistic locking on admin rows to prevent concurrent demotion race condition
    PERFORM 1 FROM public.profiles WHERE role = 'admin' FOR UPDATE;

    IF TG_OP = 'DELETE' THEN
        IF OLD.role = 'admin' AND COALESCE(OLD.is_active, FALSE) = TRUE AND OLD.approval_status = 'approved' THEN
            SELECT COUNT(*) INTO v_admin_count
            FROM public.profiles
            WHERE role = 'admin' 
              AND COALESCE(is_active, FALSE) = TRUE 
              AND approval_status = 'approved' 
              AND id <> OLD.id;

            IF v_admin_count < 1 THEN
                RAISE EXCEPTION 'إجراء أمني محظور: لا يمكن حذف آخر مدير نظام نشط ومعتمد في المنصة.';
            END IF;
        END IF;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.role = 'admin' AND COALESCE(OLD.is_active, FALSE) = TRUE AND OLD.approval_status = 'approved' THEN
            IF (NEW.role <> 'admin' OR COALESCE(NEW.is_active, FALSE) = FALSE OR NEW.approval_status <> 'approved') THEN
                SELECT COUNT(*) INTO v_admin_count
                FROM public.profiles
                WHERE role = 'admin' 
                  AND COALESCE(is_active, FALSE) = TRUE 
                  AND approval_status = 'approved' 
                  AND id <> OLD.id;

                IF v_admin_count < 1 THEN
                    RAISE EXCEPTION 'إجراء أمني محظور: لا يمكن تعديل رتبة أو تعطيل أو سحب اعتماد آخر مدير نظام نشط ومعتمد في المنصة.';
                END IF;
            END IF;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public;

-- ------------------------------------------------------------------------------
-- 6. HARDEN SEARCH_PARENT_PROFILES (ANTI-ENUMERATION, EXACT LOOKUP, MASKING)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.search_parent_profiles(search_query TEXT)
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    role public.user_role,
    avatar_url TEXT,
    email TEXT
) AS $$
DECLARE
    v_clean_query TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'رفض أمني: يتطلب تسجيل الدخول لاستدعاء هذه الدالة.';
    END IF;

    IF NOT (public.is_admin() OR public.is_teacher()) THEN
        RAISE EXCEPTION 'رفض أمني: غير مصرح بالبحث في حسابات أولياء الأمور.';
    END IF;

    v_clean_query := TRIM(search_query);
    IF LENGTH(v_clean_query) < 3 OR v_clean_query = '%' THEN
        RETURN;
    END IF;

    -- Admins have administrative search access
    IF public.is_admin() THEN
        RETURN QUERY
        SELECT p.id, p.full_name, p.role, p.avatar_url, p.email
        FROM public.profiles p
        WHERE p.role = 'parent'
          AND COALESCE(p.is_active, FALSE) = TRUE
          AND (
              p.email ILIKE '%' || v_clean_query || '%'
              OR p.full_name ILIKE '%' || v_clean_query || '%'
              OR p.id::TEXT = v_clean_query
          )
        LIMIT 10;
        RETURN;
    END IF;

    -- Teachers: Anti-Enumeration & Privacy Scoped
    -- Allowed ONLY if exact email provided OR parent already linked (pending/active) to students in teacher's classes
    RETURN QUERY
    SELECT p.id, p.full_name, p.role, p.avatar_url,
           CASE WHEN LOWER(p.email) = LOWER(v_clean_query) THEN p.email
                ELSE regexp_replace(p.email, '(^[^@]{2})[^@]+(@.*$)', '\1***\2')
           END AS email
    FROM public.profiles p
    WHERE p.role = 'parent'
      AND COALESCE(p.is_active, FALSE) = TRUE
      AND (
          LOWER(p.email) = LOWER(v_clean_query)
          OR p.id IN (
              SELECT psl.parent_id
              FROM public.parent_student_links psl
              JOIN public.students s ON s.id = psl.student_id
              JOIN public.teacher_subjects ts ON ts.class_id = s.class_id
              JOIN public.teachers t ON t.id = ts.teacher_id
              WHERE t.profile_id = auth.uid()
                AND (p.full_name ILIKE '%' || v_clean_query || '%' OR p.id::TEXT = v_clean_query)
          )
      )
    LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = pg_catalog, public;

REVOKE ALL ON FUNCTION public.search_parent_profiles(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_parent_profiles(TEXT) TO authenticated;

-- ------------------------------------------------------------------------------
-- 7. PARENT_STUDENT_LINKS STATE MACHINE TRIGGER & AUDIT
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_parent_student_link_transition()
RETURNS TRIGGER AS $$
DECLARE
    v_actor_id UUID;
    v_actor_name TEXT;
    v_actor_role public.user_role;
    v_action_name TEXT;
BEGIN
    v_actor_id := auth.uid();
    SELECT full_name, role INTO v_actor_name, v_actor_role FROM public.profiles WHERE id = v_actor_id;

    IF TG_OP = 'INSERT' THEN
        -- If creator is teacher or regular user, enforce status = pending and created_by = auth.uid()
        IF NOT public.is_admin() THEN
            NEW.status := 'pending';
            NEW.created_by := v_actor_id;
            NEW.verified_by := NULL;
            NEW.verified_at := NULL;
            NEW.revoked_by := NULL;
            NEW.revoked_at := NULL;
        ELSE
            -- Admin can set direct active or pending
            NEW.created_by := COALESCE(NEW.created_by, v_actor_id);
            IF NEW.status = 'active' THEN
                NEW.verified_by := COALESCE(NEW.verified_by, v_actor_id);
                NEW.verified_at := COALESCE(NEW.verified_at, NOW());
            END IF;
        END IF;

        v_action_name := 'CREATE_PARENT_LINK';

    ELSIF TG_OP = 'UPDATE' THEN
        -- Strictly forbid changing parent_id or student_id
        IF (OLD.parent_id <> NEW.parent_id OR OLD.student_id <> NEW.student_id) AND NOT public.is_admin() THEN
            RAISE EXCEPTION 'عملية محظورة: لا يجوز تعديل أطراف العلاقة بعد إنشائها.';
        END IF;

        -- Forbid resurrecting rejected or revoked links directly
        IF OLD.status IN ('rejected', 'revoked') AND NEW.status IN ('pending', 'active') AND NOT public.is_admin() THEN
            RAISE EXCEPTION 'عملية محظورة: لا يمكن إعادة تفعيل علاقة ملغاة أو مرفوضة مباشرة. يجب تقديم طلب ارتباط جديد.';
        END IF;

        -- Activating a link (status -> 'active')
        IF NEW.status = 'active' AND OLD.status <> 'active' THEN
            -- Only Parent themselves OR Admin can activate
            IF v_actor_id <> OLD.parent_id AND NOT public.is_admin() THEN
                RAISE EXCEPTION 'رفض أمني: لا يملك المعلم صلاحية تفعيل العلاقة مباشرة. يتطلب التفعيل موافقة ولي الأمر نفسه أو اعتماد الإدارة.';
            END IF;
            NEW.verified_by := v_actor_id;
            NEW.verified_at := NOW();
            v_action_name := 'APPROVE_PARENT_LINK';

        ELSIF NEW.status = 'rejected' AND OLD.status <> 'rejected' THEN
            -- Only Parent or Admin can reject
            IF v_actor_id <> OLD.parent_id AND NOT public.is_admin() THEN
                RAISE EXCEPTION 'رفض أمني: رفض الطلب مقتصر على ولي الأمر المعني أو الإدارة.';
            END IF;
            v_action_name := 'REJECT_PARENT_LINK';

        ELSIF NEW.status = 'revoked' AND OLD.status <> 'revoked' THEN
            -- Admin, or Parent, or Teacher who created the pending link
            IF NOT public.is_admin() AND v_actor_id <> OLD.parent_id AND NOT (v_actor_id = OLD.created_by AND OLD.status = 'pending') THEN
                RAISE EXCEPTION 'رفض أمني: غير مصرح لك بإلغاء هذه العلاقة.';
            END IF;
            NEW.revoked_by := v_actor_id;
            NEW.revoked_at := NOW();
            v_action_name := 'REVOKE_PARENT_LINK';
        ELSE
            v_action_name := 'UPDATE_PARENT_LINK';
        END IF;
    END IF;

    -- Record in audit_logs
    INSERT INTO public.audit_logs (actor_id, actor_name, actor_role, action, table_name, record_id, details)
    VALUES (
        v_actor_id,
        COALESCE(v_actor_name, 'System'),
        COALESCE(v_actor_role, 'student'::public.user_role),
        v_action_name,
        'parent_student_links',
        NEW.id::TEXT,
        'حالة الرابط: ' || NEW.status || ' | الطالب: ' || NEW.student_id::TEXT || ' | ولي الأمر: ' || NEW.parent_id::TEXT
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public;

DROP TRIGGER IF EXISTS trg_process_parent_student_link_transition ON public.parent_student_links;
CREATE TRIGGER trg_process_parent_student_link_transition
    BEFORE INSERT OR UPDATE ON public.parent_student_links
    FOR EACH ROW EXECUTE FUNCTION public.process_parent_student_link_transition();

-- ------------------------------------------------------------------------------
-- 8. SECURE RPC FOR PARENT APPROVAL / REJECTION
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.parent_respond_link(p_link_id UUID, p_accept BOOLEAN, p_notes TEXT DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
    v_link public.parent_student_links%ROWTYPE;
BEGIN
    SELECT * INTO v_link FROM public.parent_student_links WHERE id = p_link_id;
    IF v_link.id IS NULL THEN
        RAISE EXCEPTION 'الرابط المحدد غير موجود.';
    END IF;

    -- Verification that caller is the target parent
    IF auth.uid() <> v_link.parent_id AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'رفض أمني: لا تملك الصلاحية للرد على هذا الرابط.';
    END IF;

    IF v_link.status <> 'pending' THEN
        RAISE EXCEPTION 'لا يمكن تغيير حالة رابط غير معلق (الحالة الحالية: %).', v_link.status;
    END IF;

    IF p_accept THEN
        UPDATE public.parent_student_links
        SET status = 'active',
            verified_by = auth.uid(),
            verified_at = NOW(),
            notes = COALESCE(notes, '') || CASE WHEN p_notes IS NOT NULL THEN ' | ' || p_notes ELSE '' END
        WHERE id = p_link_id;
        RETURN jsonb_build_object('success', true, 'status', 'active');
    ELSE
        UPDATE public.parent_student_links
        SET status = 'rejected',
            notes = COALESCE(notes, '') || CASE WHEN p_notes IS NOT NULL THEN ' | سبب الرفض: ' || p_notes ELSE '' END
        WHERE id = p_link_id;
        RETURN jsonb_build_object('success', true, 'status', 'rejected');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public;

REVOKE ALL ON FUNCTION public.parent_respond_link(UUID, BOOLEAN, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.parent_respond_link(UUID, BOOLEAN, TEXT) TO authenticated;

-- ------------------------------------------------------------------------------
-- 9. PARENT_STUDENT_LINKS RLS POLICIES (TIGHTENED)
-- ------------------------------------------------------------------------------
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
        status = 'pending' AND
        created_by = auth.uid() AND
        verified_by IS NULL AND
        verified_at IS NULL AND
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
        public.is_teacher() AND 
        created_by = auth.uid() AND 
        status = 'pending' AND
        student_id IN (
            SELECT s.id FROM public.students s
            JOIN public.teacher_subjects ts ON ts.class_id = s.class_id
            JOIN public.teachers t ON t.id = ts.teacher_id
            WHERE t.profile_id = auth.uid()
        )
    ) WITH CHECK (
        public.is_teacher() AND 
        status IN ('pending', 'revoked')
    );

DROP POLICY IF EXISTS "parent_links_parent_select" ON public.parent_student_links;
CREATE POLICY "parent_links_parent_select" ON public.parent_student_links
    FOR SELECT USING (parent_id = auth.uid());

DROP POLICY IF EXISTS "parent_links_parent_update" ON public.parent_student_links;
CREATE POLICY "parent_links_parent_update" ON public.parent_student_links
    FOR UPDATE USING (parent_id = auth.uid())
    WITH CHECK (parent_id = auth.uid() AND status IN ('active', 'rejected'));

DROP POLICY IF EXISTS "parent_links_student_select" ON public.parent_student_links;
CREATE POLICY "parent_links_student_select" ON public.parent_student_links
    FOR SELECT USING (
        status = 'active' AND student_id IN (
            SELECT id FROM public.students WHERE profile_id = auth.uid()
        )
    );

-- ------------------------------------------------------------------------------
-- 10. UNIFY ALL PARENT POLICIES TO ACTIVE PARENT_STUDENT_LINKS EXCLUSIVELY
-- ------------------------------------------------------------------------------

-- 10.1 Profiles: Teachers view related students and parents
DROP POLICY IF EXISTS "Teachers view related students and parents" ON public.profiles;
CREATE POLICY "Teachers view related students and parents" ON public.profiles
    FOR SELECT USING (
        public.is_teacher() AND id IN (
            SELECT s.profile_id FROM public.students s
            JOIN public.teacher_subjects ts ON ts.class_id = s.class_id
            JOIN public.teachers t ON t.id = ts.teacher_id
            WHERE t.profile_id = auth.uid()
            UNION
            SELECT psl.parent_id FROM public.parent_student_links psl
            JOIN public.students s ON s.id = psl.student_id
            JOIN public.teacher_subjects ts ON ts.class_id = s.class_id
            JOIN public.teachers t ON t.id = ts.teacher_id
            WHERE t.profile_id = auth.uid()
            UNION
            SELECT t.profile_id FROM public.teachers t
        )
    );

-- 10.2 Profiles: Parents view their children and teachers
DROP POLICY IF EXISTS "Parents view their children and teachers" ON public.profiles;
CREATE POLICY "Parents view their children and teachers" ON public.profiles
    FOR SELECT USING (
        id IN (
            SELECT s.profile_id FROM public.students s
            JOIN public.parent_student_links psl ON psl.student_id = s.id
            WHERE psl.parent_id = auth.uid() AND psl.status = 'active'
            UNION
            SELECT t.profile_id FROM public.teachers t
            JOIN public.teacher_subjects ts ON ts.teacher_id = t.id
            JOIN public.students s ON s.class_id = ts.class_id
            JOIN public.parent_student_links psl ON psl.student_id = s.id
            WHERE psl.parent_id = auth.uid() AND psl.status = 'active'
        )
    );

-- 10.3 Profile Confidential Details: Parents view own children confidential details
DROP POLICY IF EXISTS "Parents view own children confidential details" ON public.profile_confidential_details;
CREATE POLICY "Parents view own children confidential details" ON public.profile_confidential_details
    FOR SELECT USING (
        id IN (
            SELECT s.profile_id FROM public.students s
            JOIN public.parent_student_links psl ON psl.student_id = s.id
            WHERE psl.parent_id = auth.uid() AND psl.status = 'active'
        )
    );

-- 10.4 Students: Parents view only own children
DROP POLICY IF EXISTS "Parents view only own children" ON public.students;
CREATE POLICY "Parents view only own children" ON public.students
    FOR SELECT USING (
        id IN (
            SELECT psl.student_id FROM public.parent_student_links psl 
            WHERE psl.parent_id = auth.uid() AND psl.status = 'active'
        )
    );

-- 10.5 Exams: Parents view their children class exams
DROP POLICY IF EXISTS "Parents view their children class exams" ON public.exams;
CREATE POLICY "Parents view their children class exams" ON public.exams
    FOR SELECT USING (
        status <> 'draft' AND
        class_id IN (
            SELECT s.class_id FROM public.students s
            JOIN public.parent_student_links psl ON psl.student_id = s.id
            WHERE psl.parent_id = auth.uid() AND psl.status = 'active'
        )
    );

-- 10.6 Grades: Parents view only children published grades
DROP POLICY IF EXISTS "Parents view only children published grades" ON public.grades;
CREATE POLICY "Parents view only children published grades" ON public.grades
    FOR SELECT USING (
        student_id IN (
            SELECT psl.student_id FROM public.parent_student_links psl
            WHERE psl.parent_id = auth.uid() AND psl.status = 'active'
        )
        AND exam_id IN (SELECT id FROM public.exams WHERE status = 'published')
    );

-- 10.7 Attendance: Parents view children attendance
DROP POLICY IF EXISTS "Parents view children attendance" ON public.attendance;
CREATE POLICY "Parents view children attendance" ON public.attendance
    FOR SELECT USING (
        student_id IN (
            SELECT psl.student_id FROM public.parent_student_links psl
            WHERE psl.parent_id = auth.uid() AND psl.status = 'active'
        )
    );

-- 10.8 Behavior Notes: Parents view visible notes for their children only
DROP POLICY IF EXISTS "Parents view visible notes for their children only" ON public.behavior_notes;
CREATE POLICY "Parents view visible notes for their children only" ON public.behavior_notes
    FOR SELECT USING (
        is_visible_to_parent = TRUE AND
        student_id IN (
            SELECT psl.student_id FROM public.parent_student_links psl
            WHERE psl.parent_id = auth.uid() AND psl.status = 'active'
        )
    );

-- 10.9 Assignments: Students and parents view assignments
DROP POLICY IF EXISTS "Students and parents view assignments" ON public.assignments;
CREATE POLICY "Students and parents view assignments" ON public.assignments
    FOR SELECT USING (
        public.is_admin() OR
        public.is_teacher() OR
        class_id IN (
            SELECT class_id FROM public.students WHERE profile_id = auth.uid()
            UNION
            SELECT s.class_id FROM public.students s
            JOIN public.parent_student_links psl ON psl.student_id = s.id
            WHERE psl.parent_id = auth.uid() AND psl.status = 'active'
        )
    );

-- 10.10 Parents Table: Teachers view parents of their students
DROP POLICY IF EXISTS "Teachers view parents of their students" ON public.parents;
CREATE POLICY "Teachers view parents of their students" ON public.parents
    FOR SELECT USING (
        public.is_teacher() AND profile_id IN (
            SELECT psl.parent_id FROM public.parent_student_links psl
            JOIN public.students s ON s.id = psl.student_id
            JOIN public.teacher_subjects ts ON ts.class_id = s.class_id
            JOIN public.teachers t ON t.id = ts.teacher_id
            WHERE t.profile_id = auth.uid() AND psl.status = 'active'
        )
    );

COMMIT;
