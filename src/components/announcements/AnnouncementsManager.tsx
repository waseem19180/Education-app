import React, { useState } from 'react';
import { UserProfile, Announcement } from '../../types/database';
import { storage } from '../../services/storage';
import { Card, Button, Badge, Modal } from '../common/UIComponents';
import {
  Megaphone,
  Pin,
  Plus,
  Calendar,
  User,
  AlertTriangle,
  Award,
  Sparkles,
  Bookmark
} from 'lucide-react';

interface AnnouncementsManagerProps {
  currentUser: UserProfile;
}

export const AnnouncementsManager: React.FC<AnnouncementsManagerProps> = ({ currentUser }) => {
  const [filterAudience, setFilterAudience] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetAudience, setTargetAudience] = useState<Announcement['target_audience']>('all');
  const [category, setCategory] = useState<Announcement['category']>('general');
  const [isPinned, setIsPinned] = useState(false);

  const announcements = storage.getAnnouncements();

  const handleCreateAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;

    storage.saveAnnouncement({
      title,
      content,
      target_audience: targetAudience,
      category,
      is_pinned: isPinned
    }, currentUser);

    setShowAddModal(false);
    setTitle('');
    setContent('');
    setIsPinned(false);
  };

  const isPrivileged = currentUser.role === 'admin' || currentUser.role === 'teacher';

  const categoryLabels = {
    urgent: { label: 'تنبيه عاجل', variant: 'danger' as const },
    academic: { label: 'أكاديمي', variant: 'primary' as const },
    exam: { label: 'مواعيد امتحانات', variant: 'warning' as const },
    event: { label: 'فعالية ونشاط', variant: 'info' as const },
    general: { label: 'عام', variant: 'neutral' as const }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            الأخبار والإعلانات المدرسية الرسمية
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            منشورات إدارة المدرسة والتعميمات وقرارات الصف الحادي عشر العلمي
          </p>
        </div>

        {isPrivileged && (
          <Button
            variant="secondary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setShowAddModal(true)}
          >
            نشر إعلان جديد
          </Button>
        )}
      </div>

      {/* Announcements Feed */}
      <div className="space-y-4">
        {announcements.map((ann) => {
          return (
            <Card
              key={ann.id}
              className={`relative overflow-hidden transition-all ${
                ann.is_pinned ? 'border-blue-400/80 bg-gradient-to-r from-blue-50/40 via-white to-white' : ''
              }`}
            >
              {ann.is_pinned && (
                <div className="absolute top-0 right-0 bg-blue-600 text-white px-3 py-0.5 rounded-bl-xl text-[10px] font-bold flex items-center gap-1 shadow-xs">
                  <Pin className="w-3 h-3" />
                  <span>إعلان مثبت بأعلى المنصة</span>
                </div>
              )}

              <div className="flex items-start justify-between gap-4 mt-1">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge variant={categoryLabels[ann.category].variant} size="sm">
                      {categoryLabels[ann.category].label}
                    </Badge>
                    <span className="text-[11px] text-slate-400 font-medium">
                      الجمهور: {ann.target_audience === 'all' ? 'كافة المدرسة' : ann.target_audience === 'grade_11' ? 'الصف الحادي عشر' : ann.target_audience}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 leading-snug">{ann.title}</h3>
                </div>

                {isPrivileged && (
                  <button
                    onClick={() => storage.togglePinAnnouncement(ann.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition cursor-pointer"
                    title={ann.is_pinned ? 'إلغاء التثبيت' : 'تثبيت في المقدمة'}
                  >
                    <Pin className={`w-4 h-4 ${ann.is_pinned ? 'text-blue-600 fill-blue-600' : ''}`} />
                  </button>
                )}
              </div>

              <p className="mt-3 text-xs text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50/60 p-4 rounded-xl border border-slate-100">
                {ann.content}
              </p>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-semibold text-slate-600">الناشر: {ann.author_name}</span>
                <span>تاريخ النشر: {new Date(ann.published_at).toLocaleDateString('ar-EG')}</span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* CREATE ANNOUNCEMENT MODAL */}
      {showAddModal && (
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="نشر إعلان رسمي جديد"
          subtitle="سيتم إرسال إشعار فوري لجميع المستخدمين المستهدفين"
        >
          <form onSubmit={handleCreateAnnouncement} className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">عنوان الإعلان *</label>
              <input
                type="text"
                required
                placeholder="مثال: موعد تسليم مشاريع مادة الفيزياء الحديثة"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">تصنيف الإعلان *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Announcement['category'])}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                >
                  <option value="general">عام</option>
                  <option value="urgent">تنبيه عاجل</option>
                  <option value="academic">أكاديمي</option>
                  <option value="exam">امتحانات ونتائج</option>
                  <option value="event">فعالية ونشاط</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">الجمهور المستهدف *</label>
                <select
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value as Announcement['target_audience'])}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                >
                  <option value="all">كافة مستخدمي المنصة</option>
                  <option value="grade_11">الصف الحادي عشر العلمي فقط</option>
                  <option value="parents">أولياء الأمور</option>
                  <option value="teachers">المعلمون</option>
                  <option value="students">الطلاب</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">نص ومحتوى الإعلان *</label>
              <textarea
                rows={4}
                required
                placeholder="اكتب تفاصيل الإعلان والتعليمات بدقة..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 block">تثبيت الإعلان في أعلى الصفحة</span>
                <span className="text-[11px] text-slate-500">
                  سيظهر الإعلان كشريط بارز في لوحة التحكم وقائمة الأخبار
                </span>
              </div>
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                إلغاء
              </Button>
              <Button type="submit" variant="secondary">
                نشر وتعميم الإعلان
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
