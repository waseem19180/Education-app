import React, { useState } from 'react';
import { UserProfile, Student, Grade, Exam } from '../../types/database';
import { storage } from '../../services/storage';
import { Card, Button, Badge, Modal, Tabs, TabItem } from '../common/UIComponents';
import {
  Search,
  Plus,
  User,
  GraduationCap,
  CalendarCheck,
  AlertCircle,
  BookOpen,
  Phone,
  Mail,
  Shield,
  FileSpreadsheet,
  Check,
  X
} from 'lucide-react';

interface StudentsManagerProps {
  currentUser: UserProfile;
}

export const StudentsManager: React.FC<StudentsManagerProps> = ({ currentUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [activeProfileTab, setActiveProfileTab] = useState<string>('general');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states for new student
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('class-11-sci-a');
  const [birthDate, setBirthDate] = useState('2009-05-15');

  const students = storage.getStudents();
  const classes = storage.getClasses();
  const exams = storage.getExams();
  const grades = storage.getGrades();
  const attendance = storage.getAttendance();
  const behaviorNotes = storage.getBehaviorNotes();
  const assignments = storage.getAssignments();

  // Filter students based on role and permissions
  let visibleStudents = students;
  if (currentUser.role === 'parent') {
    const parent = storage.getParents().find((p) => p.profile_id === currentUser.id);
    visibleStudents = students.filter((s) => s.parent_id === parent?.id);
  } else if (currentUser.role === 'student') {
    visibleStudents = students.filter((s) => s.profile_id === currentUser.id);
  }

  // Filter by search & class
  const filteredStudents = visibleStudents.filter((s) => {
    const matchSearch =
      s.profile?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.student_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchSection = selectedSection === 'all' || s.class_id === selectedSection;
    return matchSearch && matchSection;
  });

  const handleCreateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !studentNumber) return;

    // Create user profile
    const newProfile: UserProfile = {
      id: 'student-prof-' + Date.now(),
      email,
      full_name: fullName,
      role: 'student',
      created_at: new Date().toISOString()
    };
    storage.getProfiles().push(newProfile);

    // Create student record
    const newStudent: Student = {
      id: 'student-' + Date.now(),
      profile_id: newProfile.id,
      student_number: studentNumber,
      class_id: selectedClassId,
      parent_id: storage.getParents()[0].id,
      birth_date: birthDate,
      enrollment_date: new Date().toISOString().split('T')[0],
      status: 'active'
    };
    storage.getStudents().push(newStudent);
    storage.logAudit(currentUser, 'إضافة طالب جديد', 'students', newStudent.id, `إضافة الطالب ${fullName} بالرقم ${studentNumber}`);

    setShowAddModal(false);
    setFullName('');
    setEmail('');
    setStudentNumber('');
  };

  // Helper to calculate student GPA
  const calculateStudentAvg = (studentId: string) => {
    const studentGrades = grades.filter((g) => g.student_id === studentId);
    if (studentGrades.length === 0) return '—';
    const total = studentGrades.reduce((sum, g) => sum + g.score, 0);
    return (total / studentGrades.length).toFixed(1) + '%';
  };

  const profileTabs: TabItem[] = [
    { id: 'general', label: 'المعلومات العامة', icon: <User className="w-4 h-4" /> },
    { id: 'grades', label: 'السجل الأكاديمي والامتحانات', icon: <FileSpreadsheet className="w-4 h-4" /> },
    { id: 'attendance', label: 'سجل الحضور والغياب', icon: <CalendarCheck className="w-4 h-4" /> },
    { id: 'notes', label: 'الملاحظات والسلوك', icon: <AlertCircle className="w-4 h-4" /> },
    { id: 'assignments', label: 'الواجبات', icon: <BookOpen className="w-4 h-4" /> }
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {currentUser.role === 'parent' ? 'ملف متابعة الأبناء' : currentUser.role === 'student' ? 'ملفي الأكاديمي' : 'سجل طلاب الحادي عشر العلمي'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            عرض وتحديث البيانات الأكاديمية والشخصية وسجلات الحضور والتقييمات
          </p>
        </div>

        {currentUser.role === 'admin' && (
          <Button
            variant="secondary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setShowAddModal(true)}
          >
            إضافة طالب جديد
          </Button>
        )}
      </div>

      {/* Filter Bar (Visible for Admin/Teacher) */}
      {currentUser.role !== 'student' && (
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="البحث بالاسم أو الرقم المدرسي..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-10 pl-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500 bg-slate-50/50"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-semibold text-slate-500 shrink-0">الشعبة:</span>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="w-full sm:w-auto text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-700 font-medium focus:outline-hidden focus:border-blue-500"
              >
                <option value="all">جميع الشعب (أ و ب)</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>
      )}

      {/* Students Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStudents.map((s) => {
          const avg = calculateStudentAvg(s.id);
          const studentAttendance = attendance.filter((a) => a.student_id === s.id);
          const studentAbsences = studentAttendance.filter((a) => a.status === 'absent').length;

          return (
            <Card
              key={s.id}
              hoverable
              onClick={() => {
                setSelectedStudent(s);
                setActiveProfileTab('general');
              }}
              className="group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={s.profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.profile?.full_name || 'طالب')}&background=0D8ABC&color=fff`}
                    alt={s.profile?.full_name}
                    className="w-12 h-12 rounded-2xl object-cover ring-2 ring-slate-100 group-hover:ring-blue-400 transition"
                  />
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition">
                      {s.profile?.full_name}
                    </h4>
                    <span className="text-[11px] text-slate-400 font-mono block mt-0.5">
                      {s.student_number}
                    </span>
                  </div>
                </div>

                <Badge variant={s.class?.section === 'أ' ? 'primary' : 'secondary'} size="sm">
                  {s.class?.name.includes('أ') ? 'شعبة أ' : 'شعبة ب'}
                </Badge>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-50 p-2 rounded-xl text-center">
                  <span className="text-[10px] text-slate-400 block">المعدل التراكمي</span>
                  <span className="font-bold text-blue-700 text-sm mt-0.5">{avg}</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-xl text-center">
                  <span className="text-[10px] text-slate-400 block">حالات الغياب</span>
                  <span className={`font-bold text-sm mt-0.5 ${studentAbsences > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {studentAbsences} أيام
                  </span>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                <span>ولي الأمر: {s.parent?.profile?.full_name || 'مسجل'}</span>
                <span className="text-blue-600 font-semibold group-hover:underline">عرض الملف الأكاديمي ←</span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* STUDENT PROFILE DETAILED MODAL */}
      {selectedStudent && (
        <Modal
          isOpen={!!selectedStudent}
          onClose={() => setSelectedStudent(null)}
          title={`الملف الأكاديمي للطالب: ${selectedStudent.profile?.full_name}`}
          subtitle={`الرقم المدرسي: ${selectedStudent.student_number} | ${selectedStudent.class?.name}`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            <Tabs
              tabs={profileTabs}
              activeTab={activeProfileTab}
              onChange={setActiveProfileTab}
            />

            {/* TAB 1: GENERAL & CONTACT */}
            {activeProfileTab === 'general' && (
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <img
                    src={selectedStudent.profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedStudent.profile?.full_name)}&background=0D8ABC&color=fff`}
                    alt={selectedStudent.profile?.full_name}
                    className="w-16 h-16 rounded-2xl object-cover ring-2 ring-blue-500/20"
                  />
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{selectedStudent.profile?.full_name}</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      الصف: <span className="font-semibold text-slate-700">{selectedStudent.class?.name}</span>
                    </p>
                    <Badge variant="success" size="sm" className="mt-2">حساب نشط - مسجل 2026/2027</Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block">تاريخ الميلاد:</span>
                    <span className="font-bold text-slate-800">{selectedStudent.birth_date}</span>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block">فصيلة الدم:</span>
                    <span className="font-bold text-slate-800">{selectedStudent.blood_type || 'O+'}</span>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block">ولي الأمر المرتبط:</span>
                    <span className="font-bold text-slate-800">{selectedStudent.parent?.profile?.full_name || 'م. إبراهيم القاسمي'}</span>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-100">
                    <span className="text-slate-400 block">مهنة ولي الأمر:</span>
                    <span className="font-bold text-slate-800">{selectedStudent.parent?.occupation || 'مهندس'}</span>
                  </div>
                </div>

                {/* Parent Student Links & Verification Section */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">حسابات أولياء الأمور المرتبطة رسمياً:</span>
                    <Badge variant="neutral" size="sm">سجل الارتباط العائلي</Badge>
                  </div>
                  {(() => {
                    const studentLinks = storage.getLinksForStudent(selectedStudent.id);
                    if (studentLinks.length === 0) {
                      return (
                        <p className="text-xs text-slate-400 italic py-1">
                          لا توجد ارتباطات موثقة حالياً مع حسابات أولياء الأمور لهذا الطالب.
                        </p>
                      );
                    }
                    return (
                      <div className="space-y-2 mt-2">
                        {studentLinks.map((link) => (
                          <div
                            key={link.id}
                            className="p-2.5 rounded-xl bg-white border border-slate-200/70 flex items-center justify-between text-xs"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900">
                                  {link.parent_profile?.full_name || 'ولي أمر'}
                                </span>
                                <span className="text-[11px] text-slate-500">
                                  ({link.relationship === 'father' ? 'الأب' : link.relationship === 'mother' ? 'الأم' : 'ولي أمر/وصي'})
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-400 block mt-0.5">
                                {link.notes || 'سجل رسمي معتمد'}
                              </span>
                            </div>
                            <Badge
                              variant={
                                link.status === 'active'
                                  ? 'success'
                                  : link.status === 'pending'
                                  ? 'warning'
                                  : link.status === 'rejected'
                                  ? 'danger'
                                  : 'neutral'
                              }
                              size="sm"
                            >
                              {link.status === 'active'
                                ? 'مرتبط ونشط'
                                : link.status === 'pending'
                                ? 'بانتظار الاعتماد'
                                : link.status === 'rejected'
                                ? 'مرفوض'
                                : 'ملغي'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* Privacy check: Only Admin & Teacher see direct phone */}
                {(currentUser.role === 'admin' || currentUser.role === 'teacher') ? (
                  <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200/50 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-slate-700">
                      <Phone className="w-4 h-4 text-blue-600" />
                      <span>هاتف ولي الأمر للتواصل:</span>
                      <strong className="font-mono">{selectedStudent.parent?.profile?.phone || '+962 79 987 6543'}</strong>
                    </div>
                    <Badge variant="info" size="sm">معلومات اتصال مصرحة</Badge>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-50 text-[11px] text-slate-400 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    <span>بيانات الاتصال الشخصية مشفرة ومحمية وفق سياسة الخصوصية المدرسية.</span>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: GRADES & EXAMS */}
            {activeProfileTab === 'grades' && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
                  <span className="font-bold text-slate-800">الامتحانات والنتائج المسجلة:</span>
                  <span className="font-bold text-blue-600">المعدل العام: {calculateStudentAvg(selectedStudent.id)}</span>
                </div>

                <div className="space-y-2">
                  {exams
                    .filter((e) => currentUser.role === 'admin' || currentUser.role === 'teacher' || e.status === 'published')
                    .map((ex) => {
                      const gr = grades.find((g) => g.exam_id === ex.id && g.student_id === selectedStudent.id);
                      return (
                        <div
                          key={ex.id}
                          className="p-3 rounded-xl border border-slate-100 hover:bg-slate-50 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800">{ex.title}</span>
                              <Badge variant={ex.status === 'published' ? 'success' : 'warning'} size="sm">
                                {ex.status === 'published' ? 'منشور' : 'مسودة معلم'}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-1">
                              المادة: {ex.subject_name} | الوزن: {ex.weight_percentage}% | التاريخ: {ex.date}
                            </p>
                            {gr?.feedback && (
                              <p className="text-[11px] text-emerald-700 mt-1 bg-emerald-50 px-2 py-0.5 rounded inline-block">
                                ملاحظة: {gr.feedback}
                              </p>
                            )}
                          </div>
                          <div className="text-left">
                            <span className="text-base font-extrabold text-blue-700">
                              {gr ? gr.score : 'لم ترصد'}
                            </span>
                            <span className="text-xs text-slate-400 font-normal"> / {ex.max_score}</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* TAB 3: ATTENDANCE */}
            {activeProfileTab === 'attendance' && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
                  <span className="font-bold text-slate-800">سجل الحضور والغياب والتأخير:</span>
                  <Badge variant="success">نسبة الالتزام 96%</Badge>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {attendance
                    .filter((a) => a.student_id === selectedStudent.id)
                    .map((att) => (
                      <div
                        key={att.id}
                        className="p-2.5 rounded-xl border border-slate-100 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-slate-800">تاريخ: {att.date}</span>
                          <span className="text-slate-400 mr-2 text-[11px]">(سجل يومي)</span>
                          {att.reason && <p className="text-[11px] text-slate-500 mt-0.5">السبب: {att.reason}</p>}
                          {att.notes && <p className="text-[11px] text-slate-400 mt-0.5">ملاحظة: {att.notes}</p>}
                        </div>
                        <Badge
                          variant={
                            att.status === 'present'
                              ? 'success'
                              : att.status === 'late'
                              ? 'warning'
                              : 'danger'
                          }
                          size="sm"
                        >
                          {att.status === 'present'
                            ? 'حاضر'
                            : att.status === 'late'
                            ? 'متأخر'
                            : att.status === 'excused'
                            ? 'غائب بعذر'
                            : 'غائب'}
                        </Badge>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* TAB 4: NOTES */}
            {activeProfileTab === 'notes' && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
                  <span className="font-bold text-slate-800">الملاحظات الأكاديمية والسلوكية:</span>
                </div>

                <div className="space-y-2.5">
                  {behaviorNotes
                    .filter((n) => n.student_id === selectedStudent.id)
                    .filter((n) => currentUser.role === 'admin' || currentUser.role === 'teacher' || n.is_visible_to_parent)
                    .map((note) => (
                      <div key={note.id} className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{note.title}</span>
                          <div className="flex items-center gap-1.5">
                            <Badge variant={note.type === 'academic' ? 'primary' : 'warning'} size="sm">
                              {note.type === 'academic' ? 'أكاديمية' : 'سلوكية'}
                            </Badge>
                            {!note.is_visible_to_parent && (
                              <Badge variant="neutral" size="sm">سرية</Badge>
                            )}
                          </div>
                        </div>
                        <p className="mt-1.5 text-slate-600 leading-relaxed">{note.description}</p>
                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                          <span>المعلم: {note.teacher_name}</span>
                          <span>التاريخ: {note.date}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* TAB 5: ASSIGNMENTS */}
            {activeProfileTab === 'assignments' && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
                  <span className="font-bold text-slate-800">واجبات الصف ومتابعة التسليم:</span>
                </div>

                <div className="space-y-2">
                  {assignments
                    .filter((a) => a.class_id === selectedStudent.class_id)
                    .map((assign) => (
                      <div key={assign.id} className="p-3 rounded-xl border border-slate-100 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">{assign.title}</span>
                          <Badge variant="warning" size="sm">موعد التسليم: {assign.due_date}</Badge>
                        </div>
                        <p className="mt-1 text-slate-500">{assign.description}</p>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* CREATE STUDENT MODAL (ADMIN ONLY) */}
      {showAddModal && (
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="إضافة طالب جديد للصف الحادي عشر العلمي"
          subtitle="تسجيل بيانات الطالب وربطه بالشعبة وقاعدة البيانات"
        >
          <form onSubmit={handleCreateStudent} className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">الاسم الكامل للطالب *</label>
              <input
                type="text"
                required
                placeholder="مثال: إياد محمود الكيلاني"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">البريد الإلكتروني المدرسي *</label>
                <input
                  type="email"
                  required
                  placeholder="eyad@student.educonnect.school"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">الرقم المدرسي (ID) *</label>
                <input
                  type="text"
                  required
                  placeholder="2026-1116"
                  value={studentNumber}
                  onChange={(e) => setStudentNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">الشعبة المسجل بها *</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">تاريخ الميلاد</label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                إلغاء
              </Button>
              <Button type="submit" variant="secondary">
                حفظ وتسجيل الطالب
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
