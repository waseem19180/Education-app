import React, { useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { storage } from '../../services/storage';
import { Modal, Button, Badge } from '../common/UIComponents';
import { UserRole } from '../../types/database';
import {
  Lock,
  Mail,
  User,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  LogOut,
  RefreshCw,
  Sparkles
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onAuthSuccess }) => {
  const [tab, setTab] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const authUser = storage.getAuthUser();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setErrorMsg('البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى التأكد من البيانات أو إنشاء حساب جديد.');
        } else {
          setErrorMsg(error.message);
        }
        setLoading(false);
        return;
      }

      setSuccessMsg('تم تسجيل الدخول بنجاح! جاري تحميل بياناتك المدرسية الموثقة...');
      storage.setAppMode('production');

      setTimeout(() => {
        setLoading(false);
        if (onAuthSuccess) onAuthSuccess();
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'حدث خطأ أثناء تسجيل الدخول.');
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role
          }
        }
      });

      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
        return;
      }

      setSuccessMsg('تم إنشاء الحساب بنجاح في Supabase! تم ربط ملفك الأكاديمي وصلاحياتك.');
      storage.setAppMode('production');

      setTimeout(() => {
        setLoading(false);
        if (onAuthSuccess) onAuthSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err?.message || 'حدث خطأ أثناء إنشاء الحساب.');
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) {
        setErrorMsg(error.message);
      } else {
        setSuccessMsg('تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني بنجاح.');
      }
      setLoading(false);
    } catch (err: any) {
      setErrorMsg(err?.message || 'تعذر إرسال رابط الاستعادة.');
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setLoading(false);
    setSuccessMsg('تم تسجيل الخروج بنجاح.');
    setTimeout(() => {
      onClose();
    }, 500);
  };

  const fillQuickCredentials = (demoEmail: string, demoRole: UserRole, demoName: string) => {
    setEmail(demoEmail);
    setPassword('EduConnect2026!');
    setFullName(demoName);
    setRole(demoRole);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={authUser ? 'حسابك في Supabase Auth' : 'المصادقة السحابية الموحدة — Supabase'}
      subtitle="نظام التحقق الآمن وإدارة الجلسات مع تشفير كامل وصلاحيات RLS"
      maxWidth="md"
    >
      <div className="space-y-4 text-xs">
        {/* If already logged in */}
        {authUser ? (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto ring-4 ring-emerald-50">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">{authUser.full_name}</h3>
              <p className="text-slate-500 font-mono text-[11px] mt-0.5">{authUser.email}</p>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Badge variant="primary">جلسة نشطة وموثقة سحابياً</Badge>
              <Badge variant="success">الرتبة: {authUser.role}</Badge>
            </div>
            <p className="text-[11px] text-slate-500">
              صلاحياتك مطبقة تلقائياً على كافة جداول قاعدة البيانات عبر سياسات Row-Level Security.
            </p>
            <Button
              variant="danger"
              size="sm"
              icon={<LogOut className="w-4 h-4" />}
              loading={loading}
              onClick={handleSignOut}
              className="w-full mt-2"
            >
              تسجيل الخروج من الجلسة السحابية
            </Button>
          </div>
        ) : (
          <>
            {/* Tabs: Sign In / Sign Up / Reset */}
            <div className="flex border-b border-slate-200">
              <button
                type="button"
                onClick={() => { setTab('signin'); setErrorMsg(null); setSuccessMsg(null); }}
                className={`flex-1 pb-2.5 font-bold border-b-2 text-center transition cursor-pointer ${
                  tab === 'signin' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
                }`}
              >
                تسجيل الدخول
              </button>
              <button
                type="button"
                onClick={() => { setTab('signup'); setErrorMsg(null); setSuccessMsg(null); }}
                className={`flex-1 pb-2.5 font-bold border-b-2 text-center transition cursor-pointer ${
                  tab === 'signup' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
                }`}
              >
                إنشاء حساب موثق
              </button>
              <button
                type="button"
                onClick={() => { setTab('reset'); setErrorMsg(null); setSuccessMsg(null); }}
                className={`flex-1 pb-2.5 font-bold border-b-2 text-center transition cursor-pointer ${
                  tab === 'reset' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'
                }`}
              >
                استعادة الرمز
              </button>
            </div>

            {/* Error & Success Messages */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* FORM: SIGN IN */}
            {tab === 'signin' && (
              <form onSubmit={handleSignIn} className="space-y-3 pt-1">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">البريد الإلكتروني المعتمد</label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder="admin@educonnect.school"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">كلمة المرور</label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="secondary"
                  loading={loading}
                  className="w-full py-2.5 mt-2"
                >
                  تسجيل الدخول إلى حسابك السحابي
                </Button>
              </form>
            )}

            {/* FORM: SIGN UP */}
            {tab === 'signup' && (
              <form onSubmit={handleSignUp} className="space-y-3 pt-1">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">الاسم الكامل</label>
                  <div className="relative">
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="مثال: أ. أحمد الشامي"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">الرتبة المدرسية *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500 bg-white"
                  >
                    <option value="admin">مدير النظام (Admin)</option>
                    <option value="teacher">معلم مادة (Teacher)</option>
                    <option value="parent">ولي أمر (Parent)</option>
                    <option value="student">طالب (Student)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">البريد الإلكتروني</label>
                  <input
                    type="email"
                    required
                    placeholder="name@educonnect.school"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">كلمة المرور (6 خانات على الأقل)</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <Button
                  type="submit"
                  variant="secondary"
                  loading={loading}
                  className="w-full py-2.5 mt-2"
                >
                  إنشاء وتفعيل الحساب في Supabase
                </Button>
              </form>
            )}

            {/* FORM: RESET PASSWORD */}
            {tab === 'reset' && (
              <form onSubmit={handleResetPassword} className="space-y-3 pt-1">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">البريد الإلكتروني المسجل</label>
                  <input
                    type="email"
                    required
                    placeholder="user@educonnect.school"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <Button
                  type="submit"
                  variant="secondary"
                  loading={loading}
                  className="w-full py-2.5 mt-2"
                >
                  إرسال رابط إعادة التعيين
                </Button>
              </form>
            )}

            {/* Quick Autofill Helper for Fast Verification */}
            <div className="pt-3 border-t border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 block mb-1.5">
                تعبئة سريعة لحسابات الاختبار المعتمدة:
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => fillQuickCredentials('admin@educonnect.school', 'admin', 'د. سامي العبداللات')}
                  className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-[10px] text-right hover:bg-blue-50 hover:text-blue-700 transition"
                >
                  <strong className="block">مدير:</strong> admin@educonnect.school
                </button>
                <button
                  type="button"
                  onClick={() => fillQuickCredentials('a.shami@educonnect.school', 'teacher', 'أ. أحمد الشامي')}
                  className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-[10px] text-right hover:bg-blue-50 hover:text-blue-700 transition"
                >
                  <strong className="block">معلم:</strong> a.shami@educonnect.school
                </button>
                <button
                  type="button"
                  onClick={() => fillQuickCredentials('parent.qasimi@gmail.com', 'parent', 'م. إبراهيم القاسمي')}
                  className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-[10px] text-right hover:bg-blue-50 hover:text-blue-700 transition"
                >
                  <strong className="block">ولي أمر:</strong> parent.qasimi@gmail.com
                </button>
                <button
                  type="button"
                  onClick={() => fillQuickCredentials('mohammed.qasimi@student.educonnect.school', 'student', 'محمد القاسمي')}
                  className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-[10px] text-right hover:bg-blue-50 hover:text-blue-700 transition"
                >
                  <strong className="block">طالب:</strong> mohammed.qasimi@...
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
