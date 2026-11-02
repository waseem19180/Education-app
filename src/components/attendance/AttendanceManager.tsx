import React, { useState, useMemo } from 'react';
import { UserProfile, AttendanceStatus, AttendanceRecord } from '../../types/database';
import { storage } from '../../services/storage';
import { Card, Button, Badge } from '../common/UIComponents';
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Calendar,
  Save,
  Filter,
  ArrowRight,
  ArrowLeft,
  FileSpreadsheet,
  Users,
  ShieldCheck,
  UserCheck,
  CheckCheck,
  History,
  TrendingUp,
  FileText
} from 'lucide-react';

interface AttendanceManagerProps {
  currentUser: UserProfile;
}

export const AttendanceManager: React.FC<AttendanceManagerProps> = ({ currentUser }) => {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return '2026-11-01'; // Default simulation date
  });

  const allClasses = storage.getClasses();
  const allStudents = storage.getStudents();
  const allTeachers = storage.getTeachers();
  const allTeacherSubjects = storage.getTeacherSubjects();
  const allParents = storage.getParents();
  const allProfiles = storage.getProfiles();

  // Role permissions & authorized classes
  const isTeacher = currentUser.role === 'teacher';
  const isAdmin = currentUser.role === 'admin';
  const isStudent = currentUser.role === 'student';
  const isParent = currentUser.role === 'parent';

  // Classes teacher is authorized to teach
  const teacherRecord = useMemo(() => {
    return allTeachers.find((t) => t.profile_id === currentUser.id);
  }, [allTeachers, currentUser.id]);

  const authorizedClasses = useMemo(() => {
    if (isAdmin) return allClasses;
    if (isTeacher && teacherRecord) {
      const classIds = allTeacherSubjects
        .filter((ts) => ts.teacher_id === teacherRecord.id)
        .map((ts) => ts.class_id);
      return allClasses.filter((c) => classIds.includes(c.id));
    }
    return allClasses;
  }, [isAdmin, isTeacher, teacherRecord, allTeacherSubjects, allClasses]);

  const [selectedClassId, setSelectedClassId] = useState<string>(() => {
    return authorizedClasses.length > 0 ? authorizedClasses[0].id : 'class-11-sci-a';
  });

  const [activeTab, setActiveTab] = useState<'sheet' | 'history'>('sheet');
  const [isSavedSuccess, setIsSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Students in selected class
  const classStudents = useMemo(() => {
    return allStudents.filter((s) => s.class_id === selectedClassId);
  }, [allStudents, selectedClassId]);

  // Existing attendance records for this date and class
  const existingDayRecords = storage.getAttendance(selectedDate, selectedClassId);

  // Local state for daily student attendance entries
  const [studentStatuses, setStudentStatuses] = useState<
    Record<string, { status: AttendanceStatus; reason: string; notes: string }>
  >(() => {
    const map: Record<string, { status: AttendanceStatus; reason: string; notes: string }> = {};
    classStudents.forEach((st) => {
      const match = existingDayRecords.find((r) => r.student_id === st.id);
      map[st.id] = {
        status: match ? match.status : 'present',
        reason: match ? match.reason || '' : '',
        notes: match ? match.notes || '' : ''
      };
    });
    return map;
  });

  // Re-sync when date or class changes
  const handleDateOrClassChange = (newDate: string, newClassId: string) => {
    setSelectedDate(newDate);
    setSelectedClassId(newClassId);
    setIsSavedSuccess(false);
    setErrorMessage(null);

    const records = storage.getAttendance(newDate, newClassId);
    const targetStudents = allStudents.filter((s) => s.class_id === newClassId);
    const map: Record<string, { status: AttendanceStatus; reason: string; notes: string }> = {};

    targetStudents.forEach((st) => {
      const match = records.find((r) => r.student_id === st.id);
      map[st.id] = {
        status: match ? match.status : 'present',
        reason: match ? match.reason || '' : '',
        notes: match ? match.notes || '' : ''
      };
    });
    setStudentStatuses(map);
  };

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setStudentStatuses((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status
      }
    }));
  };

  const handleReasonChange = (studentId: string, reason: string) => {
    setStudentStatuses((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        reason
      }
    }));
  };

  const handleNotesChange = (studentId: string, notes: string) => {
    setStudentStatuses((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        notes
      }
    }));
  };

  const handleSetAllPresent = () => {
    const updated: Record<string, { status: AttendanceStatus; reason: string; notes: string }> = {};
    classStudents.forEach((st) => {
      updated[st.id] = {
        status: 'present',
        reason: '',
        notes: studentStatuses[st.id]?.notes || ''
      };
    });
    setStudentStatuses(updated);
  };

  const handleSaveAttendance = () => {
    try {
      setErrorMessage(null);
      const recordsToSave = classStudents.map((st) => ({
        student_id: st.id,
        status: studentStatuses[st.id]?.status || 'present',
        reason: studentStatuses[st.id]?.reason || '',
        notes: studentStatuses[st.id]?.notes || ''
      }));

      storage.saveBatchAttendance(selectedClassId, selectedDate, recordsToSave, currentUser);
      setIsSavedSuccess(true);
      setTimeout(() => setIsSavedSuccess(false), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'حدث خطأ أثناء حفظ سجل الحضور اليومي.');
    }
  };

  // Status visual styles & translations (4 official statuses)
  const statusOptions: { value: AttendanceStatus; label: string; icon: React.ReactNode; color: string }[] = [
    { value: 'present', label: 'حاضر', icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: 'emerald' },
    { value: 'absent', label: 'غائب', icon: <XCircle className="w-3.5 h-3.5" />, color: 'rose' },
    { value: 'late', label: 'متأخر', icon: <Clock className="w-3.5 h-3.5" />, color: 'amber' },
    { value: 'excused', label: 'غائب بعذر', icon: <AlertCircle className="w-3.5 h-3.5" />, color: 'blue' }
  ];

  // Daily statistics for the selected class and date
  const stats = useMemo(() => {
    const total = classStudents.length;
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let excusedCount = 0;

    classStudents.forEach((st) => {
      const stStatus = studentStatuses[st.id]?.status || 'present';
      if (stStatus === 'present') presentCount++;
      else if (stStatus === 'absent') absentCount++;
      else if (stStatus === 'late') lateCount++;
      else if (stStatus === 'excused') excusedCount++;
    });

    const rate = total > 0 ? Math.round(((presentCount + lateCount) / total) * 100) : 100;

    return {
      total,
      presentCount,
      absentCount,
      lateCount,
      excusedCount,
      rate
    };
  }, [classStudents, studentStatuses]);

  // Student-specific view (if logged in as Student)
  if (isStudent) {
    const studentObj = allStudents.find((s) => s.profile_id === currentUser.id);
    const studentRecords = studentObj ? storage.getAttendance(undefined, undefined, studentObj.id) : [];
    const studentPresent = studentRecords.filter((r) => r.status === 'present').length;
    const studentAbsent = studentRecords.filter((r) => r.status === 'absent').length;
    const studentLate = studentRecords.filter((r) => r.status === 'late').length;
    const studentExcused = studentRecords.filter((r) => r.status === 'excused').length;
    const studentRate = studentRecords.length > 0
      ? Math.round(((studentPresent + studentLate) / studentRecords.length) * 100)
      : 100;

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            سجل الحضور والغياب اليومي الخاص بي
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            متابعة أيام الدوام المدرسي، أوقات الحضور، والأعذار المعتمدة رسمياً
          </p>
        </div>

        {/* KPI Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="text-center p-3.5">
            <span className="text-[11px] text-slate-500 font-medium">نسبة الالتزام</span>
            <p className="text-2xl font-extrabold text-emerald-600 mt-1">{studentRate}%</p>
          </Card>
          <Card className="text-center p-3.5">
            <span className="text-[11px] text-slate-500 font-medium">أيام الحضور</span>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{studentPresent}</p>
          </Card>
          <Card className="text-center p-3.5">
            <span className="text-[11px] text-slate-500 font-medium">أيام الغياب</span>
            <p className="text-2xl font-extrabold text-rose-600 mt-1">{studentAbsent}</p>
          </Card>
          <Card className="text-center p-3.5">
            <span className="text-[11px] text-slate-500 font-medium">مرات التأخر</span>
            <p className="text-2xl font-extrabold text-amber-600 mt-1">{studentLate}</p>
          </Card>
        </div>

        {/* Daily Records List */}
        <Card>
          <h3 className="font-bold text-slate-900 text-sm mb-3">سجل الأيام الدراسية</h3>
          {studentRecords.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">لا توجد سجلات حضور مسجلة بعد.</div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {studentRecords.map((rec) => {
                const opt = statusOptions.find((o) => o.value === rec.status) || statusOptions[0];
                return (
                  <div key={rec.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-slate-50 text-slate-600 font-mono text-[11px]">
                        {rec.date}
                      </div>
                      <div>
                        <span className="font-bold text-slate-800">حضور اليوم الدراسي</span>
                        {rec.reason && (
                          <p className="text-[11px] text-slate-500 mt-0.5">سبب الغياب/التأخر: {rec.reason}</p>
                        )}
                      </div>
                    </div>
                    <Badge variant={opt.color === 'emerald' ? 'success' : opt.color === 'rose' ? 'danger' : opt.color === 'amber' ? 'warning' : 'info'}>
                      {opt.label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    );
  }

  // Parent view (if logged in as Parent)
  if (isParent) {
    const parentObj = allParents.find((p) => p.profile_id === currentUser.id);
    const myChildren = parentObj ? allStudents.filter((s) => s.parent_id === parentObj.id) : [];

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            سجل الحضور والغياب اليومي للأبناء
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            متابعة دقيقة لانتظام الأبناء في المدرسة مع إشعارات الغياب والتأخر
          </p>
        </div>

        {myChildren.map((child) => {
          const childProfile = allProfiles.find((p) => p.id === child.profile_id);
          const childRecords = storage.getAttendance(undefined, undefined, child.id);
          const present = childRecords.filter((r) => r.status === 'present').length;
          const absent = childRecords.filter((r) => r.status === 'absent').length;
          const late = childRecords.filter((r) => r.status === 'late').length;
          const rate = childRecords.length > 0 ? Math.round(((present + late) / childRecords.length) * 100) : 100;

          return (
            <Card key={child.id} className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm">
                    {childProfile?.full_name?.charAt(0) || 'ط'}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{childProfile?.full_name}</h3>
                    <p className="text-[11px] text-slate-500">
                      الرقم الأكاديمي: {child.student_number} | الصف الحادي عشر العلمي
                    </p>
                  </div>
                </div>
                <Badge variant={rate >= 90 ? 'success' : rate >= 75 ? 'warning' : 'danger'}>
                  معدل الانضباط: {rate}%
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50">
                  <span className="text-[10px] text-slate-500">حاضر</span>
                  <p className="font-bold text-emerald-600 mt-0.5">{present} يوم</p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50">
                  <span className="text-[10px] text-slate-500">غائب</span>
                  <p className="font-bold text-rose-600 mt-0.5">{absent} يوم</p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50">
                  <span className="text-[10px] text-slate-500">متأخر</span>
                  <p className="font-bold text-amber-600 mt-0.5">{late} يوم</p>
                </div>
              </div>

              <div className="divide-y divide-slate-100 text-xs">
                {childRecords.slice(0, 5).map((rec) => {
                  const opt = statusOptions.find((o) => o.value === rec.status) || statusOptions[0];
                  return (
                    <div key={rec.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-slate-800">{rec.date}</span>
                        {rec.reason && <p className="text-[11px] text-slate-500">{rec.reason}</p>}
                      </div>
                      <Badge variant={opt.color === 'emerald' ? 'success' : opt.color === 'rose' ? 'danger' : opt.color === 'amber' ? 'warning' : 'info'}>
                        {opt.label}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>
    );
  }

  // Teacher & Admin Management Interface
  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>نظام الحضور والغياب اليومي الموحد</span>
            <Badge variant="info">سجل يومي واحد لكل طالب</Badge>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            تسجيل ومراجعة حضور وغياب الطلاب لليوم الدراسي بالكامل مع التوثيق الرقابي الصارم
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-2xl w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('sheet')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition ${
              activeTab === 'sheet' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            كشف الرصد اليومي
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition ${
              activeTab === 'history' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            السجلات والإحصائيات السابقة
          </button>
        </div>
      </div>

      {/* Teacher scope notice */}
      {isTeacher && (
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            بصفتك معلماً، يمكنك تسجيل ومراجعة الحضور والغياب للشعب المسندة إليك في جدول الحصص فقط.
          </span>
        </div>
      )}

      {/* Control Bar: Class & Date Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {/* Date Picker */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              تاريخ اليوم الدراسي
            </label>
            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateOrClassChange(e.target.value, selectedClassId)}
                className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              />
            </div>
          </div>

          {/* Section / Class Selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              الشعبة الدراسية
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => handleDateOrClassChange(selectedDate, e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              {authorizedClasses.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} ({cls.room_number})
                </option>
              ))}
            </select>
          </div>

          {/* Quick Actions */}
          <div className="flex items-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={<CheckCheck className="w-3.5 h-3.5 text-emerald-600" />}
              onClick={handleSetAllPresent}
              className="w-full"
            >
              تحديد الكل حاضر
            </Button>
          </div>
        </div>
      </Card>

      {/* Error / Success Notifications */}
      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {isSavedSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>تم حفظ سجل الحضور والغياب اليومي بنجاح وتوثيق العملية في سجل التدقيق الأمني.</span>
        </div>
      )}

      {/* TAB 1: DAILY ATTENDANCE SHEET */}
      {activeTab === 'sheet' && (
        <div className="space-y-4">
          {/* Daily Summary Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center">
            <Card className="p-3">
              <span className="text-[10px] text-slate-500 font-bold">إجمالي طلاب الشعبة</span>
              <p className="text-xl font-extrabold text-slate-900 mt-0.5">{stats.total}</p>
            </Card>
            <Card className="p-3 border-emerald-100 bg-emerald-50/20">
              <span className="text-[10px] text-emerald-700 font-bold">حاضر</span>
              <p className="text-xl font-extrabold text-emerald-600 mt-0.5">{stats.presentCount}</p>
            </Card>
            <Card className="p-3 border-rose-100 bg-rose-50/20">
              <span className="text-[10px] text-rose-700 font-bold">غائب بدون عذر</span>
              <p className="text-xl font-extrabold text-rose-600 mt-0.5">{stats.absentCount}</p>
            </Card>
            <Card className="p-3 border-amber-100 bg-amber-50/20">
              <span className="text-[10px] text-amber-700 font-bold">متأخر</span>
              <p className="text-xl font-extrabold text-amber-600 mt-0.5">{stats.lateCount}</p>
            </Card>
            <Card className="p-3 border-blue-100 bg-blue-50/20">
              <span className="text-[10px] text-blue-700 font-bold">غائب بعذر</span>
              <p className="text-xl font-extrabold text-blue-600 mt-0.5">{stats.excusedCount}</p>
            </Card>
          </div>

          {/* Roster Table */}
          <Card className="overflow-hidden p-0 border border-slate-200">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="font-bold text-xs text-slate-800">
                  كشف أسماء الطلاب ({classStudents.length} طالباً)
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                التاريخ: {selectedDate}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">الطالب</th>
                    <th className="py-2.5 px-3">الرقم الأكاديمي</th>
                    <th className="py-2.5 px-3 text-center">حالة الحضور اليومي</th>
                    <th className="py-2.5 px-3">سبب الغياب / التأخر والملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classStudents.map((st, idx) => {
                    const stProfile = allProfiles.find((p) => p.id === st.profile_id);
                    const currentStatus = studentStatuses[st.id]?.status || 'present';
                    const currentReason = studentStatuses[st.id]?.reason || '';
                    const currentNotes = studentStatuses[st.id]?.notes || '';

                    return (
                      <tr key={st.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-3 font-mono text-slate-400 text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-slate-200 overflow-hidden shrink-0">
                              {stProfile?.avatar_url ? (
                                <img
                                  src={stProfile.avatar_url}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center font-bold text-[10px] text-slate-600">
                                  {stProfile?.full_name?.charAt(0) || 'ط'}
                                </div>
                              )}
                            </div>
                            <span className="font-bold text-slate-900">
                              {stProfile?.full_name || 'طالب'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-500 text-[11px]">
                          {st.student_number}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {statusOptions.map((opt) => {
                              const isSelected = currentStatus === opt.value;
                              const btnColorClass = isSelected
                                ? opt.value === 'present'
                                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                                  : opt.value === 'absent'
                                  ? 'bg-rose-600 text-white shadow-xs font-bold'
                                  : opt.value === 'late'
                                  ? 'bg-amber-600 text-white shadow-xs font-bold'
                                  : 'bg-blue-600 text-white shadow-xs font-bold'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200';

                              return (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => handleStatusChange(st.id, opt.value)}
                                  className={`px-2.5 py-1 text-[11px] rounded-lg transition flex items-center gap-1 cursor-pointer ${btnColorClass}`}
                                >
                                  {opt.icon}
                                  <span>{opt.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          {currentStatus !== 'present' ? (
                            <div className="space-y-1">
                              <input
                                type="text"
                                placeholder={
                                  currentStatus === 'late'
                                    ? 'سبب التأخر (مثال: عطل في الحافلة)'
                                    : 'سبب الغياب / العذر المقدم'
                                }
                                value={currentReason}
                                onChange={(e) => handleReasonChange(st.id, e.target.value)}
                                className="w-full text-xs px-2.5 py-1 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                              />
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">
                              منتظم في الدوام المدرسي
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom Save Action Bar */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-[11px] text-slate-500">
                يتم تثبيت السجل باسم المستخدم الحالي (<strong>{currentUser.full_name}</strong>) في سجل التدقيق الأمني.
              </div>

              <Button
                type="button"
                variant="primary"
                size="md"
                icon={<Save className="w-4 h-4" />}
                onClick={handleSaveAttendance}
                className="w-full sm:w-auto"
              >
                حفظ سجل الحضور اليومي
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: ATTENDANCE HISTORY & STATS */}
      {activeTab === 'history' && (
        <Card className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">مراجعة السجلات التاريخية للشعبة</h3>
              <p className="text-xs text-slate-500">
                إحصائيات الغياب والتأخر التراكمية لطلاب {allClasses.find((c) => c.id === selectedClassId)?.name}
              </p>
            </div>
            <Badge variant="info">سجلات الحضور اليومي</Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">الطالب</th>
                  <th className="py-2.5 px-3">الرقم الأكاديمي</th>
                  <th className="py-2.5 px-3 text-center">أيام الحضور</th>
                  <th className="py-2.5 px-3 text-center">مرات الغياب</th>
                  <th className="py-2.5 px-3 text-center">مرات التأخر</th>
                  <th className="py-2.5 px-3 text-center">غياب بعذر</th>
                  <th className="py-2.5 px-3 text-center">نسبة الالتزام</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classStudents.map((st) => {
                  const stProfile = allProfiles.find((p) => p.id === st.profile_id);
                  const stRecords = storage.getAttendance(undefined, selectedClassId, st.id);
                  const pCount = stRecords.filter((r) => r.status === 'present').length;
                  const aCount = stRecords.filter((r) => r.status === 'absent').length;
                  const lCount = stRecords.filter((r) => r.status === 'late').length;
                  const eCount = stRecords.filter((r) => r.status === 'excused').length;
                  const totalDays = stRecords.length;
                  const rate = totalDays > 0 ? Math.round(((pCount + lCount) / totalDays) * 100) : 100;

                  return (
                    <tr key={st.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {stProfile?.full_name}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">
                        {st.student_number}
                      </td>
                      <td className="py-2.5 px-3 text-center text-emerald-600 font-bold">
                        {pCount}
                      </td>
                      <td className="py-2.5 px-3 text-center text-rose-600 font-bold">
                        {aCount}
                      </td>
                      <td className="py-2.5 px-3 text-center text-amber-600 font-bold">
                        {lCount}
                      </td>
                      <td className="py-2.5 px-3 text-center text-blue-600 font-bold">
                        {eCount}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge variant={rate >= 90 ? 'success' : rate >= 75 ? 'warning' : 'danger'}>
                          {rate}%
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
