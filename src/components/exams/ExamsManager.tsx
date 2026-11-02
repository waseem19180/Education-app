import React, { useState, useMemo } from 'react';
import { UserProfile, Exam, Grade, ExamStatus, ExamType, Subject } from '../../types/database';
import { storage } from '../../services/storage';
import { Card, Button, Badge, Modal } from '../common/UIComponents';
import {
  FileSpreadsheet,
  Plus,
  CheckCircle,
  Eye,
  Edit,
  Upload,
  Download,
  Award,
  TrendingUp,
  FileText,
  AlertCircle,
  Save,
  CheckCheck,
  BookOpen,
  ArrowRight,
  Calendar,
  Layers,
  Clock,
  Sparkles,
  ChevronLeft,
  ShieldCheck,
  CheckCircle2,
  Lock
} from 'lucide-react';

interface ExamsManagerProps {
  currentUser: UserProfile;
}

export const ExamsManager: React.FC<ExamsManagerProps> = ({ currentUser }) => {
  // Navigation state:
  // 1. null = Main Subjects Grid (الصفحة الرئيسية للاختبارات)
  // 2. Subject object = Specific Subject Exams Page (صفحة اختبارات المادة)
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  // 3. Exam object = Specific Exam Details & Grading Sheet Modal
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPreviewData, setImportPreviewData] = useState<any[] | null>(null);

  // Form states for Create Exam
  const [examTitle, setExamTitle] = useState('');
  const [createSubjectId, setCreateSubjectId] = useState('');
  const [classId, setClassId] = useState('class-11-sci-a');
  const [examDate, setExamDate] = useState('2026-11-20');
  const [maxScore, setMaxScore] = useState<number>(100);
  const [weightPercentage, setWeightPercentage] = useState<number>(25);
  const [examType, setExamType] = useState<ExamType>('midterm');
  const [examDesc, setExamDesc] = useState('');

  // Active tab within the Subject Page: 'administered' vs 'all'
  const [subjectActiveTab, setSubjectActiveTab] = useState<'administered' | 'all'>('administered');

  // Grades edit sheet state
  const [editingGrades, setEditingGrades] = useState<
    Record<string, { score: number; is_absent: boolean; feedback: string }>
  >({});
  const [isSavedSuccess, setIsSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const allSubjects = storage.getSubjects();
  const allClasses = storage.getClasses();
  const allExams = storage.getExams();
  const allGrades = storage.getGrades();
  const allStudents = storage.getStudents();
  const allTeachers = storage.getTeachers();
  const allTeacherSubjects = storage.getTeacherSubjects();
  const allProfiles = storage.getProfiles();

  const isTeacher = currentUser.role === 'teacher';
  const isAdmin = currentUser.role === 'admin';
  const isStudent = currentUser.role === 'student';
  const isParent = currentUser.role === 'parent';
  const isPrivileged = isAdmin || isTeacher;

  // Find teacher's assigned subjects
  const teacherRecord = useMemo(() => {
    return allTeachers.find((t) => t.profile_id === currentUser.id);
  }, [allTeachers, currentUser.id]);

  const teacherAssignedSubjectIds = useMemo(() => {
    if (!isTeacher || !teacherRecord) return [];
    return allTeacherSubjects
      .filter((ts) => ts.teacher_id === teacherRecord.id)
      .map((ts) => ts.subject_id);
  }, [isTeacher, teacherRecord, allTeacherSubjects]);

  // Current user's accessible subjects
  const availableSubjects = useMemo(() => {
    return allSubjects;
  }, [allSubjects]);

  // Exams for the currently selected subject
  const currentSubjectExams = useMemo(() => {
    if (!selectedSubject) return [];
    let list = allExams.filter((e) => e.subject_id === selectedSubject.id);

    // Visibility rules:
    // Students & Parents: only see published exams OR completed/upcoming without draft content
    if (!isPrivileged) {
      list = list.filter((e) => e.status !== 'draft');
    } else if (isTeacher && teacherRecord) {
      // Teacher sees their own exams + published exams of other teachers
      list = list.filter(
        (e) => e.teacher_id === teacherRecord.id || e.status === 'published' || isAdmin
      );
    }
    return list;
  }, [allExams, selectedSubject, isPrivileged, isTeacher, teacherRecord, isAdmin]);

  // Split into:
  // 1. Completed / Administered Exams (الاختبارات التي تم تقديمها)
  // Date <= today AND not draft, or marked completed
  const administeredExams = useMemo(() => {
    const today = '2026-11-01'; // Simulated reference date
    return currentSubjectExams.filter((e) => {
      return e.date <= today && (isPrivileged || e.status === 'published');
    });
  }, [currentSubjectExams, isPrivileged]);

  // Open Grading / Details Sheet
  const handleOpenExamDetails = (exam: Exam) => {
    setSelectedExam(exam);
    const examGrades = storage.getGrades(exam.id);
    const classStudents = allStudents.filter((s) => s.class_id === exam.class_id);

    const map: Record<string, { score: number; is_absent: boolean; feedback: string }> = {};
    classStudents.forEach((st) => {
      const match = examGrades.find((g) => g.student_id === st.id);
      map[st.id] = {
        score: match ? match.score : 0,
        is_absent: match ? match.is_absent : false,
        feedback: match ? match.feedback || '' : ''
      };
    });

    setEditingGrades(map);
    setIsSavedSuccess(false);
    setErrorMessage(null);
  };

  const handleGradeChange = (studentId: string, score: number) => {
    if (selectedExam?.status === 'published' && !isAdmin) {
      setErrorMessage('لا يجوز تعديل علامات امتحان معتمد ومنشور رسمياً إلا بموافقة الإدارة.');
      return;
    }
    setEditingGrades((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        score: Math.min(Math.max(0, score), selectedExam?.max_score || 100)
      }
    }));
  };

  const handleAbsentToggle = (studentId: string) => {
    if (selectedExam?.status === 'published' && !isAdmin) {
      setErrorMessage('لا يجوز تعديل حالة الغياب لامتحان منشور رسمياً.');
      return;
    }
    setEditingGrades((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        is_absent: !prev[studentId]?.is_absent
      }
    }));
  };

  const handleFeedbackChange = (studentId: string, feedback: string) => {
    setEditingGrades((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        feedback
      }
    }));
  };

  const handleSaveGrades = () => {
    if (!selectedExam) return;
    try {
      setErrorMessage(null);
      const batch = Object.entries(editingGrades).map(([studentId, data]) => ({
        student_id: studentId,
        score: data.score,
        is_absent: data.is_absent,
        feedback: data.feedback
      }));

      storage.saveBatchGrades(selectedExam.id, batch, currentUser);
      setIsSavedSuccess(true);
      setTimeout(() => setIsSavedSuccess(false), 2500);
    } catch (err: any) {
      setErrorMessage(err.message || 'حدث خطأ أثناء حفظ العلامات.');
    }
  };

  const handlePublishExam = () => {
    if (!selectedExam) return;
    if (
      window.confirm(
        `هل أنت متأكد من اعتماد ونشر نتائج "${selectedExam.title}"؟ سيتم إشعار الطلاب وأولياء الأمور فوراً وسيتم تجميد العلامات.`
      )
    ) {
      try {
        handleSaveGrades();
        storage.publishExam(selectedExam.id, currentUser);
        setSelectedExam((prev) => (prev ? { ...prev, status: 'published' } : null));
        alert('تم اعتماد ونشر النتائج بنجاح.');
      } catch (err: any) {
        alert(err.message || 'فشل في نشر الامتحان.');
      }
    }
  };

  const handleOpenCreateModalForSubject = (subj: Subject) => {
    setCreateSubjectId(subj.id);
    setExamTitle(`امتحان ${subj.name} - الشهر الثاني`);
    setShowCreateModal(true);
  };

  const handleCreateExamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const targetSubj = allSubjects.find((s) => s.id === createSubjectId);
      const newExam = storage.saveExam(
        {
          title: examTitle,
          subject_id: createSubjectId,
          subject_name: targetSubj?.name || '',
          class_id: classId,
          date: examDate,
          max_score: maxScore,
          weight_percentage: weightPercentage,
          exam_type: examType,
          description: examDesc,
          status: 'draft'
        },
        currentUser
      );

      setShowCreateModal(false);
      handleOpenExamDetails(newExam);
    } catch (err: any) {
      alert(err.message || 'تعذر إنشاء الامتحان.');
    }
  };

  // Helper for exam delivery state
  const getExamDeliveryState = (exam: Exam): { label: string; variant: 'success' | 'info' | 'neutral' } => {
    const today = '2026-11-01';
    if (exam.status === 'draft') {
      return { label: 'مسودة', variant: 'neutral' };
    }
    if (exam.date <= today) {
      return { label: 'تم التقديم', variant: 'success' };
    }
    return { label: 'قادم', variant: 'info' };
  };

  // Helpers for stats of selected exam
  const currentExamStudentList = selectedExam
    ? allStudents.filter((s) => s.class_id === selectedExam.class_id)
    : [];

  const scoresArray = Object.values(editingGrades)
    .filter((g) => !g.is_absent)
    .map((g) => g.score);

  const averageScore =
    scoresArray.length > 0
      ? (scoresArray.reduce((a, b) => a + b, 0) / scoresArray.length).toFixed(1)
      : '0';

  const highestScore = scoresArray.length > 0 ? Math.max(...scoresArray) : 0;
  const lowestScore = scoresArray.length > 0 ? Math.min(...scoresArray) : 0;

  // Student's own score for selected exam (if student)
  const myStudentObj = allStudents.find((s) => s.profile_id === currentUser.id);
  const myStudentGrade = selectedExam && myStudentObj
    ? storage.getGrades(selectedExam.id, myStudentObj.id)[0]
    : null;

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. SUBJECTS SELECTION HOME (الصفحة الرئيسية للاختبارات) */}
      {/* ========================================================================= */}
      {!selectedSubject ? (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>نظام الاختبارات والعلامات الأكاديمية</span>
                <Badge variant="info">مُنظم حسب المادة الدراسية</Badge>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                اختر المادة الدراسية لعرض قوائم الاختبارات المقدمة والقادمة، ومراجعة ورصد العلامات
              </p>
            </div>

            {isPrivileged && (
              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => {
                  setCreateSubjectId(allSubjects[0]?.id || 'subj-math');
                  setExamTitle('اختبار فصلي جديد');
                  setShowCreateModal(true);
                }}
              >
                إنشاء اختبار جديد
              </Button>
            )}
          </div>

          {/* Subjects Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {availableSubjects.map((subject) => {
              const subjExams = allExams.filter((e) => e.subject_id === subject.id);
              const today = '2026-11-01';
              const completedCount = subjExams.filter((e) => e.date <= today && e.status !== 'draft').length;
              const upcomingCount = subjExams.filter((e) => e.date > today).length;
              const draftCount = subjExams.filter((e) => e.status === 'draft').length;

              // Find teacher teaching this subject
              const tsRecord = allTeacherSubjects.find((ts) => ts.subject_id === subject.id);
              const teacher = tsRecord ? allTeachers.find((t) => t.id === tsRecord.teacher_id) : null;
              const teacherProfile = teacher ? allProfiles.find((p) => p.id === teacher.profile_id) : null;

              return (
                <Card
                  key={subject.id}
                  hoverable
                  onClick={() => {
                    setSelectedSubject(subject);
                    setSubjectActiveTab('administered');
                  }}
                  className="group cursor-pointer border border-slate-200 hover:border-blue-400 hover:shadow-md transition relative overflow-hidden"
                >
                  {/* Subject top color bar */}
                  <div
                    className="h-1.5 w-full absolute top-0 left-0 right-0"
                    style={{ backgroundColor: subject.color || '#2563eb' }}
                  />

                  <div className="pt-2 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white shadow-xs"
                          style={{ backgroundColor: subject.color || '#2563eb' }}
                        >
                          <BookOpen className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition">
                            {subject.name}
                          </h3>
                          <span className="text-[11px] font-mono text-slate-400">
                            {subject.code}
                          </span>
                        </div>
                      </div>
                      <ChevronLeft className="w-5 h-5 text-slate-300 group-hover:text-blue-600 group-hover:-translate-x-1 transition" />
                    </div>

                    <div className="text-[11px] text-slate-500">
                      معلم المادة: <strong className="text-slate-700">{teacherProfile?.full_name || 'هيئة التدريس'}</strong>
                    </div>

                    {/* Stats pills */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[11px]">
                      <div className="p-2 rounded-xl bg-slate-50">
                        <span className="text-slate-400 block text-[10px]">تم التقديم</span>
                        <strong className="text-slate-800 font-extrabold text-sm">{completedCount}</strong> اختبار
                      </div>
                      <div className="p-2 rounded-xl bg-slate-50">
                        <span className="text-slate-400 block text-[10px]">قادم / مجدول</span>
                        <strong className="text-blue-600 font-extrabold text-sm">{upcomingCount}</strong> اختبار
                      </div>
                    </div>

                    {draftCount > 0 && isPrivileged && (
                      <div className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2.5 py-1 rounded-lg">
                        يوجد {draftCount} اختبار في طور المسودة
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* 2. SUBJECT EXAMS PAGE (صفحة اختبارات مادة محددة) */
        /* ========================================================================= */
        <div className="space-y-6">
          {/* Breadcrumb & Top Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                icon={<ArrowRight className="w-4 h-4" />}
                onClick={() => setSelectedSubject(null)}
              >
                العودة لقائمة المواد
              </Button>
              <div className="h-6 w-px bg-slate-200" />
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <span
                    className="w-3.5 h-3.5 rounded-full"
                    style={{ backgroundColor: selectedSubject.color || '#2563eb' }}
                  />
                  <span>اختبارات مادة: {selectedSubject.name}</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  كود المادة: {selectedSubject.code} | الساعات المعتمدة: {selectedSubject.credit_hours} | الدرجة القصوى: {selectedSubject.max_score}
                </p>
              </div>
            </div>

            {isPrivileged && (
              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => handleOpenCreateModalForSubject(selectedSubject)}
              >
                إنشاء اختبار في {selectedSubject.name}
              </Button>
            )}
          </div>

          {/* Subject Navigation Tabs (List 1: Administered vs List 2: All) */}
          <div className="flex border-b border-slate-200 gap-2">
            <button
              type="button"
              onClick={() => setSubjectActiveTab('administered')}
              className={`pb-3 px-4 font-bold text-xs border-b-2 transition flex items-center gap-2 cursor-pointer ${
                subjectActiveTab === 'administered'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>القائمة الأولى: الاختبارات التي تم تقديمها ({administeredExams.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setSubjectActiveTab('all')}
              className={`pb-3 px-4 font-bold text-xs border-b-2 transition flex items-center gap-2 cursor-pointer ${
                subjectActiveTab === 'all'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Layers className="w-4 h-4 text-blue-600" />
              <span>القائمة الثانية: جميع اختبارات المادة ({currentSubjectExams.length})</span>
            </button>
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: ADMINISTERED EXAMS (الاختبارات التي تم تقديمها فعلياً) */}
          {/* ========================================================================= */}
          {subjectActiveTab === 'administered' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200/60 text-xs text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  تحتوي هذه القائمة حصراً على اختبارات <strong>{selectedSubject.name}</strong> التي تم تقديمها فعلياً في المدرسة.
                </span>
              </div>

              {administeredExams.length === 0 ? (
                <Card className="py-12 text-center text-slate-400 text-xs">
                  لا توجد اختبارات تم تقديمها لهذه المادة حتى الآن.
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {administeredExams.map((exam) => {
                    const isPublished = exam.status === 'published';
                    const examGrades = allGrades.filter((g) => g.exam_id === exam.id);
                    const average =
                      examGrades.length > 0
                        ? (
                            examGrades.reduce((sum, g) => sum + g.score, 0) /
                            examGrades.length
                          ).toFixed(1)
                        : null;

                    return (
                      <Card
                        key={exam.id}
                        hoverable
                        onClick={() => handleOpenExamDetails(exam)}
                        className="group border border-slate-200 hover:border-blue-400 hover:shadow-md transition cursor-pointer"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition">
                                {exam.title}
                              </h3>
                              <span className="text-[11px] text-slate-500 mt-0.5 block">
                                تاريخ التقديم: <strong className="text-slate-700">{exam.date}</strong>
                              </span>
                            </div>
                            <Badge variant={isPublished ? 'success' : 'warning'} size="sm">
                              {isPublished ? 'العلامات منشورة' : 'العلامات قيد الرصد'}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-center text-[11px] pt-2 border-t border-slate-100">
                            <div className="p-2 rounded-xl bg-slate-50">
                              <span className="text-[10px] text-slate-400">الدرجة النهائية</span>
                              <p className="font-bold text-slate-800">{exam.max_score}</p>
                            </div>
                            <div className="p-2 rounded-xl bg-slate-50">
                              <span className="text-[10px] text-slate-400">الوزن النسبي</span>
                              <p className="font-bold text-slate-800">{exam.weight_percentage}%</p>
                            </div>
                            <div className="p-2 rounded-xl bg-slate-50">
                              <span className="text-[10px] text-slate-400">الشعبة</span>
                              <p className="font-bold text-slate-800">11 علمي (أ)</p>
                            </div>
                          </div>

                          {isPublished && average && (
                            <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50 text-[11px] text-emerald-800">
                              <span>متوسط درجات الصف:</span>
                              <strong className="font-mono font-bold text-emerald-700">{average} / {exam.max_score}</strong>
                            </div>
                          )}

                          <div className="pt-2 flex items-center justify-between text-xs text-blue-600 font-bold">
                            <span>
                              {isPrivileged ? 'عرض ورصد العلامات' : 'عرض نتيجتي وتفاصيل الاختبار'}
                            </span>
                            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition" />
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: ALL EXAMS FOR THIS SUBJECT (جميع اختبارات المادة) */}
          {/* ========================================================================= */}
          {subjectActiveTab === 'all' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-blue-50/50 border border-blue-200/60 text-xs text-blue-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  تعرض هذه القائمة كافة اختبارات مادة <strong>{selectedSubject.name}</strong> مصنفة بحالاتها (تم التقديم، قادم، مسودة).
                </span>
              </div>

              {currentSubjectExams.length === 0 ? (
                <Card className="py-12 text-center text-slate-400 text-xs">
                  لا توجد اختبارات مسجلة لهذه المادة.
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {currentSubjectExams.map((exam) => {
                    const delivery = getExamDeliveryState(exam);
                    const isPublished = exam.status === 'published';

                    return (
                      <Card
                        key={exam.id}
                        hoverable
                        onClick={() => handleOpenExamDetails(exam)}
                        className="group border border-slate-200 hover:border-blue-400 hover:shadow-md transition cursor-pointer"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition">
                                {exam.title}
                              </h3>
                              <span className="text-[11px] text-slate-500 mt-0.5 block">
                                التاريخ: <strong className="text-slate-700">{exam.date}</strong>
                              </span>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <Badge variant={delivery.variant} size="sm">
                                {delivery.label}
                              </Badge>
                              {isPublished && (
                                <Badge variant="success" size="sm">
                                  معتمد ومنشور
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-center text-[11px] pt-2 border-t border-slate-100">
                            <div className="p-2 rounded-xl bg-slate-50">
                              <span className="text-[10px] text-slate-400">الدرجة القصوى</span>
                              <p className="font-bold text-slate-800">{exam.max_score}</p>
                            </div>
                            <div className="p-2 rounded-xl bg-slate-50">
                              <span className="text-[10px] text-slate-400">الوزن</span>
                              <p className="font-bold text-slate-800">{exam.weight_percentage}%</p>
                            </div>
                            <div className="p-2 rounded-xl bg-slate-50">
                              <span className="text-[10px] text-slate-400">نوع الاختبار</span>
                              <p className="font-bold text-slate-800">
                                {exam.exam_type === 'midterm'
                                  ? 'نصفي'
                                  : exam.exam_type === 'final'
                                  ? 'نهائي'
                                  : exam.exam_type === 'practical'
                                  ? 'عملي'
                                  : 'شهري'}
                              </p>
                            </div>
                          </div>

                          <p className="text-[11px] text-slate-500 line-clamp-2">
                            {exam.description || 'لا يوجد وصف تفصيلي للاختبار.'}
                          </p>

                          <div className="pt-2 flex items-center justify-between text-xs text-blue-600 font-bold border-t border-slate-100">
                            <span>عرض التفاصيل الكاملة</span>
                            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition" />
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. EXAM DETAILS & GRADES SHEET MODAL (تفاصيل الاختبار ورصد العلامات) */}
      {/* ========================================================================= */}
      {selectedExam && (
        <Modal
          isOpen={!!selectedExam}
          onClose={() => setSelectedExam(null)}
          title={`تفاصيل الاختبار: ${selectedExam.title}`}
          subtitle={`المادة: ${selectedExam.subject_name} | التاريخ: ${selectedExam.date} | الدرجة القصوى: ${selectedExam.max_score}`}
          maxWidth="3xl"
        >
          <div className="space-y-5 text-xs">
            {/* Status & Warning Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2">
                <Badge variant={selectedExam.status === 'published' ? 'success' : 'warning'}>
                  {selectedExam.status === 'published' ? 'النتائج معتمدة ومنشورة رسمياً' : 'النتائج قيد الرصد (مسودة)'}
                </Badge>
                <Badge variant={selectedExam.date <= '2026-11-01' ? 'info' : 'neutral'}>
                  {selectedExam.date <= '2026-11-01' ? 'تم تقديم الامتحان' : 'امتحان مجدول قادم'}
                </Badge>
              </div>

              {selectedExam.status === 'published' && isPrivileged && !isAdmin && (
                <div className="flex items-center gap-1.5 text-[11px] text-amber-700 font-semibold">
                  <Lock className="w-3.5 h-3.5" />
                  <span>العلامات مجمدة بعد النشر الرسمي ولا تعدل إلا بطلب إداري.</span>
                </div>
              )}

              {isPrivileged && selectedExam.status !== 'published' && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={<CheckCheck className="w-4 h-4" />}
                  onClick={handlePublishExam}
                >
                  اعتماد ونشر النتائج للجميع
                </Button>
              )}
            </div>

            {/* Error / Success Notifications */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {isSavedSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>تم حفظ وتحديث العلامات بنجاح.</span>
              </div>
            )}

            {/* If Student: Show their own mark card */}
            {isStudent && (
              <Card className="p-4 bg-blue-50/50 border-blue-200">
                <h4 className="font-bold text-slate-900 text-sm mb-2">نتيجتي في الاختبار</h4>
                {selectedExam.status === 'published' ? (
                  myStudentGrade ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-2xl font-black text-blue-700">
                          {myStudentGrade.is_absent ? 'غائب' : `${myStudentGrade.score} / ${selectedExam.max_score}`}
                        </span>
                        {myStudentGrade.feedback && (
                          <p className="text-slate-600 mt-1">ملاحظات المعلم: {myStudentGrade.feedback}</p>
                        )}
                      </div>
                      <Badge variant="success">معتمد</Badge>
                    </div>
                  ) : (
                    <p className="text-slate-500">لم يتم رصد علامتك بعد.</p>
                  )
                ) : (
                  <p className="text-amber-700 font-semibold">
                    الامتحان قُدّم ولم تُعتمد العلامات رسمياً بعد. ستظهر نتيجتك فور نشرها من قبل الإدارة.
                  </p>
                )}
              </Card>
            )}

            {/* If Teacher or Admin: Show Grading Sheet */}
            {isPrivileged && (
              <div className="space-y-4">
                {/* Stats Bar */}
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="p-2 rounded-xl bg-slate-50">
                    <span className="text-slate-400 text-[10px]">المتوسط العام</span>
                    <p className="font-extrabold text-blue-600 text-sm">{averageScore} / {selectedExam.max_score}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50">
                    <span className="text-slate-400 text-[10px]">أعلى علامة</span>
                    <p className="font-extrabold text-emerald-600 text-sm">{highestScore}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50">
                    <span className="text-slate-400 text-[10px]">أدنى علامة</span>
                    <p className="font-extrabold text-slate-700 text-sm">{lowestScore}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50">
                    <span className="text-slate-400 text-[10px]">إجمالي الطلاب</span>
                    <p className="font-extrabold text-slate-900 text-sm">{currentExamStudentList.length}</p>
                  </div>
                </div>

                {/* Grading Table */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="max-h-80 overflow-y-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100 sticky top-0">
                        <tr>
                          <th className="py-2 px-3">#</th>
                          <th className="py-2 px-3">اسم الطالب</th>
                          <th className="py-2 px-3">الرقم الأكاديمي</th>
                          <th className="py-2 px-3">العلامة (من {selectedExam.max_score})</th>
                          <th className="py-2 px-3">غياب</th>
                          <th className="py-2 px-3">الملاحظات التقييمية</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {currentExamStudentList.map((st, i) => {
                          const stProfile = allProfiles.find((p) => p.id === st.profile_id);
                          const gradeData = editingGrades[st.id] || { score: 0, is_absent: false, feedback: '' };

                          return (
                            <tr key={st.id} className="hover:bg-slate-50/80 transition">
                              <td className="py-2.5 px-3 font-mono text-slate-400">{i + 1}</td>
                              <td className="py-2.5 px-3 font-bold text-slate-900">
                                {stProfile?.full_name}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-500">{st.student_number}</td>
                              <td className="py-2.5 px-3">
                                <input
                                  type="number"
                                  min={0}
                                  max={selectedExam.max_score}
                                  disabled={gradeData.is_absent || (selectedExam.status === 'published' && !isAdmin)}
                                  value={gradeData.is_absent ? '' : gradeData.score}
                                  onChange={(e) => handleGradeChange(st.id, Number(e.target.value))}
                                  className="w-20 px-2 py-1 text-center font-bold border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 bg-white"
                                />
                              </td>
                              <td className="py-2.5 px-3">
                                <button
                                  type="button"
                                  disabled={selectedExam.status === 'published' && !isAdmin}
                                  onClick={() => handleAbsentToggle(st.id)}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition ${
                                    gradeData.is_absent ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  }`}
                                >
                                  {gradeData.is_absent ? 'غائب' : 'حاضر'}
                                </button>
                              </td>
                              <td className="py-2.5 px-3">
                                <input
                                  type="text"
                                  placeholder="ملاحظة المعلم للطالب..."
                                  disabled={selectedExam.status === 'published' && !isAdmin}
                                  value={gradeData.feedback}
                                  onChange={(e) => handleFeedbackChange(st.id, e.target.value)}
                                  className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Save Buttons */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <span className="text-[11px] text-slate-500">
                    {selectedExam.status === 'published'
                      ? 'الامتحان منشور ومعتمد رسمياً.'
                      : 'الامتحان قيد الرصد - احفظ التغييرات قبل الاعتماد.'}
                  </span>

                  {(selectedExam.status !== 'published' || isAdmin) && (
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<Save className="w-4 h-4" />}
                      onClick={handleSaveGrades}
                    >
                      حفظ نتائج الرصد
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* 4. CREATE EXAM MODAL */}
      {/* ========================================================================= */}
      {showCreateModal && (
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="إنشاء امتحان أكاديمي جديد"
          subtitle="تحديد المادة، الشعبة، التاريخ، والأوزان النسبية للعلامات"
          maxWidth="lg"
        >
          <form onSubmit={handleCreateExamSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">عنوان الامتحان</label>
              <input
                type="text"
                required
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
                placeholder="مثال: الاختبار النصفي للكيمياء التحليلية"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">المادة الدراسية</label>
                <select
                  value={createSubjectId}
                  onChange={(e) => setCreateSubjectId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                  {allSubjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">الشعبة المستهدفة</label>
                <select
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                  {allClasses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">تاريخ الامتحان</label>
                <input
                  type="date"
                  required
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">الدرجة القصوى</label>
                <input
                  type="number"
                  min={1}
                  value={maxScore}
                  onChange={(e) => setMaxScore(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">الوزن النسبي (%)</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={weightPercentage}
                  onChange={(e) => setWeightPercentage(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">نوع الاختبار</label>
              <select
                value={examType}
                onChange={(e) => setExamType(e.target.value as ExamType)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                <option value="first_month">امتحان الشهر الأول</option>
                <option value="midterm">امتحان منتصف الفصل (نصفي)</option>
                <option value="second_month">امتحان الشهر الثاني</option>
                <option value="practical">تقييم مخبري / عملي</option>
                <option value="quiz">كويز قصير</option>
                <option value="final">امتحان نهاية الفصل (نهائي)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">الوصف والمحتوى المطلوب</label>
              <textarea
                rows={2}
                value={examDesc}
                onChange={(e) => setExamDesc(e.target.value)}
                placeholder="تفاصيل الوحدات والدروس الداخلة في الاختبار..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
                إلغاء
              </Button>
              <Button type="submit" variant="primary">
                حفظ وإنشاء الامتحان
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
