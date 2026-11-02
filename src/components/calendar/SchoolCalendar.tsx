import React, { useState } from 'react';
import { UserProfile, SchoolEvent } from '../../types/database';
import { storage } from '../../services/storage';
import { Card, Button, Badge, Modal } from '../common/UIComponents';
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  Sparkles,
  MapPin,
  Tag
} from 'lucide-react';

interface SchoolCalendarProps {
  currentUser: UserProfile;
}

export const SchoolCalendar: React.FC<SchoolCalendarProps> = ({ currentUser }) => {
  const [events, setEvents] = useState<SchoolEvent[]>(() => storage.getSchoolEvents());
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState('2026-11-15');
  const [eventType, setEventType] = useState<SchoolEvent['type']>('exam');
  const [desc, setDesc] = useState('');

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    storage.addSchoolEvent({
      title,
      date: eventDate,
      type: eventType,
      description: desc
    }, currentUser);

    setEvents(storage.getSchoolEvents());
    setShowAddModal(false);
    setTitle('');
    setDesc('');
  };

  const isPrivileged = currentUser.role === 'admin' || currentUser.role === 'teacher';

  const typeConfig = {
    exam: { label: 'امتحان', color: 'rose' },
    holiday: { label: 'عطلة رسمية', color: 'emerald' },
    activity: { label: 'نشاط علمي', color: 'blue' },
    meeting: { label: 'اجتماع', color: 'amber' },
    assignment: { label: 'تسليم مشروع', color: 'purple' }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            التقويم المدرسي ومواعيد الفصل الدراسي
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            جدول الامتحانات، الأنشطة الميدانية، العطل الرسمية، واجتماعات أولياء الأمور
          </p>
        </div>

        {isPrivileged && (
          <Button
            variant="secondary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setShowAddModal(true)}
          >
            إضافة موعد أو حدث
          </Button>
        )}
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {events.map((ev) => {
          const cfg = typeConfig[ev.type] || { label: 'حدث', color: 'slate' };
          return (
            <Card key={ev.id} className="relative">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={cfg.color as any} size="sm">
                      {cfg.label}
                    </Badge>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">{ev.title}</h3>
                </div>

                <div className="text-left bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl text-center">
                  <span className="text-[10px] text-slate-400 block font-mono">تاريخ</span>
                  <span className="font-bold text-slate-800 text-xs">{ev.date}</span>
                </div>
              </div>

              {ev.description && (
                <p className="mt-3 text-xs text-slate-600 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                  {ev.description}
                </p>
              )}
            </Card>
          );
        })}
      </div>

      {/* ADD EVENT MODAL */}
      {showAddModal && (
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="إضافة موعد جديد في التقويم"
          subtitle="تحديد التاريخ ونوع الحدث المدرسي"
        >
          <form onSubmit={handleCreateEvent} className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">عنوان الموعد / الحدث *</label>
              <input
                type="text"
                required
                placeholder="مثال: تسليم مسودة بحث الفيزياء النووية"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">التاريخ *</label>
                <input
                  type="date"
                  required
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">النوع *</label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value as SchoolEvent['type'])}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                >
                  <option value="exam">امتحان أو اختبار</option>
                  <option value="holiday">عطلة رسمية</option>
                  <option value="activity">نشاط أو مسابقة علمية</option>
                  <option value="meeting">اجتماع مع الأهالي</option>
                  <option value="assignment">تسليم واجب أو مشروع</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">الوصف والملاحظات</label>
              <textarea
                rows={2}
                placeholder="تفاصيل إضافية..."
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                إلغاء
              </Button>
              <Button type="submit" variant="secondary">
                إضافة للتقويم
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
