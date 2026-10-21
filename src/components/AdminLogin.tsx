import React, { useState } from 'react';
import { api, tokenStorage } from '../services/api';
import { UserProfile } from '../types';
import { ShieldCheck, Lock, AlertCircle, ArrowLeft, KeyRound, CheckCircle2 } from 'lucide-react';

interface AdminLoginProps {
  onAdminAuthSuccess: (user: UserProfile) => void;
  onBackToMember: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onAdminAuthSuccess, onBackToMember }) => {
  const [identifier] = useState('03208063725');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.adminLogin({
        identifier,
        password,
      });

      tokenStorage.set(res.token);
      onAdminAuthSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Administrator authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center p-4 bg-slate-900">
      <div className="w-full max-w-md bg-slate-950 rounded-2xl shadow-2xl border border-blue-900/50 overflow-hidden text-white">
        {/* Header */}
        <div className="p-6 bg-gradient-to-b from-blue-900/40 to-slate-950 border-b border-blue-900/40 text-center relative">
          <button
            onClick={onBackToMember}
            className="absolute left-4 top-5 p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Return to Member Login"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 mb-3 shadow-lg shadow-blue-500/10">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">Admin Authentication Portal</h2>
          <p className="text-xs text-blue-300 font-urdu mt-0.5" dir="rtl">
            صرف مجاز انتظامیہ اور مالک کے لیے مخصوص
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-800 text-blue-300 text-xs font-mono font-semibold">
            <span>Verified Identifier:</span>
            <span className="text-amber-400 font-bold">{identifier}</span>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-8">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-200 text-sm flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <div>{error}</div>
            </div>
          )}

          <div className="mb-5 p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
            <KeyRound className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-200">Owner Access:</span>
              <p className="text-slate-400 mt-0.5">
                Default initial master password: <code className="text-amber-300 font-mono">Admin@03208063725</code>.
                You can change it once logged into the dashboard settings.
              </p>
            </div>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                Admin Mobile Identifier
              </label>
              <input
                type="text"
                readOnly
                value={identifier}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 font-mono text-sm cursor-not-allowed select-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                Admin Secure Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter administrator password"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Access Admin Dashboard</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
            <button
              type="button"
              onClick={onBackToMember}
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              ← Return to Normal Member Portal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
