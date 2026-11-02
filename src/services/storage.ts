/**
 * EduConnect Unified Storage & Database Engine
 * Supports two strict isolated modes:
 * 1. Production Mode: Powered by Supabase Auth & Cloud PostgreSQL with Row-Level Security.
 * 2. Demo Mode: Isolated local reactive database for evaluation and demonstration.
 */

import {
  UserProfile,
  SchoolClass,
  Subject,
  Teacher,
  TeacherSubject,
  Parent,
  Student,
  Exam,
  Grade,
  AttendanceRecord,
  AttendanceStatus,
  BehaviorNote,
  Assignment,
  Announcement,
  Conversation,
  Message,
  SchoolNotification,
  AuditLog,
  SchoolEvent,
  UserRole,
  ParentStudentLink,
  ParentRelationship,
  ParentLinkStatus
} from '../types/database';

import {
  INITIAL_CLASSES,
  INITIAL_SUBJECTS,
  INITIAL_PROFILES,
  INITIAL_TEACHERS,
  INITIAL_TEACHER_SUBJECTS,
  INITIAL_PARENTS,
  INITIAL_STUDENTS,
  INITIAL_EXAMS,
  INITIAL_GRADES,
  INITIAL_ATTENDANCE,
  INITIAL_BEHAVIOR_NOTES,
  INITIAL_ASSIGNMENTS,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_CONVERSATIONS,
  INITIAL_MESSAGES,
  INITIAL_NOTIFICATIONS,
  INITIAL_AUDIT_LOGS,
  INITIAL_SCHOOL_EVENTS,
  INITIAL_PARENT_STUDENT_LINKS
} from '../data/mockData';

import { supabase, testSupabaseConnection } from './supabaseClient';
import { cloudService } from './cloudService';

const STORAGE_KEY = 'educonnect_db_v1';
const CURRENT_USER_KEY = 'educonnect_active_user_v1';
const APP_MODE_KEY = 'educonnect_app_mode';

export type AppMode = 'demo' | 'production';

export interface DatabaseState {
  profiles: UserProfile[];
  classes: SchoolClass[];
  subjects: Subject[];
  teachers: Teacher[];
  teacher_subjects: TeacherSubject[];
  parents: Parent[];
  students: Student[];
  parent_student_links: ParentStudentLink[];
  exams: Exam[];
  grades: Grade[];
  attendance: AttendanceRecord[];
  behavior_notes: BehaviorNote[];
  assignments: Assignment[];
  announcements: Announcement[];
  conversations: Conversation[];
  messages: Message[];
  notifications: SchoolNotification[];
  audit_logs: AuditLog[];
  school_events: SchoolEvent[];
}

class EduConnectStorageService {
  private state: DatabaseState;
  private mode: AppMode = 'demo';
  private listeners: Set<() => void> = new Set();
  private authUser: UserProfile | null = null;
  private isCloudConnected: boolean = false;

  constructor() {
    this.mode = (localStorage.getItem(APP_MODE_KEY) as AppMode) || 'demo';
    this.state = this.loadState();
    this.initSupabaseAuthListener();
  }

  private loadState(): DatabaseState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (!parsed.parent_student_links) {
          parsed.parent_student_links = [...INITIAL_PARENT_STUDENT_LINKS];
        }
        return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse saved EduConnect database state:', e);
    }

    return {
      profiles: [...INITIAL_PROFILES],
      classes: [...INITIAL_CLASSES],
      subjects: [...INITIAL_SUBJECTS],
      teachers: [...INITIAL_TEACHERS],
      teacher_subjects: [...INITIAL_TEACHER_SUBJECTS],
      parents: [...INITIAL_PARENTS],
      students: [...INITIAL_STUDENTS],
      parent_student_links: [...INITIAL_PARENT_STUDENT_LINKS],
      exams: [...INITIAL_EXAMS],
      grades: [...INITIAL_GRADES],
      attendance: [...INITIAL_ATTENDANCE],
      behavior_notes: [...INITIAL_BEHAVIOR_NOTES],
      assignments: [...INITIAL_ASSIGNMENTS],
      announcements: [...INITIAL_ANNOUNCEMENTS],
      conversations: [...INITIAL_CONVERSATIONS],
      messages: [...INITIAL_MESSAGES],
      notifications: [...INITIAL_NOTIFICATIONS],
      audit_logs: [...INITIAL_AUDIT_LOGS],
      school_events: [...INITIAL_SCHOOL_EVENTS]
    };
  }

  private persistState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      this.notifyListeners();
    } catch (e) {
      console.error('Failed to persist EduConnect database state:', e);
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach((fn) => fn());
  }

  // App Mode Management
  public getAppMode(): AppMode {
    return this.mode;
  }

  public setAppMode(mode: AppMode) {
    this.mode = mode;
    localStorage.setItem(APP_MODE_KEY, mode);
    this.notifyListeners();
  }

  public async initSupabaseAuthListener() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await this.syncAuthUserProfile(session.user);
      }

      supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          await this.syncAuthUserProfile(session.user);
        } else {
          this.authUser = null;
          this.notifyListeners();
        }
      });

      const check = await testSupabaseConnection();
      this.isCloudConnected = check.connected;
    } catch (err) {
      console.warn('Supabase auth initialization error:', err);
    }
  }

  private async syncAuthUserProfile(user: any) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profile) {
      this.authUser = profile as UserProfile;
    } else {
      // Create user profile object from user metadata if table not yet populated
      this.authUser = {
        id: user.id,
        email: user.email || '',
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'مستخدم مدرسي',
        role: (user.user_metadata?.role as UserRole) || 'student',
        created_at: user.created_at || new Date().toISOString()
      };
    }
    this.notifyListeners();
  }

  public getAuthUser(): UserProfile | null {
    return this.authUser;
  }

  public getActiveUser(): UserProfile {
    if (this.mode === 'production' && this.authUser) {
      return this.authUser;
    }

    // In Demo Mode: fetch stored demo active user
    try {
      const raw = localStorage.getItem(CURRENT_USER_KEY);
      if (raw) {
        const user = JSON.parse(raw);
        const match = this.state.profiles.find((p) => p.id === user.id);
        if (match) return match;
      }
    } catch (e) {
      // ignore
    }
    return this.state.profiles[0]; // Admin by default
  }

  public setActiveUser(user: UserProfile) {
    if (this.mode === 'production') {
      console.warn('Cannot switch demo accounts in Production Mode.');
      return;
    }
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    this.notifyListeners();
  }

  public resetToFactory() {
    localStorage.removeItem(STORAGE_KEY);
    this.state = {
      profiles: [...INITIAL_PROFILES],
      classes: [...INITIAL_CLASSES],
      subjects: [...INITIAL_SUBJECTS],
      teachers: [...INITIAL_TEACHERS],
      teacher_subjects: [...INITIAL_TEACHER_SUBJECTS],
      parents: [...INITIAL_PARENTS],
      students: [...INITIAL_STUDENTS],
      parent_student_links: [...INITIAL_PARENT_STUDENT_LINKS],
      exams: [...INITIAL_EXAMS],
      grades: [...INITIAL_GRADES],
      attendance: [...INITIAL_ATTENDANCE],
      behavior_notes: [...INITIAL_BEHAVIOR_NOTES],
      assignments: [...INITIAL_ASSIGNMENTS],
      announcements: [...INITIAL_ANNOUNCEMENTS],
      conversations: [...INITIAL_CONVERSATIONS],
      messages: [...INITIAL_MESSAGES],
      notifications: [...INITIAL_NOTIFICATIONS],
      audit_logs: [...INITIAL_AUDIT_LOGS],
      school_events: [...INITIAL_SCHOOL_EVENTS]
    };
    this.persistState();
  }

  // AUDIT LOGGING
  public logAudit(actor: UserProfile, action: string, tableName: string, recordId: string, details: string, targetUserId?: string) {
    const entry: AuditLog = {
      id: 'audit-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      actor_id: actor.id,
      actor_name: actor.full_name,
      actor_role: actor.role,
      action,
      table_name: tableName,
      record_id: recordId,
      target_user_id: targetUserId,
      details,
      timestamp: new Date().toISOString()
    };
    this.state.audit_logs.unshift(entry);
    this.persistState();

    if (this.mode === 'production') {
      cloudService.insertAuditLog(entry).catch((err) => console.warn('Cloud audit log insert error:', err));
    }
  }

  // DATA GETTERS
  public getProfiles(): UserProfile[] {
    return this.state.profiles;
  }

  public getClasses(): SchoolClass[] {
    return this.state.classes;
  }

  public getSubjects(): Subject[] {
    return this.state.subjects;
  }

  public getTeachers(): (Teacher & { profile?: UserProfile })[] {
    return this.state.teachers.map((t) => ({
      ...t,
      profile: this.state.profiles.find((p) => p.id === t.profile_id)
    }));
  }

  public getTeacherSubjects(): TeacherSubject[] {
    return this.state.teacher_subjects.map((ts) => ({
      ...ts,
      subject: this.state.subjects.find((s) => s.id === ts.subject_id),
      class: this.state.classes.find((c) => c.id === ts.class_id)
    }));
  }

  public getParents(): (Parent & { profile?: UserProfile })[] {
    return this.state.parents.map((parent) => ({
      ...parent,
      profile: this.state.profiles.find((p) => p.id === parent.profile_id)
    }));
  }

  public getStudents(): (Student & { profile?: UserProfile; class?: SchoolClass; parent?: Parent & { profile?: UserProfile } })[] {
    return this.state.students.map((student) => {
      const parentObj = this.state.parents.find((p) => p.id === student.parent_id);
      return {
        ...student,
        profile: this.state.profiles.find((p) => p.id === student.profile_id),
        class: this.state.classes.find((c) => c.id === student.class_id),
        parent: parentObj
          ? {
              ...parentObj,
              profile: this.state.profiles.find((p) => p.id === parentObj.profile_id)
            }
          : undefined
      };
    });
  }

  public getStudentById(studentId: string) {
    const list = this.getStudents();
    return list.find((s) => s.id === studentId || s.profile_id === studentId);
  }

  // PARENT-STUDENT LINKS & RELATIONSHIPS
  public getParentStudentLinks(): ParentStudentLink[] {
    return this.state.parent_student_links.map((link) => ({
      ...link,
      parent_profile: this.state.profiles.find((p) => p.id === link.parent_id),
      student: this.getStudentById(link.student_id)
    }));
  }

  public getLinksForStudent(studentId: string): ParentStudentLink[] {
    return this.getParentStudentLinks().filter((l) => l.student_id === studentId);
  }

  public getLinksForParent(parentId: string): ParentStudentLink[] {
    return this.getParentStudentLinks().filter((l) => l.parent_id === parentId);
  }

  public searchParents(query: string, actor: UserProfile) {
    if (!['admin', 'teacher'].includes(actor.role)) {
      throw new Error('غير مصرح لك بالبحث في حسابات أولياء الأمور.');
    }
    const q = query.trim().toLowerCase();
    if (!q) return [];

    return this.state.profiles
      .filter((p) => p.role === 'parent' && p.is_active !== false)
      .filter((p) => p.email.toLowerCase().includes(q) || p.full_name.toLowerCase().includes(q) || p.id === q)
      .slice(0, 10)
      .map((p) => ({
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        role: p.role,
        avatar_url: p.avatar_url
      }));
  }

  public createParentStudentLink(
    data: {
      parent_id: string;
      student_id: string;
      relationship: ParentRelationship;
      notes?: string;
    },
    actor: UserProfile
  ): { success: boolean; link?: ParentStudentLink; error?: string } {
    const targetStudent = this.state.students.find((s) => s.id === data.student_id);
    if (!targetStudent) {
      return { success: false, error: 'الطالب غير موجود في النظام.' };
    }

    // Role check: If teacher, verify class boundary
    if (actor.role === 'teacher') {
      const teacher = this.state.teachers.find((t) => t.profile_id === actor.id);
      const teacherClasses = this.state.teacher_subjects
        .filter((ts) => ts.teacher_id === teacher?.id)
        .map((ts) => ts.class_id);

      if (!teacherClasses.includes(targetStudent.class_id)) {
        return {
          success: false,
          error: 'محاولة غير مصرح بها: لا يمكنك ربط ولي أمر بطالب خارج الشعب المسندة إليك.'
        };
      }
    } else if (actor.role !== 'admin') {
      return { success: false, error: 'غير مصرح لك بإنشاء علاقات أولياء الأمور.' };
    }

    // Check parent account
    const parentProfile = this.state.profiles.find((p) => p.id === data.parent_id);
    if (!parentProfile || parentProfile.role !== 'parent') {
      return { success: false, error: 'الحساب المختار ليس حساب ولي أمر معتمد في النظام.' };
    }

    // Check duplicate active or pending link
    const hasDuplicate = this.state.parent_student_links.some(
      (l) =>
        l.parent_id === data.parent_id &&
        l.student_id === data.student_id &&
        (l.status === 'pending' || l.status === 'active')
    );

    if (hasDuplicate) {
      return {
        success: false,
        error: 'توجد علاقة ارتباط نشطة أو قيد الاعتماد مسبقاً بين ولي الأمر وهذا الطالب.'
      };
    }

    const isDirectActive = actor.role === 'admin';
    const newLink: ParentStudentLink = {
      id: 'link-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      parent_id: data.parent_id,
      student_id: data.student_id,
      relationship: data.relationship,
      status: isDirectActive ? 'active' : 'pending',
      created_by: actor.id,
      created_at: new Date().toISOString(),
      verified_by: isDirectActive ? actor.id : undefined,
      verified_at: isDirectActive ? new Date().toISOString() : undefined,
      notes: data.notes || (isDirectActive ? 'ربط مباشر معتمد من الإدارة' : 'طلب ربط ولي أمر بانتظار الاعتماد')
    };

    this.state.parent_student_links.push(newLink);

    // Ensure parent record exists in parents table
    if (!this.state.parents.some((p) => p.profile_id === data.parent_id)) {
      this.state.parents.push({
        id: 'parent-' + Date.now(),
        profile_id: data.parent_id,
        relationship: data.relationship === 'other' ? 'guardian' : data.relationship
      });
    }

    this.logAudit(
      actor,
      'CREATE_PARENT_LINK',
      'parent_student_links',
      newLink.id,
      `إنشاء علاقة ربط ولي أمر (${parentProfile.full_name}) بالطالب (${targetStudent.student_number}) بحالة ${newLink.status}`,
      parentProfile.id
    );

    this.persistState();
    return { success: true, link: newLink };
  }

  public verifyParentStudentLink(linkId: string, actor: UserProfile, notes?: string): { success: boolean; error?: string } {
    const link = this.state.parent_student_links.find((l) => l.id === linkId);
    if (!link) return { success: false, error: 'الرابط غير موجود.' };

    // Security Rule: Teacher CANNOT directly activate/verify link! Only Parent or Admin.
    if (actor.role === 'teacher') {
      return { success: false, error: 'رفض أمني: لا يملك المعلم صلاحية تفعيل العلاقة مباشرة. يتطلب التفعيل موافقة ولي الأمر نفسه أو اعتماد الإدارة.' };
    }

    if (actor.role !== 'admin' && actor.id !== link.parent_id) {
      return { success: false, error: 'غير مصرح لك باعتماد هذا الرابط.' };
    }

    link.status = 'active';
    link.verified_by = actor.id;
    link.verified_at = new Date().toISOString();
    if (notes) link.notes = (link.notes ? link.notes + ' | ' : '') + 'اعتماد: ' + notes;

    this.logAudit(
      actor,
      'VERIFY_PARENT_LINK',
      'parent_student_links',
      link.id,
      `اعتماد وتفعيل ارتباط ولي الأمر رسمياً`,
      link.parent_id
    );

    this.persistState();
    return { success: true };
  }

  public rejectParentStudentLink(linkId: string, actor: UserProfile, reason?: string): { success: boolean; error?: string } {
    const link = this.state.parent_student_links.find((l) => l.id === linkId);
    if (!link) return { success: false, error: 'الرابط غير موجود.' };

    if (actor.role !== 'admin' && actor.id !== link.parent_id) {
      return { success: false, error: 'رفض أمني: رفض الطلب مقتصر على ولي الأمر المعني أو الإدارة.' };
    }

    link.status = 'rejected';
    link.notes = (link.notes ? link.notes + ' | ' : '') + 'مرفوض: ' + (reason || 'عدم استيفاء شروط الإثبات');

    this.logAudit(
      actor,
      'REJECT_PARENT_LINK',
      'parent_student_links',
      link.id,
      `رفض طلب ارتباط ولي الأمر: ${reason || ''}`,
      link.parent_id
    );

    this.persistState();
    return { success: true };
  }

  public revokeParentStudentLink(linkId: string, actor: UserProfile, reason?: string): { success: boolean; error?: string } {
    const link = this.state.parent_student_links.find((l) => l.id === linkId);
    if (!link) return { success: false, error: 'الرابط غير موجود.' };

    if (actor.role === 'teacher') {
      const targetStudent = this.state.students.find((s) => s.id === link.student_id);
      const teacher = this.state.teachers.find((t) => t.profile_id === actor.id);
      const teacherClasses = this.state.teacher_subjects
        .filter((ts) => ts.teacher_id === teacher?.id)
        .map((ts) => ts.class_id);

      if (!targetStudent || !teacherClasses.includes(targetStudent.class_id)) {
        return { success: false, error: 'لا يمكنك إلغاء ربط طالب خارج شعبك.' };
      }
    } else if (actor.role !== 'admin') {
      return { success: false, error: 'غير مصرح لك بإلغاء الرابط.' };
    }

    link.status = 'revoked';
    link.revoked_by = actor.id;
    link.revoked_at = new Date().toISOString();
    link.notes = (link.notes ? link.notes + ' | ' : '') + 'إلغاء: ' + (reason || 'بواسطة الهيئة الإدارية/التدريسية');

    this.logAudit(
      actor,
      'REVOKE_PARENT_LINK',
      'parent_student_links',
      link.id,
      `إلغاء ارتباط ولي الأمر بالطالب: ${reason || ''}`,
      link.parent_id
    );

    this.persistState();
    return { success: true };
  }

  // USER APPROVAL & ROLE MANAGEMENT (With Last Admin Protection)
  public approveUserProfile(actor: UserProfile, targetUserId: string, classId?: string): { success: boolean; error?: string } {
    const profile = this.state.profiles.find((p) => p.id === targetUserId);
    if (!profile) return { success: false, error: 'المستخدم غير موجود.' };

    if (actor.role === 'teacher') {
      if (profile.role !== 'student') {
        return { success: false, error: 'المعلم لا يستطيع اعتماد إلا حسابات الطلاب في شعبه المسندة.' };
      }
      if (classId) {
        const teacher = this.state.teachers.find((t) => t.profile_id === actor.id);
        const teacherClasses = this.state.teacher_subjects
          .filter((ts) => ts.teacher_id === teacher?.id)
          .map((ts) => ts.class_id);
        if (!teacherClasses.includes(classId)) {
          return { success: false, error: 'لا يمكنك اعتماد طالب في شعبة غير مسندة إليك.' };
        }
      }
    } else if (actor.role !== 'admin') {
      return { success: false, error: 'غير مصرح لك باعتماد الحسابات.' };
    }

    profile.approval_status = 'approved';
    profile.is_active = true;

    // If student, ensure student record exists
    if (profile.role === 'student' && !this.state.students.some((s) => s.profile_id === targetUserId)) {
      this.state.students.push({
        id: 'student-' + Date.now(),
        profile_id: targetUserId,
        student_number: '2026-' + Math.floor(1100 + Math.random() * 800),
        class_id: classId || 'class-11-sci-a',
        birth_date: '2009-01-01',
        enrollment_date: new Date().toISOString().split('T')[0],
        status: 'active'
      });
    }

    this.logAudit(
      actor,
      'APPROVE_USER',
      'profiles',
      profile.id,
      `اعتماد وتفعيل حساب المستخدم ${profile.full_name} (${profile.role})`,
      profile.id
    );

    this.persistState();
    return { success: true };
  }

  public updateUserRole(actor: UserProfile, targetUserId: string, newRole: UserRole): { success: boolean; error?: string } {
    if (actor.role !== 'admin') {
      return { success: false, error: 'تعديل الأدوار والصلاحيات مقتصر حصراً على مسؤولي النظام (Admin).' };
    }

    const profile = this.state.profiles.find((p) => p.id === targetUserId);
    if (!profile) return { success: false, error: 'المستخدم غير موجود.' };

    // STRICT CHECK: PREVENT DEMOTING OR REMOVING LAST ACTIVE ADMIN
    if (profile.role === 'admin' && newRole !== 'admin') {
      const otherActiveAdmins = this.state.profiles.filter(
        (p) => p.role === 'admin' && p.id !== targetUserId && p.is_active !== false && p.approval_status !== 'rejected'
      );
      if (otherActiveAdmins.length === 0) {
        return {
          success: false,
          error: 'إجراء أمني محظور: لا يمكن حذف أو خفض رتبة آخر مسؤول نظام نشط في المنصة.'
        };
      }
    }

    const oldRole = profile.role;
    profile.role = newRole;

    // Handle auxiliary records
    if (newRole === 'teacher' && !this.state.teachers.some((t) => t.profile_id === targetUserId)) {
      this.state.teachers.push({
        id: 'teacher-' + Date.now(),
        profile_id: targetUserId,
        specialization: 'المواد العلمية',
        hire_date: new Date().toISOString().split('T')[0]
      });
    }

    if (newRole === 'parent' && !this.state.parents.some((p) => p.profile_id === targetUserId)) {
      this.state.parents.push({
        id: 'parent-' + Date.now(),
        profile_id: targetUserId,
        relationship: 'guardian'
      });
    }

    const actionCode = newRole === 'admin' ? 'ASSIGN_ADMIN' : newRole === 'teacher' ? 'ASSIGN_TEACHER' : 'UPDATE_USER_ROLE';
    this.logAudit(
      actor,
      actionCode,
      'profiles',
      profile.id,
      `تغيير رتبة المستخدم ${profile.full_name} من ${oldRole} إلى ${newRole}`,
      profile.id
    );

    this.persistState();
    return { success: true };
  }

  public assignStudentClass(actor: UserProfile, studentId: string, classId: string): { success: boolean; error?: string } {
    const student = this.state.students.find((s) => s.id === studentId);
    if (!student) return { success: false, error: 'الطالب غير موجود.' };

    if (actor.role === 'teacher') {
      const teacher = this.state.teachers.find((t) => t.profile_id === actor.id);
      const teacherClasses = this.state.teacher_subjects
        .filter((ts) => ts.teacher_id === teacher?.id)
        .map((ts) => ts.class_id);

      if (!teacherClasses.includes(classId)) {
        return { success: false, error: 'لا يمكنك نقل طالب إلى شعبة غير مسندة إليك.' };
      }
    } else if (actor.role !== 'admin') {
      return { success: false, error: 'غير مصرح.' };
    }

    const oldClassId = student.class_id;
    student.class_id = classId;
    const targetClass = this.state.classes.find((c) => c.id === classId);

    this.logAudit(
      actor,
      'LINK_STUDENT_CLASS',
      'students',
      student.id,
      `نقل/تسكين الطالب في ${targetClass?.name || classId} (من ${oldClassId})`,
      student.profile_id
    );

    this.persistState();
    return { success: true };
  }

  public updateUserProfile(
    actor: UserProfile,
    targetUserId: string,
    updates: Partial<UserProfile>
  ): { success: boolean; error?: string } {
    if (actor.role !== 'admin' && actor.id !== targetUserId) {
      return { success: false, error: 'غير مصرح بتعديل بيانات المستخدم.' };
    }

    const profile = this.state.profiles.find((p) => p.id === targetUserId);
    if (!profile) return { success: false, error: 'المستخدم غير موجود.' };

    // If attempting to alter role, must use updateUserRole
    if (updates.role && updates.role !== profile.role) {
      if (actor.role !== 'admin') {
        return { success: false, error: 'لا يمكنك ترقية رتبتك بنفسك.' };
      }
      return this.updateUserRole(actor, targetUserId, updates.role);
    }

    Object.assign(profile, updates);

    this.logAudit(
      actor,
      'UPDATE_USER_DATA',
      'profiles',
      profile.id,
      `تحديث بيانات المستخدم ${profile.full_name}`,
      profile.id
    );

    this.persistState();
    return { success: true };
  }

  // EXAMS & GRADES
  public getExams(classId?: string): Exam[] {
    let list = this.state.exams;
    if (classId) list = list.filter((e) => e.class_id === classId);
    return list;
  }

  public saveExam(exam: Partial<Exam>, actor: UserProfile): Exam {
    const isNew = !exam.id;
    const finalExam: Exam = {
      id: exam.id || 'exam-' + Date.now(),
      title: exam.title || 'امتحان جديد',
      subject_id: exam.subject_id || this.state.subjects[0].id,
      subject_name: this.state.subjects.find((s) => s.id === exam.subject_id)?.name,
      class_id: exam.class_id || this.state.classes[0].id,
      teacher_id: exam.teacher_id || 'teacher-shami',
      teacher_name: exam.teacher_name || actor.full_name,
      date: exam.date || new Date().toISOString().split('T')[0],
      max_score: exam.max_score || 100,
      weight_percentage: exam.weight_percentage || 20,
      exam_type: exam.exam_type || 'first_month',
      status: exam.status || 'draft',
      term: exam.term || 'first_term',
      description: exam.description || '',
      created_at: exam.created_at || new Date().toISOString()
    };

    if (isNew) {
      this.state.exams.push(finalExam);
      this.logAudit(actor, 'إنشاء امتحان', 'exams', finalExam.id, `إنشاء امتحان ${finalExam.title}`);
    } else {
      this.state.exams = this.state.exams.map((e) => (e.id === finalExam.id ? finalExam : e));
      this.logAudit(actor, 'تعديل امتحان', 'exams', finalExam.id, `تعديل امتحان ${finalExam.title}`);
    }

    this.persistState();

    if (this.mode === 'production') {
      cloudService.saveExam(finalExam).catch((err) => console.warn('Supabase saveExam error:', err));
    }

    return finalExam;
  }

  public publishExam(examId: string, actor: UserProfile) {
    this.state.exams = this.state.exams.map((e) => (e.id === examId ? { ...e, status: 'published' as const } : e));
    const targetExam = this.state.exams.find((e) => e.id === examId);

    if (targetExam) {
      this.logAudit(actor, 'نشر نتائج امتحان', 'exams', examId, `تم اعتماد ونشر درجات ${targetExam.title}`);

      // Broadcast notifications
      this.state.students.forEach((student) => {
        const studentProfile = this.state.profiles.find((p) => p.id === student.profile_id);
        const parentObj = this.state.parents.find((p) => p.id === student.parent_id);

        if (studentProfile) {
          this.state.notifications.unshift({
            id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
            user_id: studentProfile.id,
            title: 'نشر درجات جديدة',
            message: `تم نشر درجات ${targetExam.title} (${targetExam.subject_name}).`,
            type: 'grade',
            link_target: 'grades',
            is_read: false,
            created_at: new Date().toISOString()
          });
        }

        if (parentObj) {
          this.state.notifications.unshift({
            id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
            user_id: parentObj.profile_id,
            title: 'نتيجة امتحان جديدة لابنك/ابنتك',
            message: `تم اعتماد ونشر نتائج ${targetExam.title} للطالب ${studentProfile?.full_name}.`,
            type: 'grade',
            link_target: 'grades',
            is_read: false,
            created_at: new Date().toISOString()
          });
        }
      });
    }

    this.persistState();

    if (this.mode === 'production') {
      cloudService.publishExam(examId).catch((err) => console.warn('Supabase publishExam error:', err));
    }
  }

  public getGrades(examId?: string, studentId?: string): Grade[] {
    let list = this.state.grades;
    if (examId) list = list.filter((g) => g.exam_id === examId);
    if (studentId) list = list.filter((g) => g.student_id === studentId);
    return list;
  }

  public saveGrade(grade: Partial<Grade>, actor: UserProfile) {
    const existingIndex = this.state.grades.findIndex(
      (g) => g.exam_id === grade.exam_id && g.student_id === grade.student_id
    );

    const updated: Grade = {
      id: grade.id || (existingIndex >= 0 ? this.state.grades[existingIndex].id : 'grade-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4)),
      exam_id: grade.exam_id!,
      student_id: grade.student_id!,
      score: Number(grade.score ?? 0),
      is_absent: !!grade.is_absent,
      feedback: grade.feedback || '',
      recorded_by: actor.id,
      updated_at: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      this.state.grades[existingIndex] = updated;
    } else {
      this.state.grades.push(updated);
    }

    this.logAudit(actor, 'تسجيل درجات', 'grades', updated.id, `تحديث علامة الطالب في الامتحان ${grade.exam_id}`);
    this.persistState();
  }

  public saveBatchGrades(examId: string, gradesList: { student_id: string; score: number; is_absent?: boolean; feedback?: string }[], actor: UserProfile) {
    gradesList.forEach((item) => {
      this.saveGrade({
        exam_id: examId,
        student_id: item.student_id,
        score: item.score,
        is_absent: !!item.is_absent,
        feedback: item.feedback
      }, actor);
    });

    if (this.mode === 'production') {
      const records = gradesList.map((item) => ({
        exam_id: examId,
        student_id: item.student_id,
        score: item.score,
        is_absent: !!item.is_absent,
        feedback: item.feedback,
        recorded_by: actor.id,
        updated_at: new Date().toISOString()
      }));
      cloudService.saveBatchGrades(records).catch((err) => console.warn('Supabase batch grades error:', err));
    }
  }

  // DAILY ATTENDANCE (One record per student per school day)
  public getAttendance(date?: string, classId?: string, studentId?: string): AttendanceRecord[] {
    let list = this.state.attendance;
    if (date) list = list.filter((a) => a.date === date);
    if (classId) list = list.filter((a) => a.class_id === classId);
    if (studentId) list = list.filter((a) => a.student_id === studentId);
    return list;
  }

  public saveAttendance(record: Partial<AttendanceRecord>, actor: UserProfile): AttendanceRecord {
    // 1. Permission checks
    if (actor.role === 'student' || actor.role === 'parent') {
      throw new Error('محاولة غير مصرح بها: لا يملك الطالب أو ولي الأمر صلاحية تعديل سجلات الحضور.');
    }

    const classId = record.class_id || 'class-11-sci-a';

    if (actor.role === 'teacher') {
      const teacherObj = this.state.teachers.find((t) => t.profile_id === actor.id);
      const isAssigned = teacherObj && this.state.teacher_subjects.some(
        (ts) => ts.teacher_id === teacherObj.id && ts.class_id === classId
      );
      if (!isAssigned) {
        throw new Error('محاولة غير مصرح بها: لا يجوز للمعلم تسجيل حضور أو غياب شعبة غير مسندة إليه.');
      }
    }

    const date = record.date || new Date().toISOString().split('T')[0];
    const studentId = record.student_id!;

    // 2. Prevent duplicates: Exactly one record per student per day
    const existingIndex = this.state.attendance.findIndex(
      (a) => a.student_id === studentId && a.date === date
    );

    const now = new Date().toISOString();
    const updated: AttendanceRecord = {
      id: record.id || (existingIndex >= 0 ? this.state.attendance[existingIndex].id : 'att-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4)),
      student_id: studentId,
      class_id: classId,
      date,
      status: record.status || 'present',
      reason: record.reason || '',
      notes: record.notes || '',
      recorded_by: existingIndex >= 0 ? this.state.attendance[existingIndex].recorded_by : actor.id,
      recorded_at: existingIndex >= 0 ? this.state.attendance[existingIndex].recorded_at : now,
      updated_by: actor.id,
      updated_at: now
    };

    if (existingIndex >= 0) {
      this.state.attendance[existingIndex] = updated;
    } else {
      this.state.attendance.push(updated);
    }

    if (updated.status === 'absent' || updated.status === 'late') {
      const student = this.state.students.find((s) => s.id === updated.student_id);
      const studentProfile = this.state.profiles.find((p) => p.id === student?.profile_id);
      const parent = this.state.parents.find((p) => p.id === student?.parent_id);
      if (parent) {
        this.state.notifications.unshift({
          id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
          user_id: parent.profile_id,
          title: updated.status === 'absent' ? 'إشعار غياب مدرسي' : 'إشعار تأخر صباحي',
          message: `تم تسجيل ${updated.status === 'absent' ? 'غياب' : 'تأخر'} الطالب ${studentProfile?.full_name} لليوم الدراسي بتاريخ ${updated.date}. ${updated.reason ? `السبب: ${updated.reason}` : ''}`,
          type: 'attendance',
          link_target: 'attendance',
          is_read: false,
          created_at: now
        });
      }
    }

    this.persistState();
    return updated;
  }

  public saveBatchAttendance(
    classId: string,
    date: string,
    records: { student_id: string; status: AttendanceStatus; reason?: string; notes?: string }[],
    actor: UserProfile
  ) {
    if (actor.role === 'student' || actor.role === 'parent') {
      throw new Error('غير مصرح لك بتسجيل الحضور والغياب.');
    }

    if (actor.role === 'teacher') {
      const teacherObj = this.state.teachers.find((t) => t.profile_id === actor.id);
      const isAssigned = teacherObj && this.state.teacher_subjects.some(
        (ts) => ts.teacher_id === teacherObj.id && ts.class_id === classId
      );
      if (!isAssigned) {
        throw new Error('غير مصرح لك بتسجيل حضور شعبة دراسية غير مسندة إليك.');
      }
    }

    records.forEach((r) => {
      this.saveAttendance({
        class_id: classId,
        date,
        student_id: r.student_id,
        status: r.status,
        reason: r.reason,
        notes: r.notes
      }, actor);
    });

    this.logAudit(
      actor,
      'تسجيل الحضور اليومي',
      'attendance',
      `${classId}-${date}`,
      `تسجيل الحضور والغياب اليومي للشعبة ${classId} بتاريخ ${date}`
    );
    this.persistState();
  }

  // BEHAVIOR & ACADEMIC NOTES
  public getBehaviorNotes(studentId?: string, userRole?: UserRole): BehaviorNote[] {
    let list = this.state.behavior_notes;
    if (studentId) list = list.filter((n) => n.student_id === studentId);
    if (userRole === 'parent' || userRole === 'student') {
      list = list.filter((n) => n.is_visible_to_parent);
    }
    return list;
  }

  public saveBehaviorNote(note: Partial<BehaviorNote>, actor: UserProfile) {
    const isNew = !note.id;
    const student = this.state.students.find((s) => s.id === note.student_id);
    const studentProfile = this.state.profiles.find((p) => p.id === student?.profile_id);

    const finalNote: BehaviorNote = {
      id: note.id || 'note-' + Date.now(),
      student_id: note.student_id!,
      student_name: studentProfile?.full_name || note.student_name,
      teacher_id: note.teacher_id || actor.id,
      teacher_name: actor.full_name,
      type: note.type || 'academic',
      severity: note.severity || 'low',
      status: note.status || 'open',
      title: note.title || 'ملاحظة جديدة',
      description: note.description || '',
      date: note.date || new Date().toISOString().split('T')[0],
      is_visible_to_parent: note.is_visible_to_parent ?? true,
      action_taken: note.action_taken || ''
    };

    if (isNew) {
      this.state.behavior_notes.unshift(finalNote);
      this.logAudit(actor, 'إضافة ملاحظة', 'behavior_notes', finalNote.id, `إضافة ملاحظة ${finalNote.type} للطالب ${finalNote.student_name}`);
    } else {
      this.state.behavior_notes = this.state.behavior_notes.map((n) => (n.id === finalNote.id ? finalNote : n));
    }

    this.persistState();

    if (this.mode === 'production') {
      cloudService.saveBehaviorNote(finalNote).catch((err) => console.warn('Supabase behavior note error:', err));
    }
  }

  // ASSIGNMENTS
  public getAssignments(classId?: string): Assignment[] {
    let list = this.state.assignments;
    if (classId) list = list.filter((a) => a.class_id === classId);
    return list;
  }

  public saveAssignment(assign: Partial<Assignment>, actor: UserProfile) {
    const isNew = !assign.id;
    const finalAssign: Assignment = {
      id: assign.id || 'assign-' + Date.now(),
      title: assign.title || 'واجب جديد',
      description: assign.description || '',
      subject_id: assign.subject_id || this.state.subjects[0].id,
      subject_name: this.state.subjects.find((s) => s.id === assign.subject_id)?.name,
      class_id: assign.class_id || this.state.classes[0].id,
      teacher_id: assign.teacher_id || actor.id,
      teacher_name: actor.full_name,
      assigned_date: assign.assigned_date || new Date().toISOString().split('T')[0],
      due_date: assign.due_date || new Date().toISOString().split('T')[0],
      max_points: assign.max_points || 10,
      attachment_url: assign.attachment_url,
      status: assign.status || 'active'
    };

    if (isNew) {
      this.state.assignments.unshift(finalAssign);
      this.logAudit(actor, 'إضافة واجب مدرسي', 'assignments', finalAssign.id, `إضافة واجب ${finalAssign.title}`);
    } else {
      this.state.assignments = this.state.assignments.map((a) => (a.id === finalAssign.id ? finalAssign : a));
    }

    this.persistState();

    if (this.mode === 'production') {
      cloudService.saveAssignment(finalAssign).catch((err) => console.warn('Supabase save assignment error:', err));
    }
  }

  // ANNOUNCEMENTS
  public getAnnouncements(): Announcement[] {
    return this.state.announcements;
  }

  public saveAnnouncement(announcement: Partial<Announcement>, actor: UserProfile) {
    const isNew = !announcement.id;
    const finalAnn: Announcement = {
      id: announcement.id || 'ann-' + Date.now(),
      title: announcement.title || 'إعلان جديد',
      content: announcement.content || '',
      author_id: actor.id,
      author_name: actor.full_name,
      target_audience: announcement.target_audience || 'all',
      category: announcement.category || 'general',
      is_pinned: !!announcement.is_pinned,
      published_at: new Date().toISOString()
    };

    if (isNew) {
      this.state.announcements.unshift(finalAnn);
      this.logAudit(actor, 'نشر إعلان', 'announcements', finalAnn.id, `نشر إعلان: ${finalAnn.title}`);
    } else {
      this.state.announcements = this.state.announcements.map((a) => (a.id === finalAnn.id ? finalAnn : a));
    }

    this.persistState();

    if (this.mode === 'production') {
      cloudService.saveAnnouncement(finalAnn).catch((err) => console.warn('Supabase save announcement error:', err));
    }
  }

  public togglePinAnnouncement(id: string) {
    this.state.announcements = this.state.announcements.map((a) => (a.id === id ? { ...a, is_pinned: !a.is_pinned } : a));
    this.persistState();
  }

  // MESSAGING & CONVERSATIONS
  public getConversations(userId: string): Conversation[] {
    return this.state.conversations.filter((c) => c.participant_ids.includes(userId));
  }

  public getMessages(conversationId: string): Message[] {
    return this.state.messages.filter((m) => m.conversation_id === conversationId);
  }

  public sendMessage(conversationId: string, content: string, actor: UserProfile): Message {
    const newMsg: Message = {
      id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      conversation_id: conversationId,
      sender_id: actor.id,
      sender_name: actor.full_name,
      sender_role: actor.role,
      content,
      created_at: new Date().toISOString(),
      is_read: false
    };

    this.state.messages.push(newMsg);

    this.state.conversations = this.state.conversations.map((c) => {
      if (c.id === conversationId) {
        return {
          ...c,
          last_message: content,
          last_message_at: newMsg.created_at
        };
      }
      return c;
    });

    this.persistState();

    if (this.mode === 'production') {
      cloudService.sendMessage(conversationId, content, actor.id).catch((err) => console.warn('Supabase send message error:', err));
    }

    return newMsg;
  }

  public startConversation(participantIds: string[], subjectTopic: string, initialMessage: string, actor: UserProfile, studentId?: string): Conversation {
    const allParticipants = Array.from(new Set([actor.id, ...participantIds]));
    const student = studentId ? this.getStudentById(studentId) : undefined;

    const newConv: Conversation = {
      id: 'conv-' + Date.now(),
      subject_topic: subjectTopic,
      student_id: studentId,
      student_name: student?.profile?.full_name,
      participant_ids: allParticipants,
      last_message: initialMessage,
      last_message_at: new Date().toISOString(),
      unread_count: 0
    };

    this.state.conversations.unshift(newConv);
    this.sendMessage(newConv.id, initialMessage, actor);
    this.persistState();
    return newConv;
  }

  // NOTIFICATIONS
  public getNotifications(userId: string): SchoolNotification[] {
    return this.state.notifications.filter((n) => n.user_id === userId);
  }

  public markNotificationAsRead(id: string) {
    this.state.notifications = this.state.notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n));
    this.persistState();

    if (this.mode === 'production') {
      cloudService.markNotificationRead(id).catch((err) => console.warn('Supabase mark notification error:', err));
    }
  }

  public markAllNotificationsAsRead(userId: string) {
    this.state.notifications = this.state.notifications.map((n) => (n.user_id === userId ? { ...n, is_read: true } : n));
    this.persistState();
  }

  // AUDIT LOGS & EVENTS
  public getAuditLogs(): AuditLog[] {
    return this.state.audit_logs;
  }

  public getSchoolEvents(): SchoolEvent[] {
    return this.state.school_events;
  }

  public addSchoolEvent(event: Partial<SchoolEvent>, actor: UserProfile) {
    const newEvent: SchoolEvent = {
      id: 'ev-' + Date.now(),
      title: event.title || 'حدث مدرسي',
      date: event.date || new Date().toISOString().split('T')[0],
      end_date: event.end_date,
      type: event.type || 'activity',
      description: event.description || '',
      target_role: event.target_role || 'all'
    };
    this.state.school_events.push(newEvent);
    this.logAudit(actor, 'إضافة حدث للتقويم', 'school_events', newEvent.id, `إضافة حدث: ${newEvent.title}`);
    this.persistState();

    if (this.mode === 'production') {
      cloudService.saveSchoolEvent(newEvent).catch((err) => console.warn('Supabase save school event error:', err));
    }
  }
}

export const storage = new EduConnectStorageService();
