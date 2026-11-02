/**
 * EduConnect Database Types & Data Models
 * Designed for PostgreSQL / Supabase with Role-Based Access Control
 */

export type UserRole = 'admin' | 'teacher' | 'parent' | 'student';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  avatar_url?: string;
  national_id?: string;
  approval_status?: 'approved' | 'pending_approval' | 'rejected' | 'suspended';
  is_active?: boolean;
  created_at: string;
}

export type ParentLinkStatus = 'pending' | 'active' | 'rejected' | 'revoked';
export type ParentRelationship = 'father' | 'mother' | 'guardian' | 'other';

export interface ParentStudentLink {
  id: string;
  parent_id: string; // Profile ID of parent
  student_id: string; // Student ID
  relationship: ParentRelationship;
  status: ParentLinkStatus;
  created_by?: string;
  created_at: string;
  verified_by?: string;
  verified_at?: string;
  revoked_by?: string;
  revoked_at?: string;
  notes?: string;
  // Hydrated references
  parent_profile?: UserProfile;
  student?: Student;
}

export interface SchoolClass {
  id: string;
  name: string; // e.g. "الصف الحادي عشر العلمي (أ)"
  grade_level: number; // 11
  section: string; // "أ" or "ب"
  academic_year: string; // "2026/2027"
  advisor_id?: string; // Teacher ID
  room_number?: string;
}

export interface Subject {
  id: string;
  name: string; // e.g. "الفيزياء المتقدمة"
  code: string; // "PHYS-11"
  credit_hours: number;
  max_score: number; // 100
  pass_score: number; // 50
  color: string;
}

export interface Teacher {
  id: string;
  profile_id: string;
  profile?: UserProfile;
  specialization: string;
  office_room?: string;
  hire_date?: string;
}

export interface TeacherSubject {
  id: string;
  teacher_id: string;
  subject_id: string;
  class_id: string;
  subject?: Subject;
  class?: SchoolClass;
}

export interface Parent {
  id: string;
  profile_id: string;
  profile?: UserProfile;
  relationship: 'father' | 'mother' | 'guardian';
  occupation?: string;
}

export interface Student {
  id: string;
  profile_id: string;
  profile?: UserProfile;
  student_number: string; // e.g. "2026-1101"
  class_id: string;
  class?: SchoolClass;
  parent_id?: string;
  parent?: Parent;
  parent_links?: ParentStudentLink[];
  birth_date: string;
  blood_type?: string;
  enrollment_date: string;
  status: 'active' | 'suspended' | 'graduated';
}

export type ExamType = 'first_month' | 'midterm' | 'second_month' | 'final' | 'quiz' | 'practical';
export type ExamStatus = 'draft' | 'submitted' | 'approved' | 'published';
export type ExamDeliveryStatus = 'completed' | 'upcoming' | 'draft';

export interface Exam {
  id: string;
  title: string;
  subject_id: string;
  subject_name?: string;
  class_id: string;
  teacher_id: string;
  teacher_name?: string;
  date: string;
  max_score: number;
  weight_percentage: number; // e.g. 20%
  exam_type: ExamType;
  status: ExamStatus;
  delivery_status?: ExamDeliveryStatus; // 'completed' (تم التقديم), 'upcoming' (قادم), 'draft' (مسودة)
  term: 'first_term' | 'second_term';
  description?: string;
  created_at: string;
}

export interface Grade {
  id: string;
  exam_id: string;
  student_id: string;
  score: number;
  is_absent: boolean;
  feedback?: string;
  recorded_by: string;
  updated_at: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface AttendanceRecord {
  id: string;
  student_id: string;
  class_id: string;
  date: string; // YYYY-MM-DD (One record per student per school day)
  status: AttendanceStatus;
  reason?: string; // سبب الغياب أو التأخير
  notes?: string;
  recorded_by: string;
  recorded_at: string;
  updated_by?: string;
  updated_at?: string;
}

export type NoteType = 'academic' | 'behavioral';
export type NoteSeverity = 'low' | 'medium' | 'high';
export type NoteStatus = 'open' | 'under_review' | 'resolved';

export interface BehaviorNote {
  id: string;
  student_id: string;
  student_name?: string;
  teacher_id: string;
  teacher_name?: string;
  type: NoteType;
  severity: NoteSeverity;
  status: NoteStatus;
  title: string;
  description: string;
  date: string;
  is_visible_to_parent: boolean;
  action_taken?: string;
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  subject_id: string;
  subject_name?: string;
  class_id: string;
  teacher_id: string;
  teacher_name?: string;
  assigned_date: string;
  due_date: string;
  max_points: number;
  attachment_url?: string;
  status: 'active' | 'closed';
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  author_id: string;
  author_name: string;
  target_audience: 'all' | 'teachers' | 'students' | 'parents' | 'grade_11';
  category: 'urgent' | 'academic' | 'exam' | 'event' | 'general';
  is_pinned: boolean;
  published_at: string;
}

export interface Conversation {
  id: string;
  subject_topic?: string;
  student_id?: string;
  student_name?: string;
  participant_ids: string[];
  last_message?: string;
  last_message_at: string;
  unread_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: UserRole;
  content: string;
  created_at: string;
  is_read: boolean;
}

export interface SchoolNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'attendance' | 'grade' | 'exam' | 'message' | 'announcement' | 'assignment';
  link_target?: string;
  is_read: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string;
  actor_name: string;
  actor_role: UserRole;
  action: string;
  table_name: string;
  record_id: string;
  target_user_id?: string;
  details: string;
  ip_address?: string;
  timestamp: string;
}

export interface SchoolEvent {
  id: string;
  title: string;
  date: string;
  end_date?: string;
  type: 'exam' | 'holiday' | 'activity' | 'meeting' | 'assignment';
  description?: string;
  target_role?: 'all' | 'students' | 'teachers' | 'parents';
}
