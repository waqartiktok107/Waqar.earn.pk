import React from 'react';
import { UserProfile } from '../types';
import { ShieldCheck, Wallet, LogOut, Lock, User, FileCode, CheckCircle2 } from 'lucide-react';

interface HeaderProps {
  user: UserProfile | null;
  isAdminMode: boolean;
  onToggleAdminPortal: () => void;
  onLogout: () => void;
  onOpenFirebaseModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  isAdminMode,
  onToggleAdminPortal,
  onLogout,
  onOpenFirebaseModal,
}) => {
  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 border border-blue-400/30">
              <span className="font-extrabold text-xl sm:text-2xl tracking-tighter">W</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg sm:text-xl text-white tracking-tight">
                  Waqar Earn<span className="text-blue-400">.pk</span>
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-2.5 h-2.5" /> Verified PK
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block font-urdu" dir="rtl">
                وقار ارن - پاکستان کا بااعتماد روزگار پورٹل
              </p>
            </div>
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Firebase Code Export Button */}
            <button
              onClick={onOpenFirebaseModal}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              title="View Firebase Rules, Functions & Deploy Guide"
            >
              <FileCode className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">Firebase Code</span>
            </button>

            {user ? (
              <div className="flex items-center gap-2 sm:gap-3">
                {user.role === 'admin' ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-950 text-blue-300 border border-blue-800 text-xs font-medium">
                    <ShieldCheck className="w-4 h-4 text-blue-400" />
                    <span className="font-semibold">Admin (03208063725)</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {/* Member Balance Indicator */}
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/90 text-white border border-slate-700 text-xs sm:text-sm font-semibold shadow-inner">
                      <Wallet className="w-4 h-4 text-emerald-400" />
                      <span>
                        PKR <span className="text-emerald-400 font-bold">{user.balance.toFixed(2)}</span>
                      </span>
                    </div>

                    {/* Status Pill */}
                    <span
                      className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                        user.status === 'active'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : user.status === 'pending'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      }`}
                    >
                      {user.status}
                    </span>
                  </div>
                )}

                {/* User Name Tag */}
                <div className="hidden lg:flex flex-col text-right">
                  <span className="text-xs font-semibold text-slate-200">{user.fullName}</span>
                  <span className="text-[10px] text-slate-400">{user.phoneOrEmail}</span>
                </div>

                {/* Logout Button */}
                <button
                  onClick={onLogout}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-950/50 hover:bg-red-900/60 text-red-300 border border-red-800/60 text-xs font-semibold transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Logout / لاگ آؤٹ</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={onToggleAdminPortal}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                    isAdminMode
                      ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                      : 'bg-blue-600/20 text-blue-300 border-blue-500/30 hover:bg-blue-600/30'
                  }`}
                >
                  {isAdminMode ? (
                    <>
                      <User className="w-3.5 h-3.5 text-blue-400" />
                      <span>Member Portal / ممبر</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Admin Portal (03208063725)</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
