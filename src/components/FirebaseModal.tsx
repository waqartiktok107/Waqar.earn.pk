import React, { useState } from 'react';
import { Copy, Check, FileCode, Shield, Terminal, X, ExternalLink } from 'lucide-react';

interface FirebaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string, type: 'success' | 'danger' | 'warning' | 'info') => void;
}

export const FirebaseModal: React.FC<FirebaseModalProps> = ({ isOpen, onClose, onShowToast }) => {
  const [activeCodeTab, setActiveCodeTab] = useState<'rules' | 'functions' | 'deploy'>('rules');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const rulesCode = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() {
      return request.auth != null;
    }

    function isAdmin() {
      return isSignedIn() && (request.auth.token.admin == true || exists(/databases/$(database)/documents/admins/$(request.auth.uid)));
    }

    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }

    // Default deny catch-all
    match /{document=**} {
      allow read, write: if false;
    }

    // Users Collection
    match /users/{userId} {
      allow read: if isOwner(userId) || isAdmin();
      allow create: if isSignedIn() && isOwner(userId)
        && request.resource.data.role == 'member'
        && request.resource.data.status == 'pending'
        && request.resource.data.balance == 0
        && request.resource.data.totalEarned == 0;
      allow update: if isAdmin();
      allow delete: if isAdmin();
    }

    // Tasks Collection
    match /tasks/{taskId} {
      allow read: if isSignedIn();
      allow write: if isAdmin();
    }

    // Task Submissions
    match /taskSubmissions/{submissionId} {
      allow read: if isAdmin() || (isSignedIn() && resource.data.userId == request.auth.uid);
      allow create: if isSignedIn() && request.resource.data.userId == request.auth.uid && request.resource.data.status == 'pending';
      allow update, delete: if isAdmin();
    }

    // Deposit Requests
    match /depositRequests/{depositId} {
      allow read: if isAdmin() || (isSignedIn() && resource.data.userId == request.auth.uid);
      allow create: if isSignedIn() && request.resource.data.userId == request.auth.uid && request.resource.data.status == 'pending';
      allow update, delete: if isAdmin();
    }

    // Withdrawal Requests (Safe server-side execution only)
    match /withdrawalRequests/{withdrawalId} {
      allow read: if isAdmin() || (isSignedIn() && resource.data.userId == request.auth.uid);
      allow write: if isAdmin();
    }

    // Financial Transaction Ledger
    match /transactions/{txId} {
      allow read: if isAdmin() || (isSignedIn() && resource.data.userId == request.auth.uid);
      allow write: if isAdmin();
    }

    // Platform Settings
    match /settings/{docId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // Audit Logs
    match /auditLogs/{logId} {
      allow read, write: if isAdmin();
    }
  }
}`;

  const functionsCode = `const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// 1. Submit Withdrawal (Atomic deduction to prevent double spending)
exports.submitWithdrawalRequest = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Please log in.");

  const uid = context.auth.uid;
  const amount = Number(data.amount);
  const { paymentMethod, accountTitle, accountNumber } = data;

  return await db.runTransaction(async (transaction) => {
    const settingsDoc = await transaction.get(db.collection("settings").doc("general"));
    const minWithdrawal = settingsDoc.exists ? settingsDoc.data().minWithdrawal || 450 : 450;

    if (amount < minWithdrawal) {
      throw new functions.https.HttpsError("failed-precondition", \`Minimum withdrawal is PKR \${minWithdrawal}\`);
    }

    const userRef = db.collection("users").doc(uid);
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists) throw new functions.https.HttpsError("not-found", "User not found");

    const userData = userDoc.data();
    if (userData.status !== "active") throw new functions.https.HttpsError("permission-denied", "Account not active");
    if (userData.balance < amount) throw new functions.https.HttpsError("failed-precondition", "Insufficient balance");

    // Reserve funds immediately
    transaction.update(userRef, { balance: userData.balance - amount });

    const withdrawalRef = db.collection("withdrawalRequests").doc();
    transaction.set(withdrawalRef, {
      id: withdrawalRef.id,
      userId: uid,
      userFullName: userData.fullName,
      amount,
      paymentMethod,
      accountTitle,
      accountNumber,
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true, newBalance: userData.balance - amount };
  });
});`;

  const deployGuide = `# Deployment Guide for Waqar Earn.pk

1. Create a Firebase project at https://console.firebase.google.com/
2. Enable Email/Password authentication in Firebase Console
3. Install Firebase Tools:
   npm install -g firebase-tools
   firebase login
   firebase use --add <YOUR_PROJECT_ID>

4. Deploy Firestore Rules and Indexes:
   firebase deploy --only firestore:rules,firestore:indexes

5. Deploy Cloud Functions:
   cd functions && npm install && cd ..
   firebase deploy --only functions

6. Assign Admin Role to 03208063725:
   Run the provision script in functions/ to grant custom claim "admin: true".

7. Deploy Frontend:
   npm run build
   firebase deploy --only hosting`;

  const currentContent =
    activeCodeTab === 'rules'
      ? rulesCode
      : activeCodeTab === 'functions'
      ? functionsCode
      : deployGuide;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentContent);
    setCopied(true);
    onShowToast('Copied to clipboard!', 'info');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 text-white rounded-3xl max-w-3xl w-full border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <FileCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Firebase Backend Specifications & Code</h3>
              <p className="text-[11px] text-slate-400">Exportable Security Rules, Functions & Deployment Steps</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Code'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-slate-950/60 px-5 pt-3 border-b border-slate-800 gap-2">
          <button
            onClick={() => setActiveCodeTab('rules')}
            className={`pb-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeCodeTab === 'rules'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            firestore.rules
          </button>
          <button
            onClick={() => setActiveCodeTab('functions')}
            className={`pb-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeCodeTab === 'functions'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            functions/index.js
          </button>
          <button
            onClick={() => setActiveCodeTab('deploy')}
            className={`pb-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeCodeTab === 'deploy'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Deployment Guide (.md)
          </button>
        </div>

        {/* Code Content Body */}
        <div className="p-5 flex-1 overflow-y-auto font-mono text-xs text-slate-300 bg-slate-950/90">
          <pre className="whitespace-pre overflow-x-auto leading-relaxed">{currentContent}</pre>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>All files are also saved in the root directory: <code className="text-amber-400 font-mono">firestore.rules</code></span>
          <button onClick={onClose} className="hover:text-white transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
