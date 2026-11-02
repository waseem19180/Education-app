/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { UserProfile, SchoolNotification } from './types/database';
import { storage, AppMode } from './services/storage';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, ActivePage } from './components/layout/Sidebar';
import { OfflineIndicator } from './components/pwa/PWAInstallButton';
import {
  AdminDashboard,
  TeacherDashboard,
  ParentDashboard,
  StudentDashboard
} from './components/dashboard/Dashboards';
import { StudentsManager } from './components/students/StudentsManager';
import { AttendanceManager } from './components/attendance/AttendanceManager';
import { ExamsManager } from './components/exams/ExamsManager';
import { BehaviorNotesManager } from './components/notes/BehaviorNotesManager';
import { MessagingCenter } from './components/messaging/MessagingCenter';
import { AnnouncementsManager } from './components/announcements/AnnouncementsManager';
import { SchoolCalendar } from './components/calendar/SchoolCalendar';
import { ReportsManager } from './components/reports/ReportsManager';
import { AuditLogsViewer } from './components/audit/AuditLogsViewer';
import { TeachersManager } from './components/teachers/TeachersManager';
import { UsersPermissionsManager } from './components/users/UsersPermissionsManager';
import { TeacherStudentsParentsManager } from './components/teachers/TeacherStudentsParentsManager';
import { SupabaseSettingsModal } from './components/settings/SupabaseSettingsModal';
import { AuthModal } from './components/auth/AuthModal';
import { Card, Badge, Button } from './components/common/UIComponents';
import { BookOpen, Clock, Calendar, CheckCircle, ShieldAlert, Cloud, Lock, Sparkles } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => storage.getActiveUser());
  const [activePage, setActivePage] = useState<ActivePage>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Subscribe to storage changes for reactive re-rendering
  const [, setTick] = useState(0);
  useEffect(() => {
    return storage.subscribe(() => {
      setTick((t) => t + 1);
      setCurrentUser(storage.getActiveUser());
    });
  }, []);

  const appMode: AppMode = storage.getAppMode();
  const authUser = storage.getAuthUser();
  const notifications = storage.getNotifications(currentUser.id);
  const unreadNotifs = notifications.filter((n) => !n.is_read).length;

  const conversations = storage.getConversations(currentUser.id);
  const unreadMessagesCount = conversations.reduce((acc, c) => acc + (c.unread_count || 0), 0);

  // Assignments component view for 'assignments' page
  const renderAssignmentsPage = () => {
    const assignments = storage.getAssignments();
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              الواجبات المدرسية والمشاريع العلمية
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              متابعة المهام المطلوبة ومواعيد التسليم لطلاب الصف الحادي عشر العلمي
            </p>
          </div>
          <Badge variant="primary">{assignments.length} واجبات معتمدة</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assignments.map((assign) => (
            <Card key={assign.id} className="relative flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-slate-900 text-sm leading-snug">{assign.title}</h3>
                  <Badge variant={assign.status === 'active' ? 'warning' : 'neutral'} size="sm">
                    {assign.status === 'active' ? 'نشط' : 'مغلق'}
                  </Badge>
                </div>

                <p className="mt-1 text-xs text-blue-700 font-semibold">{assign.subject_name}</p>

                <p className="mt-3 text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {assign.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1 text-amber-700 font-semibold">
                  <Clock className="w-3.5 h-3.5" />
                  تسليم حتى: {assign.due_date}
                </span>
                <span className="font-bold text-slate-700">{assign.max_points} نقاط</span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  // Route to the appropriate view
  const renderContent = () => {
    switch (activePage) {
      case 'dashboard':
        if (currentUser.role === 'admin') {
          return <AdminDashboard currentUser={currentUser} onNavigate={setActivePage} />;
        } else if (currentUser.role === 'teacher') {
          return <TeacherDashboard currentUser={currentUser} onNavigate={setActivePage} />;
        } else if (currentUser.role === 'parent') {
          return <ParentDashboard currentUser={currentUser} onNavigate={setActivePage} />;
        } else {
          return <StudentDashboard currentUser={currentUser} onNavigate={setActivePage} />;
        }
      case 'students':
        return <StudentsManager currentUser={currentUser} />;
      case 'teachers':
        return <TeachersManager currentUser={currentUser} />;
      case 'users_permissions':
        return <UsersPermissionsManager currentUser={currentUser} />;
      case 'teacher_students_parents':
        return <TeacherStudentsParentsManager currentUser={currentUser} />;
      case 'attendance':
        return <AttendanceManager currentUser={currentUser} />;
      case 'exams':
        return <ExamsManager currentUser={currentUser} />;
      case 'notes':
        return <BehaviorNotesManager currentUser={currentUser} />;
      case 'assignments':
        return renderAssignmentsPage();
      case 'announcements':
        return <AnnouncementsManager currentUser={currentUser} />;
      case 'messages':
        return <MessagingCenter currentUser={currentUser} />;
      case 'calendar':
        return <SchoolCalendar currentUser={currentUser} />;
      case 'reports':
        return <ReportsManager currentUser={currentUser} />;
      case 'audit':
        return <AuditLogsViewer />;
      default:
        return <AdminDashboard currentUser={currentUser} onNavigate={setActivePage} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col font-sans text-slate-800 selection:bg-blue-600 selection:text-white" dir="rtl">
      {/* Top Navigation */}
      <Navbar
        currentUser={currentUser}
        appMode={appMode}
        onUserChange={(user) => {
          setCurrentUser(user);
          setActivePage('dashboard');
        }}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        unreadNotificationsCount={unreadNotifs}
      />

      {/* Production Mode Banner Indicator if active */}
      {appMode === 'production' && (
        <div className="bg-emerald-900 text-emerald-100 px-4 py-1.5 text-xs flex items-center justify-between border-b border-emerald-800">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>
              <strong>الوضع السحابي المباشر نشط:</strong> كافة العمليات والصلاحيات موثقة سحابياً عبر Supabase PostgreSQL & RLS.
            </span>
          </div>
          <div className="flex items-center gap-2">
            {!authUser && (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="underline font-bold text-white hover:text-emerald-200 cursor-pointer"
              >
                تسجيل الدخول بحسابك السحابي ←
              </button>
            )}
            <button
              onClick={() => storage.setAppMode('demo')}
              className="px-2 py-0.5 rounded bg-emerald-800 text-emerald-200 hover:bg-emerald-700 text-[11px] cursor-pointer"
            >
              العودة للوضع التجريبي (Demo)
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace with Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          currentRole={currentUser.role}
          activePage={activePage}
          onSelectPage={setActivePage}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          unreadMessagesCount={unreadMessagesCount}
        />

        {/* Page Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>

      {/* Supabase Settings Modal */}
      <SupabaseSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Supabase Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={() => setCurrentUser(storage.getActiveUser())}
      />

      {/* Offline Status PWA Banner */}
      <OfflineIndicator />
    </div>
  );
}
