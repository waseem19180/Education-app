import React, { useState } from 'react';
import { UserProfile, SchoolClass, Student } from '../../types/database';
import { storage } from '../../services/storage';
import { StatCard, Card, Badge, Button } from '../common/UIComponents';
import { ActivePage } from '../layout/Sidebar';
import {
  Users,
  GraduationCap,
  CalendarCheck,
  Award,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  BookOpen,
  Calendar,
  MessageSquare,
  FileText,
  CheckCircle,
  Megaphone,
  TrendingUp,
  FileSpreadsheet,
  ShieldCheck,
  UserCheck,
  UserX
} from 'lucide-react';

interface DashboardProps {
  currentUser: UserProfile;
  onNavigate: (page: ActivePage) => void;
  onSelectStudentProfile?: (studentId: string) => void;
}

// 1. ADMIN DASHBOARD
export const AdminDashboard: React.FC<DashboardProps> = ({ currentUser, onNavigate }) => {
  const students = storage.getStudents();
  const teachers = storage.getTeachers();
  const parents = storage.getParents();
  const today = '2026-11-01';
  const todayAttendance = storage.getAttendance(today);
  const exams = storage.getExams();
  const announcements = storage.getAnnouncements();
  const auditLogs = storage.getAuditLogs();

  const presentCount = todayAttendance.filter((a) => a.status === 'present').length;
  const absentCount = todayAttendance.filter((a) => a.status === 'absent' || a.status === 'excused').length;
  const lateCount = todayAttendance.filter((a) => a.status === 'late').length;
  const attendanceRate = students.length > 0 ? Math.round(((presentCount + lateCount) / students.length) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold mb-3">
            <span>لوحة التحكم الإدارية المركزية</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            مرحباً بك، {currentUser.full_name}
          </h1>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            متابعة شاملة للصف الحادي عشر العلمي (أ و ب): انتظام الحضور، جودة الامتحانات، ونتائج التحصيل الأكاديمي للعام الدراسي 2026/2027.
          </p>

          <div className="mt-5 flex flex-wrap gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              icon={<CalendarCheck className="w-4 h-4" />}
              onClick={() => onNavigate('attendance')}
            >
              مراجعة الحضور والغياب
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-white/10 text-white border-white/20 hover:bg-white/20"
              icon={<FileSpreadsheet className="w-4 h-4" />}
              onClick={() => onNavigate('exams')}
            >
              اعتماد نتائج الامتحانات
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-white/10 text-white border-white/20 hover:bg-white/20"
              icon={<ShieldCheck className="w-4 h-4" />}
              onClick={() => onNavigate('users_permissions')}
            >
              إدارة المستخدمين والصلاحيات
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-white/10 text-white border-white/20 hover:bg-white/20"
              icon={<Megaphone className="w-4 h-4" />}
              onClick={() => onNavigate('announcements')}
            >
              نشر إعلان رسمي
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="إجمالي الطلاب"
          value={students.length}
          subtext="شعبتي (أ) و (ب) علمي"
          icon={<Users className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="الكادر التعليمي"
          value={teachers.length}
          subtext="المواد التخصصية"
          icon={<GraduationCap className="w-5 h-5" />}
          color="purple"
        />
        <StatCard
          title="نسبة الحضور اليومي"
          value={`${attendanceRate}%`}
          subtext="تاريخ اليوم"
          icon={<Award className="w-5 h-5" />}
          trend={{ value: '1.5%', isPositive: true }}
          color="emerald"
        />
        <StatCard
          title="الغياب والتأخير"
          value={`${absentCount} غياب / ${lateCount} تأخر`}
          subtext="متابعة دورية مع الأهالي"
          icon={<AlertTriangle className="w-5 h-5" />}
          color="amber"
        />
      </div>

      {/* Grid: Attendance Analytics & Quick Class Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Academic & Attendance Overview */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-base">معدل الحضور والانتظام خلال الأسبوع</h3>
              <p className="text-xs text-slate-500">توزيع الحضور والغياب لطلاب الحادي عشر العلمي</p>
            </div>
            <Badge variant="success">96.4% معدل أسبوعي</Badge>
          </div>

          <div className="mt-6 space-y-4">
            {[
              { day: 'الأحد (اليوم)', present: 13, absent: 1, late: 1, total: 15, pct: 93 },
              { day: 'الخميس', present: 14, absent: 1, late: 0, total: 15, pct: 96 },
              { day: 'الأربعاء', present: 15, absent: 0, late: 0, total: 15, pct: 100 },
              { day: 'الثلاثاء', present: 14, absent: 0, late: 1, total: 15, pct: 96 },
              { day: 'الإثنين', present: 13, absent: 2, late: 0, total: 15, pct: 87 }
            ].map((row) => (
              <div key={row.day} className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-slate-700">
                  <span>{row.day}</span>
                  <span>{row.present} حاضر / {row.absent} غائب / {row.late} متأخر ({row.pct}%)</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                  <div style={{ width: `${(row.present / row.total) * 100}%` }} className="bg-emerald-500 h-full" />
                  <div style={{ width: `${(row.late / row.total) * 100}%` }} className="bg-amber-400 h-full" />
                  <div style={{ width: `${(row.absent / row.total) * 100}%` }} className="bg-rose-500 h-full" />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> حاضر</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> متأخر</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> غائب</span>
            </div>
            <button
              onClick={() => onNavigate('reports')}
              className="font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
            >
              استخراج تقرير تفصيلي <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </Card>

        {/* Recent Administrative Audit Logs */}
        <Card>
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">سجل العمليات الإدارية</h3>
              <p className="text-[11px] text-slate-500">أحدث الإجراءات الرقابية</p>
            </div>
            <button
              onClick={() => onNavigate('audit')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
            >
              عرض الكل
            </button>
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {auditLogs.slice(0, 4).map((log) => (
              <div key={log.id} className="py-2.5 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>{log.action}</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {new Date(log.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-600 line-clamp-1">{log.details}</p>
                <div className="mt-1 text-[10px] text-slate-400 flex items-center gap-1">
                  <span>المستخدم:</span>
                  <span className="font-semibold text-slate-600">{log.actor_name}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Pinned Announcements Feed */}
      <div className="bg-blue-50/60 rounded-2xl border border-blue-200/70 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-sm">آخر الإعلانات المعممة على المدرسة</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onNavigate('announcements')}>
            إدارة الإعلانات
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {announcements.slice(0, 2).map((ann) => (
            <div key={ann.id} className="bg-white rounded-xl p-4 border border-blue-100 shadow-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-900">{ann.title}</span>
                {ann.is_pinned && <Badge variant="danger" size="sm">مثبت</Badge>}
              </div>
              <p className="mt-2 text-xs text-slate-600 line-clamp-2 leading-relaxed">{ann.content}</p>
              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>{ann.author_name}</span>
                <span>{new Date(ann.published_at).toLocaleDateString('ar-EG')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// 2. TEACHER DASHBOARD
export const TeacherDashboard: React.FC<DashboardProps> = ({ currentUser, onNavigate }) => {
  const teacherObj = storage.getTeachers().find((t) => t.profile_id === currentUser.id);
  const teacherSubjects = storage.getTeacherSubjects().filter((ts) => ts.teacher_id === teacherObj?.id);
  const exams = storage.getExams().filter((e) => e.teacher_id === teacherObj?.id);
  const assignments = storage.getAssignments();
  const students = storage.getStudents();

  return (
    <div className="space-y-6">
      {/* Teacher Header */}
      <div className="rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-8 shadow-xl">
        <div className="max-w-2xl">
          <Badge variant="primary" size="sm" className="bg-white/20 text-white border-white/20 mb-3">
            بوابة المعلم الأكاديمية
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            أهلاً بك، {currentUser.full_name}
          </h1>
          <p className="mt-2 text-sm text-blue-100">
            {teacherObj?.specialization || 'مدرس المواد العلمية'} — الصف الحادي عشر العلمي
          </p>

          <div className="mt-5 flex flex-wrap gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              icon={<CalendarCheck className="w-4 h-4" />}
              onClick={() => onNavigate('attendance')}
            >
              تسجيل حضور الحصة الآن
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-white/10 text-white border-white/20 hover:bg-white/20"
              icon={<FileSpreadsheet className="w-4 h-4" />}
              onClick={() => onNavigate('exams')}
            >
              إدخال وتعديل العلامات
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-white/10 text-white border-white/20 hover:bg-white/20"
              icon={<Users className="w-4 h-4" />}
              onClick={() => onNavigate('teacher_students_parents')}
            >
              إدارة الطلاب وأولياء الأمور
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-white/10 text-white border-white/20 hover:bg-white/20"
              icon={<AlertTriangle className="w-4 h-4" />}
              onClick={() => onNavigate('notes')}
            >
              إضافة ملاحظة سلوكية / أكاديمية
            </Button>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="المواد والصفوف المكلف بها"
          value={teacherSubjects.length || 2}
          subtext="رياضيات 11 (أ) و (ب)"
          icon={<BookOpen className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="الطلاب المتابعون"
          value={students.length}
          subtext="إجمالي المسجلين بالصف"
          icon={<Users className="w-5 h-5" />}
          color="emerald"
        />
        <StatCard
          title="الامتحانات والتقييمات"
          value={exams.length}
          subtext="نصفية وشهرية"
          icon={<FileSpreadsheet className="w-5 h-5" />}
          color="purple"
        />
        <StatCard
          title="الواجبات المفتوحة"
          value={assignments.length}
          subtext="قيد التسليم من الطلاب"
          icon={<Clock className="w-5 h-5" />}
          color="amber"
        />
      </div>

      {/* Quick Classes List */}
      <Card>
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-base">المواد والصفوف المسندة إليك</h3>
            <p className="text-xs text-slate-500">اختر الصف لإجراء سريع (حضور، كشف درجات، واجبات)</p>
          </div>
          <Badge variant="primary">الفصل الأول 2026/2027</Badge>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {teacherSubjects.map((ts) => (
            <div
              key={ts.id}
              className="rounded-2xl border border-slate-200 p-4 hover:border-blue-400 hover:shadow-md transition-all bg-gradient-to-br from-slate-50 to-white"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{ts.subject?.name || 'الرياضيات التخصصية'}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{ts.class?.name || 'الصف الحادي عشر العلمي'}</p>
                </div>
                <Badge variant="secondary" size="sm">{ts.subject?.code || 'MATH-11'}</Badge>
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-3">
                <span>{ts.class?.room_number || 'قاعة الخوارزمي'}</span>
                <span>{ts.subject?.credit_hours || 5} حصص أسبوعياً</span>
              </div>

              <div className="mt-3 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => onNavigate('attendance')}
                >
                  تسجيل الحضور
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => onNavigate('exams')}
                >
                  العلامات
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

// 3. PARENT DASHBOARD
export const ParentDashboard: React.FC<DashboardProps> = ({ currentUser, onNavigate, onSelectStudentProfile }) => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const allLinks = storage.getParentStudentLinks();
  const activeLinks = allLinks.filter((l) => l.parent_id === currentUser.id && l.status === 'active');
  const activeStudentIds = activeLinks.map((l) => l.student_id);

  const parents = storage.getParents();
  const parentObj = parents.find((p) => p.profile_id === currentUser.id);
  const children = storage.getStudents().filter((s) => activeStudentIds.includes(s.id) || s.parent_id === parentObj?.id);
  const activeChild = children[0] || storage.getStudents()[0];

  const pendingLinks = allLinks.filter((l) => l.parent_id === currentUser.id && l.status === 'pending');

  const handleApproveLink = (linkId: string) => {
    const res = storage.verifyParentStudentLink(linkId, currentUser, 'موافقة ولي الأمر عبر البوابة');
    if (res.success) {
      setActionMessage('تم اعتماد وتفعيل ربط الطالب بنجاح.');
      setRefreshKey((k) => k + 1);
    } else {
      setActionMessage(res.error || 'فشلت عملية الاعتماد.');
    }
  };

  const handleRejectLink = (linkId: string) => {
    const res = storage.rejectParentStudentLink(linkId, currentUser, 'رفض من قِبل ولي الأمر');
    if (res.success) {
      setActionMessage('تم رفض طلب الربط.');
      setRefreshKey((k) => k + 1);
    } else {
      setActionMessage(res.error || 'فشلت عملية الرفض.');
    }
  };

  const exams = storage.getExams().filter((e) => e.status === 'published');
  const grades = storage.getGrades(undefined, activeChild?.id).filter((g) =>
    exams.some((e) => e.id === g.exam_id)
  );

  const attendanceRecords = storage.getAttendance(undefined, undefined, activeChild?.id);
  const notes = storage.getBehaviorNotes(activeChild?.id, 'parent');

  // Calculate average
  const totalScore = grades.reduce((acc, g) => acc + g.score, 0);
  const avg = grades.length > 0 ? (totalScore / grades.length).toFixed(1) : '94.2';

  return (
    <div className="space-y-6">
      {/* Pending Link Approval Banner */}
      {pendingLinks.length > 0 && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-amber-900 text-sm">
              طلبات ربط أبناء بانتظار موافقتك الشخصية ({pendingLinks.length})
            </h3>
          </div>
          <p className="text-xs text-amber-700 mb-4">
            وفقاً لسياسات الأمان المدرسية، يتطلب تفعيل ربط الطالب ومتابعة درجاته موافقتك الصريحة كولي أمر:
          </p>
          <div className="space-y-3">
            {pendingLinks.map((link) => {
              const targetStudent = storage.getStudents().find((s) => s.id === link.student_id);
              return (
                <div key={link.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-amber-200 shadow-2xs">
                  <div>
                    <span className="font-bold text-slate-800 text-sm">{targetStudent?.profile?.full_name || 'طالب مجهول'}</span>
                    <span className="text-xs text-slate-500 mr-2">({targetStudent?.student_number})</span>
                    <Badge variant="warning" size="sm" className="mr-2">بانتظار موافقتك</Badge>
                    <p className="text-xs text-slate-500 mt-1">صلة القرابة: {link.relationship === 'father' ? 'أب' : link.relationship === 'mother' ? 'أم' : 'ولي أمر'}</p>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<UserCheck className="w-4 h-4" />}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => handleApproveLink(link.id)}
                    >
                      موافقة واعتماد الربط
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      icon={<UserX className="w-4 h-4" />}
                      onClick={() => handleRejectLink(link.id)}
                    >
                      رفض
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          {actionMessage && (
            <p className="mt-3 text-xs font-semibold text-emerald-800 bg-emerald-100/60 p-2 rounded-lg">
              {actionMessage}
            </p>
          )}
        </div>
      )}

      {/* Parent Welcome */}
      <div className="rounded-3xl bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white p-6 sm:p-8 shadow-xl">
        <div className="max-w-2xl">
          <Badge variant="success" size="sm" className="bg-emerald-400/20 text-emerald-200 border-emerald-400/30 mb-3">
            بوابة أولياء الأمور
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            أهلاً بك، {currentUser.full_name}
          </h1>
          <p className="mt-2 text-sm text-emerald-100">
            متابعة فورية ومباشرة للأداء الدراسي وسجل الحضور والتواصل مع معلمي الطالب {activeChild?.profile?.full_name}.
          </p>

          <div className="mt-5 flex flex-wrap gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              icon={<MessageSquare className="w-4 h-4" />}
              onClick={() => onNavigate('messages')}
            >
              مراسلة معلمي الطالب
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-white/10 text-white border-white/20 hover:bg-white/20"
              icon={<FileText className="w-4 h-4" />}
              onClick={() => onNavigate('reports')}
            >
              طباعة كشف الدرجات الرسمي
            </Button>
          </div>
        </div>
      </div>

      {/* Child Card Header */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <img
              src={activeChild?.profile?.avatar_url || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200'}
              alt={activeChild?.profile?.full_name}
              className="w-16 h-16 rounded-2xl object-cover ring-2 ring-emerald-500/20 shadow-sm"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">{activeChild?.profile?.full_name}</h3>
                <Badge variant="success">منتظم ونشط</Badge>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                الرقم المدرسي: <span className="font-semibold text-slate-700">{activeChild?.student_number}</span> | {activeChild?.class?.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('students')}
            >
              الملف الأكاديمي الكامل
            </Button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-2xl bg-emerald-50/60 p-4 border border-emerald-100 text-center">
            <p className="text-xs font-semibold text-emerald-800">المعدل العام التراكمي</p>
            <h4 className="mt-1 text-2xl font-black text-emerald-700">{avg}%</h4>
            <span className="text-[11px] font-bold text-emerald-600">تقدير: ممتاز مرتفع</span>
          </div>
          <div className="rounded-2xl bg-blue-50/60 p-4 border border-blue-100 text-center">
            <p className="text-xs font-semibold text-blue-800">نسبة الحضور</p>
            <h4 className="mt-1 text-2xl font-black text-blue-700">98%</h4>
            <span className="text-[11px] text-blue-600">التزام ممتاز بالدوام</span>
          </div>
          <div className="rounded-2xl bg-amber-50/60 p-4 border border-amber-100 text-center">
            <p className="text-xs font-semibold text-amber-800">أيام الغياب</p>
            <h4 className="mt-1 text-2xl font-black text-amber-700">0</h4>
            <span className="text-[11px] text-amber-600">خلال الفصل الحالي</span>
          </div>
          <div className="rounded-2xl bg-purple-50/60 p-4 border border-purple-100 text-center">
            <p className="text-xs font-semibold text-purple-800">الملاحظات التقديرية</p>
            <h4 className="mt-1 text-2xl font-black text-purple-700">{notes.length}</h4>
            <span className="text-[11px] text-purple-600">ملاحظات أكاديمية</span>
          </div>
        </div>
      </div>

      {/* Latest Published Exam Results */}
      <Card>
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-base">آخر نتائج الامتحانات المعتمدة والمعلنة</h3>
            <p className="text-xs text-slate-500">النتائج الرسمية المعتمدة من إدارة المدرسة</p>
          </div>
          <Badge variant="primary">معتمدة رسمياً</Badge>
        </div>

        <div className="mt-4 divide-y divide-slate-100">
          {grades.map((g) => {
            const ex = exams.find((e) => e.id === g.exam_id);
            return (
              <div key={g.id} className="py-3 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">{ex?.title}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    المادة: <span className="font-semibold text-slate-700">{ex?.subject_name}</span> | المعلم: {ex?.teacher_name}
                  </p>
                  {g.feedback && (
                    <p className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md mt-1 inline-block">
                      ملاحظة المعلم: {g.feedback}
                    </p>
                  )}
                </div>
                <div className="text-left">
                  <span className="text-xl font-extrabold text-blue-600">
                    {g.score}
                    <span className="text-xs text-slate-400 font-normal"> / {ex?.max_score}</span>
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">{ex?.date}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

// 4. STUDENT DASHBOARD
export const StudentDashboard: React.FC<DashboardProps> = ({ currentUser, onNavigate }) => {
  const students = storage.getStudents();
  const currentStudent = students.find((s) => s.profile_id === currentUser.id) || students[0];
  const exams = storage.getExams().filter((e) => e.status === 'published');
  const grades = storage.getGrades(undefined, currentStudent.id).filter((g) =>
    exams.some((e) => e.id === g.exam_id)
  );
  const assignments = storage.getAssignments(currentStudent.class_id);

  const totalScore = grades.reduce((acc, g) => acc + g.score, 0);
  const avg = grades.length > 0 ? (totalScore / grades.length).toFixed(1) : '94.2';

  return (
    <div className="space-y-6">
      {/* Student Welcome Header */}
      <div className="rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-8 shadow-xl">
        <div className="max-w-2xl">
          <Badge variant="primary" size="sm" className="bg-white/20 text-white border-white/20 mb-3">
            الصف الحادي عشر العلمي (أ)
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            أهلاً بك، {currentUser.full_name}
          </h1>
          <p className="mt-2 text-sm text-blue-100">
            الرقم الأكاديمي: {currentStudent.student_number} — تتبع جدول الحصص اليومي، الواجبات، ونتائج الاختبارات أولاً بأول.
          </p>

          <div className="mt-5 flex flex-wrap gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              icon={<Award className="w-4 h-4" />}
              onClick={() => onNavigate('exams')}
            >
              كشف درجاتي
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-white/10 text-white border-white/20 hover:bg-white/20"
              icon={<BookOpen className="w-4 h-4" />}
              onClick={() => onNavigate('assignments')}
            >
              واجباتي المدرسية ({assignments.length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-white/10 text-white border-white/20 hover:bg-white/20"
              icon={<Calendar className="w-4 h-4" />}
              onClick={() => onNavigate('calendar')}
            >
              الجدول الدراسي والامتحانات
            </Button>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="معدلي التراكمي الحالي"
          value={`${avg}%`}
          subtext="تقدير: ممتاز"
          icon={<Award className="w-5 h-5" />}
          color="emerald"
        />
        <StatCard
          title="نسبة التزام الحضور"
          value="98.5%"
          subtext="سجل خالٍ من الغياب غير المبرر"
          icon={<CalendarCheck className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="واجبات قيد التسليم"
          value={assignments.length}
          subtext="أحدث موعد: 3 نوفمبر"
          icon={<BookOpen className="w-5 h-5" />}
          color="purple"
        />
        <StatCard
          title="الامتحانات المعتمدة"
          value={grades.length}
          subtext="تم رصدها ونشرها"
          icon={<FileSpreadsheet className="w-5 h-5" />}
          color="amber"
        />
      </div>

      {/* Today's Timetable & Active Homework */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Schedule */}
        <Card>
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">جدول الحصص اليومي (الأحد)</h3>
              <p className="text-xs text-slate-500">الصف الحادي عشر العلمي (أ)</p>
            </div>
            <Badge variant="primary">دوام كامل</Badge>
          </div>

          <div className="mt-4 space-y-2.5">
            {[
              { period: 'الحصة 1 (08:00 - 08:45)', subject: 'الرياضيات التخصصية', teacher: 'أ. أحمد الشامي', room: 'قاعة 204' },
              { period: 'الحصة 2 (08:50 - 09:35)', subject: 'الفيزياء الحديثة', teacher: 'أ. محمود الكردي', room: 'مختبر الفيزياء' },
              { period: 'الحصة 3 (09:40 - 10:25)', subject: 'الكيمياء التحليلية', teacher: 'د. منى السعيد', room: 'مختبر الكيمياء' },
              { period: 'استراحة وإفطار (10:25 - 11:00)', subject: 'استراحة مدرسية', teacher: 'فناء المدرسة', room: '' },
              { period: 'الحصة 4 (11:00 - 11:45)', subject: 'الأحياء والوراثة', teacher: 'أ. رانية بركات', room: 'مختبر الأحياء' },
              { period: 'الحصة 5 (11:50 - 12:35)', subject: 'علوم الحاسوب والبرمجة', teacher: 'أ. طارق نجم', room: 'مختبر الحاسوب' }
            ].map((p, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition"
              >
                <div>
                  <span className="text-[11px] font-semibold text-blue-700 block">{p.period}</span>
                  <span className="text-xs font-bold text-slate-800">{p.subject}</span>
                </div>
                <div className="text-left text-xs text-slate-500">
                  <p>{p.teacher}</p>
                  {p.room && <span className="text-[10px] text-slate-400">{p.room}</span>}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Homework list */}
        <Card>
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">الواجبات والمشاريع القادمة</h3>
              <p className="text-xs text-slate-500">يرجى تسليم المهام قبل انقضاء الموعد النهائي</p>
            </div>
            <button
              onClick={() => onNavigate('assignments')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
            >
              عرض الكل
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {assignments.map((assign) => (
              <div key={assign.id} className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/50">
                <div className="flex items-start justify-between">
                  <h4 className="font-bold text-slate-900 text-xs">{assign.title}</h4>
                  <Badge variant="warning" size="sm">تسليم: {assign.due_date}</Badge>
                </div>
                <p className="mt-1 text-xs text-slate-600">{assign.description}</p>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                  <span>المادة: {assign.subject_name}</span>
                  <span>العلامة القصوى: {assign.max_points} نقاط</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
