-- ==============================================================================
-- EduConnect: Final Security Remediation Migration
-- File: supabase/migrations/20261102000002_final_security_remediation.sql
-- Description:
--   1. Fix prevent_role_escalation: Eliminate current_user security definer flaw.
--      Enforce PostgreSQL column-level privileges (REVOKE UPDATE on sensitive columns).
--      Create secure administrative RPC (admin_manage_user_access) for role/status changes.
--   2. Fix is_admin() and is_teacher(): Require role + is_active = TRUE + approval_status = 'approved'.
--      Update current_user_role() to return role only for active approved accounts.
--   3. Fix search_parent_profiles: Scope teacher search to target_student_id in teacher's assigned classes.
--      Enforce exact email match with email masking, eliminating global enumeration.
--   4. Fix parent_student_links: Drop direct client parent update policy (parent_links_parent_update).
--      Enforce column privileges (REVOKE UPDATE on administrative fields).
--      Route all approvals/rejections strictly through parent_respond_link with full auditing.
--   5. Fix enforce_audit_log_integrity: Force actor_id, actor_name, actor_role, and timestamp
--      from server session & database profiles, preventing spoofing.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. HARDEN CORE AUTH HELPER FUNCTIONS (ACTIVE & APPROVED STRICT ENFORCEMENT)
-- ------------------------------------------------------------------------------

-- Helper 1: Current User Role (Returns role ONLY if active and approved)
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

-- ------------------------------------------------------------------------------
-- 2. PREVENT ROLE ESCALATION & COLUMN-LEVEL PERMISSIONS (PROFILES)
-- ------------------------------------------------------------------------------

-- Column privileges on profiles:
-- Authenticated users CANNOT update role, approval_status, is_active, or id directly!
REVOKE UPDATE ON public.profiles FROM authenticated, anon, PUBLIC;
GRANT UPDATE (full_name, avatar_url, bio, updated_at) ON public.profiles TO authenticated;

-- Tighten profile policies: Separate SELECT and UPDATE
DROP POLICY IF EXISTS "Users view and update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;

CREATE POLICY "Users view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Defense-in-depth trigger: eliminate current_user definer pitfall
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

    -- Direct DB session checks (non-superuser): verify caller is an active approved admin
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

-- ------------------------------------------------------------------------------
-- 3. SECURE ADMINISTRATIVE RPC: USER ROLE & ACCESS MANAGEMENT
-- ------------------------------------------------------------------------------
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

REVOKE ALL ON FUNCTION public.admin_manage_user_access(UUID, public.user_role, TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_manage_user_access(UUID, public.user_role, TEXT, BOOLEAN) TO authenticated;

-- ------------------------------------------------------------------------------
-- 4. SCOPED PARENT LOOKUP: MANDATORY STUDENT CLASS BINDING & MASKED OUTPUT
-- ------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.search_parent_profiles(TEXT);

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

    -- Teachers: Strictly bound to assigned class student and exact parent email match
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

REVOKE ALL ON FUNCTION public.search_parent_profiles(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_parent_profiles(UUID, TEXT) TO authenticated;

-- ------------------------------------------------------------------------------
-- 5. PARENT_STUDENT_LINKS: REVOKE DIRECT PARENT UPDATE & SENSITIVE COLUMN GRANTS
-- ------------------------------------------------------------------------------

-- Drop direct client update policy for parents (responses MUST use parent_respond_link)
DROP POLICY IF EXISTS "parent_links_parent_update" ON public.parent_student_links;

-- Column privileges on parent_student_links:
-- Authenticated users cannot directly update parent_id, student_id, status, verified_*, or created_*
REVOKE UPDATE ON public.parent_student_links FROM authenticated, anon, PUBLIC;
GRANT UPDATE (notes) ON public.parent_student_links TO authenticated;

-- Update process_parent_student_link_transition trigger
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

        -- Direct status changes via UPDATE from non-admins are blocked (must use parent_respond_link RPC)
        IF NEW.status <> OLD.status AND NOT public.is_admin() AND current_setting('request.jwt.claim.role', true) = 'authenticated' THEN
            -- Allow only if called inside authorized RPC or admin
            NULL;
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

-- Refine parent_respond_link RPC with audit details and parent verification
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

REVOKE ALL ON FUNCTION public.parent_respond_link(UUID, BOOLEAN, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.parent_respond_link(UUID, BOOLEAN, TEXT) TO authenticated;

-- ------------------------------------------------------------------------------
-- 6. AUDIT LOG INTEGRITY: FORCE ACTOR DETAILS FROM SERVER AND DATABASE
-- ------------------------------------------------------------------------------
REVOKE UPDATE, DELETE ON public.audit_logs FROM authenticated, anon, PUBLIC;

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

COMMIT;
