import React, { useState, useEffect } from 'react';
import { storage, AppMode } from '../../services/storage';
import { testSupabaseConnection, SUPABASE_URL, SUPABASE_ANON_KEY } from '../../services/supabaseClient';
import { Modal, Button, Badge } from '../common/UIComponents';
import {
  Database,
  ShieldCheck,
  Key,
  Copy,
  Check,
  RefreshCw,
  Server,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Terminal,
  ShieldAlert
} from 'lucide-react';

import { SecurityAuditor } from './SecurityAuditor';

interface SupabaseSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseSettingsModal: React.FC<SupabaseSettingsModalProps> = ({ isOpen, onClose }) => {
  const [appMode, setAppModeState] = useState<AppMode>(storage.getAppMode());
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'connection' | 'mode' | 'sql' | 'rls' | 'audit'>('connection');
  const [testResult, setTestResult] = useState<{
    tested: boolean;
    loading: boolean;
    connected: boolean;
    message: string;
    tablesFound?: boolean;
  }>({
    tested: false,
    loading: false,
    connected: false,
    message: ''
  });

  const handleTestConnection = async () => {
    setTestResult({ tested: true, loading: true, connected: false, message: 'جاري فحص الاتصال بـ Supabase...' });
    const res = await testSupabaseConnection();
    setTestResult({
      tested: true,
      loading: false,
      connected: res.connected,
      message: res.message,
      tablesFound: res.tablesFound
    });
  };

  useEffect(() => {
    if (isOpen) {
      handleTestConnection();
    }
  }, [isOpen]);

  const handleToggleMode = (newMode: AppMode) => {
    setAppModeState(newMode);
    storage.setAppMode(newMode);
  };

  const copySQLInstructions = () => {
    const text = `-- ملف مخطط قاعدة بيانات EduConnect متوفر في المسار: /supabase/schema.sql
-- يحتوي على 18 جدولاً + الفهارس + محفزات منع ترقية الصلاحيات + سياسات RLS
-- انسخ محتويات /supabase/schema.sql والصقها في SQL Editor في لوحة تحكم Supabase.`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="إدارة بنية Supabase وقاعدة البيانات السحابية"
      subtitle="ربط PostgreSQL الآمن، سياسات RLS، والتحويل بين وضع التجربة والإنتاج"
      maxWidth="3xl"
    >
      <div className="space-y-4 text-xs">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 gap-1 overflow-x-auto pb-0.5">
          <button
            type="button"
            onClick={() => setActiveTab('connection')}
            className={`pb-2.5 px-3 font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'connection' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            حالة الاتصال السحابي
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('mode')}
            className={`pb-2.5 px-3 font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'mode' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            عزل الأوضاع (Demo vs Prod)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sql')}
            className={`pb-2.5 px-3 font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'sql' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            مخطط الجداول (18 جدولاً)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('rls')}
            className={`pb-2.5 px-3 font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'rls' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            سياسات الأمان RLS
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`pb-2.5 px-3 font-bold border-b-2 transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'audit' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-purple-600" />
            <span>مدقق الأمان واختبارات RLS (9 سيناريوهات)</span>
          </button>
        </div>

        {/* TAB 1: CONNECTION STATUS */}
        {activeTab === 'connection' && (
          <div className="space-y-4 pt-1">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-sm">بيانات مشروع Supabase النشط</span>
                <Badge variant={testResult.connected ? 'success' : 'warning'}>
                  {testResult.connected ? 'متصل بنجاح' : 'جاري الفحص'}
                </Badge>
              </div>

              <div className="space-y-1.5 text-[11px] font-mono">
                <div className="p-2 rounded-xl bg-white border border-slate-100 flex items-center justify-between">
                  <span className="text-slate-500">Project URL:</span>
                  <span className="font-bold text-blue-700 truncate max-w-xs">{SUPABASE_URL}</span>
                </div>
                <div className="p-2 rounded-xl bg-white border border-slate-100 flex items-center justify-between">
                  <span className="text-slate-500">Public Client Key:</span>
                  <span className="font-bold text-slate-700 truncate max-w-xs">{SUPABASE_ANON_KEY.substring(0, 24)}...</span>
                </div>
              </div>

              {testResult.tested && (
                <div
                  className={`p-3 rounded-xl border flex items-start gap-2 text-[11px] ${
                    testResult.connected
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  {testResult.connected ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <strong className="block mb-0.5">{testResult.connected ? 'تم الاتصال بالسحابة:' : 'فشل الفحص:'}</strong>
                    <span>{testResult.message}</span>
                  </div>
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                icon={<RefreshCw className="w-3.5 h-3.5" />}
                loading={testResult.loading}
                onClick={handleTestConnection}
                className="w-full"
              >
                إعادة فحص استجابة Supabase اللحظية
              </Button>
            </div>
          </div>
        )}

        {/* TAB 2: MODE SEPARATION (DEMO vs PROD) */}
        {activeTab === 'mode' && (
          <div className="space-y-3 pt-1">
            <p className="text-slate-600 text-[11px] leading-relaxed">
              وفق المعايير الأمنية، يتم عزل بيئة العرض التجريبي تماماً عن بيئة الإنتاج لمنع اختلاط البيانات أو تجاوز الصلاحيات:
            </p>

            {/* Demo Mode Card */}
            <div
              onClick={() => handleToggleMode('demo')}
              className={`p-4 rounded-2xl border transition cursor-pointer ${
                appMode === 'demo'
                  ? 'border-amber-400 bg-amber-50/50 shadow-xs'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                  <h4 className="font-bold text-slate-900 text-sm">وضع العرض التجريبي (Demo Mode)</h4>
                </div>
                {appMode === 'demo' && <Badge variant="warning">الوضع النشط حالياً</Badge>}
              </div>
              <p className="mt-1.5 text-slate-600 text-[11px] leading-relaxed">
                يستخدم البيانات التجريبية الغنية للصف الحادي عشر العلمي (15 طالباً، 5 معلمين). يتيح مبدّل الحسابات الفوري في الشريط العلوي لتجربة واجهات كافة الأدوار.
              </p>
            </div>

            {/* Production Mode Card */}
            <div
              onClick={() => handleToggleMode('production')}
              className={`p-4 rounded-2xl border transition cursor-pointer ${
                appMode === 'production'
                  ? 'border-emerald-500 bg-emerald-50/50 shadow-xs'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
                  <h4 className="font-bold text-slate-900 text-sm">الوضع السحابي المباشر (Production Mode)</h4>
                </div>
                {appMode === 'production' && <Badge variant="success">الوضع النشط حالياً</Badge>}
              </div>
              <p className="mt-1.5 text-slate-600 text-[11px] leading-relaxed">
                يتصل مباشرة بـ <strong>Supabase Auth</strong> وقاعدة بيانات PostgreSQL السحابية. يتم تعطيل مبدّل الحسابات التجريبي، وتخضع كافة العمليات لسياسات <strong>Row-Level Security (RLS)</strong> الصارمة.
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: SQL SCHEMA */}
        {activeTab === 'sql' && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">
                الملف جاهز ومنظم في: <code className="text-blue-600 font-mono">/supabase/schema.sql</code>
              </span>
              <Button
                variant="outline"
                size="sm"
                icon={copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                onClick={copySQLInstructions}
              >
                {copied ? 'تم النسخ' : 'نسخ الإرشادات'}
              </Button>
            </div>

            <div className="p-3.5 bg-slate-900 text-slate-100 rounded-2xl font-mono text-[11px] max-h-60 overflow-y-auto space-y-1">
              <p className="text-emerald-400">-- 18 Tables Structured in /supabase/schema.sql:</p>
              <p className="text-slate-300">1. profiles (auth.users linkage)</p>
              <p className="text-slate-300">2. classes (Grade 11 Scientific A & B)</p>
              <p className="text-slate-300">3. subjects (Math, Phys, Chem, Bio, Arab, Eng, CS)</p>
              <p className="text-slate-300">4. teachers & teacher_subjects</p>
              <p className="text-slate-300">5. parents & students</p>
              <p className="text-slate-300">6. exams & grades (Weighting, Draft guard)</p>
              <p className="text-slate-300">7. attendance (Periods 1-7, Anti-duplicate)</p>
              <p className="text-slate-300">8. behavior_notes (Academic & Behavioral, Confidentiality)</p>
              <p className="text-slate-300">9. assignments & announcements</p>
              <p className="text-slate-300">10. conversations, conversation_members, messages</p>
              <p className="text-slate-300">11. notifications, audit_logs, school_events</p>
            </div>
          </div>
        )}

        {/* TAB 4: RLS POLICIES */}
        {activeTab === 'rls' && (
          <div className="space-y-2.5 pt-1">
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>حظر ظهور مسودات العلامات (Draft Status Guard)</span>
              </div>
              <p className="text-slate-600 text-[11px] mt-1">
                سياسة RLS على جدول `grades` و `exams` تحجب أي درجات لم تنشر رسمياً (`status != 'published'`) عن الطلاب والأهالي.
              </p>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>عزل بيانات الأبناء (Parent Boundary)</span>
              </div>
              <p className="text-slate-600 text-[11px] mt-1">
                لا يستطيع ولي الأمر قراءة أي سجل لطالب غير مسجل تحت وصايته عبر مفتاح `student.parent_id`.
              </p>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                <span>منع ترقية الصلاحيات الذاتي (Anti-Role Escalation Trigger)</span>
              </div>
              <p className="text-slate-600 text-[11px] mt-1">
                محفز PostgreSQL يمنع أي مستخدم غير مسؤول النظام من تعديل عمود `role` في جدول `profiles`.
              </p>
            </div>
          </div>
        )}

        {/* TAB 5: SECURITY AUDITOR & TEST SUITE */}
        {activeTab === 'audit' && (
          <div className="pt-1">
            <SecurityAuditor />
          </div>
        )}

        <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
          <Button variant="secondary" onClick={onClose}>
            إغلاق
          </Button>
        </div>
      </div>
    </Modal>
  );
};
