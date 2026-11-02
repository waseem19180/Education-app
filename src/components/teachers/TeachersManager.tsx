import React, { useState } from 'react';
import { storage } from '../../services/storage';
import { Card, Button, Badge, Modal } from '../common/UIComponents';
import { GraduationCap, BookOpen, Plus, Mail, Phone, Calendar, UserCheck } from 'lucide-react';
import { UserProfile } from '../../types/database';

interface TeachersManagerProps {
  currentUser: UserProfile;
}

export const TeachersManager: React.FC<TeachersManagerProps> = ({ currentUser }) => {
  const teachers = storage.getTeachers();
  const subjects = storage.getSubjects();
  const teacherSubjects = storage.getTeacherSubjects();
  const [showAddModal, setShowAddModal] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [specialization, setSpecialization] = useState('');

  const handleCreateTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email) return;

    const newProfile: UserProfile = {
      id: 'teacher-prof-' + Date.now(),
      email,
      full_name: fullName,
      role: 'teacher',
      created_at: new Date().toISOString()
    };
    storage.getProfiles().push(newProfile);

    storage.getTeachers().push({
      id: 'teacher-' + Date.now(),
      profile_id: newProfile.id,
      specialization: specialization || 'العلوم والرياضيات',
      hire_date: new Date().toISOString().split('T')[0]
    });

    storage.logAudit(currentUser, 'إضافة معلم جديد', 'teachers', newProfile.id, `إضافة المعلم ${fullName}`);
    setShowAddModal(false);
    setFullName('');
    setEmail('');
    setSpecialization('');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            الكادر التعليمي والمواد الدراسية
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            إدارة المعلمين، التخصصات، والمواد المسندة للصف الحادي عشر العلمي
          </p>
        </div>

        {currentUser.role === 'admin' && (
          <Button
            variant="secondary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setShowAddModal(true)}
          >
            إضافة معلم جديد
          </Button>
        )}
      </div>

      {/* Teachers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teachers.map((t) => {
          const assigned = teacherSubjects.filter((ts) => ts.teacher_id === t.id);

          return (
            <Card key={t.id} className="relative">
              <div className="flex items-start gap-3">
                <img
                  src={t.profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(t.profile?.full_name || 'معلم')}&background=0D8ABC&color=fff`}
                  alt={t.profile?.full_name}
                  className="w-12 h-12 rounded-2xl object-cover ring-2 ring-blue-500/20"
                />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{t.profile?.full_name}</h3>
                  <p className="text-xs text-blue-700 font-semibold mt-0.5">{t.specialization}</p>
                  <span className="text-[11px] text-slate-400 block mt-0.5">{t.profile?.email}</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
                <span className="text-slate-400 text-[11px] block">المواد والصفوف المسندة:</span>
                <div className="flex flex-wrap gap-1">
                  {assigned.length > 0 ? (
                    assigned.map((a) => (
                      <span
                        key={a.id}
                        className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold"
                      >
                        {a.subject?.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-400 text-[11px]">لا توجد مواد مسندة حالياً</span>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>المكتب: {t.office_room || 'المبنى العلمي'}</span>
                <span>تاريخ التعيين: {t.hire_date}</span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Subjects Catalog */}
      <Card>
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">مقررات الصف الحادي عشر العلمي (2026/2027)</h3>
            <p className="text-xs text-slate-500">المواد المعتمدة بالساعات والعلامات</p>
          </div>
          <Badge variant="primary">{subjects.length} مقررات</Badge>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {subjects.map((s) => (
            <div key={s.id} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 text-xs block">{s.name}</span>
                <span className="text-[11px] font-mono text-slate-400">{s.code}</span>
              </div>
              <div className="text-left text-xs">
                <span className="font-bold text-blue-700 block">{s.credit_hours} ساعات</span>
                <span className="text-[10px] text-slate-400">العظمى: {s.max_score}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ADD TEACHER MODAL */}
      {showAddModal && (
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="إضافة معلم جديد"
          subtitle="تسجيل بيانات المعلم والتخصص الأكاديمي"
        >
          <form onSubmit={handleCreateTeacher} className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">الاسم الكامل *</label>
              <input
                type="text"
                required
                placeholder="مثال: أ. يوسف الغامدي"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">البريد الإلكتروني *</label>
              <input
                type="email"
                required
                placeholder="y.ghamdi@educonnect.school"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">التخصص الأكاديمي</label>
              <input
                type="text"
                placeholder="مثال: الفيزياء النظرية والكمية"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                إلغاء
              </Button>
              <Button type="submit" variant="secondary">
                تسجيل المعلم
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
