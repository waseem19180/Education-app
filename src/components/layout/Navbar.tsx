import React, { useState } from 'react';
import { UserProfile, SchoolNotification } from '../../types/database';
import { storage, AppMode } from '../../services/storage';
import { PWAInstallButton } from '../pwa/PWAInstallButton';
import { Badge, Button } from '../common/UIComponents';
import {
  Bell,
  CheckCircle2,
  RefreshCw,
  Database,
  Menu,
  GraduationCap,
  ChevronDown,
  UserCheck,
  ShieldCheck,
  Lock,
  Cloud,
  CloudOff,
  LogIn
} from 'lucide-react';

interface NavbarProps {
  currentUser: UserProfile;
  appMode: AppMode;
  onUserChange: (user: UserProfile) => void;
  onToggleSidebar: () => void;
  onOpenSettings: () => void;
  onOpenAuth: () => void;
  unreadNotificationsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  appMode,
  onUserChange,
  onToggleSidebar,
  onOpenSettings,
  onOpenAuth,
  unreadNotificationsCount
}) => {
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [notifications, setNotifications] = useState<SchoolNotification[]>(() =>
    storage.getNotifications(currentUser.id)
  );

  const authUser = storage.getAuthUser();
  const allProfiles = storage.getProfiles();
  const demoAccounts = [
    { role: 'admin', label: 'مدير النظام', desc: 'د. سامي العبداللات - صلاحيات كاملة', profile: allProfiles.find((p) => p.role === 'admin') },
    { role: 'teacher', label: 'معلم مادة', desc: 'أ. أحمد الشامي - رياضيات الحادي عشر', profile: allProfiles.find((p) => p.id === 'teacher-shami-user') },
    { role: 'parent', label: 'ولي أمر', desc: 'م. إبراهيم القاسمي - والد الطالب محمد', profile: allProfiles.find((p) => p.id === 'parent-qasimi-user') },
    { role: 'student', label: 'طالب', desc: 'محمد القاسمي - الحادي عشر العلمي (أ)', profile: allProfiles.find((p) => p.id === 'student-qasimi-user') }
  ];

  const handleSwitchUser = (profile?: UserProfile) => {
    if (appMode === 'production') return;
    if (profile) {
      storage.setActiveUser(profile);
      onUserChange(profile);
      setNotifications(storage.getNotifications(profile.id));
      setShowRoleDropdown(false);
    }
  };

  const handleClearNotifications = () => {
    storage.markAllNotificationsAsRead(currentUser.id);
    setNotifications(storage.getNotifications(currentUser.id));
  };

  const roleBadgeVariant: Record<string, 'primary' | 'secondary' | 'warning' | 'success'> = {
    admin: 'danger' as any,
    teacher: 'primary',
    parent: 'warning',
    student: 'success'
  };

  const roleArabicName: Record<string, string> = {
    admin: 'مدير النظام',
    teacher: 'معلم',
    parent: 'ولي أمر',
    student: 'طالب'
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-6 py-2.5 transition-all">
      <div className="flex items-center justify-between gap-4">
        {/* Right side (RTL Start): Logo & Mobile Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 lg:hidden cursor-pointer"
            aria-label="القائمة الجانبية"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-slate-900 via-blue-900 to-blue-600 flex items-center justify-center text-white shadow-sm ring-2 ring-blue-500/20">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-slate-900 text-lg tracking-tight">EduConnect</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/50">
                  الحادي عشر العلمي
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">منصة التواصل والإدارة المدرسية الموحدة</p>
            </div>
          </div>
        </div>

        {/* Center / Mode indicator */}
        <div className="hidden lg:flex items-center gap-2">
          {appMode === 'production' ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <Cloud className="w-3.5 h-3.5 text-emerald-600" />
              <span>الوضع السحابي المباشر (Production)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>وضع العرض التجريبي (Demo Mode)</span>
            </div>
          )}
        </div>

        {/* Left side (RTL End): Actions, Switcher, Profile */}
        <div className="flex items-center gap-2">
          {/* PWA Install Button */}
          <PWAInstallButton />

          {/* Mode Switcher / Auth Button */}
          {appMode === 'demo' ? (
            /* Quick Demo Role Switcher (Active in Demo Mode only) */
            <div className="relative">
              <button
                onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-800 transition cursor-pointer"
                title="التبديل الفوري بين أدوار المستخدمين لتجربة المنصة"
              >
                <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden md:inline">تجربة كـ:</span>
                <span className="font-bold text-blue-700">{roleArabicName[currentUser.role]}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showRoleDropdown && (
                <div className="absolute left-0 mt-2 w-72 rounded-2xl bg-white p-2 shadow-2xl border border-slate-100 z-50 text-right animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-2 border-b border-slate-100 text-xs font-bold text-slate-500">
                    تبديل حساب العرض التجريبي:
                  </div>
                  <div className="mt-1 space-y-1">
                    {demoAccounts.map((account) => {
                      const isCurrent = currentUser.role === account.role;
                      return (
                        <button
                          key={account.role}
                          onClick={() => handleSwitchUser(account.profile)}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl text-right transition cursor-pointer ${
                            isCurrent ? 'bg-blue-50 text-blue-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-1.5 text-xs font-bold">
                              <span>{account.label}</span>
                              {isCurrent && <span className="text-[10px] text-blue-600">(الحالي)</span>}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">{account.desc}</p>
                          </div>
                          {isCurrent && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* In Production Mode: Locked to real auth */
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>{authUser ? authUser.full_name : 'مصادقة حقيقية'}</span>
            </div>
          )}

          {/* Supabase Auth Trigger */}
          <button
            onClick={onOpenAuth}
            className={`p-2 rounded-xl transition cursor-pointer ${
              authUser
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title={authUser ? `حساب Supabase: ${authUser.email}` : 'تسجيل الدخول السحابي إلى Supabase'}
          >
            {authUser ? <ShieldCheck className="w-4 h-4 text-emerald-600" /> : <LogIn className="w-4 h-4" />}
          </button>

          {/* Supabase / Database Settings */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
            title="إدارة بنية Supabase وقاعدة البيانات"
          >
            <Database className="w-4 h-4" />
          </button>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotificationsDropdown(!showNotificationsDropdown);
                setNotifications(storage.getNotifications(currentUser.id));
              }}
              className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
              title="الإشعارات"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-white">
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </span>
              )}
            </button>

            {showNotificationsDropdown && (
              <div className="absolute left-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl border border-slate-100 z-50 overflow-hidden text-right animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between p-3.5 border-b border-slate-100 bg-slate-50">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">مركز الإشعارات</span>
                    {unreadNotificationsCount > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                        {unreadNotificationsCount} جديدة
                      </span>
                    )}
                  </div>
                  {unreadNotificationsCount > 0 && (
                    <button
                      onClick={handleClearNotifications}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                    >
                      تحديد الكل كمقروء
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      لا توجد إشعارات حالياً
                    </div>
                  ) : (
                    notifications.slice(0, 8).map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => {
                          storage.markNotificationAsRead(notif.id);
                          setNotifications(storage.getNotifications(currentUser.id));
                        }}
                        className={`p-3 text-xs transition cursor-pointer hover:bg-slate-50 ${
                          !notif.is_read ? 'bg-blue-50/40 font-medium' : 'text-slate-600'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-bold text-slate-900">{notif.title}</p>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {new Date(notif.created_at).toLocaleTimeString('ar-EG', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <p className="mt-1 text-slate-600 text-[11px] line-clamp-2">{notif.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Current User Pill */}
          <div className="flex items-center gap-2.5 pr-2 border-r border-slate-200">
            <img
              src={currentUser.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.full_name)}&background=0D8ABC&color=fff`}
              alt={currentUser.full_name}
              className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-100"
            />
            <div className="hidden sm:block text-right">
              <p className="text-xs font-bold text-slate-900 leading-tight">{currentUser.full_name}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Badge variant={roleBadgeVariant[currentUser.role] || 'neutral'} size="sm">
                  {roleArabicName[currentUser.role]}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
