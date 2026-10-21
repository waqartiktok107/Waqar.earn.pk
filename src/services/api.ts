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
  NotificationItem,
} from '../types';

const TOKEN_KEY = 'waqar_earn_token';

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = tokenStorage.get();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data as T;
}

export const api = {
  // Public
  getPublicSettings: () => request<PlatformSettings>('/settings/public'),

  // Member Auth
  register: (payload: { fullName: string; phoneOrEmail: string; password: string; confirmPassword: string }) =>
    request<{ success: boolean; message: string; messageUrdu: string; status: string; token: string; user: UserProfile }>(
      '/auth/register',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  login: (payload: { phoneOrEmail: string; password: string }) =>
    request<{ success: boolean; message: string; token: string; user: UserProfile }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getCurrentUser: () => request<{ user: UserProfile }>('/auth/me'),

  logout: async () => {
    try {
      await request('/auth/logout', { method: 'POST' });
    } finally {
      tokenStorage.clear();
    }
  },

  // Admin Auth
  adminLogin: (payload: { identifier: string; password: string }) =>
    request<{ success: boolean; token: string; user: UserProfile }>('/admin/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  adminChangePassword: (payload: { currentPassword: string; newPassword: string; confirmNewPassword: string }) =>
    request<{ success: boolean; message: string }>('/admin/change-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Member Tasks
  getTasks: () => request<{ tasks: Task[] }>('/tasks'),
  submitTaskProof: (taskId: string, proof: string) =>
    request<{ success: boolean; message: string; submission: TaskSubmission }>(`/tasks/${taskId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ proof }),
    }),
  getMySubmissions: () => request<{ submissions: TaskSubmission[] }>('/submissions/my'),

  // Member Deposits
  submitDeposit: (payload: {
    amount: number;
    paymentMethod: string;
    transactionId: string;
    senderAccount?: string;
    proofUrl?: string;
  }) =>
    request<{ success: boolean; message: string; deposit: DepositRequest }>('/deposits', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getMyDeposits: () => request<{ deposits: DepositRequest[] }>('/deposits/my'),

  // Member Withdrawals
  submitWithdrawal: (payload: {
    amount: number;
    paymentMethod: string;
    accountTitle: string;
    accountNumber: string;
    bankName?: string;
  }) =>
    request<{ success: boolean; message: string; newBalance: number; withdrawal: WithdrawalRequest }>('/withdrawals', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getMyWithdrawals: () => request<{ withdrawals: WithdrawalRequest[] }>('/withdrawals/my'),

  // Member Transactions & Notifications
  getMyTransactions: () => request<{ transactions: Transaction[] }>('/transactions/my'),
  getMyNotifications: () => request<{ notifications: NotificationItem[] }>('/notifications/my'),

  // Admin Operations
  getAdminOverview: () => request<{ stats: AdminOverviewStats }>('/admin/overview'),
  getAdminMembers: (status?: string) =>
    request<{ members: UserProfile[] }>(`/admin/members${status ? `?status=${status}` : ''}`),
  updateMemberStatus: (memberId: string, status: string, reason?: string) =>
    request<{ success: boolean; message: string }>(`/admin/members/${memberId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, reason }),
    }),

  getAdminDeposits: () => request<{ deposits: DepositRequest[] }>('/admin/deposits'),
  processDeposit: (depositId: string, action: 'approve' | 'reject', reason?: string) =>
    request<{ success: boolean; message: string }>(`/admin/deposits/${depositId}/action`, {
      method: 'POST',
      body: JSON.stringify({ action, reason }),
    }),

  getAdminWithdrawals: () => request<{ withdrawals: WithdrawalRequest[] }>('/admin/withdrawals'),
  processWithdrawal: (withdrawalId: string, action: 'approve' | 'reject', reason?: string) =>
    request<{ success: boolean; message: string }>(`/admin/withdrawals/${withdrawalId}/action`, {
      method: 'POST',
      body: JSON.stringify({ action, reason }),
    }),

  getAdminTasks: () => request<{ tasks: Task[] }>('/admin/tasks'),
  createTask: (task: Partial<Task>) =>
    request<{ success: boolean; task: Task }>('/admin/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    }),
  updateTask: (taskId: string, updates: Partial<Task>) =>
    request<{ success: boolean; task: Task }>(`/admin/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),
  deleteTask: (taskId: string) =>
    request<{ success: boolean; message: string }>(`/admin/tasks/${taskId}`, {
      method: 'DELETE',
    }),

  getAdminSubmissions: () => request<{ submissions: TaskSubmission[] }>('/admin/submissions'),
  processSubmission: (submissionId: string, action: 'approve' | 'reject', reason?: string) =>
    request<{ success: boolean; message: string }>(`/admin/submissions/${submissionId}/action`, {
      method: 'POST',
      body: JSON.stringify({ action, reason }),
    }),

  getAdminSettings: () => request<{ settings: PlatformSettings }>('/admin/settings'),
  updateAdminSettings: (settings: Partial<PlatformSettings>) =>
    request<{ success: boolean; settings: PlatformSettings }>('/admin/settings', {
      method: 'POST',
      body: JSON.stringify(settings),
    }),

  getAdminAuditLogs: () => request<{ auditLogs: AuditLog[] }>('/admin/audit-logs'),
  getAdminLedger: () => request<{ transactions: Transaction[] }>('/admin/ledger'),
};
