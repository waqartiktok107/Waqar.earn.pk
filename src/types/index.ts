export type UserRole = 'member' | 'admin';
export type UserStatus = 'pending' | 'active' | 'suspended' | 'rejected';

export interface UserProfile {
  id: string;
  fullName: string;
  phoneOrEmail: string;
  role: UserRole;
  status: UserStatus;
  balance: number;
  totalEarned: number;
  createdAt?: string;
}

export interface Task {
  id: string;
  title: string;
  titleUrdu?: string;
  description: string;
  instructions: string;
  reward: number;
  isActive: boolean;
  category?: string;
  createdAt: string;
}

export interface TaskSubmission {
  id: string;
  taskId: string;
  taskTitle: string;
  userId: string;
  userFullName: string;
  userPhoneOrEmail: string;
  submissionProof: string;
  reward: number;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface DepositRequest {
  id: string;
  userId: string;
  userFullName: string;
  userPhoneOrEmail: string;
  amount: number;
  paymentMethod: 'EasyPaisa' | 'JazzCash' | 'Bank Transfer' | 'Nayapay';
  transactionId: string;
  senderAccount?: string;
  proofUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  createdAt: string;
  processedAt?: string;
  processedBy?: string;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  userFullName: string;
  userPhoneOrEmail: string;
  amount: number;
  paymentMethod: 'EasyPaisa' | 'JazzCash' | 'Bank Transfer';
  accountTitle: string;
  accountNumber: string;
  bankName?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  createdAt: string;
  processedAt?: string;
  processedBy?: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'deposit' | 'withdrawal' | 'task_reward' | 'withdrawal_refund';
  amount: number;
  description: string;
  descriptionUrdu?: string;
  referenceId: string;
  createdAt: string;
}

export interface PaymentAccount {
  method: string;
  title: string;
  accountNumber: string;
  bankName?: string;
  instructions: string;
}

export interface PlatformSettings {
  minDeposit: number;
  minWithdrawal: number;
  adminIdentifier: string;
  paymentAccounts: PaymentAccount[];
  announcement?: string;
  announcementUrdu?: string;
}

export interface AdminOverviewStats {
  totalMembers: number;
  pendingMembers: number;
  activeMembers: number;
  suspendedMembers: number;
  rejectedMembers: number;
  pendingDeposits: number;
  approvedDepositsTotal: number;
  pendingWithdrawals: number;
  approvedWithdrawalsTotal: number;
  pendingSubmissions: number;
  totalMemberBalances: number;
}

export interface AuditLog {
  id: string;
  adminIdentifier: string;
  action: string;
  targetId: string;
  details: Record<string, unknown>;
  timestamp: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  titleUrdu?: string;
  message: string;
  messageUrdu?: string;
  read: boolean;
  createdAt: string;
}
