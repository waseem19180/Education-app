/**
 * EduConnect Cloud Database Service (Supabase PostgreSQL Client)
 * Handles direct CRUD and realtime subscriptions to Supabase tables
 * respecting Row-Level Security policies.
 */

import { supabase } from './supabaseClient';
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
  BehaviorNote,
  Assignment,
  Announcement,
  Conversation,
  Message,
  SchoolNotification,
  AuditLog,
  SchoolEvent
} from '../types/database';

export class CloudDatabaseService {
  /**
   * PROFILES
   */
  async getProfiles(): Promise<{ data: UserProfile[] | null; error: any }> {
    const { data, error } = await supabase.from('profiles').select('*');
    return { data: data as UserProfile[], error };
  }

  async getProfileById(id: string): Promise<{ data: UserProfile | null; error: any }> {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
    return { data: data as UserProfile, error };
  }

  /**
   * CLASSES & SUBJECTS
   */
  async getClasses(): Promise<{ data: SchoolClass[] | null; error: any }> {
    const { data, error } = await supabase.from('classes').select('*').order('name');
    return { data: data as SchoolClass[], error };
  }

  async getSubjects(): Promise<{ data: Subject[] | null; error: any }> {
    const { data, error } = await supabase.from('subjects').select('*').order('name');
    return { data: data as Subject[], error };
  }

  /**
   * STUDENTS
   */
  async getStudents(): Promise<{ data: any[] | null; error: any }> {
    const { data, error } = await supabase
      .from('students')
      .select(`
        *,
        profile:profiles!students_profile_id_fkey(*),
        class:classes!students_class_id_fkey(*),
        parent:parents!students_parent_id_fkey(
          *,
          profile:profiles!parents_profile_id_fkey(*)
        )
      `)
      .order('student_number');
    return { data, error };
  }

  async createStudent(studentData: Partial<Student>): Promise<{ data: any; error: any }> {
    const { data, error } = await supabase.from('students').insert([studentData]).select().single();
    return { data, error };
  }

  /**
   * TEACHERS
   */
  async getTeachers(): Promise<{ data: any[] | null; error: any }> {
    const { data, error } = await supabase
      .from('teachers')
      .select(`
        *,
        profile:profiles!teachers_profile_id_fkey(*)
      `);
    return { data, error };
  }

  async getTeacherSubjects(): Promise<{ data: any[] | null; error: any }> {
    const { data, error } = await supabase
      .from('teacher_subjects')
      .select(`
        *,
        subject:subjects!teacher_subjects_subject_id_fkey(*),
        class:classes!teacher_subjects_class_id_fkey(*)
      `);
    return { data, error };
  }

  /**
   * EXAMS & GRADES
   */
  async getExams(classId?: string): Promise<{ data: Exam[] | null; error: any }> {
    let query = supabase.from('exams').select('*').order('date', { ascending: false });
    if (classId) query = query.eq('class_id', classId);
    const { data, error } = await query;
    return { data: data as Exam[], error };
  }

  async saveExam(exam: Partial<Exam>): Promise<{ data: Exam | null; error: any }> {
    if (exam.id) {
      const { data, error } = await supabase
        .from('exams')
        .update(exam)
        .eq('id', exam.id)
        .select()
        .single();
      return { data: data as Exam, error };
    } else {
      const { data, error } = await supabase
        .from('exams')
        .insert([exam])
        .select()
        .single();
      return { data: data as Exam, error };
    }
  }

  async publishExam(examId: string): Promise<{ data: any; error: any }> {
    const { data, error } = await supabase
      .from('exams')
      .update({ status: 'published' })
      .eq('id', examId)
      .select()
      .single();
    return { data, error };
  }

  async getGrades(examId?: string, studentId?: string): Promise<{ data: Grade[] | null; error: any }> {
    let query = supabase.from('grades').select('*');
    if (examId) query = query.eq('exam_id', examId);
    if (studentId) query = query.eq('student_id', studentId);
    const { data, error } = await query;
    return { data: data as Grade[], error };
  }

  async saveBatchGrades(gradesList: Partial<Grade>[]): Promise<{ data: any; error: any }> {
    const { data, error } = await supabase
      .from('grades')
      .upsert(gradesList, { onConflict: 'exam_id,student_id' })
      .select();
    return { data, error };
  }

  /**
   * ATTENDANCE
   */
  async getAttendance(date?: string, classId?: string, studentId?: string): Promise<{ data: AttendanceRecord[] | null; error: any }> {
    let query = supabase.from('attendance').select('*').order('period', { ascending: true });
    if (date) query = query.eq('date', date);
    if (classId) query = query.eq('class_id', classId);
    if (studentId) query = query.eq('student_id', studentId);
    const { data, error } = await query;
    return { data: data as AttendanceRecord[], error };
  }

  async saveBatchAttendance(records: Partial<AttendanceRecord>[]): Promise<{ data: any; error: any }> {
    const { data, error } = await supabase
      .from('attendance')
      .upsert(records, { onConflict: 'student_id,date,period' })
      .select();
    return { data, error };
  }

  /**
   * BEHAVIOR & ACADEMIC NOTES
   */
  async getBehaviorNotes(studentId?: string): Promise<{ data: BehaviorNote[] | null; error: any }> {
    let query = supabase.from('behavior_notes').select('*').order('date', { ascending: false });
    if (studentId) query = query.eq('student_id', studentId);
    const { data, error } = await query;
    return { data: data as BehaviorNote[], error };
  }

  async saveBehaviorNote(note: Partial<BehaviorNote>): Promise<{ data: BehaviorNote | null; error: any }> {
    const { data, error } = await supabase
      .from('behavior_notes')
      .insert([note])
      .select()
      .single();
    return { data: data as BehaviorNote, error };
  }

  /**
   * ASSIGNMENTS
   */
  async getAssignments(classId?: string): Promise<{ data: Assignment[] | null; error: any }> {
    let query = supabase.from('assignments').select('*').order('due_date', { ascending: false });
    if (classId) query = query.eq('class_id', classId);
    const { data, error } = await query;
    return { data: data as Assignment[], error };
  }

  async saveAssignment(assignment: Partial<Assignment>): Promise<{ data: Assignment | null; error: any }> {
    const { data, error } = await supabase
      .from('assignments')
      .insert([assignment])
      .select()
      .single();
    return { data: data as Assignment, error };
  }

  /**
   * ANNOUNCEMENTS
   */
  async getAnnouncements(): Promise<{ data: Announcement[] | null; error: any }> {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('published_at', { ascending: false });
    return { data: data as Announcement[], error };
  }

  async saveAnnouncement(announcement: Partial<Announcement>): Promise<{ data: Announcement | null; error: any }> {
    const { data, error } = await supabase
      .from('announcements')
      .insert([announcement])
      .select()
      .single();
    return { data: data as Announcement, error };
  }

  /**
   * MESSAGING & CONVERSATIONS
   */
  async getConversations(): Promise<{ data: Conversation[] | null; error: any }> {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .order('updated_at', { ascending: false });
    return { data: data as Conversation[], error };
  }

  async getMessages(conversationId: string): Promise<{ data: Message[] | null; error: any }> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    return { data: data as Message[], error };
  }

  async sendMessage(conversationId: string, content: string, senderId: string): Promise<{ data: Message | null; error: any }> {
    const { data, error } = await supabase
      .from('messages')
      .insert([
        {
          conversation_id: conversationId,
          content,
          sender_id: senderId
        }
      ])
      .select()
      .single();
    return { data: data as Message, error };
  }

  /**
   * NOTIFICATIONS
   */
  async getNotifications(userId: string): Promise<{ data: SchoolNotification[] | null; error: any }> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return { data: data as SchoolNotification[], error };
  }

  async markNotificationRead(id: string): Promise<{ error: any }> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
    return { error };
  }

  /**
   * AUDIT LOGS
   */
  async getAuditLogs(): Promise<{ data: AuditLog[] | null; error: any }> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false });
    return { data: data as AuditLog[], error };
  }

  async insertAuditLog(log: Partial<AuditLog>): Promise<{ error: any }> {
    const { error } = await supabase.from('audit_logs').insert([log]);
    return { error };
  }

  /**
   * SCHOOL EVENTS
   */
  async getSchoolEvents(): Promise<{ data: SchoolEvent[] | null; error: any }> {
    const { data, error } = await supabase
      .from('school_events')
      .select('*')
      .order('date', { ascending: true });
    return { data: data as SchoolEvent[], error };
  }

  async saveSchoolEvent(event: Partial<SchoolEvent>): Promise<{ data: SchoolEvent | null; error: any }> {
    const { data, error } = await supabase
      .from('school_events')
      .insert([event])
      .select()
      .single();
    return { data: data as SchoolEvent, error };
  }
}

export const cloudService = new CloudDatabaseService();
