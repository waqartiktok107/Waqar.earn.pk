import React, { useState, useEffect } from 'react';
import {
  UserProfile,
  Task,
  TaskSubmission,
  DepositRequest,
  WithdrawalRequest,
  Transaction,
  PlatformSettings,
  NotificationItem,
} from '../types';
import { api } from '../services/api';
import {
  Wallet,
  TrendingUp,
  CheckCircle2,
  Clock,
  ListTodo,
  ArrowDownLeft,
  ArrowUpRight,
  History,
  Bell,
  AlertCircle,
  Copy,
  ExternalLink,
  Send,
  HelpCircle,
  Building,
  Smartphone,
  ChevronRight,
} from 'lucide-react';

interface MemberDashboardProps {
  user: UserProfile;
  onRefreshUser: () => Promise<void>;
  onShowToast: (msg: string, type: 'success' | 'danger' | 'warning' | 'info', urdu?: string) => void;
}

export const MemberDashboard: React.FC<MemberDashboardProps> = ({
  user,
  onRefreshUser,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'tasks' | 'deposit' | 'withdraw' | 'history' | 'notifications'>('tasks');
  const [settings, setSettings] = useState<PlatformSettings | null>(null);

  // Data collections
  const [tasks, setTasks] = useState<Task[]>([]);
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([]);
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Deposit Form State
  const [depositAmount, setDepositAmount] = useState<number>(250);
  const [depositMethod, setDepositMethod] = useState<'EasyPaisa' | 'JazzCash' | 'Bank Transfer'>('EasyPaisa');
  const [depositTrxId, setDepositTrxId] = useState('');
  const [depositSender, setDepositSender] = useState('');
  const [depositProofUrl, setDepositProofUrl] = useState('');
  const [depositSubmitting, setDepositSubmitting] = useState(false);

  // Withdrawal Form State
  const [withdrawAmount, setWithdrawAmount] = useState<number>(450);
  const [withdrawMethod, setWithdrawMethod] = useState<'EasyPaisa' | 'JazzCash' | 'Bank Transfer'>('EasyPaisa');
  const [withdrawTitle, setWithdrawTitle] = useState('');
  const [withdrawNumber, setWithdrawNumber] = useState('');
  const [withdrawBank, setWithdrawBank] = useState('');
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);

  // Task Submission State
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskProof, setTaskProof] = useState('');
  const [taskSubmitting, setTaskSubmitting] = useState(false);

  // Load initial data
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [settingsRes, tasksRes, subsRes, depositsRes, withRes, txRes, notifRes] = await Promise.all([
        api.getPublicSettings().catch(() => null),
        api.getTasks().catch(() => ({ tasks: [] })),
        api.getMySubmissions().catch(() => ({ submissions: [] })),
        api.getMyDeposits().catch(() => ({ deposits: [] })),
        api.getMyWithdrawals().catch(() => ({ withdrawals: [] })),
        api.getMyTransactions().catch(() => ({ transactions: [] })),
        api.getMyNotifications().catch(() => ({ notifications: [] })),
      ]);

      if (settingsRes) {
        setSettings(settingsRes);
        setDepositAmount(settingsRes.minDeposit || 250);
        setWithdrawAmount(settingsRes.minWithdrawal || 450);
      }
      setTasks(tasksRes.tasks || []);
      setSubmissions(subsRes.submissions || []);
      setDeposits(depositsRes.deposits || []);
      setWithdrawals(withRes.withdrawals || []);
      setTransactions(txRes.transactions || []);
      setNotifications(notifRes.notifications || []);
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user.id]);

  // Handle Deposit Submission
  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const minDep = settings?.minDeposit || 250;
    if (depositAmount < minDep) {
      onShowToast(`Minimum deposit is PKR ${minDep}`, 'danger', `کم از کم ڈپازٹ ${minDep} روپے ہے`);
      return;
    }

    if (!depositTrxId.trim()) {
      onShowToast('Please enter the Transaction ID (TRX ID)', 'danger');
      return;
    }

    setDepositSubmitting(true);
    try {
      const res = await api.submitDeposit({
        amount: Number(depositAmount),
        paymentMethod: depositMethod,
        transactionId: depositTrxId.trim(),
        senderAccount: depositSender.trim(),
        proofUrl: depositProofUrl.trim(),
      });

      onShowToast(res.message, 'success', 'ڈپازٹ ایڈمن کی تصدیق کے لیے بھیج دیا گیا ہے');
      setDepositTrxId('');
      setDepositSender('');
      setDepositProofUrl('');
      // Reload deposits
      const myDeps = await api.getMyDeposits();
      setDeposits(myDeps.deposits);
      setActiveTab('deposit');
    } catch (err: any) {
      onShowToast(err.message, 'danger');
    } finally {
      setDepositSubmitting(false);
    }
  };

  // Handle Withdrawal Submission
  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const minWith = settings?.minWithdrawal || 450;
    if (withdrawAmount < minWith) {
      onShowToast(`Minimum withdrawal is PKR ${minWith}`, 'danger', `کم از کم رقم ${minWith} روپے ہے`);
      return;
    }

    if (withdrawAmount > user.balance) {
      onShowToast(`Insufficient balance. You have PKR ${user.balance.toFixed(2)}`, 'danger', 'ناکافی بیلنس');
      return;
    }

    if (!withdrawTitle.trim() || !withdrawNumber.trim()) {
      onShowToast('Please provide your complete account title and number', 'danger');
      return;
    }

    setWithdrawSubmitting(true);
    try {
      const res = await api.submitWithdrawal({
        amount: Number(withdrawAmount),
        paymentMethod: withdrawMethod,
        accountTitle: withdrawTitle.trim(),
        accountNumber: withdrawNumber.trim(),
        bankName: withdrawMethod === 'Bank Transfer' ? withdrawBank.trim() : undefined,
      });

      onShowToast(res.message, 'success', 'رقم نکلوانے کی درخواست جمع ہوگئی ہے');
      setWithdrawTitle('');
      setWithdrawNumber('');
      setWithdrawBank('');
      await onRefreshUser();
      const [myWiths, myTxs] = await Promise.all([api.getMyWithdrawals(), api.getMyTransactions()]);
      setWithdrawals(myWiths.withdrawals);
      setTransactions(myTxs.transactions);
      setActiveTab('withdraw');
    } catch (err: any) {
      onShowToast(err.message, 'danger');
    } finally {
      setWithdrawSubmitting(false);
    }
  };

  // Handle Task Proof Submission
  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !taskProof.trim()) return;

    setTaskSubmitting(true);
    try {
      const res = await api.submitTaskProof(selectedTask.id, taskProof.trim());
      onShowToast(res.message, 'success', 'ٹاسک ایڈمن کی منظوری کے لیے جمع ہو گیا ہے');
      setTaskProof('');
      setSelectedTask(null);
      // Reload submissions
      const mySubs = await api.getMySubmissions();
      setSubmissions(mySubs.submissions);
    } catch (err: any) {
      onShowToast(err.message, 'danger');
    } finally {
      setTaskSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    onShowToast('Copied to clipboard!', 'info');
  };

  // Helper to check if task is already submitted
  const getTaskSubmissionStatus = (taskId: string) => {
    const sub = submissions.find((s) => s.taskId === taskId);
    return sub ? sub.status : null;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      {/* Announcement Banner */}
      {settings?.announcement && (
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-blue-900 to-indigo-900 text-white shadow-md border border-blue-700/50 flex items-start gap-3">
          <Bell className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <div className="font-semibold">{settings.announcement}</div>
            {settings.announcementUrdu && (
              <div className="text-xs text-blue-200 font-urdu mt-1 text-right" dir="rtl">
                {settings.announcementUrdu}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Top Financial Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8">
        {/* Available Balance */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Available Balance / موجودہ رقم
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900">
            <span className="text-sm font-semibold text-emerald-600 mr-1">PKR</span>
            {user.balance.toFixed(2)}
          </div>
          <p className="text-xs text-slate-500 mt-2 flex items-center gap-1 font-urdu" dir="rtl">
            فوری کیش آؤٹ کے لیے تیار رقم
          </p>
        </div>

        {/* Total Approved Earnings */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Approved Earnings / کل آمدنی
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-blue-900">
            <span className="text-sm font-semibold text-blue-600 mr-1">PKR</span>
            {user.totalEarned.toFixed(2)}
          </div>
          <p className="text-xs text-slate-500 mt-2 font-urdu" dir="rtl">
            ٹاسکس اور سرگرمیوں سے کمائی گئی کل رقم
          </p>
        </div>

        {/* Account Status */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Account Status / اکاؤنٹ کی حالت
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              Verified & Active
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-3 font-urdu" dir="rtl">
            آپ کا اکاؤنٹ فعال ہے اور آپ تمام سرگرمیاں انجام دے سکتے ہیں
          </p>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex overflow-x-auto gap-2 border-b border-slate-200 pb-3 mb-6 no-scrollbar">
        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
            activeTab === 'tasks'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ListTodo className="w-4 h-4" />
          <span>Available Tasks / ٹاسکس ({tasks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('deposit')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
            activeTab === 'deposit'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
          <span>Deposit Funds / جمع کروائیں</span>
        </button>

        <button
          onClick={() => setActiveTab('withdraw')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
            activeTab === 'withdraw'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ArrowUpRight className="w-4 h-4 text-indigo-500" />
          <span>Withdraw / رقم نکلوائیں</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
            activeTab === 'history'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Ledger & History / کھاتہ</span>
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
            activeTab === 'notifications'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Alerts ({notifications.length})</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: AVAILABLE TASKS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'tasks' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 flex items-center justify-between">
              <span>Verified Tasks & Daily Earning Opportunities</span>
              <span className="text-xs text-slate-500 font-urdu" dir="rtl">
                روزانہ ٹاسک مکمل کریں اور نقد انعام حاصل کریں
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Select an active task below, follow the instructions carefully, and submit your proof. Rewards are reviewed and credited directly to your available balance.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {tasks.length === 0 ? (
                <div className="col-span-2 text-center py-12 text-slate-400">
                  No active tasks available at this moment. Check back shortly.
                </div>
              ) : (
                tasks.map((task) => {
                  const subStatus = getTaskSubmissionStatus(task.id);
                  return (
                    <div
                      key={task.id}
                      className="border border-slate-200 hover:border-blue-400 rounded-2xl p-5 bg-gradient-to-br from-white to-slate-50/50 shadow-sm transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                            {task.category || 'General'}
                          </span>
                          <span className="inline-flex items-center gap-1 font-extrabold text-emerald-600 text-base">
                            <span className="text-xs font-semibold">PKR</span> +{task.reward}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-900 text-base">{task.title}</h3>
                        {task.titleUrdu && (
                          <p className="text-xs text-slate-600 font-urdu mt-0.5" dir="rtl">
                            {task.titleUrdu}
                          </p>
                        )}
                        <p className="text-xs text-slate-600 mt-2 line-clamp-2">{task.description}</p>
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                        {subStatus ? (
                          <span
                            className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                              subStatus === 'approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : subStatus === 'pending'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            Status: {subStatus}
                          </span>
                        ) : (
                          <button
                            onClick={() => setSelectedTask(task)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all"
                          >
                            <span>Start & Submit Proof</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Member Submissions List */}
          {submissions.length > 0 && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-4">Your Recent Task Submissions</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Task Title</th>
                      <th className="py-2.5 px-3">Reward</th>
                      <th className="py-2.5 px-3">Proof Details</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {submissions.map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-3 font-semibold text-slate-900">{sub.taskTitle}</td>
                        <td className="py-3 px-3 font-bold text-emerald-600">PKR {sub.reward}</td>
                        <td className="py-3 px-3 text-slate-600 max-w-xs truncate">{sub.submissionProof}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                              sub.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : sub.status === 'pending'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {sub.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-500">
                          {new Date(sub.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: DEPOSIT FUNDS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'deposit' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Official Payment Accounts Instructions */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-gradient-to-br from-blue-900 to-indigo-950 text-white rounded-2xl p-6 shadow-md border border-blue-800/60">
              <h3 className="text-base font-bold text-white mb-1">Official Deposit Instructions</h3>
              <p className="text-xs text-blue-200 font-urdu mb-4" dir="rtl">
                سرکاری اکاؤنٹس پر رقم بھیجیں اور ٹرانزیکشن آئی ڈی درج کریں
              </p>

              <div className="space-y-3">
                {settings?.paymentAccounts.map((acc, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-white/10 backdrop-blur border border-white/15">
                    <div className="flex items-center justify-between text-xs font-bold text-amber-300 mb-1">
                      <span>{acc.method}</span>
                      {acc.bankName && <span className="text-[10px] text-blue-200">{acc.bankName}</span>}
                    </div>
                    <div className="text-sm font-mono font-bold tracking-wider flex items-center justify-between">
                      <span>{acc.accountNumber}</span>
                      <button
                        onClick={() => copyToClipboard(acc.accountNumber)}
                        className="p-1 hover:bg-white/20 rounded transition-colors text-slate-300 hover:text-white"
                        title="Copy account number"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="text-xs text-blue-100 mt-1">Title: <strong>{acc.title}</strong></div>
                    <p className="text-[11px] text-blue-200/80 mt-1.5 leading-snug">{acc.instructions}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-3 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-200 text-xs">
                <strong>Default Minimum Deposit:</strong> PKR {settings?.minDeposit || 250}.
                Deposits are manually checked by admin before balance is credited.
              </div>
            </div>
          </div>

          {/* Deposit Request Form */}
          <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-1">Submit Deposit Request</h3>
            <p className="text-xs text-slate-500 mb-6 font-urdu" dir="rtl">
              رقم جمع کروانے کے بعد فارم مکمل کریں
            </p>

            <form onSubmit={handleDepositSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Deposit Amount (PKR) / رقم
                  </label>
                  <input
                    type="number"
                    required
                    min={settings?.minDeposit || 250}
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:bg-white focus:border-blue-600 outline-none"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Minimum: PKR {settings?.minDeposit || 250}</p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Payment Method / طریقہ کار
                  </label>
                  <select
                    value={depositMethod}
                    onChange={(e: any) => setDepositMethod(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:bg-white focus:border-blue-600 outline-none"
                  >
                    <option value="EasyPaisa">EasyPaisa</option>
                    <option value="JazzCash">JazzCash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Transaction ID (TRX ID / TID) / ٹرانزیکشن آئی ڈی
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 81928491823"
                  value={depositTrxId}
                  onChange={(e) => setDepositTrxId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono text-sm focus:bg-white focus:border-blue-600 outline-none"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  11-digit or official transaction number received in SMS from 3737 (EasyPaisa) or 8558 (JazzCash).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Sender Mobile/Account (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Your sender phone number"
                    value={depositSender}
                    onChange={(e) => setDepositSender(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:bg-white focus:border-blue-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Screenshot Link / Proof URL (Optional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://imgur.com/..."
                    value={depositProofUrl}
                    onChange={(e) => setDepositProofUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:bg-white focus:border-blue-600 outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={depositSubmitting}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {depositSubmitting ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit Deposit for Review / جمع کروائیں</span>
                  </>
                )}
              </button>
            </form>

            {/* Deposits History */}
            <div className="mt-8 pt-6 border-t border-slate-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                Deposit Requests History
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Method</th>
                      <th className="py-2 px-3">Amount</th>
                      <th className="py-2 px-3">TRX ID</th>
                      <th className="py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {deposits.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-slate-400">
                          No deposit requests found.
                        </td>
                      </tr>
                    ) : (
                      deposits.map((dep) => (
                        <tr key={dep.id}>
                          <td className="py-2.5 px-3 text-slate-500">
                            {new Date(dep.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-800">{dep.paymentMethod}</td>
                          <td className="py-2.5 px-3 font-bold text-emerald-600">PKR {dep.amount}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">{dep.transactionId}</td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                                dep.status === 'approved'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : dep.status === 'pending'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {dep.status === 'pending' ? 'Pending Review' : dep.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: WITHDRAW FUNDS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'withdraw' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Rules & Balance Box */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-gradient-to-br from-slate-900 to-blue-950 text-white rounded-2xl p-6 shadow-md border border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Your Current Balance</span>
              <div className="text-3xl font-black text-white mt-1">
                PKR <span className="text-emerald-400">{user.balance.toFixed(2)}</span>
              </div>
              <p className="text-xs text-blue-200 mt-1 font-urdu" dir="rtl">
                آپ اس رقم میں سے کیش آؤٹ کر سکتے ہیں
              </p>

              <hr className="my-4 border-slate-800" />

              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">
                Withdrawal Safety Policy
              </h4>
              <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside">
                <li>Default minimum withdrawal: <strong>PKR {settings?.minWithdrawal || 450}</strong>.</li>
                <li>Funds are automatically reserved from your balance immediately to prevent double spending.</li>
                <li>Payments are transferred directly to your EasyPaisa, JazzCash, or Bank account by admin.</li>
                <li>If any request is rejected due to invalid account info, the full amount is refunded to your balance instantly.</li>
              </ul>
            </div>
          </div>

          {/* Withdrawal Request Form */}
          <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-1">Request Cashout / رقم نکلوائیں</h3>
            <p className="text-xs text-slate-500 mb-6 font-urdu" dir="rtl">
              اپنا درست اکاؤنٹ نمبر اور نام درج کریں
            </p>

            <form onSubmit={handleWithdrawSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Withdrawal Amount (PKR) / رقم
                  </label>
                  <input
                    type="number"
                    required
                    min={settings?.minWithdrawal || 450}
                    max={user.balance}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:bg-white focus:border-blue-600 outline-none"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Minimum: PKR {settings?.minWithdrawal || 450}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Payout Method / ادائیگی کا طریقہ
                  </label>
                  <select
                    value={withdrawMethod}
                    onChange={(e: any) => setWithdrawMethod(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:bg-white focus:border-blue-600 outline-none"
                  >
                    <option value="EasyPaisa">EasyPaisa</option>
                    <option value="JazzCash">JazzCash</option>
                    <option value="Bank Transfer">Bank Transfer (All Pakistani Banks)</option>
                  </select>
                </div>
              </div>

              {withdrawMethod === 'Bank Transfer' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Bank Name (e.g. Meezan Bank, HBL, UBL, Allied)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Meezan Bank Limited"
                    value={withdrawBank}
                    onChange={(e) => setWithdrawBank(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:bg-white focus:border-blue-600 outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Account Title (Full Name on Account) / اکاؤنٹ کا نام
                </label>
                <input
                  type="text"
                  required
                  placeholder="Exact title as in EasyPaisa/JazzCash"
                  value={withdrawTitle}
                  onChange={(e) => setWithdrawTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:bg-white focus:border-blue-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Account / Mobile Number / موبائل یا اکاؤنٹ نمبر
                </label>
                <input
                  type="text"
                  required
                  placeholder="03XXXXXXXXX or IBAN"
                  value={withdrawNumber}
                  onChange={(e) => setWithdrawNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:bg-white focus:border-blue-600 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={withdrawSubmitting || user.balance < (settings?.minWithdrawal || 450)}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {withdrawSubmitting ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit Cashout Request / رقم کی درخواست بھیجیں</span>
                  </>
                )}
              </button>
            </form>

            {/* Withdrawals History */}
            <div className="mt-8 pt-6 border-t border-slate-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                Withdrawal Requests History
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Method</th>
                      <th className="py-2 px-3">Amount</th>
                      <th className="py-2 px-3">Account Details</th>
                      <th className="py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {withdrawals.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-slate-400">
                          No withdrawal requests found.
                        </td>
                      </tr>
                    ) : (
                      withdrawals.map((w) => (
                        <tr key={w.id}>
                          <td className="py-2.5 px-3 text-slate-500">
                            {new Date(w.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-800">{w.paymentMethod}</td>
                          <td className="py-2.5 px-3 font-bold text-indigo-600">PKR {w.amount}</td>
                          <td className="py-2.5 px-3 text-slate-600">
                            <div>{w.accountTitle}</div>
                            <div className="font-mono text-[11px] text-slate-500">{w.accountNumber}</div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                                w.status === 'approved'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : w.status === 'pending'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {w.status === 'approved' ? 'Paid & Completed' : w.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: COMPLETE FINANCIAL LEDGER */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Official Account Ledger & Transactions</h2>
              <p className="text-xs text-slate-500 font-urdu" dir="rtl">
                آپ کے اکاؤنٹ کی تمام ٹرانزیکشنز کا مکمل اور شفاف ریکارڈ
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">Date & Time</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Amount (PKR)</th>
                  <th className="py-3 px-3">Description</th>
                  <th className="py-3 px-3">Reference ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No financial records found in your ledger.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => {
                    const isCredit = tx.amount > 0;
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                          {new Date(tx.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                              tx.type === 'deposit'
                                ? 'bg-emerald-100 text-emerald-800'
                                : tx.type === 'task_reward'
                                ? 'bg-blue-100 text-blue-800'
                                : tx.type === 'withdrawal_refund'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {tx.type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-sm whitespace-nowrap">
                          <span className={isCredit ? 'text-emerald-600' : 'text-rose-600'}>
                            {isCredit ? `+PKR ${tx.amount}` : `-PKR ${Math.abs(tx.amount)}`}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-700">
                          <div>{tx.description}</div>
                          {tx.descriptionUrdu && (
                            <div className="text-[11px] text-slate-400 font-urdu" dir="rtl">
                              {tx.descriptionUrdu}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-400 text-[10px]">{tx.referenceId}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 5: NOTIFICATIONS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'notifications' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm max-w-2xl mx-auto">
          <h2 className="text-base font-bold text-slate-900 mb-4">Official Announcements & Alerts</h2>
          <div className="space-y-3">
            {notifications.length === 0 ? (
              <p className="text-center py-8 text-slate-400 text-xs">No notifications yet.</p>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-sm text-slate-900">{n.title}</span>
                    <span className="text-[10px] text-slate-400">{new Date(n.createdAt).toLocaleDateString()}</span>
                  </div>
                  {n.titleUrdu && (
                    <div className="text-xs text-blue-800 font-urdu font-semibold mb-1" dir="rtl">
                      {n.titleUrdu}
                    </div>
                  )}
                  <p className="text-xs text-slate-600">{n.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TASK SUBMISSION MODAL */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  Submit Task Proof
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">{selectedTask.title}</h3>
                <span className="text-sm font-bold text-emerald-600">Reward: PKR {selectedTask.reward}</span>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-700 mb-4 space-y-1">
              <span className="font-bold text-slate-900 block">Instructions:</span>
              <p className="whitespace-pre-line text-slate-600">{selectedTask.instructions}</p>
            </div>

            <form onSubmit={handleTaskSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Submission Proof / ثبوت یا تفصیلات
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Paste your username, screenshot link, or details proving completion..."
                  value={taskProof}
                  onChange={(e) => setTaskProof(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:bg-white focus:border-blue-600 outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={taskSubmitting}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {taskSubmitting ? (
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Submit for Review</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedTask(null)}
                  className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
