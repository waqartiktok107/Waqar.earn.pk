import React, { useState } from 'react';
import { UserProfile } from '../types';
import { Clock, ShieldAlert, XCircle, RefreshCw, LogOut, PhoneCall } from 'lucide-react';
import { api } from '../services/api';

interface StatusLockProps {
  user: UserProfile;
  onRefreshUser: () => Promise<void>;
  onLogout: () => void;
}

export const StatusLock: React.FC<StatusLockProps> = ({ user, onRefreshUser, onLogout }) => {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefreshUser();
    } finally {
      setRefreshing(false);
    }
  };

  const isPending = user.status === 'pending';
  const isSuspended = user.status === 'suspended';
  const isRejected = user.status === 'rejected';

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center p-4 bg-slate-100">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl border border-slate-200 p-6 sm:p-10 text-center">
        {/* Status Graphic */}
        <div className="mx-auto mb-6 flex items-center justify-center">
          {isPending && (
            <div className="w-20 h-20 rounded-full bg-amber-100 border-4 border-amber-200 text-amber-600 flex items-center justify-center animate-pulse">
              <Clock className="w-10 h-10" />
            </div>
          )}
          {isSuspended && (
            <div className="w-20 h-20 rounded-full bg-red-100 border-4 border-red-200 text-red-600 flex items-center justify-center">
              <ShieldAlert className="w-10 h-10" />
            </div>
          )}
          {isRejected && (
            <div className="w-20 h-20 rounded-full bg-rose-100 border-4 border-rose-200 text-rose-600 flex items-center justify-center">
              <XCircle className="w-10 h-10" />
            </div>
          )}
        </div>

        {/* Primary Status Title */}
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {isPending && 'Waiting for Admin Approval'}
          {isSuspended && 'Your Account Has Been Suspended'}
          {isRejected && 'Your Account Registration Was Rejected'}
        </h1>

        {/* Urdu Status Subtitle */}
        <p className="text-base sm:text-lg text-slate-600 font-urdu mt-2" dir="rtl">
          {isPending && 'آپ کا اکاؤنٹ ایڈمن کی منظوری کے منتظر ہے۔'}
          {isSuspended && 'آپ کا اکاؤنٹ انتظامیہ کی جانب سے معطل کر دیا گیا ہے۔'}
          {isRejected && 'آپ کی اکاؤنٹ رجسٹریشن مسترد کر دی گئی ہے۔'}
        </p>

        {/* Explanation Card */}
        <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2 text-sm text-slate-700">
          <div className="flex justify-between items-center text-xs text-slate-500 border-b border-slate-200 pb-2">
            <span>Member: <strong className="text-slate-800">{user.fullName}</strong></span>
            <span>Identifier: <strong className="text-slate-800">{user.phoneOrEmail}</strong></span>
          </div>

          {isPending && (
            <p className="text-xs text-slate-600 leading-relaxed pt-1">
              Thank you for registering on <strong>Waqar Earn.pk</strong>. In accordance with security protocol, your profile is placed in a pending verification queue. Earning tasks, deposits, and withdrawals will become instantly accessible as soon as the administrator verifies your account.
            </p>
          )}

          {isSuspended && (
            <p className="text-xs text-rose-700 leading-relaxed pt-1">
              Your account has been placed under administrative suspension due to a terms of service violation or review request. Contact the official admin support for resolution.
            </p>
          )}

          {isRejected && (
            <p className="text-xs text-rose-700 leading-relaxed pt-1">
              This registration request was rejected by administration. Possible reasons include duplicate credentials or invalid phone number details.
            </p>
          )}
        </div>

        {/* Helpline Notice */}
        <div className="mt-4 p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center justify-center gap-2">
          <PhoneCall className="w-4 h-4 text-blue-600" />
          <span>Official Admin Support Helpline: <strong>0320-8063725</strong></span>
        </div>

        {/* Action Controls */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Check Approval Status / دوبارہ چیک کریں</span>
          </button>

          <button
            onClick={onLogout}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-sm transition-all flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4 text-slate-600" />
            <span>Logout / لاگ آؤٹ</span>
          </button>
        </div>
      </div>
    </div>
  );
};
