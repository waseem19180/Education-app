import React, { useState } from 'react';
import { UserProfile, SchoolClass, ParentStudentLink, ParentRelationship } from '../../types/database';
import { storage } from '../../services/storage';
import { Card, Badge, Button, Modal, StatCard } from '../common/UIComponents';
import {
  Users,
  UserCheck,
  Link,
  Unlink,
  Search,
  CheckCircle,
  AlertTriangle,
  Clock,
  ShieldCheck,
  UserPlus,
  BookOpen,
  Info
} from 'lucide-react';

interface TeacherStudentsParentsManagerProps {
  currentUser: UserProfile;
}

export const TeacherStudentsParentsManager: React.FC<TeacherStudentsParentsManagerProps> = ({ currentUser }) => {
  const teacher = storage.getTeachers().find((t) => t.profile_id === currentUser.id);
  const teacherSubjects = storage.getTeacherSubjects().filter((ts) => ts.teacher_id === teacher?.id);

  // Extract unique classes assigned to this teacher
  const assignedClassIds = Array.from(new Set(teacherSubjects.map((ts) => ts.class_id)));
  const assignedClasses = storage.getClasses().filter((c) => assignedClassIds.includes(c.id));

  const [selectedClassId, setSelectedClassId] = useState<string>(assignedClasses[0]?.id || 'class-11-sci-a');
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Link Parent Modal State
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedStudentForLink, setSelectedStudentForLink] = useState<{ id: string; name: string } | null>(null);
  const [parentSearchTerm, setParentSearchTerm] = useState('');
  const [selectedParentId, setSelectedParentId] = useState('');
  const [relationship, setRelationship] = useState<ParentRelationship>('father');
  const [linkNotes, setLinkNotes] = useState('');

  // Revoke Modal State
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [targetLinkId, setTargetLinkId] = useState('');
  const [revokeReason, setRevokeReason] = useState('');

  // Data fetching
  const allStudents = storage.getStudents();
  const classStudents = allStudents.filter((s) => s.class_id === selectedClassId);
  const allLinks = storage.getParentStudentLinks();

  // Search filter
  const filteredStudents = classStudents.filter((st) =>
    (st.profile?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    st.student_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Search parent accounts (strictly minimal data)
  const searchedParents = parentSearchTerm.trim().length > 0
    ? storage.searchParents(parentSearchTerm, currentUser)
    : [];

  // Handle Approve Student
  const handleApproveStudent = (profileId: string) => {
    const res = storage.approveUserProfile(currentUser, profileId, selectedClassId);
    if (res.success) {
      setMessage({ text: 'تم اعتماد وتفعيل حساب الطالب بنجاح.', type: 'success' });
    } else {
      setMessage({ text: res.error || 'فشل الاعتماد', type: 'error' });
    }
    setTimeout(() => setMessage(null), 4000);
  };

  // Handle Create Link
  const handleCreateLink = () => {
    if (!selectedStudentForLink || !selectedParentId) {
      setMessage({ text: 'يرجى اختيار الطالب وحساب ولي الأمر.', type: 'error' });
      return;
    }

    const res = storage.createParentStudentLink(
      {
        student_id: selectedStudentForLink.id,
        parent_id: selectedParentId,
        relationship,
        notes: linkNotes
      },
      currentUser
    );

    if (res.success) {
      setMessage({
        text: 'تم إنشاء طلب ربط ولي الأمر بالطالب بنجاح وإرساله للمصادقة وتوثيقه بسجل الرقابة.',
        type: 'success'
      });
      setShowLinkModal(false);
      setSelectedStudentForLink(null);
      setSelectedParentId('');
      setParentSearchTerm('');
      setLinkNotes('');
    } else {
      setMessage({ text: res.error || 'فشلت عملية الربط', type: 'error' });
    }
    setTimeout(() => setMessage(null), 4500);
  };

  // Handle Revoke Link
  const handleRevoke = () => {
    if (!targetLinkId) return;
    const res = storage.revokeParentStudentLink(targetLinkId, currentUser, revokeReason);
    if (res.success) {
      setMessage({ text: 'تم إلغاء ارتباط ولي الأمر بالطالب وتوثيق العملية في سجل التدقيق الإداري.', type: 'success' });
      setShowRevokeModal(false);
      setTargetLinkId('');
      setRevokeReason('');
    } else {
      setMessage({ text: res.error || 'فشل إلغاء الرابط', type: 'error' });
    }
    setTimeout(() => setMessage(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-2">
            <BookOpen className="w-4 h-4" />
            <span>بوابة المعلم الأكاديمية — إدارة الصفوف المسندة</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            إدارة الطلاب وأولياء الأمور
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            متابعة طلاب الشعب المسندة إليك، اعتماد الحسابات الجديدة، وإدارة روابط أولياء الأمور وفق ضوابط الأمان المعتمدة
          </p>
        </div>

        <Badge variant="primary">
          {assignedClasses.length} شعب دراسية مسندة
        </Badge>
      </div>

      {/* Security Info Banner */}
      <div className="p-3.5 rounded-2xl bg-slate-900 text-white text-xs flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <strong>نطاق الصلاحيات:</strong> يقتصر وصولك على الطلاب وأولياء الأمور في الشعب المسندة إليك فقط في جدول <code className="text-blue-300 font-mono">teacher_subjects</code>. كافة العمليات مسجلة في سجل الرقابة المدرسية.
          </span>
        </div>
      </div>

      {/* Toast Notification */}
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

      {/* Class Selector Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs font-bold text-slate-700 shrink-0">الشعبة الدراسية:</span>
        {assignedClasses.map((cls) => (
          <button
            key={cls.id}
            onClick={() => setSelectedClassId(cls.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              selectedClassId === cls.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span>{cls.name}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${selectedClassId === cls.id ? 'bg-white/20' : 'bg-slate-100 text-slate-600'}`}>
              {allStudents.filter((s) => s.class_id === cls.id).length} طالب
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="ابحث باسم الطالب أو رقمه المدرسي..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pr-10 pl-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs focus:outline-hidden focus:border-blue-500 shadow-xs"
        />
      </div>

      {/* Students List */}
      <div className="space-y-4">
        {filteredStudents.length === 0 ? (
          <Card className="text-center py-12">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-700">لا يوجد طلاب في هذه الشعبة</h3>
            <p className="text-xs text-slate-400 mt-1">تأكد من اختيار الشعبة الصحيحة أو مراجعة معايير البحث</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStudents.map((st) => {
              const studentLinks = allLinks.filter((l) => l.student_id === st.id && l.status !== 'revoked');
              const isPendingApproval = st.profile?.approval_status === 'pending_approval';

              return (
                <Card key={st.id} className="flex flex-col justify-between border-slate-200 hover:border-blue-300 transition-all">
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={st.profile?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120'}
                          alt={st.profile?.full_name}
                          className="w-11 h-11 rounded-xl object-cover border border-slate-200"
                        />
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{st.profile?.full_name}</h4>
                          <span className="text-[11px] font-mono text-slate-400">رقم: {st.student_number}</span>
                        </div>
                      </div>
                      <Badge variant={isPendingApproval ? 'warning' : 'primary'} size="sm">
                        {isPendingApproval ? 'قيد الاعتماد' : 'نشط'}
                      </Badge>
                    </div>

                    {/* Pending Account Alert */}
                    {isPendingApproval && (
                      <div className="mt-3 p-2 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between text-xs">
                        <span className="text-amber-800 font-semibold text-[11px]">حساب بانتظار الاعتماد للشعبة</span>
                        <Button
                          variant="primary"
                          size="sm"
                          icon={<CheckCircle className="w-3.5 h-3.5" />}
                          onClick={() => st.profile && handleApproveStudent(st.profile.id)}
                        >
                          اعتماد الآن
                        </Button>
                      </div>
                    )}

                    {/* Parent Links Section */}
                    <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-700 flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                          <span>أولياء الأمور المرتبطون:</span>
                        </span>
                        <span className="text-slate-400 font-mono text-[11px]">{studentLinks.length}</span>
                      </div>

                      <div className="space-y-1.5">
                        {studentLinks.length === 0 ? (
                          <p className="text-[11px] text-slate-400 italic bg-white p-2 rounded-lg border border-slate-100 text-center">
                            لا يوجد ولي أمر مرتبط بهذا الطالب
                          </p>
                        ) : (
                          studentLinks.map((l) => (
                            <div
                              key={l.id}
                              className={`p-2 rounded-lg border text-[11px] flex items-center justify-between ${
                                l.status === 'active'
                                  ? 'bg-white border-slate-200'
                                  : 'bg-amber-50 border-amber-200 text-amber-900'
                              }`}
                            >
                              <div>
                                <div className="font-bold text-slate-900">
                                  {l.parent_profile?.full_name || 'ولي الأمر'}
                                </div>
                                <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                                  <span>{l.relationship === 'father' ? 'أب' : l.relationship === 'mother' ? 'أم' : 'وصي'}</span>
                                  <span>•</span>
                                  <span className={l.status === 'active' ? 'text-emerald-700 font-semibold' : 'text-amber-700 font-semibold'}>
                                    {l.status === 'active' ? 'رابط نشط' : 'قيد الاعتماد'}
                                  </span>
                                </div>
                              </div>

                              <button
                                onClick={() => {
                                  setTargetLinkId(l.id);
                                  setShowRevokeModal(true);
                                }}
                                className="text-rose-600 hover:text-rose-800 p-1 rounded-md hover:bg-rose-50"
                                title="إلغاء ارتباط ولي الأمر"
                              >
                                <Unlink className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Link className="w-3.5 h-3.5" />}
                      onClick={() => {
                        setSelectedStudentForLink({ id: st.id, name: st.profile?.full_name || 'طالب' });
                        setShowLinkModal(true);
                      }}
                    >
                      ربط ولي أمر
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL 1: LINK PARENT */}
      {showLinkModal && selectedStudentForLink && (
        <Modal
          isOpen={showLinkModal}
          onClose={() => {
            setShowLinkModal(false);
            setSelectedStudentForLink(null);
            setSelectedParentId('');
            setParentSearchTerm('');
          }}
          title={`ربط ولي أمر بالطالب: ${selectedStudentForLink.name}`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-700 shrink-0" />
              <span>
                يتم البحث في حسابات أولياء الأمور المسجلة رسمياً بالمنصة. لا يتم كشف أرقام الهواتف أو البيانات الحساسة حفاظاً على الخصوصية.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                البحث عن حساب ولي الأمر بالبريد أو المعرف:
              </label>
              <div className="relative">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ابحث بالاسم الكامل أو البريد الإلكتروني..."
                  value={parentSearchTerm}
                  onChange={(e) => setParentSearchTerm(e.target.value)}
                  className="w-full pr-9 pl-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white"
                />
              </div>

              {/* Search Results */}
              <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto">
                {searchedParents.map((parent) => (
                  <div
                    key={parent.id}
                    onClick={() => setSelectedParentId(parent.id)}
                    className={`p-2.5 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition ${
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
                  <p className="text-xs text-slate-400 text-center py-2">لا توجد حسابات أولياء أمور مسجلة بهذا الاسم</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">صفة القرابة بالتعليم المدرسي:</label>
                <select
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value as ParentRelationship)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white font-semibold"
                >
                  <option value="father">أب (Father)</option>
                  <option value="mother">أم (Mother)</option>
                  <option value="guardian">وصي شرعي / كفيل رسمي (Guardian)</option>
                  <option value="other">أخرى (Other)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظة التحقق (للمراجعة الإدارية):</label>
                <input
                  type="text"
                  placeholder="مثال: مراجعة بطاقة العائلة في شعبة (أ)..."
                  value={linkNotes}
                  onChange={(e) => setLinkNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowLinkModal(false);
                  setSelectedStudentForLink(null);
                }}
              >
                إلغاء
              </Button>
              <Button variant="primary" size="sm" onClick={handleCreateLink}>
                تأكيد طلب الربط
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 2: REVOKE LINK */}
      {showRevokeModal && (
        <Modal
          isOpen={showRevokeModal}
          onClose={() => setShowRevokeModal(false)}
          title="تأكيد إلغاء ارتباط ولي الأمر"
          maxWidth="sm"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              هل أنت متأكد من رغبتك في إلغاء ارتباط ولي الأمر بهذا الطالب؟ سيتم تسجيل سبب الإلغاء في سجل الرقابة وتوثيق اسمك كمعلم منفذ للإجراء.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">سبب الإلغاء الموثق:</label>
              <input
                type="text"
                placeholder="أدخل مبرر الإلغاء لمراجعة الإدارة..."
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs bg-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="ghost" size="sm" onClick={() => setShowRevokeModal(false)}>تراجع</Button>
              <Button variant="danger" size="sm" onClick={handleRevoke}>تأكيد الإلغاء والتوثيق</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
