import React, { useState } from 'react';
import { UserProfile, BehaviorNote, NoteType, NoteSeverity, NoteStatus } from '../../types/database';
import { storage } from '../../services/storage';
import { Card, Button, Badge, Modal } from '../common/UIComponents';
import {
  AlertCircle,
  Plus,
  Lock,
  Eye,
  CheckCircle2,
  Calendar,
  User,
  ShieldAlert,
  Award
} from 'lucide-react';

interface BehaviorNotesManagerProps {
  currentUser: UserProfile;
}

export const BehaviorNotesManager: React.FC<BehaviorNotesManagerProps> = ({ currentUser }) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // New Note form states
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [noteType, setNoteType] = useState<NoteType>('academic');
  const [severity, setSeverity] = useState<NoteSeverity>('low');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isVisibleToParent, setIsVisibleToParent] = useState(true);

  const students = storage.getStudents();
  const allNotes = storage.getBehaviorNotes(undefined, currentUser.role);

  const filteredNotes = allNotes.filter((n) => {
    if (filterType === 'all') return true;
    return n.type === filterType;
  });

  const handleCreateNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !selectedStudentId) return;

    storage.saveBehaviorNote({
      student_id: selectedStudentId,
      type: noteType,
      severity,
      title,
      description,
      is_visible_to_parent: isVisibleToParent
    }, currentUser);

    setShowAddModal(false);
    setTitle('');
    setDescription('');
    setSelectedStudentId('');
  };

  const isPrivileged = currentUser.role === 'admin' || currentUser.role === 'teacher';

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            نظام الملاحظات الأكاديمية والسلوكية
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            توثيق الملاحظات التوجيهية وسجلات التميز الأكاديمي وسلوكيات الصف مع حفظ خصوصية الطالب
          </p>
        </div>

        {isPrivileged && (
          <Button
            variant="secondary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => {
              if (students.length > 0) setSelectedStudentId(students[0].id);
              setShowAddModal(true);
            }}
          >
            إضافة ملاحظة جديدة
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilterType('all')}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition cursor-pointer ${
            filterType === 'all'
              ? 'bg-slate-900 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          جميع الملاحظات ({allNotes.length})
        </button>
        <button
          onClick={() => setFilterType('academic')}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition cursor-pointer ${
            filterType === 'academic'
              ? 'bg-blue-600 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          ملاحظات أكاديمية ({allNotes.filter((n) => n.type === 'academic').length})
        </button>
        <button
          onClick={() => setFilterType('behavioral')}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition cursor-pointer ${
            filterType === 'behavioral'
              ? 'bg-amber-600 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          ملاحظات سلوكية ({allNotes.filter((n) => n.type === 'behavioral').length})
        </button>
      </div>

      {/* Notes Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredNotes.map((note) => {
          const student = students.find((s) => s.id === note.student_id);

          return (
            <Card key={note.id} className="relative">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-sm">{note.title}</h3>
                    <Badge
                      variant={note.type === 'academic' ? 'primary' : 'warning'}
                      size="sm"
                    >
                      {note.type === 'academic' ? 'أكاديمي' : 'سلوكي'}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    الطالب: <strong className="text-slate-800">{student?.profile?.full_name || note.student_name}</strong>
                    {student && <span className="font-mono text-slate-400 mr-1">({student.student_number})</span>}
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <Badge
                    variant={
                      note.severity === 'high'
                        ? 'danger'
                        : note.severity === 'medium'
                        ? 'warning'
                        : 'success'
                    }
                    size="sm"
                  >
                    {note.severity === 'high' ? 'هام جداً' : note.severity === 'medium' ? 'متوسط' : 'عادي'}
                  </Badge>

                  {isPrivileged && (
                    <span
                      title={note.is_visible_to_parent ? 'مرئية لولي الأمر' : 'سرية للكادر التعليمي فقط'}
                      className="p-1 rounded bg-slate-100 text-slate-500"
                    >
                      {note.is_visible_to_parent ? <Eye className="w-3.5 h-3.5 text-emerald-600" /> : <Lock className="w-3.5 h-3.5 text-amber-600" />}
                    </span>
                  )}
                </div>
              </div>

              <p className="mt-3 text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                {note.description}
              </p>

              {note.action_taken && (
                <div className="mt-2 text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>الإجراء المتخذ: {note.action_taken}</span>
                </div>
              )}

              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>المعلم المشرف: {note.teacher_name}</span>
                <span>{note.date}</span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* CREATE NOTE MODAL */}
      {showAddModal && (
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="إضافة ملاحظة جديدة للطالب"
          subtitle="فصل الملاحظات الأكاديمية عن السلوكية مع تحديد درجة الأهمية"
        >
          <form onSubmit={handleCreateNote} className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">اختر الطالب *</label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.profile?.full_name} ({s.student_number}) - {s.class?.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">نوع الملاحظة *</label>
                <select
                  value={noteType}
                  onChange={(e) => setNoteType(e.target.value as NoteType)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                >
                  <option value="academic">أكاديمية (تحصيل، خطط علاجية، تميز)</option>
                  <option value="behavioral">سلوكية (انضباط، تأخر، مشاركة صفية)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">درجة الأهمية *</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as NoteSeverity)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                >
                  <option value="low">منخفضة / عادية</option>
                  <option value="medium">متوسطة</option>
                  <option value="high">عالية الأهمية / عاجلة</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">عنوان الملاحظة *</label>
              <input
                type="text"
                required
                placeholder="مثال: تميز في حل مسائل التفاضل المتقدمة"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">تفاصيل الملاحظة *</label>
              <textarea
                rows={3}
                required
                placeholder="اكتب التقييم التفصيلي أو المشكلة أو الدعم المطلوب..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 block">إظهار الملاحظة لولي الأمر</span>
                <span className="text-[11px] text-slate-500">
                  إذا تم إلغاء التحديد، ستكون الملاحظة سرية ومتاحة للكادر التعليمي وإدارة المدرسة فقط.
                </span>
              </div>
              <input
                type="checkbox"
                checked={isVisibleToParent}
                onChange={(e) => setIsVisibleToParent(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                إلغاء
              </Button>
              <Button type="submit" variant="secondary">
                حفظ وتسجيل الملاحظة
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
