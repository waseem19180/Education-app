-- ==============================================================================
-- EduConnect — منصة التواصل والإدارة المدرسية المتكاملة
-- الصف الحادي عشر العلمي (قابل للتوسع لكافة المراحل المدرسية)
-- الإصدار الأمني النهائي الشامل: تحصين الصلاحيات على مستوى الأعمدة (Column Grants)،
-- إزالة عيوب SECURITY DEFINER / current_user، اشتراط الاعتماد والنشاط في دوال الفحص،
-- تقييد بحث أولياء الأمور بالشعب المسندة، وفرض أصالة سجلات التدقيق والموافقات.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. ENUM TYPES
-- ==============================================================================
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('admin', 'teacher', 'parent', 'student');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.exam_type AS ENUM ('first_quarter', 'midterm', 'second_quarter', 'final', 'quiz', 'practical');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.exam_status AS ENUM ('draft', 'published', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.attendance_status AS ENUM ('present', 'absent', 'late', 'excused');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.conversation_type AS ENUM ('direct', 'group', 'admin_channel', 'teachers_group');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.note_type AS ENUM ('behavioral', 'academic', 'appreciation', 'warning');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.announcement_audience AS ENUM ('all', 'teachers', 'parents', 'students', 'grade_11');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.announcement_category AS ENUM ('urgent', 'academic', 'exam', 'event', 'general');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==============================================================================
-- 3. CORE PUBLIC PROFILES TABLE (Public / Academic Data Only)
-- Sensitive items (national_id, phone, address) isolated to profile_confidential_details
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role public.user_role NOT NULL DEFAULT 'student',
    avatar_url TEXT,
    bio TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    approval_status TEXT NOT NULL DEFAULT 'approved' CHECK (approval_status IN ('approved', 'pending_approval', 'rejected', 'suspended')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 4. CONFIDENTIAL DETAILS TABLE (Strictly Private & Sensitive Personal Data)
-- Isolated from profiles to prevent data leakage via SELECT * or relations
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profile_confidential_details (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    national_id TEXT UNIQUE,
    phone TEXT,
    emergency_contact TEXT,
    home_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 5. CLASSES TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL, -- e.g. 'الصف الحادي عشر العلمي (أ)'
    grade_level INT NOT NULL DEFAULT 11,
    section TEXT NOT NULL, -- 'أ', 'ب'
    academic_year TEXT NOT NULL DEFAULT '2026/2027',
    room_number TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 6. SUBJECTS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    credit_hours INT NOT NULL DEFAULT 3,
    max_score NUMERIC(5,2) NOT NULL DEFAULT 100.00,
    pass_score NUMERIC(5,2) NOT NULL DEFAULT 50.00,
    color TEXT DEFAULT '#2563eb',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 7. TEACHERS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.teachers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    specialization TEXT NOT NULL,
    office_room TEXT,
    hire_date DATE DEFAULT CURRENT_DATE
);

-- ==============================================================================
-- 8. TEACHER_SUBJECTS (Mapping teacher to subject and class)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.teacher_subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    UNIQUE(teacher_id, subject_id, class_id)
);

-- ==============================================================================
-- 9. PARENTS TABLE (Profile mapping table; legacy relationship carrier)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.parents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    relationship TEXT NOT NULL DEFAULT 'father',
    occupation TEXT
);

-- ==============================================================================
-- 10. STUDENTS TABLE
-- parent_id is kept for legacy schema backward-compatibility, but active access
-- rights are strictly governed by parent_student_links with status = 'active'.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    student_number TEXT NOT NULL UNIQUE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
    parent_id UUID REFERENCES public.parents(id) ON DELETE SET NULL,
    birth_date DATE NOT NULL,
    blood_type TEXT,
    enrollment_date DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'graduated'))
);

-- ==============================================================================
-- 10.1 PARENT_STUDENT_LINKS TABLE (Managed Relationships & Multi-Parent Support)
-- Verified state machine: pending -> active / rejected / revoked
-- ==============================================================================
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_parent_student_unique_active
ON public.parent_student_links(parent_id, student_id)
WHERE status IN ('pending', 'active');

CREATE INDEX IF NOT EXISTS idx_parent_student_parent_id ON public.parent_student_links(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_student_student_id ON public.parent_student_links(student_id);

-- ==============================================================================
-- 11. EXAMS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    max_score NUMERIC(5,2) NOT NULL DEFAULT 100,
    weight_percentage NUMERIC(5,2) NOT NULL DEFAULT 20.00,
    exam_type public.exam_type NOT NULL,
    status public.exam_status NOT NULL DEFAULT 'draft',
    term TEXT NOT NULL DEFAULT 'first_term',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 12. GRADES TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.grades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
    score NUMERIC(5,2) NOT NULL CHECK (score >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, exam_id)
);

-- ==============================================================================
-- 13. DAILY ATTENDANCE TABLE (One Record Per Student Per School Day)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status public.attendance_status NOT NULL DEFAULT 'present',
    excuse_reason TEXT,
    notes TEXT,
    recorded_by UUID REFERENCES public.profiles(id),
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES public.profiles(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, date) -- Strictly one record per student per school day
);

-- ==============================================================================
-- 14. BEHAVIOR NOTES TABLE (Confidentiality Support)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.behavior_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    note_type public.note_type NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_visible_to_parent BOOLEAN DEFAULT TRUE,
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 15. ASSIGNMENTS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
    due_date TIMESTAMPTZ NOT NULL,
    attachment_url TEXT,
    max_score NUMERIC(5,2) DEFAULT 10.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 16. ANNOUNCEMENTS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    category public.announcement_category NOT NULL DEFAULT 'general',
    target_audience public.announcement_audience NOT NULL DEFAULT 'all',
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 17. CONVERSATIONS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type public.conversation_type NOT NULL DEFAULT 'direct',
    title TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 18. CONVERSATION MEMBERS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.conversation_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_read_at TIMESTAMPTZ,
    UNIQUE(conversation_id, profile_id)
);

-- ==============================================================================
-- 19. MESSAGES TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    attachment_url TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 20. NOTIFICATIONS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    link_target TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 21. AUDIT LOGS TABLE (Strictly Immutable Security Log)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES public.profiles(id),
    actor_name TEXT NOT NULL,
    actor_role public.user_role NOT NULL,
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    details TEXT,
    ip_address TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 22. SCHOOL EVENTS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.school_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    date DATE NOT NULL,
    end_date DATE,
    type TEXT NOT NULL DEFAULT 'activity',
    description TEXT,
    target_role TEXT DEFAULT 'all',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 23. VIEWS (Safe Public View for User Listings - Security Invoker Enforced)
-- ==============================================================================
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = true) AS
    SELECT id, full_name, role, avatar_url
    FROM public.profiles;

REVOKE ALL ON public.public_profiles FROM PUBLIC, anon;
GRANT SELECT ON public.public_profiles TO authenticated;

-- ==============================================================================
-- 24. INDEXES FOR HIGH-PERFORMANCE SECURITY & QUERY EVALUATION
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_students_class ON public.students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_parent ON public.students(parent_id);
CREATE INDEX IF NOT EXISTS idx_grades_student_exam ON public.grades(student_id, exam_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON public.attendance(student_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_class_date ON public.attendance(class_id, date);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notes_student ON public.behavior_notes(student_id);
CREATE INDEX IF NOT EXISTS idx_conv_members ON public.conversation_members(conversation_id, profile_id);

-- ==============================================================================
-- 25. SECURITY DEFINER HELPER FUNCTIONS WITH STRICT SEARCH_PATH = pg_catalog, public
-- Strict Requirements: role + is_active = TRUE + approval_status = 'approved'
-- ==============================================================================

-- Helper 1: Get Current User Role (Returns role ONLY if active and approved)
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role AS $$
    SELECT role FROM public.profiles 
    WHERE id = auth.uid() 
      AND COALESCE(is_active, FALSE) = TRUE 
      AND approval_status = 'approved';
$$ LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = pg_catalog, public;

-- Helper 2: Check If User Is an Active Approved Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'admin'
          AND COALESCE(is_active, FALSE) = TRUE
          AND approval_status = 'approved'
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = pg_catalog, public;

-- Helper 3: Check If User Is an Active Approved Teacher (or Admin)
CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND role IN ('teacher', 'admin')
          AND COALESCE(is_active, FALSE) = TRUE
          AND approval_status = 'approved'
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = pg_catalog, public;

-- Helper 4: Check Pedagogical Association Between Two Users
-- Enforces active parent_student_links exclusively for parent verification
CREATE OR REPLACE FUNCTION public.can_communicate(user_a UUID, user_b UUID)
RETURNS BOOLEAN AS $$
DECLARE
    role_a public.user_role;
    role_b public.user_role;
BEGIN
    SELECT role INTO role_a FROM public.profiles WHERE id = user_a AND COALESCE(is_active, FALSE) = TRUE AND approval_status = 'approved';
    SELECT role INTO role_b FROM public.profiles WHERE id = user_b AND COALESCE(is_active, FALSE) = TRUE AND approval_status = 'approved';

    IF role_a IS NULL OR role_b IS NULL THEN
        RETURN FALSE;
    END IF;

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

-- Helper 5: Verify Eligibility to Join a Specific Conversation
CREATE OR REPLACE FUNCTION public.can_join_conversation(p_user_id UUID, p_conv_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_conv_type public.conversation_type;
    v_user_role public.user_role;
    v_member_count INT;
    v_other_user_id UUID;
BEGIN
    SELECT type INTO v_conv_type FROM public.conversations WHERE id = p_conv_id;
    SELECT role INTO v_user_role FROM public.profiles WHERE id = p_user_id AND COALESCE(is_active, FALSE) = TRUE AND approval_status = 'approved';

    IF v_conv_type IS NULL OR v_user_role IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Admin can join any conversation
    IF v_user_role = 'admin' THEN
        RETURN TRUE;
    END IF;

    -- admin_channel: Strictly Admins only
    IF v_conv_type = 'admin_channel' THEN
        RETURN FALSE;
    END IF;

    -- teachers_group: Strictly Teachers & Admins only
    IF v_conv_type = 'teachers_group' THEN
        RETURN v_user_role IN ('teacher', 'admin');
    END IF;

    -- direct: Maximum 2 members, requires legitimate pedagogical communication link
    IF v_conv_type = 'direct' THEN
        SELECT COUNT(*) INTO v_member_count FROM public.conversation_members WHERE conversation_id = p_conv_id;
        IF v_member_count >= 2 THEN
            RETURN FALSE;
        END IF;

        IF v_member_count = 1 THEN
            SELECT profile_id INTO v_other_user_id FROM public.conversation_members WHERE conversation_id = p_conv_id LIMIT 1;
            RETURN public.can_communicate(p_user_id, v_other_user_id);
        END IF;

        RETURN TRUE;
    END IF;

    -- group: Only Teachers or Admins can initialize/join groups unilaterally
    IF v_conv_type = 'group' THEN
        RETURN v_user_role IN ('teacher', 'admin');
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = pg_catalog, public;

-- Helper 6: Scoped Parent Lookup Bound Strictly to Teacher's Assigned Class Student
CREATE OR REPLACE FUNCTION public.search_parent_profiles(
    target_student_id UUID,
    parent_identifier TEXT
)
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    role public.user_role,
    avatar_url TEXT,
    masked_email TEXT
) AS $$
DECLARE
    v_clean_ident TEXT;
    v_student_class UUID;
    v_teacher_teaches_class BOOLEAN;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'رفض أمني: يتطلب تسجيل الدخول لاستدعاء هذه الدالة.' USING ERRCODE = '42501';
    END IF;

    -- Admins have administrative search access
    IF public.is_admin() THEN
        v_clean_ident := TRIM(parent_identifier);
        RETURN QUERY
        SELECT p.id, p.full_name, p.role, p.avatar_url, p.email AS masked_email
        FROM public.profiles p
        WHERE p.role = 'parent'
          AND COALESCE(p.is_active, FALSE) = TRUE
          AND (
              LOWER(p.email) = LOWER(v_clean_ident)
              OR p.full_name ILIKE '%' || v_clean_ident || '%'
              OR p.id::TEXT = v_clean_ident
          )
        LIMIT 5;
        RETURN;
    END IF;

    -- Teachers: Bound strictly to an assigned class student and exact parent email
    IF NOT public.is_teacher() THEN
        RAISE EXCEPTION 'رفض أمني: غير مصرح بالبحث في حسابات أولياء الأمور.' USING ERRCODE = '42501';
    END IF;

    IF target_student_id IS NULL THEN
        RAISE EXCEPTION 'رفض أمني: يجب تحديد الطالب المستهدف لإجراء عملية الربط مع ولي أمره.' USING ERRCODE = '22023';
    END IF;

    -- Verify target student exists
    SELECT s.class_id INTO v_student_class FROM public.students s WHERE s.id = target_student_id;
    IF v_student_class IS NULL THEN
        RAISE EXCEPTION 'الطالب المحدد غير موجود في النظام.' USING ERRCODE = 'P0002';
    END IF;

    -- Verify teacher is assigned to this student's class
    SELECT EXISTS (
        SELECT 1 FROM public.teacher_subjects ts
        JOIN public.teachers t ON t.id = ts.teacher_id
        WHERE t.profile_id = auth.uid() AND ts.class_id = v_student_class
    ) INTO v_teacher_teaches_class;

    IF NOT v_teacher_teaches_class THEN
        RAISE EXCEPTION 'رفض أمني: لا يمكنك البحث عن ولي أمر لطالب خارج شعبك المسندة إليك.' USING ERRCODE = '42501';
    END IF;

    v_clean_ident := TRIM(parent_identifier);
    IF LENGTH(v_clean_ident) < 5 OR v_clean_ident = '%' OR v_clean_ident NOT LIKE '%@%.%' THEN
        RETURN; -- Must be a valid email string; prevents pattern probes and mass enumeration
    END IF;

    -- Match ONLY by exact email match, and return masked email
    RETURN QUERY
    SELECT p.id, p.full_name, p.role, p.avatar_url,
           regexp_replace(p.email, '(^[^@]{2})[^@]+(@.*$)', '\1***\2') AS masked_email
    FROM public.profiles p
    WHERE p.role = 'parent'
      AND COALESCE(p.is_active, FALSE) = TRUE
      AND p.approval_status = 'approved'
      AND LOWER(p.email) = LOWER(v_clean_ident)
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = pg_catalog, public;

-- ==============================================================================
-- 26. SECURE BOOTSTRAP FOR FIRST ADMIN
-- Designed for DB Owner in SQL Editor when zero admins exist.
-- Employs explicit pessimistic table lock; eliminates insecure GUC bypass.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.bootstrap_initial_admin(admin_email TEXT)
RETURNS TEXT AS $$
DECLARE
    v_target_id UUID;
    v_admin_count INT;
BEGIN
    -- 1. Explicit caller check: MUST be executed by database superuser or service_role in SQL Editor
    IF current_user NOT IN ('postgres', 'supabase_admin') AND 
       COALESCE(current_setting('request.jwt.claim.role', true), '') <> 'service_role' THEN
        RAISE EXCEPTION 'رفض أمني: دالة التهيئة الأولية مخصصة لمالك قاعدة البيانات فقط من خلال SQL Editor.' USING ERRCODE = '42501';
    END IF;

    -- 2. Concurrency Lock: Lock profiles table in exclusive mode to prevent race conditions
    LOCK TABLE public.profiles IN EXCLUSIVE MODE;

    -- 3. Strict Check: Allow ONLY if ZERO admins exist
    SELECT COUNT(*) INTO v_admin_count FROM public.profiles WHERE role = 'admin';
    IF v_admin_count > 0 THEN
        RAISE EXCEPTION 'خطأ أمني: يوجد مسؤول نظام مسجل بالفعل في المنصة (% مسجل). تم تعطيل آلية التهيئة نهائياً.', v_admin_count USING ERRCODE = '42501';
    END IF;

    -- 4. Locate target user by email
    SELECT id INTO v_target_id FROM public.profiles WHERE LOWER(email) = LOWER(TRIM(admin_email));
    IF v_target_id IS NULL THEN
        RAISE EXCEPTION 'المستخدم بالبريد الإلكتروني % غير مسجل بعد في جدول profiles. يرجى إنشاء الحساب أولاً عبر واجهة التسجيل.', admin_email USING ERRCODE = 'P0002';
    END IF;

    -- 5. Upgrade role to admin and mark approved and active
    UPDATE public.profiles
    SET role = 'admin',
        approval_status = 'approved',
        is_active = TRUE,
        updated_at = NOW()
    WHERE id = v_target_id;

    -- 6. Audit Log
    INSERT INTO public.audit_logs (actor_id, actor_name, actor_role, action, table_name, record_id, details)
    VALUES (v_target_id, admin_email, 'admin', 'INITIAL_ADMIN_BOOTSTRAP', 'profiles', v_target_id::TEXT, 'تهيئة أول مدير نظام للمنصة بواسطة مالك قاعدة البيانات في SQL Editor');

    RETURN 'تم تعيين أول مدير نظام بنجاح: ' || admin_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public;

-- ==============================================================================
-- 27. SECURITY TRIGGERS & ADMINISTRATIVE ACCESS RPC
-- ==============================================================================

-- Security Rule: Enforce 'student' role & pending_approval status on all self-registrations.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, approval_status)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        'student'::public.user_role, -- Strict Security Enforcement: default role is ALWAYS student
        'pending_approval'           -- Requires school approval before general activation
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);

    -- Initialize empty confidential details record
    INSERT INTO public.profile_confidential_details (id)
    VALUES (NEW.id)
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Security Rule: Prevent Role Escalation via direct UPDATE profiles API
-- Hardened: Does NOT rely on current_user inside security definer; enforces column protection.
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER AS $$
DECLARE
    v_jwt_role TEXT;
BEGIN
    v_jwt_role := COALESCE(current_setting('request.jwt.claim.role', true), '');

    -- Direct client API calls (authenticated / anon) must never alter role or account status via UPDATE
    IF v_jwt_role IN ('authenticated', 'anon') THEN
        IF NEW.role <> OLD.role THEN
            RAISE EXCEPTION 'محاولة اختراق أمني محظورة: لا يجوز تعديل الرتبة مباشرة عبر UPDATE. يجب استخدام إجراءات الإدارة المعتمدة (RPC).'
                USING ERRCODE = '42501';
        END IF;
        IF (NEW.approval_status <> OLD.approval_status OR NEW.is_active <> OLD.is_active) THEN
            RAISE EXCEPTION 'محاولة اختراق أمني محظورة: لا يجوز تعديل حالة التفعيل أو الاعتماد مباشرة عبر UPDATE.'
                USING ERRCODE = '42501';
        END IF;
    END IF;

    -- Direct DB session checks: verify caller is an active approved admin or superuser
    IF NEW.role <> OLD.role OR NEW.approval_status <> OLD.approval_status OR NEW.is_active <> OLD.is_active THEN
        IF session_user NOT IN ('postgres', 'supabase_admin') AND v_jwt_role <> 'service_role' THEN
            IF NOT public.is_admin() THEN
                RAISE EXCEPTION 'رفض أمني: تعديل صلاحيات المستخدمين مقتصر حصراً على مسؤولي النظام النشطين المعتمدين.'
                    USING ERRCODE = '42501';
            END IF;
        END IF;
    END IF;

    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_role_escalation
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.prevent_role_escalation();

-- Secure Administrative RPC for User Role & Access Management
CREATE OR REPLACE FUNCTION public.admin_manage_user_access(
    target_user_id UUID,
    new_role public.user_role,
    new_approval_status TEXT,
    new_is_active BOOLEAN
)
RETURNS JSONB AS $$
DECLARE
    v_caller_id UUID;
    v_target_profile public.profiles%ROWTYPE;
    v_caller_is_admin BOOLEAN;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'رفض أمني: يتطلب تسجيل الدخول لتنفيذ هذا الإجراء.' USING ERRCODE = '42501';
    END IF;

    -- Verify caller is an active, approved administrator
    SELECT public.is_admin() INTO v_caller_is_admin;
    IF NOT v_caller_is_admin THEN
        RAISE EXCEPTION 'رفض أمني: غير مصرح لك بإدارة صلاحيات المستخدمين. مقتصر على المدراء النشطين المعتمدين.' USING ERRCODE = '42501';
    END IF;

    -- Prevent an admin from demoting or disabling themselves through this path
    IF v_caller_id = target_user_id AND (new_role <> 'admin' OR new_is_active = FALSE OR new_approval_status <> 'approved') THEN
        RAISE EXCEPTION 'رفض أمني: لا يمكن للمدير خفض رتبته أو تعطيل حسابه ذاتياً.' USING ERRCODE = '42501';
    END IF;

    -- Validate approval_status
    IF new_approval_status NOT IN ('approved', 'pending_approval', 'rejected', 'suspended') THEN
        RAISE EXCEPTION 'حالة الاعتماد المدخلة غير صالحة.' USING ERRCODE = '22023';
    END IF;

    SELECT * INTO v_target_profile FROM public.profiles WHERE id = target_user_id;
    IF v_target_profile.id IS NULL THEN
        RAISE EXCEPTION 'المستخدم المستهدف غير موجود.' USING ERRCODE = 'P0002';
    END IF;

    -- Update target user
    UPDATE public.profiles
    SET role = new_role,
        approval_status = new_approval_status,
        is_active = new_is_active,
        updated_at = NOW()
    WHERE id = target_user_id;

    -- Audit log entry
    INSERT INTO public.audit_logs (actor_id, actor_name, actor_role, action, table_name, record_id, details)
    VALUES (
        v_caller_id,
        COALESCE((SELECT full_name FROM public.profiles WHERE id = v_caller_id), 'Administrator'),
        'admin',
        'ADMIN_MANAGE_USER_ACCESS',
        'profiles',
        target_user_id::TEXT,
        'تعديل الصلاحيات للمستخدم (' || v_target_profile.email || '): دور=' || new_role::TEXT || ' | اعتماد=' || new_approval_status || ' | نشط=' || new_is_active::TEXT
    );

    RETURN jsonb_build_object(
        'success', true,
        'user_id', target_user_id,
        'role', new_role,
        'approval_status', new_approval_status,
        'is_active', new_is_active
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public;

-- Security Rule: Prevent Removing or Demoting or Disabling the Last Active Admin
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
                RAISE EXCEPTION 'إجراء أمني محظور: لا يمكن حذف آخر مدير نظام نشط ومعتمد في المنصة.' USING ERRCODE = '42501';
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
                    RAISE EXCEPTION 'إجراء أمني محظور: لا يمكن تعديل رتبة أو تعطيل أو سحب اعتماد آخر مدير نظام نشط ومعتمد في المنصة.' USING ERRCODE = '42501';
                END IF;
            END IF;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public;

DROP TRIGGER IF EXISTS trg_prevent_last_admin_removal ON public.profiles;
CREATE TRIGGER trg_prevent_last_admin_removal
    BEFORE UPDATE OR DELETE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.prevent_last_admin_removal();

-- Security Rule: Teachers cannot alter or delete published grades
CREATE OR REPLACE FUNCTION public.prevent_published_grade_tampering()
RETURNS TRIGGER AS $$
DECLARE
    v_exam_id UUID;
    v_exam_status public.exam_status;
BEGIN
    v_exam_id := COALESCE(NEW.exam_id, OLD.exam_id);
    SELECT status INTO v_exam_status FROM public.exams WHERE id = v_exam_id;

    IF v_exam_status = 'published' AND NOT public.is_admin() THEN
        IF TG_OP = 'DELETE' THEN
            RAISE EXCEPTION 'عملية محظورة: لا يجوز حذف علامة مرتبطة بامتحان معتمد ومنشور رسمياً إلا من قبل الإدارة.' USING ERRCODE = '42501';
        ELSIF TG_OP = 'UPDATE' THEN
            RAISE EXCEPTION 'عملية محظورة: تم اعتماد ونشر نتائج هذا الامتحان رسمياً. لا يجوز تعديل العلامات المنشورة إلا بموافقة وإجراء موثق من الإدارة.' USING ERRCODE = '42501';
        END IF;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        NEW.updated_at = NOW();
        RETURN NEW;
    ELSE
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public;

DROP TRIGGER IF EXISTS trg_prevent_published_grade_tampering ON public.grades;
CREATE TRIGGER trg_prevent_published_grade_tampering
    BEFORE UPDATE OR DELETE ON public.grades
    FOR EACH ROW EXECUTE FUNCTION public.prevent_published_grade_tampering();

-- Security Rule: Prevent Teachers from Unpublishing Exams or Deleting Published Exams
CREATE OR REPLACE FUNCTION public.prevent_published_exam_tampering()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF OLD.status = 'published' AND NEW.status <> 'published' AND NOT public.is_admin() THEN
            RAISE EXCEPTION 'عملية محظورة: لا يجوز للمعلم إعادة فتح نتائج امتحان منشور أو تغيير حالته إلى مسودة لتجاوز حماية العلامات.' USING ERRCODE = '42501';
        END IF;

        IF OLD.status = 'published' AND (OLD.max_score <> NEW.max_score OR OLD.weight_percentage <> NEW.weight_percentage OR OLD.subject_id <> NEW.subject_id) AND NOT public.is_admin() THEN
            RAISE EXCEPTION 'عملية محظورة: لا يجوز تعديل معايير الامتحان المنشور (الدرجة، الوزن، المادة) إلا بواسطة الإدارة.' USING ERRCODE = '42501';
        END IF;

        IF OLD.status = 'published' AND NEW.status <> 'published' AND public.is_admin() THEN
            INSERT INTO public.audit_logs (actor_id, actor_name, actor_role, action, table_name, record_id, details)
            VALUES (auth.uid(), 'Admin User', 'admin', 'UNPUBLISH_EXAM', 'exams', OLD.id::TEXT, 'إعادة فتح نتائج امتحان معتمد بواسطة الإدارة');
        END IF;

        NEW.updated_at = NOW();
        RETURN NEW;
    END IF;

    IF TG_OP = 'DELETE' THEN
        IF OLD.status = 'published' AND NOT public.is_admin() THEN
            RAISE EXCEPTION 'عملية محظورة: لا يجوز حذف امتحان منشور ومعتمد رسمياً إلا من قبل الإدارة.' USING ERRCODE = '42501';
        END IF;
        RETURN OLD;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public;

DROP TRIGGER IF EXISTS trg_prevent_published_exam_tampering ON public.exams;
CREATE TRIGGER trg_prevent_published_exam_tampering
    BEFORE UPDATE OR DELETE ON public.exams
    FOR EACH ROW EXECUTE FUNCTION public.prevent_published_exam_tampering();

-- Security Rule: Parent-Student Links Integrity, Scoped Creation & State Machine Protection
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
        -- Non-admins MUST create link with status = pending and created_by = auth.uid()
        IF NOT public.is_admin() THEN
            NEW.status := 'pending';
            NEW.created_by := v_actor_id;
            NEW.verified_by := NULL;
            NEW.verified_at := NULL;
            NEW.revoked_by := NULL;
            NEW.revoked_at := NULL;
        ELSE
            NEW.created_by := COALESCE(NEW.created_by, v_actor_id);
            IF NEW.status = 'active' THEN
                NEW.verified_by := COALESCE(NEW.verified_by, v_actor_id);
                NEW.verified_at := COALESCE(NEW.verified_at, NOW());
            END IF;
        END IF;

        v_action_name := 'CREATE_PARENT_LINK';

    ELSIF TG_OP = 'UPDATE' THEN
        -- Strictly forbid changing parent_id, student_id, or created_by
        IF (OLD.parent_id <> NEW.parent_id OR OLD.student_id <> NEW.student_id OR OLD.created_by IS DISTINCT FROM NEW.created_by) THEN
            RAISE EXCEPTION 'عملية محظورة: لا يجوز تعديل أطراف العلاقة أو منشئها بعد إنشائها.' USING ERRCODE = '42501';
        END IF;

        -- Forbid resurrecting rejected or revoked links directly
        IF OLD.status IN ('rejected', 'revoked') AND NEW.status IN ('pending', 'active') AND NOT public.is_admin() THEN
            RAISE EXCEPTION 'عملية محظورة: لا يمكن إعادة تفعيل علاقة ملغاة أو مرفوضة مباشرة. يجب تقديم طلب ارتباط جديد.' USING ERRCODE = '42501';
        END IF;

        IF NEW.status = 'active' AND OLD.status <> 'active' THEN
            v_action_name := 'APPROVE_PARENT_LINK';
        ELSIF NEW.status = 'rejected' AND OLD.status <> 'rejected' THEN
            v_action_name := 'REJECT_PARENT_LINK';
        ELSIF NEW.status = 'revoked' AND OLD.status <> 'revoked' THEN
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

-- Security Rule: Enforce Server and Database Identity on Audit Logs
CREATE OR REPLACE FUNCTION public.enforce_audit_log_integrity()
RETURNS TRIGGER AS $$
DECLARE
    v_uid UUID;
    v_name TEXT;
    v_role public.user_role;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NOT NULL THEN
        SELECT full_name, role INTO v_name, v_role
        FROM public.profiles
        WHERE id = v_uid;

        NEW.actor_id := v_uid;
        NEW.actor_name := COALESCE(v_name, 'Unknown User');
        NEW.actor_role := COALESCE(v_role, 'student'::public.user_role);
    ELSE
        -- No auth.uid() (e.g. background database trigger / postgres)
        IF NEW.actor_id IS NOT NULL THEN
            SELECT full_name, role INTO v_name, v_role
            FROM public.profiles
            WHERE id = NEW.actor_id;

            NEW.actor_name := COALESCE(v_name, NEW.actor_name, 'System User');
            NEW.actor_role := COALESCE(v_role, NEW.actor_role, 'admin'::public.user_role);
        ELSE
            NEW.actor_name := 'System Process';
            NEW.actor_role := 'admin'::public.user_role;
        END IF;
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

-- Security RPC: Parent Response to Link Request (Strictly authorized)
CREATE OR REPLACE FUNCTION public.parent_respond_link(
    p_link_id UUID,
    p_accept BOOLEAN,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_link public.parent_student_links%ROWTYPE;
    v_parent_profile public.profiles%ROWTYPE;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'رفض أمني: يتطلب تسجيل الدخول.' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_link FROM public.parent_student_links WHERE id = p_link_id;
    IF v_link.id IS NULL THEN
        RAISE EXCEPTION 'الرابط المحدد غير موجود.' USING ERRCODE = 'P0002';
    END IF;

    -- Strict verification that caller is the target parent (or active admin)
    IF auth.uid() <> v_link.parent_id AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'رفض أمني: لا تملك الصلاحية للرد على هذا الرابط.' USING ERRCODE = '42501';
    END IF;

    IF v_link.status <> 'pending' THEN
        RAISE EXCEPTION 'لا يمكن تغيير حالة رابط غير معلق (الحالة الحالية: %).', v_link.status USING ERRCODE = '22023';
    END IF;

    SELECT * INTO v_parent_profile FROM public.profiles WHERE id = auth.uid();

    IF p_accept THEN
        UPDATE public.parent_student_links
        SET status = 'active',
            verified_by = auth.uid(),
            verified_at = NOW(),
            notes = COALESCE(notes, '') || CASE WHEN p_notes IS NOT NULL THEN ' | ' || p_notes ELSE '' END
        WHERE id = p_link_id;

        -- Ensure parent record exists in public.parents
        INSERT INTO public.parents (profile_id, relationship)
        VALUES (v_link.parent_id, v_link.relationship)
        ON CONFLICT (profile_id) DO NOTHING;

        -- Audit log entry
        INSERT INTO public.audit_logs (actor_id, actor_name, actor_role, action, table_name, record_id, details)
        VALUES (
            auth.uid(),
            v_parent_profile.full_name,
            v_parent_profile.role,
            'APPROVE_PARENT_LINK',
            'parent_student_links',
            p_link_id::TEXT,
            'موافقة وتفعيل ارتباط ولي الأمر (' || v_parent_profile.full_name || ') بالطالب في ' || NOW()::TEXT
        );

        RETURN jsonb_build_object('success', true, 'status', 'active');
    ELSE
        UPDATE public.parent_student_links
        SET status = 'rejected',
            notes = COALESCE(notes, '') || CASE WHEN p_notes IS NOT NULL THEN ' | سبب الرفض: ' || p_notes ELSE '' END
        WHERE id = p_link_id;

        -- Audit log entry
        INSERT INTO public.audit_logs (actor_id, actor_name, actor_role, action, table_name, record_id, details)
        VALUES (
            auth.uid(),
            v_parent_profile.full_name,
            v_parent_profile.role,
            'REJECT_PARENT_LINK',
            'parent_student_links',
            p_link_id::TEXT,
            'رفض طلب ارتباط ولي الأمر (' || v_parent_profile.full_name || ') في ' || NOW()::TEXT
        );

        RETURN jsonb_build_object('success', true, 'status', 'rejected');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public;

-- ==============================================================================
-- 28. REVOKE & GRANT PERMISSIONS ON SECURITY DEFINER FUNCTIONS & COLUMNS
-- ==============================================================================
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_role_escalation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_published_grade_tampering() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_published_exam_tampering() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_last_admin_removal() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.process_parent_student_link_transition() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_audit_log_integrity() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bootstrap_initial_admin(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_manage_user_access(UUID, public.user_role, TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.parent_respond_link(UUID, BOOLEAN, TEXT) FROM PUBLIC, anon, authenticated;

-- Grant execution of bootstrap ONLY to postgres and service_role in SQL Editor
GRANT EXECUTE ON FUNCTION public.bootstrap_initial_admin(TEXT) TO postgres, service_role;

-- Grant execution of helper validation & interaction functions to authenticated clients
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_teacher() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_communicate(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_join_conversation(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_parent_profiles(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.parent_respond_link(UUID, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_manage_user_access(UUID, public.user_role, TEXT, BOOLEAN) TO authenticated;

-- Column-level privilege restrictions:
-- Profiles: Authenticated users CANNOT update role, approval_status, is_active directly
REVOKE UPDATE ON public.profiles FROM authenticated, anon, PUBLIC;
GRANT UPDATE (full_name, avatar_url, bio, updated_at) ON public.profiles TO authenticated;

-- Parent Student Links: Authenticated users CANNOT update administrative fields directly
REVOKE UPDATE ON public.parent_student_links FROM authenticated, anon, PUBLIC;
GRANT UPDATE (notes) ON public.parent_student_links TO authenticated;

-- Audit Logs: Immutability enforcement (no updates or deletes permitted)
REVOKE UPDATE, DELETE ON public.audit_logs FROM authenticated, anon, PUBLIC;

-- ==============================================================================
-- 29. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS across all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_confidential_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_student_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behavior_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_events ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 29.1 PROFILES POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins full access to profiles" ON public.profiles;
CREATE POLICY "Admins full access to profiles" ON public.profiles
    FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Users view and update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;

CREATE POLICY "Users view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Teachers can view students in their classes and their linked parents
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

-- Parents can view their active children and their children's teachers
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

-- Students can view their class teachers and fellow classmates
DROP POLICY IF EXISTS "Students view their class teachers and classmates" ON public.profiles;
CREATE POLICY "Students view their class teachers and classmates" ON public.profiles
    FOR SELECT USING (
        id IN (
            SELECT t.profile_id FROM public.teachers t
            JOIN public.teacher_subjects ts ON ts.teacher_id = t.id
            JOIN public.students s ON s.class_id = ts.class_id
            WHERE s.profile_id = auth.uid()
            UNION
            SELECT s2.profile_id FROM public.students s1
            JOIN public.students s2 ON s1.class_id = s2.class_id
            WHERE s1.profile_id = auth.uid()
        )
    );

-- ------------------------------------------------------------------------------
-- 29.2 PROFILE CONFIDENTIAL DETAILS POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins full access to confidential details" ON public.profile_confidential_details;
CREATE POLICY "Admins full access to confidential details" ON public.profile_confidential_details
    FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Users access own confidential details" ON public.profile_confidential_details;
CREATE POLICY "Users access own confidential details" ON public.profile_confidential_details
    FOR ALL USING (auth.uid() = id);

-- Parents can view confidential details of their verified ACTIVE children only
DROP POLICY IF EXISTS "Parents view own children confidential details" ON public.profile_confidential_details;
CREATE POLICY "Parents view own children confidential details" ON public.profile_confidential_details
    FOR SELECT USING (
        id IN (
            SELECT s.profile_id FROM public.students s
            JOIN public.parent_student_links psl ON psl.student_id = s.id
            WHERE psl.parent_id = auth.uid() AND psl.status = 'active'
        )
    );

-- ------------------------------------------------------------------------------
-- 29.3 CLASSES & SUBJECTS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users view classes" ON public.classes;
CREATE POLICY "Authenticated users view classes" ON public.classes
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins manage classes" ON public.classes;
CREATE POLICY "Admins manage classes" ON public.classes
    FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Authenticated users view subjects" ON public.subjects;
CREATE POLICY "Authenticated users view subjects" ON public.subjects
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins manage subjects" ON public.subjects;
CREATE POLICY "Admins manage subjects" ON public.subjects
    FOR ALL USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 29.4 TEACHERS & TEACHER_SUBJECTS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users view teachers" ON public.teachers;
CREATE POLICY "Authenticated users view teachers" ON public.teachers
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins manage teachers" ON public.teachers;
CREATE POLICY "Admins manage teachers" ON public.teachers
    FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Authenticated users view teacher_subjects" ON public.teacher_subjects;
CREATE POLICY "Authenticated users view teacher_subjects" ON public.teacher_subjects
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins manage teacher_subjects" ON public.teacher_subjects;
CREATE POLICY "Admins manage teacher_subjects" ON public.teacher_subjects
    FOR ALL USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 29.5 PARENTS & STUDENTS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins manage parents" ON public.parents;
CREATE POLICY "Admins manage parents" ON public.parents
    FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Parents view own record" ON public.parents;
CREATE POLICY "Parents view own record" ON public.parents
    FOR SELECT USING (profile_id = auth.uid());

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

DROP POLICY IF EXISTS "Admins manage students" ON public.students;
CREATE POLICY "Admins manage students" ON public.students
    FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Students view own profile record" ON public.students;
CREATE POLICY "Students view own profile record" ON public.students
    FOR SELECT USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "Parents view only own children" ON public.students;
CREATE POLICY "Parents view only own children" ON public.students
    FOR SELECT USING (
        id IN (
            SELECT psl.student_id FROM public.parent_student_links psl 
            WHERE psl.parent_id = auth.uid() AND psl.status = 'active'
        )
    );

DROP POLICY IF EXISTS "Teachers view enrolled class students" ON public.students;
CREATE POLICY "Teachers view enrolled class students" ON public.students
    FOR SELECT USING (
        public.is_teacher() AND class_id IN (
            SELECT ts.class_id FROM public.teacher_subjects ts
            JOIN public.teachers t ON t.id = ts.teacher_id
            WHERE t.profile_id = auth.uid()
        )
    );

-- ------------------------------------------------------------------------------
-- 29.5.1 PARENT_STUDENT_LINKS POLICIES (TIGHTENED RBAC)
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
        status = 'pending'
    );

DROP POLICY IF EXISTS "parent_links_parent_select" ON public.parent_student_links;
CREATE POLICY "parent_links_parent_select" ON public.parent_student_links
    FOR SELECT USING (parent_id = auth.uid());

-- Note: Direct parent update policy removed; parent approval/rejection MUST use parent_respond_link RPC!
DROP POLICY IF EXISTS "parent_links_parent_update" ON public.parent_student_links;

DROP POLICY IF EXISTS "parent_links_student_select" ON public.parent_student_links;
CREATE POLICY "parent_links_student_select" ON public.parent_student_links
    FOR SELECT USING (
        status = 'active' AND student_id IN (
            SELECT id FROM public.students WHERE profile_id = auth.uid()
        )
    );

-- ------------------------------------------------------------------------------
-- 29.6 EXAMS & GRADES (Subject Scope & Draft Status Guard)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins manage exams" ON public.exams;
CREATE POLICY "Admins manage exams" ON public.exams
    FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Teachers view and create exams" ON public.exams;
CREATE POLICY "Teachers view and create exams" ON public.exams
    FOR ALL USING (
        public.is_admin() OR
        (
            public.is_teacher() AND
            teacher_id IN (SELECT id FROM public.teachers WHERE profile_id = auth.uid()) AND
            (subject_id, class_id) IN (
                SELECT ts.subject_id, ts.class_id
                FROM public.teacher_subjects ts
                JOIN public.teachers t ON t.id = ts.teacher_id
                WHERE t.profile_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Students view their class exams" ON public.exams;
CREATE POLICY "Students view their class exams" ON public.exams
    FOR SELECT USING (
        status <> 'draft' AND
        class_id IN (
            SELECT s.class_id FROM public.students s WHERE s.profile_id = auth.uid()
        )
    );

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

DROP POLICY IF EXISTS "Admins manage all grades" ON public.grades;
CREATE POLICY "Admins manage all grades" ON public.grades
    FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Teachers manage grades for their exams" ON public.grades;
CREATE POLICY "Teachers manage grades for their exams" ON public.grades
    FOR ALL USING (
        public.is_admin() OR
        exam_id IN (
            SELECT e.id FROM public.exams e
            JOIN public.teachers t ON t.id = e.teacher_id
            WHERE t.profile_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Students view only own published grades" ON public.grades;
CREATE POLICY "Students view only own published grades" ON public.grades
    FOR SELECT USING (
        student_id IN (SELECT id FROM public.students WHERE profile_id = auth.uid())
        AND exam_id IN (SELECT id FROM public.exams WHERE status = 'published')
    );

DROP POLICY IF EXISTS "Parents view only children published grades" ON public.grades;
CREATE POLICY "Parents view only children published grades" ON public.grades
    FOR SELECT USING (
        student_id IN (
            SELECT psl.student_id FROM public.parent_student_links psl
            WHERE psl.parent_id = auth.uid() AND psl.status = 'active'
        )
        AND exam_id IN (SELECT id FROM public.exams WHERE status = 'published')
    );

-- ------------------------------------------------------------------------------
-- 29.7 DAILY ATTENDANCE POLICIES (Class Scope & Immutability)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins manage attendance" ON public.attendance;
CREATE POLICY "Admins manage attendance" ON public.attendance
    FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Teachers record and view class attendance" ON public.attendance;
CREATE POLICY "Teachers record and view class attendance" ON public.attendance
    FOR ALL
    USING (
        public.is_admin() OR
        class_id IN (
            SELECT ts.class_id FROM public.teacher_subjects ts
            JOIN public.teachers t ON t.id = ts.teacher_id
            WHERE t.profile_id = auth.uid()
        )
    )
    WITH CHECK (
        public.is_admin() OR
        class_id IN (
            SELECT ts.class_id FROM public.teacher_subjects ts
            JOIN public.teachers t ON t.id = ts.teacher_id
            WHERE t.profile_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Students view own attendance" ON public.attendance;
CREATE POLICY "Students view own attendance" ON public.attendance
    FOR SELECT USING (
        student_id IN (SELECT id FROM public.students WHERE profile_id = auth.uid())
    );

DROP POLICY IF EXISTS "Parents view children attendance" ON public.attendance;
CREATE POLICY "Parents view children attendance" ON public.attendance
    FOR SELECT USING (
        student_id IN (
            SELECT psl.student_id FROM public.parent_student_links psl
            WHERE psl.parent_id = auth.uid() AND psl.status = 'active'
        )
    );

-- ------------------------------------------------------------------------------
-- 29.8 BEHAVIOR & ACADEMIC NOTES (Confidential Notes Guard)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins manage behavior notes" ON public.behavior_notes;
CREATE POLICY "Admins manage behavior notes" ON public.behavior_notes
    FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Teachers manage their behavior notes" ON public.behavior_notes;
CREATE POLICY "Teachers manage their behavior notes" ON public.behavior_notes
    FOR ALL USING (
        public.is_admin() OR
        teacher_id IN (SELECT id FROM public.teachers WHERE profile_id = auth.uid())
    );

DROP POLICY IF EXISTS "Parents view visible notes for their children only" ON public.behavior_notes;
CREATE POLICY "Parents view visible notes for their children only" ON public.behavior_notes
    FOR SELECT USING (
        is_visible_to_parent = TRUE AND
        student_id IN (
            SELECT psl.student_id FROM public.parent_student_links psl
            WHERE psl.parent_id = auth.uid() AND psl.status = 'active'
        )
    );

DROP POLICY IF EXISTS "Students view visible notes for themselves only" ON public.behavior_notes;
CREATE POLICY "Students view visible notes for themselves only" ON public.behavior_notes
    FOR SELECT USING (
        is_visible_to_parent = TRUE AND
        student_id IN (
            SELECT id FROM public.students WHERE profile_id = auth.uid()
        )
    );

-- ------------------------------------------------------------------------------
-- 29.9 ASSIGNMENTS & ANNOUNCEMENTS
-- ------------------------------------------------------------------------------
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

DROP POLICY IF EXISTS "Teachers and admins manage assignments" ON public.assignments;
CREATE POLICY "Teachers and admins manage assignments" ON public.assignments
    FOR ALL USING (
        public.is_admin() OR
        teacher_id IN (SELECT id FROM public.teachers WHERE profile_id = auth.uid())
    );

DROP POLICY IF EXISTS "Audience targeted announcements view" ON public.announcements;
CREATE POLICY "Audience targeted announcements view" ON public.announcements
    FOR SELECT USING (
        public.is_admin() OR
        target_audience = 'all' OR
        (target_audience = 'grade_11' AND auth.role() = 'authenticated') OR
        (target_audience = 'teachers' AND public.is_teacher()) OR
        (target_audience = 'parents' AND public.current_user_role() = 'parent') OR
        (target_audience = 'students' AND public.current_user_role() = 'student')
    );

DROP POLICY IF EXISTS "Admins and teachers manage announcements" ON public.announcements;
CREATE POLICY "Admins and teachers manage announcements" ON public.announcements
    FOR ALL USING (public.is_teacher());

-- ------------------------------------------------------------------------------
-- 29.10 CONVERSATIONS, MEMBERS & MESSAGES (Anti-Intrusion & Strict Channels)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Members view their conversations" ON public.conversations;
CREATE POLICY "Members view their conversations" ON public.conversations
    FOR SELECT USING (
        public.is_admin() OR
        id IN (SELECT conversation_id FROM public.conversation_members WHERE profile_id = auth.uid())
    );

-- Restrict Conversation Creation: Students/Parents cannot create admin channels or teacher groups
DROP POLICY IF EXISTS "Authorized users create conversations" ON public.conversations;
CREATE POLICY "Authorized users create conversations" ON public.conversations
    FOR INSERT WITH CHECK (
        (type = 'admin_channel' AND public.is_admin()) OR
        (type = 'teachers_group' AND public.is_teacher()) OR
        (type IN ('direct', 'group') AND auth.role() = 'authenticated')
    );

-- Prevent unauthorized type mutations (e.g. changing direct to admin_channel)
DROP POLICY IF EXISTS "Prevent conversation type change" ON public.conversations;
CREATE POLICY "Prevent conversation type change" ON public.conversations
    FOR UPDATE USING (
        public.is_admin() OR
        (id IN (SELECT conversation_id FROM public.conversation_members WHERE profile_id = auth.uid()))
    );

DROP POLICY IF EXISTS "Members view conversation members" ON public.conversation_members;
CREATE POLICY "Members view conversation members" ON public.conversation_members
    FOR SELECT USING (
        public.is_admin() OR
        conversation_id IN (SELECT cm.conversation_id FROM public.conversation_members cm WHERE cm.profile_id = auth.uid())
    );

-- Adding members: Strictly verified by can_join_conversation
DROP POLICY IF EXISTS "Controlled member addition" ON public.conversation_members;
DROP POLICY IF EXISTS "Strict member addition" ON public.conversation_members;
CREATE POLICY "Strict member addition" ON public.conversation_members
    FOR INSERT WITH CHECK (
        public.is_admin() OR
        (
            -- Adding oneself only if conversation rules permit
            (profile_id = auth.uid() AND public.can_join_conversation(auth.uid(), conversation_id))
            OR
            -- Or a teacher/admin inviting an eligible user
            (public.is_teacher() AND public.can_join_conversation(profile_id, conversation_id))
        )
    );

DROP POLICY IF EXISTS "Members read messages" ON public.messages;
CREATE POLICY "Members read messages" ON public.messages
    FOR SELECT USING (
        public.is_admin() OR
        conversation_id IN (SELECT conversation_id FROM public.conversation_members WHERE profile_id = auth.uid())
    );

DROP POLICY IF EXISTS "Members post messages" ON public.messages;
CREATE POLICY "Members post messages" ON public.messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        conversation_id IN (SELECT conversation_id FROM public.conversation_members WHERE profile_id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can only edit own messages" ON public.messages;
CREATE POLICY "Users can only edit own messages" ON public.messages
    FOR UPDATE USING (
        sender_id = auth.uid() OR public.is_admin()
    );

DROP POLICY IF EXISTS "Users can delete own messages" ON public.messages;
CREATE POLICY "Users can delete own messages" ON public.messages
    FOR DELETE USING (
        sender_id = auth.uid() OR public.is_admin()
    );

-- ------------------------------------------------------------------------------
-- 29.11 NOTIFICATIONS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users access own notifications" ON public.notifications;
CREATE POLICY "Users access own notifications" ON public.notifications
    FOR ALL USING (user_id = auth.uid() OR public.is_admin());

-- ------------------------------------------------------------------------------
-- 29.12 AUDIT LOGS (Immutable Security Log - No Updates / Deletes Permitted)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins view audit logs" ON public.audit_logs;
CREATE POLICY "Admins view audit logs" ON public.audit_logs
    FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "System insert audit logs" ON public.audit_logs;
CREATE POLICY "System insert audit logs" ON public.audit_logs
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND
        (actor_id IS NULL OR actor_id = auth.uid())
    );

-- Strict Immutability Policies: Nobody can UPDATE or DELETE audit logs!
DROP POLICY IF EXISTS "No one can update audit logs" ON public.audit_logs;
CREATE POLICY "No one can update audit logs" ON public.audit_logs
    FOR UPDATE USING (false);

DROP POLICY IF EXISTS "No one can delete audit logs" ON public.audit_logs;
CREATE POLICY "No one can delete audit logs" ON public.audit_logs
    FOR DELETE USING (false);

-- ------------------------------------------------------------------------------
-- 29.13 SCHOOL EVENTS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users view school events" ON public.school_events;
CREATE POLICY "Authenticated users view school events" ON public.school_events
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins and teachers manage school events" ON public.school_events;
CREATE POLICY "Admins and teachers manage school events" ON public.school_events
    FOR ALL USING (public.is_teacher());

-- ==============================================================================
-- 30. IDEMPOTENT INITIAL SEED DATA FOR GRADE 11 SCIENTIFIC
-- ==============================================================================
INSERT INTO public.classes (id, name, grade_level, section, academic_year, room_number)
VALUES
    ('c1100000-0000-0000-0000-00000000000a', 'الصف الحادي عشر العلمي (أ)', 11, 'أ', '2026/2027', 'قاعة الخوارزمي 204'),
    ('c1100000-0000-0000-0000-00000000000b', 'الصف الحادي عشر العلمي (ب)', 11, 'ب', '2026/2027', 'قاعة ابن الهيثم 205')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.subjects (id, name, code, credit_hours, max_score, pass_score, color)
VALUES
    ('s0000000-0000-0000-0000-000000000001', 'الرياضيات التخصصية', 'MATH-11', 5, 100, 50, '#2563eb'),
    ('s0000000-0000-0000-0000-000000000002', 'الفيزياء الحديثة', 'PHYS-11', 4, 100, 50, '#0891b2'),
    ('s0000000-0000-0000-0000-000000000003', 'الكيمياء التحليلية', 'CHEM-11', 4, 100, 50, '#059669'),
    ('s0000000-0000-0000-0000-000000000004', 'الأحياء والوراثة', 'BIO-11', 4, 100, 50, '#16a34a'),
    ('s0000000-0000-0000-0000-000000000005', 'اللغة العربية والبيان', 'ARAB-11', 4, 100, 50, '#d97706'),
    ('s0000000-0000-0000-0000-000000000006', 'اللغة الإنجليزية المتقدمة', 'ENG-11', 4, 100, 50, '#7c3aed'),
    ('s0000000-0000-0000-0000-000000000007', 'علوم الحاسوب والخوارزميات', 'CS-11', 3, 100, 50, '#4f46e5')
ON CONFLICT (code) DO NOTHING;
