import React, { useState } from 'react';
import { storage } from '../../services/storage';
import { Card, Badge } from '../common/UIComponents';
import { ShieldCheck, Search, Activity, Clock, Terminal } from 'lucide-react';

export const AuditLogsViewer: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const logs = storage.getAuditLogs();

  const filtered = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.actor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.table_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            سجل العمليات والرقابة الإدارية (Audit Trail)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            توثيق جميع عمليات التعديل والاعتماد ورصد الحضور والعلامات لضمان النزاهة الأكاديمية
          </p>
        </div>
        <Badge variant="danger" size="md">
          صلاحيات الإدارة العليا فقط
        </Badge>
      </div>

      {/* Search Bar */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="بحث بالعملية، اسم المستخدم، الجدول، أو التفاصيل..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-10 pl-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-hidden focus:border-blue-500"
          />
        </div>
      </Card>

      {/* Audit Log Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 font-bold text-slate-600">
              <tr>
                <th className="py-3 px-4">التوقيت والتاريخ</th>
                <th className="py-3 px-4">المستخدم الفاعل</th>
                <th className="py-3 px-4">الدور</th>
                <th className="py-3 px-4">العملية الإدارية</th>
                <th className="py-3 px-4">الجدول</th>
                <th className="py-3 px-4">تفاصيل العملية</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/60 transition">
                  <td className="py-3 px-4 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString('ar-EG', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900">{log.actor_name}</td>
                  <td className="py-3 px-4">
                    <Badge
                      variant={
                        log.actor_role === 'admin'
                          ? 'danger'
                          : log.actor_role === 'teacher'
                          ? 'primary'
                          : 'neutral'
                      }
                      size="sm"
                    >
                      {log.actor_role === 'admin' ? 'مدير' : 'معلم'}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-800">{log.action}</td>
                  <td className="py-3 px-4 font-mono text-blue-600 font-bold">{log.table_name}</td>
                  <td className="py-3 px-4 text-slate-600 text-[11px] max-w-xs">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
