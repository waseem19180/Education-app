import React from 'react';
import { X, Loader2 } from 'lucide-react';

// BADGE
export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className = ''
}) => {
  const variantStyles = {
    primary: 'bg-blue-50 text-blue-700 border-blue-200/60',
    secondary: 'bg-indigo-50 text-indigo-700 border-indigo-200/60',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
    warning: 'bg-amber-50 text-amber-700 border-amber-200/60',
    danger: 'bg-rose-50 text-rose-700 border-rose-200/60',
    info: 'bg-cyan-50 text-cyan-700 border-cyan-200/60',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200'
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1'
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-lg border ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  );
};

// BUTTON
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const variantStyles = {
    primary: 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm active:scale-[0.98]',
    secondary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm active:scale-[0.98]',
    outline: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-xs',
    ghost: 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm active:scale-[0.98]',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm active:scale-[0.98]'
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs rounded-xl font-medium',
    md: 'px-4 py-2 text-sm rounded-xl font-semibold',
    lg: 'px-5 py-2.5 text-base rounded-2xl font-semibold'
  };

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {children}
    </button>
  );
};

// CARD
export interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  onClick,
  hoverable = false
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs transition-all ${
        hoverable ? 'hover:shadow-md hover:border-slate-300 cursor-pointer' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};

// STAT CARD
export interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  color?: 'blue' | 'emerald' | 'amber' | 'purple' | 'rose' | 'slate';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtext,
  icon,
  trend,
  color = 'blue'
}) => {
  const iconBg = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
    rose: 'bg-rose-50 text-rose-600',
    slate: 'bg-slate-100 text-slate-700'
  };

  return (
    <Card className="relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
          <h3 className="mt-2 text-2xl font-extrabold text-slate-900 tracking-tight">{value}</h3>
          {subtext && <p className="mt-1 text-xs text-slate-500">{subtext}</p>}
          {trend && (
            <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold">
              <span className={trend.isPositive ? 'text-emerald-600' : 'text-rose-600'}>
                {trend.isPositive ? '▲' : '▼'} {trend.value}
              </span>
              <span className="text-slate-400 font-normal">مقارنة بالشهر السابق</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-2xl ${iconBg[color]}`}>{icon}</div>
      </div>
    </Card>
  );
};

// MODAL
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'lg'
}) => {
  if (!isOpen) return null;

  const maxWidthStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div
        className={`w-full ${maxWidthStyles[maxWidth]} rounded-3xl bg-white shadow-2xl border border-slate-100 my-8 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200`}
      >
        <div className="flex items-start justify-between p-6 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
            {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

// TABS
export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className = ''
}) => {
  return (
    <div className={`flex border-b border-slate-200 gap-1 overflow-x-auto no-scrollbar ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-all cursor-pointer ${
              isActive
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
