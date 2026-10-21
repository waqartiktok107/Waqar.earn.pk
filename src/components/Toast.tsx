import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'danger' | 'warning' | 'info';
  message: string;
  messageUrdu?: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full px-4 pointer-events-none">
      {toasts.map((toast) => {
        const bgStyles =
          toast.type === 'success'
            ? 'bg-emerald-600 text-white shadow-emerald-200'
            : toast.type === 'danger'
            ? 'bg-rose-600 text-white shadow-rose-200'
            : toast.type === 'warning'
            ? 'bg-amber-600 text-white shadow-amber-200'
            : 'bg-blue-600 text-white shadow-blue-200';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border border-white/20 transition-all transform animate-in fade-in slide-in-from-bottom-2 ${bgStyles}`}
          >
            <div className="mt-0.5 shrink-0">
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-white" />}
              {toast.type === 'danger' && <XCircle className="w-5 h-5 text-white" />}
              {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-white" />}
              {toast.type === 'info' && <Info className="w-5 h-5 text-white" />}
            </div>
            <div className="flex-1 text-sm font-medium">
              <div>{toast.message}</div>
              {toast.messageUrdu && (
                <div className="text-xs opacity-90 mt-0.5 font-urdu text-right" dir="rtl">
                  {toast.messageUrdu}
                </div>
              )}
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-white/80 hover:text-white transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
