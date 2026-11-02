import React from 'react';
import { UserRole } from '../../types/database';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  CalendarCheck,
  FileSpreadsheet,
  AlertCircle,
  BookOpen,
  Megaphone,
  MessageSquare,
  Calendar,
  BarChart3,
  ShieldCheck,
  X,
  BookMarked,
  UserCheck
} from 'lucide-react';

export type ActivePage =
  | 'dashboard'
  | 'students'
  | 'teachers'
  | 'users_permissions'
  | 'teacher_students_parents'
  | 'attendance'
  | 'exams'
  | 'notes'
  | 'assignments'
  | 'announcements'
  | 'messages'
  | 'calendar'
  | 'reports'
  | 'audit';

interface SidebarProps {
  currentRole: UserRole;
  activePage: ActivePage;
  onSelectPage: (page: ActivePage) => void;
  isOpen: boolean;
  onClose: () => void;
  unreadMessagesCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentRole,
  activePage,
  onSelectPage,
  isOpen,
  onClose,
  unreadMessagesCount
}) => {
  interface NavItem {
    id: ActivePage;
    label: string;
    icon: React.ReactNode;
    roles: UserRole[];
    badge?: number;
  }

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'لوحة التحكم',
      icon: <LayoutDashboard className="w-5 h-5" />,
      roles: ['admin', 'teacher', 'parent', 'student']
    },
    {
      id: 'users_permissions',
      label: 'إدارة المستخدمين والصلاحيات',
      icon: <ShieldCheck className="w-5 h-5" />,
      roles: ['admin']
    },
    {
      id: 'teacher_students_parents',
      label: 'إدارة الطلاب وأولياء الأمور',
      icon: <UserCheck className="w-5 h-5" />,
      roles: ['teacher']
    },
    {
      id: 'students',
      label: currentRole === 'parent' ? 'متابعة الأبناء' : currentRole === 'student' ? 'ملفي الأكاديمي' : 'شؤون الطلاب',
      icon: <Users className="w-5 h-5" />,
      roles: ['admin', 'teacher', 'parent', 'student']
    },
    {
      id: 'teachers',
      label: 'المعلمون والمواد',
      icon: <GraduationCap className="w-5 h-5" />,
      roles: ['admin']
    },
    {
      id: 'attendance',
      label: currentRole === 'teacher' ? 'تسجيل الحضور' : 'الحضور والغياب',
      icon: <CalendarCheck className="w-5 h-5" />,
      roles: ['admin', 'teacher', 'parent', 'student']
    },
    {
      id: 'exams',
      label: currentRole === 'student' ? 'النتائج والامتحانات' : currentRole === 'teacher' ? 'الامتحانات والعلامات' : 'الامتحانات والنتائج',
      icon: <FileSpreadsheet className="w-5 h-5" />,
      roles: ['admin', 'teacher', 'parent', 'student']
    },
    {
      id: 'notes',
      label: 'الملاحظات والسلوك',
      icon: <AlertCircle className="w-5 h-5" />,
      roles: ['admin', 'teacher', 'parent']
    },
    {
      id: 'assignments',
      label: currentRole === 'student' ? 'واجباتي المدرسية' : 'الواجبات والمشاريع',
      icon: <BookOpen className="w-5 h-5" />,
      roles: ['admin', 'teacher', 'parent', 'student']
    },
    {
      id: 'announcements',
      label: 'الأخبار والإعلانات',
      icon: <Megaphone className="w-5 h-5" />,
      roles: ['admin', 'teacher', 'parent', 'student']
    },
    {
      id: 'messages',
      label: 'التواصل والرسائل',
      icon: <MessageSquare className="w-5 h-5" />,
      roles: ['admin', 'teacher', 'parent'],
      badge: unreadMessagesCount
    },
    {
      id: 'calendar',
      label: 'التقويم المدرسي',
      icon: <Calendar className="w-5 h-5" />,
      roles: ['admin', 'teacher', 'parent', 'student']
    },
    {
      id: 'reports',
      label: 'التقارير والإحصائيات',
      icon: <BarChart3 className="w-5 h-5" />,
      roles: ['admin', 'teacher', 'parent']
    },
    {
      id: 'audit',
      label: 'سجل العمليات الإدارية',
      icon: <ShieldCheck className="w-5 h-5" />,
      roles: ['admin']
    }
  ];

  const visibleNav = navItems.filter((item) => item.roles.includes(currentRole));

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 w-64 bg-slate-900 text-slate-100 flex flex-col transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header inside sidebar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              <BookMarked className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold tracking-wide text-white">EduConnect</h2>
              <p className="text-[10px] text-slate-400">إصدار الحادي عشر العلمي</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            القائمة الرئيسية
          </div>

          {visibleNav.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectPage(item.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-white' : 'text-slate-400'}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* School Class badge info footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="rounded-xl bg-slate-800/80 p-3 border border-slate-700/60">
            <div className="flex items-center justify-between text-[11px] text-slate-300">
              <span className="font-semibold">العام الدراسي:</span>
              <span className="font-bold text-blue-400">2026/2027</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-300">
              <span className="font-semibold">الفصل:</span>
              <span className="font-medium text-slate-300">الأول (منتصف الفصل)</span>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-700/60 flex items-center justify-between text-[10px] text-slate-400">
              <span>حالة النظام:</span>
              <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                قاعدة البيانات متصلة
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
