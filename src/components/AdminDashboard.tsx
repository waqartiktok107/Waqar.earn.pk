import React, { useState, useEffect } from 'react';
import {
  UserProfile,
  Task,
  TaskSubmission,
  DepositRequest,
  WithdrawalRequest,
  Transaction,
  PlatformSettings,
  AdminOverviewStats,
  AuditLog,
} from '../types';
import { api } from '../services/api';
import {
  ShieldCheck,
  Users,
  UserCheck,
  UserX,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  ListTodo,
  CheckCircle2,
  XCircle,
  Settings,
  FileText,
  KeyRound,
  RefreshCw,
  Plus,
  Trash2,
  Edit2,
  DollarSign,
  AlertTriangle,
  History,
  Lock,
} from 'lucide-react';

interface AdminDashboardProps {
  adminUser: UserProfile;
  onRefreshAdmin: () => Promise<void>;
  onShowToast: (msg: string, type: 'success' | 'danger' | 'warning' | 'info', urdu?: string) => void;
  onOpenFirebaseModal: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  adminUser,
  onRefreshAdmin,
  onShowToast,
  onOpenFirebaseModal,
}) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'members' | 'deposits' | 'withdrawals' | 'tasks' | 'submissions' | 'settings' | 'ledger' | 'audit'
  >('overview');

  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<AdminOverviewStats | null>(null);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([]);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [ledger, setLedger] = useState<Transaction[]>([]);

  // Task Creation State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskTitleUrdu, setNewTaskTitleUrdu] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskInstructions, setNewTaskInstructions] = useState('');
  const [newTaskReward, setNewTaskReward] = useState<number>(50);
  const [newTaskCategory, setNewTaskCategory] = useState('Social Media');
  const [taskCreating, setTaskCreating] = useState(false);

  // Settings State
  const [minDepositInput, setMinDepositInput] = useState<number>(250);
  const [minWithdrawalInput, setMinWithdrawalInput] = useState<number>(450);
  const [announcementInput, setAnnouncementInput] = useState('');
  const [announcementUrduInput, setAnnouncementUrduInput] = useState('');
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Password Change State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordChanging, setPasswordChanging] = useState(false);

  const loadAllAdminData = async () => {
    setLoading(true);
    try {
      const [statsRes, membersRes, depRes, withRes, taskRes, subRes, setRes, auditRes, ledgerRes] =
        await Promise.all([
          api.getAdminOverview(),
          api.getAdminMembers(),
          api.getAdminDeposits(),
          api.getAdminWithdrawals(),
          api.getAdminTasks(),
          api.getAdminSubmissions(),
          api.getAdminSettings(),
          api.getAdminAuditLogs(),
          api.getAdminLedger(),
        ]);

      setStats(statsRes.stats);
      setMembers(membersRes.members);
      setDeposits(depRes.deposits);
      setWithdrawals(withRes.withdrawals);
      setTasks(taskRes.tasks);
      setSubmissions(subRes.submissions);
      setSettings(setRes.settings);
      setMinDepositInput(setRes.settings.minDeposit);
      setMinWithdrawalInput(setRes.settings.minWithdrawal);
      setAnnouncementInput(setRes.settings.announcement || '');
      setAnnouncementUrduInput(setRes.settings.announcementUrdu || '');
      setAuditLogs(auditRes.auditLogs);
      setLedger(ledgerRes.transactions);
    } catch (err: any) {
      onShowToast(err.message || 'Failed to load admin data', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllAdminData();
  }, []);

  // Member Status Change
  const handleUpdateMemberStatus = async (memberId: string, status: string) => {
    try {
      const res = await api.updateMemberStatus(memberId, status);
      onShowToast(res.message, 'success');
      const updated = await api.getAdminMembers();
      setMembers(updated.members);
      const updatedStats = await api.getAdminOverview();
      setStats(updatedStats.stats);
    } catch (err: any) {
      onShowToast(err.message, 'danger');
    }
  };

  // Deposit Process
  const handleProcessDeposit = async (depositId: string, action: 'approve' | 'reject') => {
    try {
      const res = await api.processDeposit(depositId, action);
      onShowToast(res.message, 'success');
      const [dRes, sRes] = await Promise.all([api.getAdminDeposits(), api.getAdminOverview()]);
      setDeposits(dRes.deposits);
      setStats(sRes.stats);
    } catch (err: any) {
      onShowToast(err.message, 'danger');
    }
  };

  // Withdrawal Process
  const handleProcessWithdrawal = async (withdrawalId: string, action: 'approve' | 'reject') => {
    try {
      const res = await api.processWithdrawal(withdrawalId, action);
      onShowToast(res.message, 'success');
      const [wRes, sRes] = await Promise.all([api.getAdminWithdrawals(), api.getAdminOverview()]);
      setWithdrawals(wRes.withdrawals);
      setStats(sRes.stats);
    } catch (err: any) {
      onShowToast(err.message, 'danger');
    }
  };

  // Task Submission Review
  const handleReviewSubmission = async (subId: string, action: 'approve' | 'reject') => {
    try {
      const res = await api.processSubmission(subId, action);
      onShowToast(res.message, 'success');
      const [subRes, sRes] = await Promise.all([api.getAdminSubmissions(), api.getAdminOverview()]);
      setSubmissions(subRes.submissions);
      setStats(sRes.stats);
    } catch (err: any) {
      onShowToast(err.message, 'danger');
    }
  };

  // Create Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setTaskCreating(true);
    try {
      const res = await api.createTask({
        title: newTaskTitle,
        titleUrdu: newTaskTitleUrdu,
        description: newTaskDescription,
        instructions: newTaskInstructions,
        reward: Number(newTaskReward),
        category: newTaskCategory,
      });
      onShowToast('Task created successfully', 'success');
      setNewTaskTitle('');
      setNewTaskTitleUrdu('');
      setNewTaskDescription('');
      setNewTaskInstructions('');
      setNewTaskReward(50);
      const tRes = await api.getAdminTasks();
      setTasks(tRes.tasks);
    } catch (err: any) {
      onShowToast(err.message, 'danger');
    } finally {
      setTaskCreating(false);
    }
  };

  // Toggle Task Active
  const handleToggleTask = async (task: Task) => {
    try {
      await api.updateTask(task.id, { isActive: !task.isActive });
      onShowToast(`Task ${!task.isActive ? 'activated' : 'deactivated'}`, 'info');
      const tRes = await api.getAdminTasks();
      setTasks(tRes.tasks);
    } catch (err: any) {
      onShowToast(err.message, 'danger');
    }
  };

  // Delete Task
  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await api.deleteTask(taskId);
      onShowToast('Task deleted', 'info');
      const tRes = await api.getAdminTasks();
      setTasks(tRes.tasks);
    } catch (err: any) {
      onShowToast(err.message, 'danger');
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSaving(true);
    try {
      const res = await api.updateAdminSettings({
        minDeposit: Number(minDepositInput),
        minWithdrawal: Number(minWithdrawalInput),
        announcement: announcementInput,
        announcementUrdu: announcementUrduInput,
      });
      onShowToast('Platform settings saved successfully', 'success');
      setSettings(res.settings);
    } catch (err: any) {
      onShowToast(err.message, 'danger');
    } finally {
      setSettingsSaving(false);
    }
  };

  // Change Admin Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      onShowToast('New passwords do not match', 'danger');
      return;
    }
    setPasswordChanging(true);
    try {
      await api.adminChangePassword({
        currentPassword,
        newPassword,
        confirmNewPassword,
      });
      onShowToast('Admin password changed successfully', 'success');
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      onShowToast(err.message, 'danger');
    } finally {
      setPasswordChanging(false);
    }
  };

  const pendingMembersList = members.filter((m) => m.status === 'pending');
  const pendingDepositsList = deposits.filter((d) => d.status === 'pending');
  const pendingWithdrawalsList = withdrawals.filter((w) => w.status === 'pending');
  const pendingSubmissionsList = submissions.filter((s) => s.status === 'pending');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      {/* Admin Title & Authority Bar */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-blue-900/40 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white">Waqar Earn.pk Admin Control</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                03208063725
              </span>
            </div>
            <p className="text-xs text-blue-300 font-urdu mt-0.5" dir="rtl">
              حتمی مالی کنٹرول، ممبر منظوری، ڈپازٹس، کیش آؤٹس اور ٹاسکس مینجمنٹ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowPasswordModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-400" />
            <span>Change Password</span>
          </button>

          <button
            onClick={loadAllAdminData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex overflow-x-auto gap-2 border-b border-slate-200 pb-3 mb-6 no-scrollbar">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
            activeTab === 'overview'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('members')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
            activeTab === 'members'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Members</span>
          {pendingMembersList.length > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-900 text-[10px] font-black">
              {pendingMembersList.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('deposits')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
            activeTab === 'deposits'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500" />
          <span>Deposits</span>
          {pendingDepositsList.length > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-emerald-400 text-slate-900 text-[10px] font-black">
              {pendingDepositsList.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('withdrawals')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
            activeTab === 'withdrawals'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ArrowUpRight className="w-3.5 h-3.5 text-indigo-500" />
          <span>Withdrawals</span>
          {pendingWithdrawalsList.length > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-indigo-400 text-slate-900 text-[10px] font-black">
              {pendingWithdrawalsList.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
            activeTab === 'tasks'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ListTodo className="w-3.5 h-3.5" />
          <span>Tasks ({tasks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('submissions')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
            activeTab === 'submissions'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />
          <span>Submissions Review</span>
          {pendingSubmissionsList.length > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-900 text-[10px] font-black">
              {pendingSubmissionsList.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
            activeTab === 'settings'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Platform Settings</span>
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
            activeTab === 'ledger'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Full Ledger</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
            activeTab === 'audit'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Audit Logs ({auditLogs.length})</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. OVERVIEW & STATISTICS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Members</span>
              <div className="text-2xl font-black text-slate-900 mt-1">{stats?.totalMembers || 0}</div>
              <div className="text-xs text-slate-500 mt-1">
                Active: <strong className="text-emerald-600">{stats?.activeMembers || 0}</strong>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">Pending Approvals</span>
              <div className="text-2xl font-black text-amber-600 mt-1">{stats?.pendingMembers || 0}</div>
              <div className="text-xs text-slate-500 mt-1">Awaiting verification</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Approved Deposits</span>
              <div className="text-2xl font-black text-emerald-600 mt-1">
                PKR {stats?.approvedDepositsTotal.toFixed(0) || 0}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Pending: <strong className="text-amber-600">{stats?.pendingDeposits || 0}</strong>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">Paid Withdrawals</span>
              <div className="text-2xl font-black text-indigo-600 mt-1">
                PKR {stats?.approvedWithdrawalsTotal.toFixed(0) || 0}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Pending: <strong className="text-rose-600">{stats?.pendingWithdrawals || 0}</strong>
              </div>
            </div>
          </div>

          {/* Quick Action Queue Banners */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              onClick={() => setActiveTab('members')}
              className="bg-amber-50 border border-amber-200 hover:border-amber-400 p-4 rounded-2xl cursor-pointer transition-all flex items-center justify-between"
            >
              <div>
                <span className="text-xs font-bold text-amber-800">Pending Registrations</span>
                <div className="text-lg font-black text-amber-900">{pendingMembersList.length} members waiting</div>
              </div>
              <UserCheck className="w-6 h-6 text-amber-600" />
            </div>

            <div
              onClick={() => setActiveTab('deposits')}
              className="bg-emerald-50 border border-emerald-200 hover:border-emerald-400 p-4 rounded-2xl cursor-pointer transition-all flex items-center justify-between"
            >
              <div>
                <span className="text-xs font-bold text-emerald-800">Pending Deposits</span>
                <div className="text-lg font-black text-emerald-900">{pendingDepositsList.length} requests</div>
              </div>
              <ArrowDownLeft className="w-6 h-6 text-emerald-600" />
            </div>

            <div
              onClick={() => setActiveTab('withdrawals')}
              className="bg-indigo-50 border border-indigo-200 hover:border-indigo-400 p-4 rounded-2xl cursor-pointer transition-all flex items-center justify-between"
            >
              <div>
                <span className="text-xs font-bold text-indigo-800">Pending Withdrawals</span>
                <div className="text-lg font-black text-indigo-900">{pendingWithdrawalsList.length} requests</div>
              </div>
              <ArrowUpRight className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2 & 3. MEMBERS MANAGEMENT (PENDING, ACTIVE, SUSPEND, REJECT) */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'members' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Member Accounts & Approvals</h2>
              <p className="text-xs text-slate-500 font-urdu" dir="rtl">
                صرف ایڈمن ممبر کو ایکٹو، معطل یا مسترد کر سکتا ہے
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-bold">
                Pending: {pendingMembersList.length}
              </span>
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                Active: {members.filter((m) => m.status === 'active').length}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Full Name</th>
                  <th className="py-2.5 px-3">Phone / Identifier</th>
                  <th className="py-2.5 px-3">Current Status</th>
                  <th className="py-2.5 px-3">Balance (PKR)</th>
                  <th className="py-2.5 px-3">Joined Date</th>
                  <th className="py-2.5 px-3 text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400">
                      No members registered yet.
                    </td>
                  </tr>
                ) : (
                  members.map((member) => (
                    <tr key={member.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-3 font-bold text-slate-900">{member.fullName}</td>
                      <td className="py-3 px-3 font-mono text-slate-600">{member.phoneOrEmail}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                            member.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : member.status === 'pending'
                              ? 'bg-amber-100 text-amber-800 animate-pulse'
                              : member.status === 'suspended'
                              ? 'bg-slate-200 text-slate-700'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {member.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-emerald-600">PKR {member.balance.toFixed(2)}</td>
                      <td className="py-3 px-3 text-slate-500">
                        {member.createdAt ? new Date(member.createdAt).toLocaleDateString() : '-'}
                      </td>
                      <td className="py-3 px-3 text-right space-x-1 whitespace-nowrap">
                        {member.status !== 'active' && (
                          <button
                            onClick={() => handleUpdateMemberStatus(member.id, 'active')}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors"
                          >
                            Approve/Active
                          </button>
                        )}
                        {member.status !== 'suspended' && (
                          <button
                            onClick={() => handleUpdateMemberStatus(member.id, 'suspended')}
                            className="px-2.5 py-1 rounded-lg bg-slate-600 hover:bg-slate-700 text-white font-semibold text-[11px] transition-colors"
                          >
                            Suspend
                          </button>
                        )}
                        {member.status !== 'rejected' && (
                          <button
                            onClick={() => handleUpdateMemberStatus(member.id, 'rejected')}
                            className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-[11px] transition-colors"
                          >
                            Reject
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. DEPOSIT REQUESTS MANAGEMENT */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'deposits' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Deposit Requests Verification</h2>
              <p className="text-xs text-slate-500 font-urdu" dir="rtl">
                ڈپازٹ منظور کرنے پر ممبر کے بیلنس میں فوری رقم کریڈٹ ہو جاتی ہے
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Member</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Method</th>
                  <th className="py-2.5 px-3">TRX ID</th>
                  <th className="py-2.5 px-3">Proof / Sender</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deposits.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-slate-400">
                      No deposit requests submitted.
                    </td>
                  </tr>
                ) : (
                  deposits.map((dep) => (
                    <tr key={dep.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                        {new Date(dep.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{dep.userFullName}</div>
                        <div className="text-[10px] text-slate-500">{dep.userPhoneOrEmail}</div>
                      </td>
                      <td className="py-3 px-3 font-bold text-emerald-600">PKR {dep.amount}</td>
                      <td className="py-3 px-3 font-semibold text-slate-800">{dep.paymentMethod}</td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-700">{dep.transactionId}</td>
                      <td className="py-3 px-3 text-slate-600">
                        {dep.senderAccount && <div>From: {dep.senderAccount}</div>}
                        {dep.proofUrl && (
                          <a
                            href={dep.proofUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 underline flex items-center gap-1"
                          >
                            <span>View Proof</span>
                          </a>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                            dep.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : dep.status === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {dep.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right space-x-1 whitespace-nowrap">
                        {dep.status === 'pending' ? (
                          <>
                            <button
                              onClick={() => handleProcessDeposit(dep.id, 'approve')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px]"
                            >
                              Approve (+Balance)
                            </button>
                            <button
                              onClick={() => handleProcessDeposit(dep.id, 'reject')}
                              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-[11px]"
                            >
                              Reject
                            </button>
                          </>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Processed</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. WITHDRAWAL REQUESTS MANAGEMENT */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'withdrawals' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Withdrawal Requests & Payout Processing</h2>
              <p className="text-xs text-slate-500 font-urdu" dir="rtl">
                منظور کرنے پر پیڈ مارک کریں، مسترد کرنے پر رقم فوراً ممبر کے بیلنس میں واپس آ جاتی ہے
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Member</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Method</th>
                  <th className="py-2.5 px-3">Account Title & Number</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {withdrawals.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-400">
                      No withdrawal requests.
                    </td>
                  </tr>
                ) : (
                  withdrawals.map((w) => (
                    <tr key={w.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                        {new Date(w.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{w.userFullName}</div>
                        <div className="text-[10px] text-slate-500">{w.userPhoneOrEmail}</div>
                      </td>
                      <td className="py-3 px-3 font-bold text-indigo-600">PKR {w.amount}</td>
                      <td className="py-3 px-3 font-semibold text-slate-800">{w.paymentMethod}</td>
                      <td className="py-3 px-3 text-slate-700">
                        <div className="font-semibold">{w.accountTitle}</div>
                        <div className="font-mono text-slate-500 text-[11px]">{w.accountNumber}</div>
                        {w.bankName && <div className="text-[10px] text-slate-400">{w.bankName}</div>}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                            w.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : w.status === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {w.status === 'approved' ? 'Paid & Sent' : w.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right space-x-1 whitespace-nowrap">
                        {w.status === 'pending' ? (
                          <>
                            <button
                              onClick={() => handleProcessWithdrawal(w.id, 'approve')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px]"
                            >
                              Paid & Mark Approved
                            </button>
                            <button
                              onClick={() => handleProcessWithdrawal(w.id, 'reject')}
                              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-[11px]"
                            >
                              Reject & Refund
                            </button>
                          </>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Processed</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 6. TASK MANAGEMENT */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'tasks' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Create Task Form */}
          <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-1">Create New Task / نیا ٹاسک</h3>
            <p className="text-xs text-slate-500 mb-4 font-urdu" dir="rtl">
              ممبرز کے لیے نیا ارننگ ٹاسک اور انعام مقرر کریں
            </p>

            <form onSubmit={handleCreateTask} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Task Title (English)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Subscribe to Official Channel"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:border-blue-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Task Title (Urdu) / عنوان اردو میں
                </label>
                <input
                  type="text"
                  placeholder="مثال: آفیشل چینل سبسکرائب کریں"
                  value={newTaskTitleUrdu}
                  onChange={(e) => setNewTaskTitleUrdu(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-urdu text-right focus:bg-white focus:border-blue-600 outline-none"
                  dir="rtl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Reward (PKR) / انعام
                  </label>
                  <input
                    type="number"
                    required
                    min={5}
                    value={newTaskReward}
                    onChange={(e) => setNewTaskReward(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:border-blue-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Category
                  </label>
                  <select
                    value={newTaskCategory}
                    onChange={(e) => setNewTaskCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:border-blue-600 outline-none"
                  >
                    <option value="Social Media">Social Media</option>
                    <option value="Reviews">Reviews</option>
                    <option value="Promotion">Promotion</option>
                    <option value="Survey">Survey</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Task Instructions / ہدایات
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Steps the member must perform to earn reward..."
                  value={newTaskInstructions}
                  onChange={(e) => setNewTaskInstructions(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:border-blue-600 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={taskCreating}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span>Publish New Task / ٹاسک شامل کریں</span>
              </button>
            </form>
          </div>

          {/* Existing Tasks List */}
          <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-base font-bold text-slate-900 mb-2">Existing Platform Tasks</h3>
            {tasks.map((task) => (
              <div
                key={task.id}
                className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 flex items-start justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-slate-900 text-sm">{task.title}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        task.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {task.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {task.titleUrdu && (
                    <p className="text-xs text-slate-600 font-urdu" dir="rtl">
                      {task.titleUrdu}
                    </p>
                  )}
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{task.instructions}</p>
                  <div className="text-xs font-bold text-emerald-600 mt-2">Reward: PKR {task.reward}</div>
                </div>

                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    onClick={() => handleToggleTask(task)}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-100 text-slate-700"
                  >
                    {task.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 flex items-center gap-1 justify-center"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 7. TASK SUBMISSIONS REVIEW */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'submissions' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Task Proof Submissions Review</h2>
              <p className="text-xs text-slate-500 font-urdu" dir="rtl">
                ثبوت کی تصدیق کے بعد انعام منظور کریں
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
              Pending: {pendingSubmissionsList.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Member</th>
                  <th className="py-2.5 px-3">Task Title</th>
                  <th className="py-2.5 px-3">Reward</th>
                  <th className="py-2.5 px-3">Member Submitted Proof</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {submissions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-400">
                      No task submissions yet.
                    </td>
                  </tr>
                ) : (
                  submissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                        {new Date(sub.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{sub.userFullName}</div>
                        <div className="text-[10px] text-slate-500">{sub.userPhoneOrEmail}</div>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-800">{sub.taskTitle}</td>
                      <td className="py-3 px-3 font-bold text-emerald-600">PKR {sub.reward}</td>
                      <td className="py-3 px-3 text-slate-700 max-w-sm">
                        <div className="bg-slate-100 p-2 rounded-lg font-mono text-[11px] break-all">
                          {sub.submissionProof}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
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
                      <td className="py-3 px-3 text-right space-x-1 whitespace-nowrap">
                        {sub.status === 'pending' ? (
                          <>
                            <button
                              onClick={() => handleReviewSubmission(sub.id, 'approve')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px]"
                            >
                              Approve & Pay
                            </button>
                            <button
                              onClick={() => handleReviewSubmission(sub.id, 'reject')}
                              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-[11px]"
                            >
                              Reject
                            </button>
                          </>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Reviewed</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 8. PLATFORM SETTINGS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'settings' && (
        <div className="max-w-2xl bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Platform Limits & Official Account Configuration</h2>
            <p className="text-xs text-slate-500 font-urdu" dir="rtl">
              کم از کم ڈپازٹ اور کیش آؤٹ کی حد تبدیل کریں
            </p>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Minimum Deposit Limit (PKR)
                </label>
                <input
                  type="number"
                  required
                  min={100}
                  value={minDepositInput}
                  onChange={(e) => setMinDepositInput(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:bg-white focus:border-blue-600 outline-none"
                />
                <p className="text-[11px] text-slate-500 mt-1">Default requirement: PKR 250</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Minimum Withdrawal Limit (PKR)
                </label>
                <input
                  type="number"
                  required
                  min={100}
                  value={minWithdrawalInput}
                  onChange={(e) => setMinWithdrawalInput(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:bg-white focus:border-blue-600 outline-none"
                />
                <p className="text-[11px] text-slate-500 mt-1">Default requirement: PKR 450</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Announcement Message (English)
              </label>
              <textarea
                rows={2}
                value={announcementInput}
                onChange={(e) => setAnnouncementInput(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:border-blue-600 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Announcement Message (Urdu) / اعلان اردو میں
              </label>
              <textarea
                rows={2}
                value={announcementUrduInput}
                onChange={(e) => setAnnouncementUrduInput(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-urdu text-right focus:bg-white focus:border-blue-600 outline-none"
                dir="rtl"
              />
            </div>

            <button
              type="submit"
              disabled={settingsSaving}
              className="py-2.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
            >
              Save Configuration
            </button>
          </form>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 9. FULL FINANCIAL LEDGER */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'ledger' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Platform Comprehensive Transaction Ledger</h2>
              <p className="text-xs text-slate-500 font-urdu" dir="rtl">
                تمام ممبرز کے مالی کھاتے کا مکمل ریکارڈ
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">User ID</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3">Reference ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledger.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                      {new Date(tx.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[10px] text-slate-500">{tx.userId}</td>
                    <td className="py-2.5 px-3">
                      <span className="font-bold uppercase text-[10px]">{tx.type}</span>
                    </td>
                    <td
                      className={`py-2.5 px-3 font-bold ${
                        tx.amount > 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {tx.amount > 0 ? `+PKR ${tx.amount}` : `-PKR ${Math.abs(tx.amount)}`}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">{tx.description}</td>
                    <td className="py-2.5 px-3 font-mono text-[10px] text-slate-400">{tx.referenceId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 10. SYSTEM AUDIT LOGS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Security & Operational Audit Logs</h2>
              <p className="text-xs text-slate-500 font-urdu" dir="rtl">
                ایڈمن کی تمام کارروائیوں کا محفوظ ٹائم اسٹیمپڈ ریکارڈ
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Admin Identifier</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Target ID</th>
                  <th className="py-2.5 px-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-blue-900">{log.adminIdentifier}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{log.action}</td>
                    <td className="py-2.5 px-3 font-mono text-[10px] text-slate-500">{log.targetId}</td>
                    <td className="py-2.5 px-3 text-slate-600">
                      <pre className="font-mono text-[10px] bg-slate-50 p-1 rounded max-w-xs overflow-x-auto">
                        {JSON.stringify(log.details)}
                      </pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CHANGE PASSWORD MODAL */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Change Admin Master Password</h3>
            <p className="text-xs text-slate-500 mb-4">
              Update password for identifier <strong>03208063725</strong>.
            </p>

            <form onSubmit={handleChangePassword} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  New Password (min 8 chars)
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={passwordChanging}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md disabled:opacity-50"
                >
                  {passwordChanging ? 'Updating...' : 'Update Password'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
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
