import React, { useState } from 'react';
import { usePWAInstall, useOnlineStatus } from '../../hooks/usePWAInstall';
import { Download, Smartphone, X, WifiOff } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed, hide
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-2 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 active:scale-95 transition-all"
        title="تثبيت المنصة كتطبيق على الهاتف أو الحاسوب"
      >
        <Download className="w-3.5 h-3.5" />
        <span>تثبيت التطبيق</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
        >
          <Smartphone className="w-3.5 h-3.5 text-blue-600" />
          <span>تثبيت على iPhone</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 text-right">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900">تثبيت التطبيق على iPhone / iPad</h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="rounded-lg p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">١</span>
                  <p>اضغط على زر <strong>المشاركة (Share)</strong> في شريط متصفح Safari بالأسفل.</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">٢</span>
                  <p>مرر للأسفل واضغط على <strong>إضافة إلى الشاشة الرئيسية (Add to Home Screen)</strong>.</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">٣</span>
                  <p>اضغط <strong>إضافة (Add)</strong> بالأعلى لتجد تطبيق EduConnect على شاشتك!</p>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-6 w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition"
              >
                فهمت، إغلاق
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <button
      onClick={() => alert('لتثبيت EduConnect: اضغط على خيارات المتصفح (⋮) ثم اختر "تثبيت التطبيق" أو "الإضافة للشاشة الرئيسية".')}
      className="hidden sm:flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
      title="تطبيق الويب التقدمي (PWA)"
    >
      <Smartphone className="w-3.5 h-3.5 text-blue-600" />
      <span>تطبيق PWA</span>
    </button>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-500/95 backdrop-blur-md px-4 py-2 text-xs font-medium text-white shadow-xl animate-bounce">
      <WifiOff className="w-4 h-4" />
      <span>وضع عدم الاتصال — يتم استخدام البيانات المحفوظة محلياً (PWA Cache).</span>
    </div>
  );
};
