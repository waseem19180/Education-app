import React, { useState } from 'react';
import { UserProfile, SchoolClass, UserRole, ParentStudentLink, ParentRelationship } from '../../types/database';
import { storage } from '../../services/storage';
import { Card, Badge, Button, Modal, StatCard } from '../common/UIComponents';
import {
  ShieldCheck,
  Users,
  GraduationCap,
  UserCheck,
  UserPlus,
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Link,
  Unlink,
  Clock,
  Edit2,
  Lock,
  Mail,
  Phone,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

interface UsersPermissionsManagerProps {
  currentUser: UserProfile;
}

type TabType = 'pending' | 'admins' | 'teachers' | 'students' | 'parents' | 'audit';

export const UsersPermissionsManager: React.FC<UsersPermissionsManagerProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modals
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [targetUserForRole, setTargetUserForRole] = useState<UserProfile | null>(null);
  const [selectedNewRole, setSelectedNewRole] = useState<UserRole>('teacher');

  const [showLinkParentModal, setShowLinkParentModal] = useState(false);
  const [selectedStudentForLink, setSelectedStudentForLink] = useState<string>('');
  const [parentSearchTerm, setParentSearchTerm] = useState('');
  const [selectedParentId, setSelectedParentId] = useState('');
  const [relationshipType, setRelationshipType] = useState<ParentRelationship>('father');
  const [linkNotes, setLinkNotes] = useState('');

  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [targetLinkId, setTargetLinkId] = useState<string>('');
  const [revokeReason, setRevokeReason] = useState('');

  // Data
  const profiles = storage.getProfiles();
  const students = storage.getStudents();
  const classes = storage.getClasses();
  const teachers = storage.getTeachers();
  const parents = storage.getParents();
  const links = storage.getParentStudentLinks();
  const auditLogs = storage.getAuditLogs().filter((l) =>
    ['ASSIGN_ADMIN', 'ASSIGN_TEACHER', 'APPROVE_USER', 'LINK_STUDENT_CLASS', 'CREATE_PARENT_LINK', 'VERIFY_PARENT_LINK', 'REVOKE_PARENT_LINK', 'UPDATE_USER_ROLE', 'UPDATE_USER_DATA'].includes(l.action)
  );

  const pendingProfiles = profiles.filter((p) => p.approval_status === 'pending_approval' || (!p.is_active && p.approval_status !== 'rejected'));
  const adminProfiles = profiles.filter((p) => p.role === 'admin');
  const teacherProfiles = profiles.filter((p) => p.role === 'teacher' && p.approval_status !== 'pending_approval');
  const studentProfiles = profiles.filter((p) => p.role === 'student' && p.approval_status !== 'pending_approval');
  const parentProfiles = profiles.filter((p) => p.role === 'parent' && p.approval_status !== 'pending_approval');

  // Handle Approve User
  const handleApprove = (profileId: string) => {
    const res = storage.approveUserProfile(currentUser, profileId);
    if (res.success) {
      setMessage({ text: 'تم اعتماد وتفعيل الحساب بنجاح.', type: 'success' });
    } else {
      setMessage({ text: res.error || 'فشل الاعتماد', type: 'error' });
    }
    setTimeout(() => setMessage(null), 4000);
  };

  // Handle Role Change
  const handleChangeRole = () => {
    if (!targetUserForRole) return;
    const res = storage.updateUserRole(currentUser, targetUserForRole.id, selectedNewRole);
    if (res.success) {
      setMessage({ text: `تم تحديث رتبة ${targetUserForRole.full_name} إلى ${selectedNewRole} بنجاح.`, type: 'success' });
      setShowRoleModal(false);
      setTargetUserForRole(null);
    } else {
      setMessage({ text: res.error || 'فشلت عملية تغيير الرتبة', type: 'error' });
    }
    setTimeout(() => setMessage(null), 4500);
  };

  // Handle Create Parent Link
  const handleCreateParentLink = () => {
    if (!selectedStudentForLink || !selectedParentId) {
      setMessage({ text: 'يرجى اختيار الطالب وحساب ولي الأمر.', type: 'error' });
      return;
    }

    const res = storage.createParentStudentLink(
      {
        parent_id: selectedParentId,
        student_id: selectedStudentForLink,
        relationship: relationshipType,
        notes: linkNotes
      },
      currentUser
    );

    if (res.success) {
      setMessage({ text: 'تم إنشاء واعتماد رابط ولي الأمر بالطالب بنجاح.', type: 'success' });
      setShowLinkParentModal(false);
      setSelectedParentId('');
      setSelectedStudentForLink('');
      setLinkNotes('');
      setParentSearchTerm('');
    } else {
      setMessage({ text: res.error || 'فشل إنشاء الرابط', type: 'error' });
    }
    setTimeout(() => setMessage(null), 4000);
  };

  // Handle Revoke Link
  const handleRevokeLink = () => {
    if (!targetLinkId) return;
    const res = storage.revokeParentStudentLink(targetLinkId, currentUser, revokeReason);
    if (res.success) {
      setMessage({ text: 'تم إلغاء ارتباط ولي الأمر بنجاح وتوثيق ذلك في سجل التدقيق.', type: 'success' });
      setShowRevokeModal(false);
      setTargetLinkId('');
      setRevokeReason('');
    } else {
      setMessage({ text: res.error || 'فشل إلغاء الرابط', type: 'error' });
    }
    setTimeout(() => setMessage(null), 4000);
  };

  // Parent search results
  const searchedParents = parentSearchTerm.trim().length > 0
    ? storage.searchParents(parentSearchTerm, currentUser)
    : [];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-2">
            <ShieldCheck className="w-4 h-4" />
            <span>نظام الصلاحيات والحوكمة المدرسية</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            إدارة المستخدمين والصلاحيات
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            إدارة الكادر الإداري والتعليمي، اعتماد حسابات الطلاب، وضبط روابط أولياء الأمور وحماية الصلاحيات
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            icon={<Link className="w-4 h-4" />}
            onClick={() => setShowLinkParentModal(true)}
          >
            ربط ولي أمر بطالب
          </Button>
        </div>
      </div>

      {/* Notification Toast */}
      {message && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2 font-semibold">
            {message.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-600 font-bold">×</button>
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard
          title="بانتظار الاعتماد"
          value={pendingProfiles.length}
          subtext="حسابات بحاجة لمراجعة"
          icon={<Clock className="w-5 h-5" />}
          color={pendingProfiles.length > 0 ? 'amber' : 'slate'}
        />
        <StatCard
          title="مسؤولو النظام"
          value={adminProfiles.length}
          subtext="صلاحيات إدارة عليا"
          icon={<ShieldCheck className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="المعلمون"
          value={teacherProfiles.length}
          subtext="كادر تدريسي معتمد"
          icon={<GraduationCap className="w-5 h-5" />}
          color="purple"
        />
        <StatCard
          title="الطلاب"
          value={studentProfiles.length}
          subtext="طلاب مسجلون"
          icon={<Users className="w-5 h-5" />}
          color="emerald"
        />
        <StatCard
          title="روابط أولياء الأمور"
          value={links.filter((l) => l.status === 'active').length}
          subtext="علاقات مفعلة وموثقة"
          icon={<Link className="w-5 h-5" />}
          color="blue"
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto text-xs font-semibold gap-2 pb-px">
        <button
          onClick={() => { setActiveTab('pending'); setSearchTerm(''); }}
          className={`py-3 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
            activeTab === 'pending'
              ? 'border-amber-600 text-amber-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>بانتظار الاعتماد</span>
          {pendingProfiles.length > 0 && (
            <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
              {pendingProfiles.length}
            </span>
          )}
        </button>

        <button
          onClick={() => { setActiveTab('admins'); setSearchTerm(''); }}
          className={`py-3 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
            activeTab === 'admins'
              ? 'border-blue-600 text-blue-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>المدراء ({adminProfiles.length})</span>
        </button>

        <button
          onClick={() => { setActiveTab('teachers'); setSearchTerm(''); }}
          className={`py-3 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
            activeTab === 'teachers'
              ? 'border-purple-600 text-purple-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>المعلمون ({teacherProfiles.length})</span>
        </button>

        <button
          onClick={() => { setActiveTab('students'); setSearchTerm(''); }}
          className={`py-3 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
            activeTab === 'students'
              ? 'border-emerald-600 text-emerald-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>الطلاب ({studentProfiles.length})</span>
        </button>

        <button
          onClick={() => { setActiveTab('parents'); setSearchTerm(''); }}
          className={`py-3 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
            activeTab === 'parents'
              ? 'border-slate-800 text-slate-900 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>أولياء الأمور ({parentProfiles.length})</span>
        </button>

        <button
          onClick={() => { setActiveTab('audit'); setSearchTerm(''); }}
          className={`py-3 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap transition ${
            activeTab === 'audit'
              ? 'border-rose-600 text-rose-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>سجل الرقابة الإدارية ({auditLogs.length})</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      {activeTab !== 'audit' && (
        <div className="relative">
          <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="البحث بالاسم الكامل أو البريد الإلكتروني أو المعرف..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-10 pl-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs focus:outline-hidden focus:border-blue-500 shadow-xs"
          />
        </div>
      )}

      {/* TAB 1: PENDING ACCOUNTS */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          {pendingProfiles.length === 0 ? (
            <Card className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800">لا توجد حسابات جديدة بانتظار الاعتماد</h3>
              <p className="text-xs text-slate-500 mt-1">كافة الحسابات في النظام معتمدة ومفعلة رسمياً</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingProfiles
                .filter((p) => p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || p.email.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((p) => (
                  <Card key={p.id} className="border-amber-200 bg-amber-50/20 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <img
                            src={p.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120'}
                            alt={p.full_name}
                            className="w-10 h-10 rounded-xl object-cover border border-amber-200"
                          />
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">{p.full_name}</h4>
                            <p className="text-xs text-slate-500 font-mono mt-0.5">{p.email}</p>
                          </div>
                        </div>
                        <Badge variant="warning" size="sm">بانتظار الاعتماد</Badge>
                      </div>

                      <div className="mt-3 bg-white p-2.5 rounded-xl border border-slate-100 text-xs space-y-1">
                        <div className="flex justify-between text-slate-600">
                          <span>الرتبة المحددة:</span>
                          <span className="font-bold text-slate-800">{p.role === 'student' ? 'طالب' : p.role === 'parent' ? 'ولي أمر' : p.role}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>تاريخ التسجيل:</span>
                          <span className="font-mono text-slate-500 text-[11px]">{new Date(p.created_at).toLocaleDateString('ar-EG')}</span>
                        </div>
                        {p.phone && (
                          <div className="flex justify-between text-slate-600">
                            <span>الهاتف:</span>
                            <span className="font-mono text-slate-600 text-[11px]">{p.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-amber-100 flex items-center justify-end gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        icon={<CheckCircle className="w-4 h-4" />}
                        onClick={() => handleApprove(p.id)}
                      >
                        اعتماد وتفعيل الحساب
                      </Button>
                    </div>
                  </Card>
                ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ADMINS */}
      {activeTab === 'admins' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-blue-50/70 p-3.5 rounded-2xl border border-blue-200 text-xs text-blue-900">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-700" />
              <span>
                <strong>ضمان الأمان:</strong> محمي بحاجز منع حذف آخر مدير نشط. لا يمكن للنظام خفض رتبة أو تعطيل آخر مسؤول نشط.
              </span>
            </div>
            <Badge variant="primary">حماية مشددة</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {adminProfiles
              .filter((p) => p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || p.email.toLowerCase().includes(searchTerm.toLowerCase()))
              .map((admin) => {
                const isOnlyOne = adminProfiles.length === 1;
                return (
                  <Card key={admin.id} className="relative border-blue-100 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <img
                            src={admin.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120'}
                            alt={admin.full_name}
                            className="w-10 h-10 rounded-xl object-cover border border-blue-200"
                          />
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">{admin.full_name}</h4>
                            <p className="text-xs text-slate-500 font-mono">{admin.email}</p>
                          </div>
                        </div>
                        <Badge variant="primary" size="sm">مسؤول نظام</Badge>
                      </div>

                      <div className="mt-4 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                        <div className="flex justify-between text-slate-600">
                          <span>المعرف الداخلي:</span>
                          <span className="font-mono text-slate-500 text-[11px] truncate max-w-[120px]">{admin.id}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>حالة الحماية:</span>
                          <span className="font-semibold text-emerald-700 flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            {isOnlyOne ? 'المدير الأساسي (محمي)' : 'مدير معتمد'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        {isOnlyOne ? 'لا يمكن خفض الرتبة' : 'صلاحيات كاملة'}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isOnlyOne}
                        icon={<Edit2 className="w-3.5 h-3.5" />}
                        onClick={() => {
                          setTargetUserForRole(admin);
                          setSelectedNewRole('teacher');
                          setShowRoleModal(true);
                        }}
                      >
                        تعديل الرتبة
                      </Button>
                    </div>
                  </Card>
                );
              })}
          </div>
        </div>
      )}

      {/* TAB 3: TEACHERS */}
      {activeTab === 'teachers' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teacherProfiles
              .filter((p) => p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || p.email.toLowerCase().includes(searchTerm.toLowerCase()))
              .map((tProf) => {
                const teacherObj = teachers.find((t) => t.profile_id === tProf.id);
                const teacherSubs = storage.getTeacherSubjects().filter((ts) => ts.teacher_id === teacherObj?.id);
                return (
                  <Card key={tProf.id} className="flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <img
                            src={tProf.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120'}
                            alt={tProf.full_name}
                            className="w-10 h-10 rounded-xl object-cover border border-purple-200"
                          />
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">{tProf.full_name}</h4>
                            <p className="text-xs text-slate-500 font-mono">{tProf.email}</p>
                          </div>
                        </div>
                        <Badge variant="secondary" size="sm">معلم</Badge>
                      </div>

                      <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1.5">
                        <div className="text-slate-600">
                          <span className="font-semibold text-slate-700">التخصص: </span>
                          <span>{teacherObj?.specialization || 'المواد العلمية'}</span>
                        </div>
                        <div className="text-slate-600">
                          <span className="font-semibold text-slate-700">الشعب المسندة: </span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {teacherSubs.map((ts) => (
                              <span key={ts.id} className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded-md font-semibold text-blue-700">
                                {ts.subject?.name} - {ts.class?.name?.includes('أ') ? 'شعبة (أ)' : 'شعبة (ب)'}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-blue-700 border-blue-200 hover:bg-blue-50"
                        icon={<ShieldCheck className="w-3.5 h-3.5" />}
                        onClick={() => {
                          setTargetUserForRole(tProf);
                          setSelectedNewRole('admin');
                          setShowRoleModal(true);
                        }}
                      >
                        ترقية إلى مدير
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Edit2 className="w-3.5 h-3.5" />}
                        onClick={() => {
                          setTargetUserForRole(tProf);
                          setSelectedNewRole('student');
                          setShowRoleModal(true);
                        }}
                      >
                        تعديل الرتبة
                      </Button>
                    </div>
                  </Card>
                );
              })}
          </div>
        </div>
      )}

      {/* TAB 4: STUDENTS */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {students
              .filter((st) => st.profile?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || st.student_number.toLowerCase().includes(searchTerm.toLowerCase()))
              .map((st) => {
                const stLinks = links.filter((l) => l.student_id === st.id && l.status === 'active');
                return (
                  <Card key={st.id} className="flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{st.profile?.full_name}</h4>
                          <span className="text-[11px] font-mono text-slate-400">الرقم المدرسي: {st.student_number}</span>
                        </div>
                        <Badge variant="primary" size="sm">{st.class?.name || 'الحادي عشر'}</Badge>
                      </div>

                      <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600 font-semibold">أولياء الأمور المرتبطون:</span>
                          <span className="text-blue-700 font-bold">{stLinks.length}</span>
                        </div>
                        <div className="space-y-1">
                          {stLinks.length === 0 ? (
                            <p className="text-[11px] text-amber-700 bg-amber-50 p-1.5 rounded-md">لا يوجد ولي أمر مرتبط حالياً</p>
                          ) : (
                            stLinks.map((l) => (
                              <div key={l.id} className="flex items-center justify-between bg-white p-1.5 rounded-lg border border-slate-200 text-[11px]">
                                <span className="font-semibold text-slate-800">{l.parent_profile?.full_name || 'ولي الأمر'}</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-400 text-[10px]">
                                    {l.relationship === 'father' ? 'أب' : l.relationship === 'mother' ? 'أم' : 'وصي'}
                                  </span>
                                  <button
                                    onClick={() => {
                                      setTargetLinkId(l.id);
                                      setShowRevokeModal(true);
                                    }}
                                    className="text-rose-600 hover:text-rose-800 font-bold"
                                    title="إلغاء الارتباط"
                                  >
                                    <Unlink className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<Link className="w-3.5 h-3.5" />}
                        onClick={() => {
                          setSelectedStudentForLink(st.id);
                          setShowLinkParentModal(true);
                        }}
                      >
                        ربط ولي أمر
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (st.profile) {
                            setTargetUserForRole(st.profile);
                            setSelectedNewRole('teacher');
                            setShowRoleModal(true);
                          }
                        }}
                      >
                        تعديل الدور
                      </Button>
                    </div>
                  </Card>
                );
              })}
          </div>
        </div>
      )}

      {/* TAB 5: PARENTS */}
      {activeTab === 'parents' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {parentProfiles
              .filter((p) => p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || p.email.toLowerCase().includes(searchTerm.toLowerCase()))
              .map((parent) => {
                const parentLinks = links.filter((l) => l.parent_id === parent.id && l.status === 'active');
                return (
                  <Card key={parent.id} className="flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <img
                            src={parent.avatar_url || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=120'}
                            alt={parent.full_name}
                            className="w-10 h-10 rounded-xl object-cover border border-slate-200"
                          />
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">{parent.full_name}</h4>
                            <p className="text-xs text-slate-500 font-mono">{parent.email}</p>
                          </div>
                        </div>
                        <Badge variant="neutral" size="sm">ولي أمر</Badge>
                      </div>

                      <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1.5">
                        <div className="flex justify-between text-slate-600">
                          <span>الطلاب المرتبطون:</span>
                          <span className="font-bold text-blue-700">{parentLinks.length}</span>
                        </div>
                        <div className="space-y-1">
                          {parentLinks.map((l) => (
                            <div key={l.id} className="bg-white p-1.5 rounded-lg border border-slate-100 text-[11px] flex items-center justify-between">
                              <span className="font-semibold text-slate-800">{l.student?.profile?.full_name || 'طالب'}</span>
                              <span className="text-slate-400 text-[10px]">{l.student?.class?.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Edit2 className="w-3.5 h-3.5" />}
                        onClick={() => {
                          setTargetUserForRole(parent);
                          setSelectedNewRole('teacher');
                          setShowRoleModal(true);
                        }}
                      >
                        تعديل الرتبة
                      </Button>
                    </div>
                  </Card>
                );
              })}
          </div>
        </div>
      )}

      {/* TAB 6: AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <Card className="p-0 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">سجل تدقيق عمليات إدارة المستخدمين والصلاحيات</h3>
              <p className="text-xs text-slate-500">توثيق شامل لمن عيّن من، متى، ومعرّفات العمليات لضمان المحاسبة والنزاهة</p>
            </div>
            <Badge variant="danger">سجل غير قابل للتعديل</Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100/70 border-b border-slate-200 font-bold text-slate-700">
                <tr>
                  <th className="py-3 px-4">التاريخ والوقت</th>
                  <th className="py-3 px-4">المنفذ</th>
                  <th className="py-3 px-4">نوع العملية</th>
                  <th className="py-3 px-4">تفاصيل الإجراء والمستفيد</th>
                  <th className="py-3 px-4 text-center">الرقم التعريفي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('ar-EG')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{log.actor_name}</div>
                      <span className="text-[10px] text-blue-700 font-semibold">{log.actor_role}</span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          log.action.includes('ADMIN')
                            ? 'primary'
                            : log.action.includes('REVOKE')
                            ? 'danger'
                            : log.action.includes('LINK')
                            ? 'success'
                            : 'neutral'
                        }
                        size="sm"
                      >
                        {log.action}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-700 max-w-md">{log.details}</td>
                    <td className="py-3 px-4 text-center font-mono text-[10px] text-slate-400">{log.record_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* MODAL 1: CHANGE USER ROLE */}
      {showRoleModal && targetUserForRole && (
        <Modal
          isOpen={showRoleModal}
          onClose={() => { setShowRoleModal(false); setTargetUserForRole(null); }}
          title={`تعديل صلاحيات ورتبة: ${targetUserForRole.full_name}`}
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">البريد الإلكتروني:</span>
                <span className="font-mono text-slate-800">{targetUserForRole.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">الرتبة الحالية:</span>
                <span className="font-bold text-blue-700">{targetUserForRole.role}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">اختر الرتبة الجديدة:</label>
              <select
                value={selectedNewRole}
                onChange={(e) => setSelectedNewRole(e.target.value as UserRole)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white font-semibold"
              >
                <option value="admin">مسؤول نظام (Admin) — صلاحيات شاملة</option>
                <option value="teacher">معلم (Teacher) — صلاحيات صفوف ومواد</option>
                <option value="parent">ولي أمر (Parent) — متابعة الأبناء فقط</option>
                <option value="student">طالب (Student) — طالب مدرسي</option>
              </select>
            </div>

            {targetUserForRole.role === 'admin' && selectedNewRole !== 'admin' && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  تنبيه أمني: إذا كان هذا المستخدم هو آخر مدير نشط في النظام، فسيتم رفض العملية حماية للمنصة.
                </span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="ghost" size="sm" onClick={() => setShowRoleModal(false)}>إلغاء</Button>
              <Button variant="primary" size="sm" onClick={handleChangeRole}>تأكيد تغيير الرتبة</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 2: LINK PARENT TO STUDENT */}
      {showLinkParentModal && (
        <Modal
          isOpen={showLinkParentModal}
          onClose={() => setShowLinkParentModal(false)}
          title="ربط ولي أمر بطالب (صلاحيات الإدارة)"
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">اختر الطالب:</label>
              <select
                value={selectedStudentForLink}
                onChange={(e) => setSelectedStudentForLink(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white font-semibold"
              >
                <option value="">-- اختر الطالب --</option>
                {students.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.profile?.full_name} ({st.student_number}) - {st.class?.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">البحث عن حساب ولي الأمر:</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ابحث بالاسم أو البريد الإلكتروني..."
                  value={parentSearchTerm}
                  onChange={(e) => setParentSearchTerm(e.target.value)}
                  className="w-full pr-9 pl-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50"
                />
              </div>

              {/* Search Results */}
              <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto">
                {searchedParents.map((parent) => (
                  <div
                    key={parent.id}
                    onClick={() => setSelectedParentId(parent.id)}
                    className={`p-2 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition ${
                      selectedParentId === parent.id
                        ? 'border-blue-600 bg-blue-50/70 font-bold'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="text-slate-900">{parent.full_name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{parent.email}</div>
                    </div>
                    <Badge variant={selectedParentId === parent.id ? 'primary' : 'neutral'} size="sm">
                      {selectedParentId === parent.id ? 'تم الاختيار' : 'اختيار'}
                    </Badge>
                  </div>
                ))}
                {parentSearchTerm && searchedParents.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-2">لا توجد حسابات أولياء أمور مطابقة للبحث</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">صفة القرابة:</label>
                <select
                  value={relationshipType}
                  onChange={(e) => setRelationshipType(e.target.value as ParentRelationship)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white font-semibold"
                >
                  <option value="father">أب (Father)</option>
                  <option value="mother">أم (Mother)</option>
                  <option value="guardian">وصي شرعي / كفيل (Guardian)</option>
                  <option value="other">أخرى (Other)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات التحقق والاعتماد:</label>
                <input
                  type="text"
                  placeholder="مطابقة الهوية أو الوثائق الرسمية..."
                  value={linkNotes}
                  onChange={(e) => setLinkNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="ghost" size="sm" onClick={() => setShowLinkParentModal(false)}>إلغاء</Button>
              <Button variant="primary" size="sm" onClick={handleCreateParentLink}>اعتماد وحفظ الرابط</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 3: REVOKE LINK CONFIRMATION */}
      {showRevokeModal && (
        <Modal
          isOpen={showRevokeModal}
          onClose={() => setShowRevokeModal(false)}
          title="تأكيد إلغاء ارتباط ولي الأمر"
          maxWidth="sm"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              هل أنت متأكد من إلغاء ارتباط ولي الأمر بهذا الطالب؟ لن يتمكن ولي الأمر من الاطلاع على نتائج الطالب أو متابعته حتى يتم إعادة ربطه.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">سبب الإلغاء (يُسجل في سجل التدقيق):</label>
              <input
                type="text"
                placeholder="مثال: طلب رسمي من الإدارة أو تصحيح بيانات..."
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="ghost" size="sm" onClick={() => setShowRevokeModal(false)}>تراجع</Button>
              <Button variant="danger" size="sm" onClick={handleRevokeLink}>تأكيد الإلغاء</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
