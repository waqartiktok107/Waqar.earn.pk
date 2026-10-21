/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { api, tokenStorage } from './services/api';
import { UserProfile } from './types';
import { Header } from './components/Header';
import { MemberAuth } from './components/MemberAuth';
import { AdminLogin } from './components/AdminLogin';
import { StatusLock } from './components/StatusLock';
import { MemberDashboard } from './components/MemberDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { FirebaseModal } from './components/FirebaseModal';
import { Toast, ToastMessage } from './components/Toast';
import { ShieldCheck, PhoneCall, Heart, ExternalLink } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAdminPortalMode, setIsAdminPortalMode] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isFirebaseModalOpen, setIsFirebaseModalOpen] = useState<boolean>(false);

  // Toast Notification helper
  const showToast = (
    message: string,
    type: 'success' | 'danger' | 'warning' | 'info' = 'info',
    messageUrdu?: string
  ) => {
    const id = `${Date.now()}_${Math.random()}`;
    const newToast: ToastMessage = { id, message, type, messageUrdu };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Check existing session on mount
  const refreshUserData = async () => {
    const token = tokenStorage.get();
    if (!token) {
      setCurrentUser(null);
      setIsInitializing(false);
      return;
    }

    try {
      const res = await api.getCurrentUser();
      setCurrentUser(res.user);
    } catch (err) {
      tokenStorage.clear();
      setCurrentUser(null);
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    refreshUserData();
  }, []);

  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
    setIsAdminPortalMode(false);
    showToast('Logged out successfully', 'info', 'کامیابی کے ساتھ لاگ آؤٹ ہو گئے ہیں');
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-500 flex items-center justify-center text-white text-2xl font-black mb-4 animate-bounce">
          W
        </div>
        <h2 className="text-xl font-bold">Waqar Earn.pk</h2>
        <p className="text-xs text-blue-300 font-urdu mt-1" dir="rtl">
          براہ کرم انتظار کریں، سیکیورٹی لوڈ ہو رہی ہے...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-800 font-sans selection:bg-blue-600 selection:text-white">
      {/* Toast Notifications */}
      <Toast toasts={toasts} onDismiss={handleDismissToast} />

      {/* Firebase Specs Modal */}
      <FirebaseModal
        isOpen={isFirebaseModalOpen}
        onClose={() => setIsFirebaseModalOpen(false)}
        onShowToast={showToast}
      />

      {/* Navigation Header */}
      <Header
        user={currentUser}
        isAdminMode={isAdminPortalMode}
        onToggleAdminPortal={() => setIsAdminPortalMode((prev) => !prev)}
        onLogout={handleLogout}
        onOpenFirebaseModal={() => setIsFirebaseModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {!currentUser ? (
          // Unauthenticated Flow
          isAdminPortalMode ? (
            <AdminLogin
              onAdminAuthSuccess={(admin) => {
                setCurrentUser(admin);
                setIsAdminPortalMode(false);
                showToast('Welcome, Administrator!', 'success');
              }}
              onBackToMember={() => setIsAdminPortalMode(false)}
            />
          ) : (
            <MemberAuth
              onAuthSuccess={(user, message) => {
                setCurrentUser(user);
                showToast(
                  message || 'Registered successfully. Status: Pending.',
                  user.status === 'pending' ? 'warning' : 'success',
                  user.status === 'pending' ? 'آپ کا اکاؤنٹ ایڈمن کی منظوری کے منتظر ہے۔' : undefined
                );
              }}
              onGoToAdmin={() => setIsAdminPortalMode(true)}
            />
          )
        ) : currentUser.role === 'admin' ? (
          // Authenticated Admin Dashboard
          <AdminDashboard
            adminUser={currentUser}
            onRefreshAdmin={refreshUserData}
            onShowToast={showToast}
            onOpenFirebaseModal={() => setIsFirebaseModalOpen(true)}
          />
        ) : currentUser.status !== 'active' ? (
          // Member Status Lock (Pending / Suspended / Rejected)
          <StatusLock
            user={currentUser}
            onRefreshUser={refreshUserData}
            onLogout={handleLogout}
          />
        ) : (
          // Approved Active Member Dashboard
          <MemberDashboard
            user={currentUser}
            onRefreshUser={refreshUserData}
            onShowToast={showToast}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 text-xs py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-white text-sm">Waqar Earn.pk</span>
            <span>•</span>
            <span className="text-slate-500 font-urdu" dir="rtl">پاکستان کا محفوظ آن لائن ارننگ نیٹ ورک</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span className="text-slate-400">Official Admin Support: <strong className="text-white">0320-8063725</strong></span>
            <span>•</span>
            <span className="text-slate-500">All rights reserved © 2025</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
