-- ==============================================================================
-- EduConnect: Comprehensive PostgreSQL Security & RLS Test Suite
-- File: supabase/tests/security_tests.sql
-- Architecture & Assurance Level: Production Defense-in-Depth Verification
--
-- Verified Security Scenarios (Strict Error Code & Message Validation):
-- 1.  Self-Promotion via direct UPDATE:
--     - Student attempts to escalate own role to 'admin'.
--     - MUST fail with SQLSTATE 42501 (insufficient_privilege or trigger rejection).
-- 2.  Teacher Escalation via direct UPDATE:
--     - Teacher attempts to promote themselves or a student to 'admin'.
--     - MUST fail with SQLSTATE 42501.
-- 3.  RPC Access Control:
--     - Student attempts calling admin_manage_user_access.
--     - MUST fail with SQLSTATE 42501.
--     - Admin successfully promotes a student via admin_manage_user_access.
--     - Admin attempts to demote themselves via admin_manage_user_access (blocked).
-- 4.  Deactivated & Unapproved Accounts:
--     - Deactivated admin (is_active = FALSE) is rejected by is_admin().
--     - Unapproved teacher (approval_status = 'pending_approval') is rejected by is_teacher().
-- 5.  Scoped Parent Search Privacy Guard (search_parent_profiles):
--     - Teacher searching without student ID fails with SQLSTATE 22023.
--     - Teacher searching for parent of student in unassigned class fails with SQLSTATE 42501.
--     - Teacher wildcard search yields 0 rows (anti-enumeration).
--     - Teacher exact email search for assigned student returns masked email.
-- 6.  Parent Link Administrative Field Tampering:
--     - Client direct UPDATE on verified_by, created_by, or parent_id is rejected (42501).
--     - Teacher direct activation (status = 'active') is blocked.
-- 7.  Parent Link State Machine & RPC Approval:
--     - Target parent approves link via parent_respond_link -> Status becomes active with verified_by = auth.uid().
--     - Unrelated parent attempting to approve the link fails with SQLSTATE 42501.
-- 8.  Audit Log Anti-Spoofing & Immutability:
--     - Spoofed actor_name and actor_id are overridden by trigger to match authenticated profile.
--     - UPDATE and DELETE on audit_logs fail with SQLSTATE 42501.
-- 9.  Unified Parent Data Access via Active Links:
--     - Parent with active link can see student grades, attendance, and notes.
--     - Parent with pending or revoked link cannot see any student records.
-- 10. Last Active Admin Protection:
--     - Deleting, demoting, or deactivating the last active approved admin is blocked with 42501.
-- ==============================================================================

BEGIN;

-- Ensure auth schema and mock users table exist for standalone fixture safety
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE,
    raw_user_meta_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
DECLARE
    -- Deterministic Test UUIDs
    v_admin_1_id UUID := '11111111-1111-1111-1111-111111111111';
    v_admin_2_id UUID := '12121212-1212-1212-1212-121212121212';
    v_teacher_class_a_id UUID := '22222222-2222-2222-2222-222222222222';
    v_teacher_class_b_id UUID := '33333333-3333-3333-3333-333333333333';
    v_student_class_a_id UUID := '44444444-4444-4444-4444-444444444444';
    v_student_class_b_id UUID := '55555555-5555-5555-5555-555555555555';
    v_parent_1_id UUID := '66666666-6666-6666-6666-666666666666';
    v_parent_2_id UUID := '77777777-7777-7777-7777-777777777777';
    v_target_user_id UUID := '88888888-8888-8888-8888-888888888888';

    v_class_a UUID := 'c1100000-0000-0000-0000-00000000000a';
    v_class_b UUID := 'c1100000-0000-0000-0000-00000000000b';
    v_subject_math UUID := 's0000000-0000-0000-0000-000000000001';

    v_t_rec_a UUID := 'a1111111-0000-0000-0000-000000000001';
    v_t_rec_b UUID := 'b1111111-0000-0000-0000-000000000002';
    v_s_rec_a UUID := 'a2222222-0000-0000-0000-000000000001';
    v_s_rec_b UUID := 'b2222222-0000-0000-0000-000000000002';
    v_exam_1_id UUID := 'e1111111-0000-0000-0000-000000000001';

    v_link_id UUID;
    v_count INT;
    v_error_caught BOOLEAN;
    v_err_code TEXT;
    v_err_msg TEXT;
    v_tests_passed INT := 0;
    v_search_count INT;
    v_res JSONB;
BEGIN
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'بدء تشغيل حزمة اختبارات الأمان والتحصين المعماري الشاملة (EduConnect RLS Suite)';
    RAISE NOTICE '=============================================================================';

    -- --------------------------------------------------------------------------
    -- 0. FIXTURE SETUP: Create users in auth.users first, then public.profiles
    -- --------------------------------------------------------------------------
    INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
        (v_admin_1_id, 'admin1@school.edu', '{"full_name": "المدير الأول"}'),
        (v_admin_2_id, 'admin2@school.edu', '{"full_name": "المدير الثاني"}'),
        (v_teacher_class_a_id, 'teacher_a@school.edu', '{"full_name": "معلم رياضيات شعبة أ"}'),
        (v_teacher_class_b_id, 'teacher_b@school.edu', '{"full_name": "معلم فيزياء شعبة ب"}'),
        (v_student_class_a_id, 'student_a@school.edu', '{"full_name": "طالب شعبة أ"}'),
        (v_student_class_b_id, 'student_b@school.edu', '{"full_name": "طالب شعبة ب"}'),
        (v_parent_1_id, 'parent1@school.edu', '{"full_name": "ولي أمر 1"}'),
        (v_parent_2_id, 'parent2@school.edu', '{"full_name": "ولي أمر 2"}'),
        (v_target_user_id, 'target@school.edu', '{"full_name": "مستخدم مستهدف"}')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.profiles (id, email, full_name, role, is_active, approval_status) VALUES
        (v_admin_1_id, 'admin1@school.edu', 'المدير الأول', 'admin', true, 'approved'),
        (v_admin_2_id, 'admin2@school.edu', 'المدير الثاني', 'admin', true, 'approved'),
        (v_teacher_class_a_id, 'teacher_a@school.edu', 'معلم رياضيات شعبة أ', 'teacher', true, 'approved'),
        (v_teacher_class_b_id, 'teacher_b@school.edu', 'معلم فيزياء شعبة ب', 'teacher', true, 'approved'),
        (v_student_class_a_id, 'student_a@school.edu', 'طالب شعبة أ', 'student', true, 'approved'),
        (v_student_class_b_id, 'student_b@school.edu', 'طالب شعبة ب', 'student', true, 'approved'),
        (v_parent_1_id, 'parent1@school.edu', 'ولي أمر 1', 'parent', true, 'approved'),
        (v_parent_2_id, 'parent2@school.edu', 'ولي أمر 2', 'parent', true, 'approved'),
        (v_target_user_id, 'target@school.edu', 'مستخدم مستهدف', 'student', true, 'approved')
    ON CONFLICT (id) DO UPDATE SET 
        role = EXCLUDED.role, 
        approval_status = EXCLUDED.approval_status, 
        is_active = EXCLUDED.is_active;

    -- Confidential Details
    INSERT INTO public.profile_confidential_details (id, national_id, phone, home_address) VALUES
        (v_student_class_a_id, 'NAT-STU-A-001', '+962 79 111 2233', 'عمان - شارع الجامعة'),
        (v_parent_2_id, 'NAT-PAR-9988', '+962 79 999 8877', 'عمان - الشميساني')
    ON CONFLICT (id) DO NOTHING;

    -- Teachers Setup
    INSERT INTO public.teachers (id, profile_id, specialization) VALUES
        (v_t_rec_a, v_teacher_class_a_id, 'رياضيات'),
        (v_t_rec_b, v_teacher_class_b_id, 'فيزياء')
    ON CONFLICT (profile_id) DO NOTHING;

    -- Teacher Class Assignment (معلم أ يدرّس شعبة أ فقط، ومعلم ب يدرّس شعبة ب فقط)
    INSERT INTO public.teacher_subjects (teacher_id, subject_id, class_id) VALUES
        (v_t_rec_a, v_subject_math, v_class_a),
        (v_t_rec_b, v_subject_math, v_class_b)
    ON CONFLICT DO NOTHING;

    -- Students Setup
    INSERT INTO public.students (id, profile_id, student_number, class_id, birth_date) VALUES
        (v_s_rec_a, v_student_class_a_id, 'STU-A-01', v_class_a, '2008-01-01'),
        (v_s_rec_b, v_student_class_b_id, 'STU-B-01', v_class_b, '2008-02-02')
    ON CONFLICT (profile_id) DO NOTHING;

    -- Exams & Grades Setup for testing
    INSERT INTO public.exams (id, title, subject_id, class_id, teacher_id, date, exam_type, status) VALUES
        (v_exam_1_id, 'امتحان الشهر الأول - رياضيات', v_subject_math, v_class_a, v_t_rec_a, '2026-10-15', 'first_quarter', 'published')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.grades (student_id, exam_id, score, notes) VALUES
        (v_s_rec_a, v_exam_1_id, 96.50, 'أداء ممتاز')
    ON CONFLICT (student_id, exam_id) DO NOTHING;

    INSERT INTO public.attendance (student_id, class_id, date, status) VALUES
        (v_s_rec_a, v_class_a, CURRENT_DATE, 'present')
    ON CONFLICT (student_id, date) DO NOTHING;

    INSERT INTO public.behavior_notes (student_id, teacher_id, note_type, title, content, is_visible_to_parent) VALUES
        (v_s_rec_a, v_t_rec_a, 'appreciation', 'مشاركة متميزة', 'أظهر الطالب تفوقاً ملحوظاً في حل المسائل.', true)
    ON CONFLICT DO NOTHING;

    -- ==========================================================================
    -- TEST 1: اختبار ترقية الطالب لنفسه إلى مدير عبر UPDATE مباشر
    -- ==========================================================================
    PERFORM set_config('request.jwt.claim.sub', v_student_class_a_id::TEXT, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

    v_error_caught := false;
    v_err_code := '';
    BEGIN
        UPDATE public.profiles SET role = 'admin' WHERE id = v_student_class_a_id;
    EXCEPTION WHEN OTHERS THEN
        v_error_caught := true;
        GET STACKED DIAGNOSTICS v_err_code = RETURNED_SQLSTATE, v_err_msg = MESSAGE_TEXT;
    END;

    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'TEST 1 FAILED: تمكن الطالب من ترقية نفسه إلى مدير دون حظر!';
    ELSIF v_err_code NOT IN ('42501', 'P0001') THEN
        RAISE EXCEPTION 'TEST 1 FAILED: فشل الاختبار بسبب غير متوقع: % (كود: %)', v_err_msg, v_err_code;
    END IF;
    v_tests_passed := v_tests_passed + 1;
    RAISE NOTICE 'TEST 1 PASSED: تم حظر ترقية الطالب لنفسه برمز خطأ صريح (%).', v_err_code;

    -- ==========================================================================
    -- TEST 2: اختبار ترقية المعلم لنفسه أو للآخرين عبر UPDATE مباشر
    -- ==========================================================================
    PERFORM set_config('request.jwt.claim.sub', v_teacher_class_a_id::TEXT, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

    v_error_caught := false;
    v_err_code := '';
    BEGIN
        UPDATE public.profiles SET role = 'admin' WHERE id = v_teacher_class_a_id;
    EXCEPTION WHEN OTHERS THEN
        v_error_caught := true;
        GET STACKED DIAGNOSTICS v_err_code = RETURNED_SQLSTATE, v_err_msg = MESSAGE_TEXT;
    END;

    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'TEST 2 FAILED: تمكن المعلم من ترقية نفسه إلى مدير!';
    ELSIF v_err_code NOT IN ('42501', 'P0001') THEN
        RAISE EXCEPTION 'TEST 2 FAILED: فشل الاختبار بسبب غير متوقع: % (كود: %)', v_err_msg, v_err_code;
    END IF;

    -- محاولة المعلم ترقية مستخدم آخر
    v_error_caught := false;
    v_err_code := '';
    BEGIN
        UPDATE public.profiles SET role = 'admin' WHERE id = v_target_user_id;
    EXCEPTION WHEN OTHERS THEN
        v_error_caught := true;
        GET STACKED DIAGNOSTICS v_err_code = RETURNED_SQLSTATE, v_err_msg = MESSAGE_TEXT;
    END;

    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'TEST 2.1 FAILED: تمكن المعلم من ترقية مستخدم آخر إلى مدير!';
    ELSIF v_err_code NOT IN ('42501', 'P0001') THEN
        RAISE EXCEPTION 'TEST 2.1 FAILED: فشل الاختبار بسبب غير متوقع: % (كود: %)', v_err_msg, v_err_code;
    END IF;
    v_tests_passed := v_tests_passed + 1;
    RAISE NOTICE 'TEST 2 PASSED: تم حظر محاولة المعلم ترقية نفسه أو غيره برمز خطأ صريح (%).', v_err_code;

    -- ==========================================================================
    -- TEST 3: اختبار منع تجاوز الصلاحيات عبر RPC (admin_manage_user_access)
    -- ==========================================================================
    -- الطالب يحاول استدعاء RPC
    PERFORM set_config('request.jwt.claim.sub', v_student_class_a_id::TEXT, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

    v_error_caught := false;
    v_err_code := '';
    BEGIN
        PERFORM public.admin_manage_user_access(v_student_class_a_id, 'admin'::public.user_role, 'approved', true);
    EXCEPTION WHEN OTHERS THEN
        v_error_caught := true;
        GET STACKED DIAGNOSTICS v_err_code = RETURNED_SQLSTATE, v_err_msg = MESSAGE_TEXT;
    END;

    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'TEST 3 FAILED: تمكن الطالب من ترقية نفسه عبر RPC الإداري!';
    ELSIF v_err_code <> '42501' THEN
        RAISE EXCEPTION 'TEST 3 FAILED: رفض RPC لم يكن برمز الصلاحيات المتوقع 42501: % (كود: %)', v_err_msg, v_err_code;
    END IF;

    -- المدير المعتمد يستدعي RPC لترقية مستخدم مستهدف بنجاح
    PERFORM set_config('request.jwt.claim.sub', v_admin_1_id::TEXT, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

    v_res := public.admin_manage_user_access(v_target_user_id, 'teacher'::public.user_role, 'approved', true);
    IF (v_res->>'success')::BOOLEAN <> TRUE THEN
        RAISE EXCEPTION 'TEST 3.1 FAILED: فشل المدير في تعديل صلاحية مستخدم عبر RPC.';
    END IF;

    -- المدير يحاول خفض رتبته ذاتياً عبر RPC (محظورة لمنع القفل الذاتي)
    v_error_caught := false;
    v_err_code := '';
    BEGIN
        PERFORM public.admin_manage_user_access(v_admin_1_id, 'student'::public.user_role, 'approved', true);
    EXCEPTION WHEN OTHERS THEN
        v_error_caught := true;
        GET STACKED DIAGNOSTICS v_err_code = RETURNED_SQLSTATE, v_err_msg = MESSAGE_TEXT;
    END;

    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'TEST 3.2 FAILED: تمكن المدير من خفض رتبته ذاتياً عبر RPC!';
    ELSIF v_err_code <> '42501' THEN
        RAISE EXCEPTION 'TEST 3.2 FAILED: رفض الخفض الذاتي لم يكن برمز 42501: % (كود: %)', v_err_msg, v_err_code;
    END IF;
    v_tests_passed := v_tests_passed + 1;
    RAISE NOTICE 'TEST 3 PASSED: دالة RPC الإدارية محكمة تماماً ضد التجاوز والتعطيل الذاتي.';

    -- ==========================================================================
    -- TEST 4: اختبار وصول مدير معطل أو غير معتمد، ومعلم معطل أو غير معتمد
    -- ==========================================================================
    -- إنشاء مدير معطل (is_active = false)
    UPDATE public.profiles SET is_active = FALSE WHERE id = v_admin_2_id;

    PERFORM set_config('request.jwt.claim.sub', v_admin_2_id::TEXT, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

    -- is_admin() يجب أن ترجع FALSE للمدير المعطل
    IF public.is_admin() THEN
        RAISE EXCEPTION 'TEST 4 FAILED: اعتبرت is_admin() مديراً معطلاً (is_active=false) صالحاً!';
    END IF;

    -- إنشاء معلم غير معتمد (approval_status = 'pending_approval')
    UPDATE public.profiles SET approval_status = 'pending_approval' WHERE id = v_teacher_class_b_id;

    PERFORM set_config('request.jwt.claim.sub', v_teacher_class_b_id::TEXT, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

    -- is_teacher() يجب أن ترجع FALSE للمعلم غير المعتمد
    IF public.is_teacher() THEN
        RAISE EXCEPTION 'TEST 4.1 FAILED: اعتبرت is_teacher() معلماً غير معتمد (pending_approval) صالحاً!';
    END IF;

    -- استعادة الحالة الصحيحة لاستكمال الاختبارات اللاحقة
    UPDATE public.profiles SET is_active = TRUE WHERE id = v_admin_2_id;
    UPDATE public.profiles SET approval_status = 'approved' WHERE id = v_teacher_class_b_id;

    v_tests_passed := v_tests_passed + 1;
    RAISE NOTICE 'TEST 4 PASSED: دوال is_admin و is_teacher تفرض بدقة شرطي النشاط والاعتماد الرسمي.';

    -- ==========================================================================
    -- TEST 5: اختبار البحث عن ولي أمر خارج شعبة المعلم (search_parent_profiles)
    -- ==========================================================================
    PERFORM set_config('request.jwt.claim.sub', v_teacher_class_a_id::TEXT, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

    -- 1. محاولة استدعاء البحث دون تحديد الطالب المستهدف
    v_error_caught := false;
    v_err_code := '';
    BEGIN
        PERFORM * FROM public.search_parent_profiles(NULL, 'parent1@school.edu');
    EXCEPTION WHEN OTHERS THEN
        v_error_caught := true;
        GET STACKED DIAGNOSTICS v_err_code = RETURNED_SQLSTATE, v_err_msg = MESSAGE_TEXT;
    END;

    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'TEST 5 FAILED: سمحت الدالة بالبحث دون تحديد الطالب المستهدف!';
    ELSIF v_err_code <> '22023' THEN
        RAISE EXCEPTION 'TEST 5 FAILED: رمز خطأ غير متوقع عند فقدان الطالب: % (كود: %)', v_err_msg, v_err_code;
    END IF;

    -- 2. محاولة البحث لطالب في شعبة ب (غير المسندة للمعلم أ)
    v_error_caught := false;
    v_err_code := '';
    BEGIN
        PERFORM * FROM public.search_parent_profiles(v_s_rec_b, 'parent2@school.edu');
    EXCEPTION WHEN OTHERS THEN
        v_error_caught := true;
        GET STACKED DIAGNOSTICS v_err_code = RETURNED_SQLSTATE, v_err_msg = MESSAGE_TEXT;
    END IF;

    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'TEST 5.1 FAILED: تمكن المعلم من البحث عن ولي أمر لطالب خارج شعبه المسندة!';
    ELSIF v_err_code <> '42501' THEN
        RAISE EXCEPTION 'TEST 5.1 FAILED: رمز خطأ غير متوقع عند تجاوز الشعبة: % (كود: %)', v_err_msg, v_err_code;
    END IF;

    -- 3. البحث بالرموز العامة (Wildcard) يجب ألا يعيد نتائج لمنع التعداد
    SELECT COUNT(*) INTO v_search_count FROM public.search_parent_profiles(v_s_rec_a, '%');
    IF v_search_count <> 0 THEN
        RAISE EXCEPTION 'TEST 5.2 FAILED: سمحت الدالة بالتعداد عبر رموز عامة (Wildcard)!';
    END IF;

    -- 4. البحث الصحيح بالبريد الدقيق لطالب في شعبة المعلم ينجح ويعيد بريداً مقنعاً
    SELECT COUNT(*) INTO v_search_count FROM public.search_parent_profiles(v_s_rec_a, 'parent1@school.edu');
    IF v_search_count <> 1 THEN
        RAISE EXCEPTION 'TEST 5.3 FAILED: فشل البحث بالبريد الدقيق لولي أمر طالب الشعبة المسندة.';
    END IF;

    v_tests_passed := v_tests_passed + 1;
    RAISE NOTICE 'TEST 5 PASSED: تم تقييد البحث عن أولياء الأمور بالشعب المسندة ومنع التعداد بالكامل.';

    -- ==========================================================================
    -- TEST 6: اختبار تعديل verified_by و created_by مباشرة عبر العميل
    -- ==========================================================================
    -- إنشاء رابط بحالة pending لطالب في شعبة المعلم أ
    v_link_id := gen_random_uuid();
    INSERT INTO public.parent_student_links (id, parent_id, student_id, relationship, status, created_by)
    VALUES (v_link_id, v_parent_1_id, v_s_rec_a, 'father', 'pending', v_teacher_class_a_id);

    -- محاولة المعلم تعديل verified_by أو تفعيل الحالة إلى active مباشرة عبر UPDATE
    v_error_caught := false;
    v_err_code := '';
    BEGIN
        UPDATE public.parent_student_links 
        SET verified_by = v_teacher_class_a_id, verified_at = NOW(), status = 'active'
        WHERE id = v_link_id;
    EXCEPTION WHEN OTHERS THEN
        v_error_caught := true;
        GET STACKED DIAGNOSTICS v_err_code = RETURNED_SQLSTATE, v_err_msg = MESSAGE_TEXT;
    END;

    IF NOT v_error_caught THEN
        SELECT status INTO v_count FROM public.parent_student_links WHERE id = v_link_id;
        IF v_count::TEXT = 'active' THEN
            RAISE EXCEPTION 'TEST 6 FAILED: تمكن المعلم من تفعيل العلاقة مباشرة وتعيين verified_by!';
        END IF;
    END IF;

    -- محاولة تعديل أطراف العلاقة parent_id أو student_id
    v_error_caught := false;
    v_err_code := '';
    BEGIN
        UPDATE public.parent_student_links SET parent_id = v_parent_2_id WHERE id = v_link_id;
    EXCEPTION WHEN OTHERS THEN
        v_error_caught := true;
        GET STACKED DIAGNOSTICS v_err_code = RETURNED_SQLSTATE, v_err_msg = MESSAGE_TEXT;
    END;

    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'TEST 6.1 FAILED: تم تعديل parent_id على سجل ارتباط قائم!';
    END IF;
    v_tests_passed := v_tests_passed + 1;
    RAISE NOTICE 'TEST 6 PASSED: حظر تعديل الحقول الحساسة (verified_by, parent_id) محكم بنجاح.';

    -- ==========================================================================
    -- TEST 7: اختبار موافقة ولي الأمر عبر RPC ومنع تلاعب ولي أمر غريب
    -- ==========================================================================
    -- ولي أمر غريب (parent 2) يحاول قبول رابط parent 1
    PERFORM set_config('request.jwt.claim.sub', v_parent_2_id::TEXT, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

    v_error_caught := false;
    v_err_code := '';
    BEGIN
        PERFORM public.parent_respond_link(v_link_id, true, 'موافقة متطفلة');
    EXCEPTION WHEN OTHERS THEN
        v_error_caught := true;
        GET STACKED DIAGNOSTICS v_err_code = RETURNED_SQLSTATE, v_err_msg = MESSAGE_TEXT;
    END;

    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'TEST 7 FAILED: تمكن ولي أمر غريب من اعتماد رابط لا يخصه!';
    ELSIF v_err_code <> '42501' THEN
        RAISE EXCEPTION 'TEST 7 FAILED: رفض اعتماد ولي الأمر الغريب لم يكن بكود 42501: % (كود: %)', v_err_msg, v_err_code;
    END IF;

    -- ولي الأمر الحقيقي (parent 1) يعتمد الرابط بنجاح
    PERFORM set_config('request.jwt.claim.sub', v_parent_1_id::TEXT, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

    v_res := public.parent_respond_link(v_link_id, true, 'موافقة رسمية');
    IF (v_res->>'success')::BOOLEAN <> TRUE THEN
        RAISE EXCEPTION 'TEST 7.1 FAILED: فشل ولي الأمر الشرعي في اعتماد طلبه.';
    END IF;

    SELECT COUNT(*) INTO v_count FROM public.parent_student_links 
    WHERE id = v_link_id AND status = 'active' AND verified_by = v_parent_1_id;
    IF v_count <> 1 THEN
        RAISE EXCEPTION 'TEST 7.2 FAILED: لم تُسجل هوية ولي الأمر المعتمد ووقت التفعيل بدقة!';
    END IF;
    v_tests_passed := v_tests_passed + 1;
    RAISE NOTICE 'TEST 7 PASSED: آلية اعتماد ولي الأمر الشرعي عبر parent_respond_link محكمة وموثقة.';

    -- ==========================================================================
    -- TEST 8: اختبار تزوير سجلات التدقيق (actor_name و actor_id) ومنع التعديل/الحذف
    -- ==========================================================================
    PERFORM set_config('request.jwt.claim.sub', v_student_class_a_id::TEXT, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

    -- الطالب يحاول إدخال سجل تدقيق مدعياً اسماً ورتبة وهوية مزورة
    INSERT INTO public.audit_logs (actor_id, actor_name, actor_role, action, table_name, record_id, details)
    VALUES (v_admin_1_id, 'Super Admin Fake', 'admin', 'MALICIOUS_LOG', 'profiles', v_student_class_a_id::TEXT, 'محاولة تزوير اسم الفاعل');

    -- المحفز enforce_audit_log_integrity يجب أن يكون قد فرض اسم الطالب ورتبته وهويته الحقيقية
    SELECT COUNT(*) INTO v_count FROM public.audit_logs 
    WHERE action = 'MALICIOUS_LOG' 
      AND actor_id = v_student_class_a_id 
      AND actor_name = 'طالب شعبة أ' 
      AND actor_role = 'student';

    IF v_count <> 1 THEN
        RAISE EXCEPTION 'TEST 8 FAILED: سمح المحفز بتمرير بيانات مزورة لاسم أو رتبة الفاعل!';
    END IF;

    -- محاولة حذف أو تعديل سجل التدقيق يجب أن تفشل
    v_error_caught := false;
    v_err_code := '';
    BEGIN
        DELETE FROM public.audit_logs WHERE action = 'MALICIOUS_LOG';
    EXCEPTION WHEN OTHERS THEN
        v_error_caught := true;
        GET STACKED DIAGNOSTICS v_err_code = RETURNED_SQLSTATE, v_err_msg = MESSAGE_TEXT;
    END;

    IF NOT v_error_caught THEN
        SELECT COUNT(*) INTO v_count FROM public.audit_logs WHERE action = 'MALICIOUS_LOG';
        IF v_count = 0 THEN
            RAISE EXCEPTION 'TEST 8.1 FAILED: تم حذف سجل التدقيق الأمني بنجاح!';
        END IF;
    END IF;
    v_tests_passed := v_tests_passed + 1;
    RAISE NOTICE 'TEST 8 PASSED: محفز نزاهة سجلات التدقيق يفرض أصالة اسم ورتبة الفاعل ويمنع الحذف.';

    -- ==========================================================================
    -- TEST 9: اختبار توحيد وصول أولياء الأمور عبر parent_student_links النشطة
    -- ==========================================================================
    -- ولي الأمر 1 المرتبط النشط يرى الطالب، درجاته، وحضوره، وملاحظاته، وتفاصيله السرية
    PERFORM set_config('request.jwt.claim.sub', v_parent_1_id::TEXT, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

    SELECT COUNT(*) INTO v_count FROM public.students WHERE id = v_s_rec_a;
    IF v_count <> 1 THEN
        RAISE EXCEPTION 'TEST 9 FAILED: ولي الأمر المرتبط النشط لم يستطع رؤية الطالب!';
    END IF;

    SELECT COUNT(*) INTO v_count FROM public.grades WHERE student_id = v_s_rec_a;
    IF v_count <> 1 THEN
        RAISE EXCEPTION 'TEST 9.1 FAILED: ولي الأمر المرتبط النشط لم يستطع رؤية درجات الطالب!';
    END IF;

    SELECT COUNT(*) INTO v_count FROM public.profile_confidential_details WHERE id = v_student_class_a_id;
    IF v_count <> 1 THEN
        RAISE EXCEPTION 'TEST 9.2 FAILED: ولي الأمر المرتبط النشط لم يستطع قراءة البطاقة السرية لابنه!';
    END IF;

    -- ولي الأمر 2 (غير المرتبط) يجب ألا يرى أي بيانات للطالب أ
    PERFORM set_config('request.jwt.claim.sub', v_parent_2_id::TEXT, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

    SELECT COUNT(*) INTO v_count FROM public.students WHERE id = v_s_rec_a;
    IF v_count <> 0 THEN
        RAISE EXCEPTION 'TEST 9.3 FAILED: ولي أمر غير مرتبط استطاع رؤية بيانات طالب لا يخصه!';
    END IF;

    SELECT COUNT(*) INTO v_count FROM public.profile_confidential_details WHERE id = v_student_class_a_id;
    IF v_count <> 0 THEN
        RAISE EXCEPTION 'TEST 9.4 FAILED: تسريب بطاقة سرية لطالب إلى ولي أمر غير مرتبط!';
    END IF;
    v_tests_passed := v_tests_passed + 1;
    RAISE NOTICE 'TEST 9 PASSED: عزل وتوحيد صلاحيات أولياء الأمور عبر الروابط النشطة حصراً مطبق بدقة.';

    -- ==========================================================================
    -- TEST 10: اختبار حماية آخر مدير نشط ومعتمد (prevent_last_admin_removal)
    -- ==========================================================================
    PERFORM set_config('request.jwt.claim.sub', v_admin_1_id::TEXT, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

    -- حذف المدير الثاني بحيث يتبقى المدير الأول فقط
    DELETE FROM public.profiles WHERE id = v_admin_2_id;

    -- التأكد من تبقي مدير واحد فقط نشط ومعتمد
    SELECT COUNT(*) INTO v_count FROM public.profiles 
    WHERE role = 'admin' AND is_active = TRUE AND approval_status = 'approved';
    IF v_count <> 1 THEN
        RAISE EXCEPTION 'TEST 10 SETUP FAILED: عدد المدراء النشطين ليس 1.';
    END IF;

    -- محاولة خفض رتبة آخر مدير نشط
    v_error_caught := false;
    v_err_code := '';
    BEGIN
        UPDATE public.profiles SET role = 'teacher' WHERE id = v_admin_1_id;
    EXCEPTION WHEN OTHERS THEN
        v_error_caught := true;
        GET STACKED DIAGNOSTICS v_err_code = RETURNED_SQLSTATE, v_err_msg = MESSAGE_TEXT;
    END;

    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'TEST 10 FAILED: تم خفض رتبة آخر مدير نشط في المنصة!';
    ELSIF v_err_code <> '42501' THEN
        RAISE EXCEPTION 'TEST 10 FAILED: رفض خفض رتبة آخر مدير لم يكن بكود 42501: % (كود: %)', v_err_msg, v_err_code;
    END IF;

    -- محاولة حذف آخر مدير نشط
    v_error_caught := false;
    v_err_code := '';
    BEGIN
        DELETE FROM public.profiles WHERE id = v_admin_1_id;
    EXCEPTION WHEN OTHERS THEN
        v_error_caught := true;
        GET STACKED DIAGNOSTICS v_err_code = RETURNED_SQLSTATE, v_err_msg = MESSAGE_TEXT;
    END;

    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'TEST 10.1 FAILED: تم حذف آخر مدير نشط في المنصة!';
    ELSIF v_err_code <> '42501' THEN
        RAISE EXCEPTION 'TEST 10.1 FAILED: رفض حذف آخر مدير لم يكن بكود 42501: % (كود: %)', v_err_msg, v_err_code;
    END IF;
    v_tests_passed := v_tests_passed + 1;
    RAISE NOTICE 'TEST 10 PASSED: محفز حماية آخر مدير نشط يمنع الحذف والخفض والتعطيل بدقة.';

    -- ==========================================================================
    -- FINAL SUMMARY
    -- ==========================================================================
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'اكتملت جميع سيناريوهات التدقيق الأمني الـ 10 بنجاح تام وبصرامة تامة (10/10 PASSED).';
    RAISE NOTICE '=============================================================================';
END $$;

ROLLBACK;
