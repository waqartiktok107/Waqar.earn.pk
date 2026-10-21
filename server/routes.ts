import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import {
  getDatabase,
  saveDatabase,
  hashPassword,
  verifyPassword,
  User,
  Task,
  TaskSubmission,
  DepositRequest,
  WithdrawalRequest,
  Transaction,
  AuditLog,
  NotificationItem,
} from './db.js';

export const apiRouter = Router();

// In-memory active tokens map: token -> { userId: string, role: string, expiresAt: number }
const sessions = new Map<string, { userId: string; role: 'member' | 'admin'; expiresAt: number }>();

function createSession(userId: string, role: 'member' | 'admin'): string {
  const token = crypto.randomBytes(32).toString('hex');
  // 7 days expiration
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
  sessions.set(token, { userId, role, expiresAt });
  return token;
}

function getSessionUser(req: Request): User | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.substring(7).trim();
  const session = sessions.get(token);
  if (!session) return null;

  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return null;
  }

  const db = getDatabase();
  const user = db.users.find((u) => u.id === session.userId);
  return user || null;
}

// Middlewares
function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required / براہ کرم پہلے لاگ ان کریں' });
  }
  (req as any).user = user;
  next();
}

function requireActiveMember(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user as User;
  if (user.role === 'admin') {
    return next(); // Admin has override
  }
  if (user.status !== 'active') {
    let msg = 'Account is not active';
    if (user.status === 'pending') msg = 'Your account is Pending. Waiting for Admin Approval / آپ کا اکاؤنٹ ایڈمن کی منظوری کے منتظر ہے';
    if (user.status === 'suspended') msg = 'Your account has been suspended / آپ کا اکاؤنٹ معطل کر دیا گیا ہے';
    if (user.status === 'rejected') msg = 'Your account registration was rejected / آپ کی رجسٹریشن مسترد کر دی گئی ہے';
    return res.status(403).json({ error: msg, status: user.status });
  }
  next();
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = getSessionUser(req);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Access Denied: Admin authorization required' });
  }
  (req as any).adminUser = user;
  next();
}

function addAuditLog(adminIdentifier: string, action: string, targetId: string, details: Record<string, unknown>) {
  const db = getDatabase();
  const log: AuditLog = {
    id: crypto.randomUUID(),
    adminIdentifier,
    action,
    targetId,
    details,
    timestamp: new Date().toISOString(),
  };
  db.auditLogs.unshift(log);
  if (db.auditLogs.length > 500) {
    db.auditLogs = db.auditLogs.slice(0, 500);
  }
  saveDatabase();
}

// -------------------------------------------------------------
// 1. PUBLIC PLATFORM SETTINGS
// -------------------------------------------------------------
apiRouter.get('/settings/public', (_req: Request, res: Response) => {
  const db = getDatabase();
  res.json({
    minDeposit: db.settings.minDeposit,
    minWithdrawal: db.settings.minWithdrawal,
    adminIdentifier: db.settings.adminIdentifier,
    paymentAccounts: db.settings.paymentAccounts,
    announcement: db.settings.announcement,
    announcementUrdu: db.settings.announcementUrdu,
  });
});

// -------------------------------------------------------------
// 2. MEMBER REGISTRATION & AUTH
// -------------------------------------------------------------
apiRouter.post('/auth/register', (req: Request, res: Response) => {
  const { fullName, phoneOrEmail, password, confirmPassword } = req.body;

  if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
    return res.status(400).json({ error: 'Please enter a valid full name / مکمل نام درج کریں' });
  }

  if (!phoneOrEmail || typeof phoneOrEmail !== 'string' || phoneOrEmail.trim().length < 5) {
    return res.status(400).json({ error: 'Please enter a valid phone number or email / فون نمبر یا ای میل درج کریں' });
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long / پاس ورڈ کم از کم 6 ہندسوں کا ہو' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match / پاس ورڈ مماثل نہیں ہیں' });
  }

  const cleanIdentifier = phoneOrEmail.trim().toLowerCase();
  const db = getDatabase();

  // Prevent registration using the admin reserved identifier
  if (cleanIdentifier === '03208063725' || cleanIdentifier === db.settings.adminIdentifier) {
    return res.status(400).json({ error: 'This phone identifier is reserved for administration' });
  }

  // Prevent duplicate accounts
  const existing = db.users.find(
    (u) => u.phoneOrEmail.toLowerCase() === cleanIdentifier
  );
  if (existing) {
    return res.status(400).json({ error: 'An account with this email/phone already exists / یہ اکاؤنٹ پہلے سے موجود ہے' });
  }

  const { hash, salt } = hashPassword(password);
  const now = new Date().toISOString();

  const newUser: User = {
    id: `user_${crypto.randomUUID()}`,
    fullName: fullName.trim(),
    phoneOrEmail: phoneOrEmail.trim(),
    role: 'member',
    status: 'pending',
    passwordHash: hash,
    salt,
    balance: 0,
    totalEarned: 0,
    createdAt: now,
    updatedAt: now,
  };

  db.users.push(newUser);
  saveDatabase();

  const token = createSession(newUser.id, 'member');

  return res.status(201).json({
    success: true,
    message: 'Your account is Pending. Waiting for Admin Approval.',
    messageUrdu: 'آپ کا اکاؤنٹ ایڈمن کی منظوری کے منتظر ہے۔',
    status: 'pending',
    token,
    user: {
      id: newUser.id,
      fullName: newUser.fullName,
      phoneOrEmail: newUser.phoneOrEmail,
      role: newUser.role,
      status: newUser.status,
      balance: newUser.balance,
      totalEarned: newUser.totalEarned,
    },
  });
});

apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const { phoneOrEmail, password } = req.body;

  if (!phoneOrEmail || !password) {
    return res.status(400).json({ error: 'Phone/email and password are required' });
  }

  const cleanIdentifier = String(phoneOrEmail).trim().toLowerCase();
  const db = getDatabase();

  const user = db.users.find((u) => u.phoneOrEmail.toLowerCase() === cleanIdentifier);
  if (!user) {
    return res.status(401).json({ error: 'Account not found or invalid credentials / اکاؤنٹ نہیں ملا یا غلط معلومات' });
  }

  const isMatch = verifyPassword(password, user.passwordHash, user.salt);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid password / غلط پاس ورڈ' });
  }

  const token = createSession(user.id, user.role);

  return res.json({
    success: true,
    token,
    user: {
      id: user.id,
      fullName: user.fullName,
      phoneOrEmail: user.phoneOrEmail,
      role: user.role,
      status: user.status,
      balance: user.balance,
      totalEarned: user.totalEarned,
    },
    message:
      user.status === 'pending'
        ? 'Your account is Pending. Waiting for Admin Approval.'
        : user.status === 'suspended'
        ? 'Your Account Has Been Suspended.'
        : user.status === 'rejected'
        ? 'Your Account Registration Was Rejected.'
        : 'Login successful.',
  });
});

apiRouter.get('/auth/me', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  res.json({
    user: {
      id: user.id,
      fullName: user.fullName,
      phoneOrEmail: user.phoneOrEmail,
      role: user.role,
      status: user.status,
      balance: user.balance,
      totalEarned: user.totalEarned,
      createdAt: user.createdAt,
    },
  });
});

apiRouter.post('/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    sessions.delete(token);
  }
  res.json({ success: true });
});

// -------------------------------------------------------------
// 3. ADMIN AUTHENTICATION (Identifier: 03208063725)
// -------------------------------------------------------------
apiRouter.post('/admin/login', (req: Request, res: Response) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Admin identifier and password are required' });
  }

  const cleanIdentifier = String(identifier).trim();
  const db = getDatabase();

  if (cleanIdentifier !== '03208063725' && cleanIdentifier !== db.settings.adminIdentifier) {
    return res.status(403).json({ error: 'Access Denied: Invalid administrator identifier' });
  }

  const admin = db.users.find(
    (u) => (u.phoneOrEmail === '03208063725' || u.phoneOrEmail === db.settings.adminIdentifier) && u.role === 'admin'
  );

  if (!admin) {
    return res.status(500).json({ error: 'Administrator configuration error' });
  }

  const isMatch = verifyPassword(password, admin.passwordHash, admin.salt);
  if (!isMatch) {
    return res.status(401).json({ error: 'Incorrect administrator password / غلط ایڈمن پاس ورڈ' });
  }

  const token = createSession(admin.id, 'admin');

  addAuditLog(cleanIdentifier, 'ADMIN_LOGIN_SUCCESS', admin.id, {
    ip: req.ip || req.socket.remoteAddress,
  });

  return res.json({
    success: true,
    token,
    user: {
      id: admin.id,
      fullName: admin.fullName,
      phoneOrEmail: admin.phoneOrEmail,
      role: admin.role,
      status: admin.status,
    },
  });
});

apiRouter.post('/admin/change-password', requireAdmin, (req: Request, res: Response) => {
  const admin = (req as any).adminUser as User;
  const { currentPassword, newPassword, confirmNewPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }

  if (newPassword !== confirmNewPassword) {
    return res.status(400).json({ error: 'New passwords do not match' });
  }

  const isMatch = verifyPassword(currentPassword, admin.passwordHash, admin.salt);
  if (!isMatch) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  const { hash, salt } = hashPassword(newPassword);
  admin.passwordHash = hash;
  admin.salt = salt;
  admin.updatedAt = new Date().toISOString();

  addAuditLog(admin.phoneOrEmail, 'ADMIN_PASSWORD_CHANGED', admin.id, {});
  saveDatabase();

  return res.json({ success: true, message: 'Admin password updated securely' });
});

// -------------------------------------------------------------
// 4. MEMBER EARNING TASKS & SUBMISSIONS
// -------------------------------------------------------------
apiRouter.get('/tasks', requireAuth, requireActiveMember, (_req: Request, res: Response) => {
  const db = getDatabase();
  const activeTasks = db.tasks.filter((t) => t.isActive);
  res.json({ tasks: activeTasks });
});

apiRouter.post('/tasks/:id/submit', requireAuth, requireActiveMember, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const taskId = req.params.id;
  const { proof } = req.body;

  if (!proof || typeof proof !== 'string' || proof.trim().length < 3) {
    return res.status(400).json({ error: 'Please provide valid proof or details / ثبوت فراہم کریں' });
  }

  const db = getDatabase();
  const task = db.tasks.find((t) => t.id === taskId);
  if (!task || !task.isActive) {
    return res.status(404).json({ error: 'Task is not available or inactive' });
  }

  // Prevent duplicate submissions for the same task if already pending or approved
  const existingSub = db.taskSubmissions.find(
    (s) => s.userId === user.id && s.taskId === taskId && (s.status === 'pending' || s.status === 'approved')
  );

  if (existingSub) {
    return res.status(400).json({
      error: 'You have already submitted this task and it is ' + existingSub.status,
    });
  }

  const submission: TaskSubmission = {
    id: `sub_${crypto.randomUUID()}`,
    taskId: task.id,
    taskTitle: task.title,
    userId: user.id,
    userFullName: user.fullName,
    userPhoneOrEmail: user.phoneOrEmail,
    submissionProof: proof.trim(),
    reward: task.reward,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  db.taskSubmissions.unshift(submission);
  saveDatabase();

  return res.status(201).json({
    success: true,
    message: 'Task submitted for admin review / ٹاسک ایڈمن ریویو کے لیے جمع کر دیا گیا ہے',
    submission,
  });
});

apiRouter.get('/submissions/my', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const db = getDatabase();
  const mySubs = db.taskSubmissions.filter((s) => s.userId === user.id);
  res.json({ submissions: mySubs });
});

// -------------------------------------------------------------
// 5. DEPOSIT SYSTEM (PKR 250 MINIMUM)
// -------------------------------------------------------------
apiRouter.post('/deposits', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;

  // Pending members are restricted per requirements
  if (user.status !== 'active') {
    return res.status(403).json({
      error: 'Account must be approved and active to submit deposits / اکاؤنٹ کا فعال ہونا ضروری ہے',
    });
  }

  const { amount, paymentMethod, transactionId, senderAccount, proofUrl } = req.body;
  const numAmount = Number(amount);
  const db = getDatabase();
  const minDeposit = db.settings.minDeposit || 250;

  if (isNaN(numAmount) || numAmount < minDeposit) {
    return res.status(400).json({
      error: `Minimum deposit amount is PKR ${minDeposit} / کم از کم ڈپازٹ ${minDeposit} روپے ہے`,
    });
  }

  if (!paymentMethod || !['EasyPaisa', 'JazzCash', 'Bank Transfer', 'Nayapay'].includes(paymentMethod)) {
    return res.status(400).json({ error: 'Please select a valid payment method' });
  }

  if (!transactionId || typeof transactionId !== 'string' || transactionId.trim().length < 4) {
    return res.status(400).json({ error: 'Please enter a valid Transaction ID (TRX ID)' });
  }

  const cleanTrxId = transactionId.trim();

  // Prevent duplicate transaction IDs
  const duplicateTrx = db.depositRequests.find(
    (d) => d.transactionId.toLowerCase() === cleanTrxId.toLowerCase()
  );
  if (duplicateTrx) {
    return res.status(400).json({
      error: 'This Transaction ID (TRX ID) has already been submitted / یہ ٹرانزیکشن آئی ڈی پہلے سے جمع شدہ ہے',
    });
  }

  const newDeposit: DepositRequest = {
    id: `dep_${crypto.randomUUID()}`,
    userId: user.id,
    userFullName: user.fullName,
    userPhoneOrEmail: user.phoneOrEmail,
    amount: numAmount,
    paymentMethod,
    transactionId: cleanTrxId,
    senderAccount: senderAccount ? String(senderAccount).trim() : undefined,
    proofUrl: proofUrl ? String(proofUrl).trim() : undefined,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  db.depositRequests.unshift(newDeposit);
  saveDatabase();

  return res.status(201).json({
    success: true,
    message: 'Deposit Pending Approval. Awaiting admin review / ڈپازٹ ایڈمن کی منظوری کے منتظر ہے',
    deposit: newDeposit,
  });
});

apiRouter.get('/deposits/my', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const db = getDatabase();
  const myDeposits = db.depositRequests.filter((d) => d.userId === user.id);
  res.json({ deposits: myDeposits });
});

// -------------------------------------------------------------
// 6. WITHDRAWAL SYSTEM (PKR 450 MINIMUM)
// -------------------------------------------------------------
apiRouter.post('/withdrawals', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;

  if (user.status !== 'active') {
    return res.status(403).json({
      error: 'Account must be approved and active to withdraw / اکاؤنٹ کا فعال ہونا ضروری ہے',
    });
  }

  const { amount, paymentMethod, accountTitle, accountNumber, bankName } = req.body;
  const numAmount = Number(amount);
  const db = getDatabase();
  const minWithdrawal = db.settings.minWithdrawal || 450;

  if (isNaN(numAmount) || numAmount < minWithdrawal) {
    return res.status(400).json({
      error: `Minimum withdrawal amount is PKR ${minWithdrawal} / کم از کم رقم نکلوانے کی حد ${minWithdrawal} روپے ہے`,
    });
  }

  if (!paymentMethod || !['EasyPaisa', 'JazzCash', 'Bank Transfer'].includes(paymentMethod)) {
    return res.status(400).json({ error: 'Please select a valid payment method' });
  }

  if (!accountTitle || typeof accountTitle !== 'string' || accountTitle.trim().length < 2) {
    return res.status(400).json({ error: 'Please enter a valid Account Title / اکاؤنٹ کا عنوان درج کریں' });
  }

  if (!accountNumber || typeof accountNumber !== 'string' || accountNumber.trim().length < 5) {
    return res.status(400).json({ error: 'Please enter a valid Account / Mobile Number' });
  }

  // ATOMIC CHECK & DEDUCTION: Prevent double spending
  const freshUser = db.users.find((u) => u.id === user.id);
  if (!freshUser) {
    return res.status(404).json({ error: 'User record not found' });
  }

  if (freshUser.balance < numAmount) {
    return res.status(400).json({
      error: `Insufficient balance. Available: PKR ${freshUser.balance.toFixed(2)} / ناکافی بیلنس`,
    });
  }

  // Reserve/deduct funds safely immediately
  freshUser.balance -= numAmount;
  freshUser.updatedAt = new Date().toISOString();

  const withdrawalId = `wdr_${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  const newWithdrawal: WithdrawalRequest = {
    id: withdrawalId,
    userId: freshUser.id,
    userFullName: freshUser.fullName,
    userPhoneOrEmail: freshUser.phoneOrEmail,
    amount: numAmount,
    paymentMethod,
    accountTitle: accountTitle.trim(),
    accountNumber: accountNumber.trim(),
    bankName: bankName ? String(bankName).trim() : undefined,
    status: 'pending',
    createdAt: now,
  };

  db.withdrawalRequests.unshift(newWithdrawal);

  // Add ledger transaction for reserved withdrawal funds
  const transaction: Transaction = {
    id: `tx_${crypto.randomUUID()}`,
    userId: freshUser.id,
    type: 'withdrawal',
    amount: -numAmount,
    description: `Withdrawal request to ${paymentMethod} (${accountNumber}) - Pending Review`,
    descriptionUrdu: `${paymentMethod} پر رقم نکلوانے کی درخواست - زیر جائزہ`,
    referenceId: withdrawalId,
    createdAt: now,
  };

  db.transactions.unshift(transaction);
  saveDatabase();

  return res.status(201).json({
    success: true,
    message: 'Withdrawal requested successfully. Funds reserved pending admin payment / رقم نکلوانے کی درخواست جمع ہوگئی ہے',
    newBalance: freshUser.balance,
    withdrawal: newWithdrawal,
  });
});

apiRouter.get('/withdrawals/my', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const db = getDatabase();
  const myWithdrawals = db.withdrawalRequests.filter((w) => w.userId === user.id);
  res.json({ withdrawals: myWithdrawals });
});

// -------------------------------------------------------------
// 7. TRANSACTION LEDGER & NOTIFICATIONS
// -------------------------------------------------------------
apiRouter.get('/transactions/my', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const db = getDatabase();
  const myTxs = db.transactions.filter((t) => t.userId === user.id);
  res.json({ transactions: myTxs });
});

apiRouter.get('/notifications/my', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const db = getDatabase();
  const myNotifs = db.notifications.filter((n) => n.userId === user.id);
  res.json({ notifications: myNotifs });
});

// -------------------------------------------------------------
// 8. ADMIN DASHBOARD API (Strictly Protected for 03208063725)
// -------------------------------------------------------------
apiRouter.get('/admin/overview', requireAdmin, (_req: Request, res: Response) => {
  const db = getDatabase();
  const totalMembers = db.users.filter((u) => u.role === 'member').length;
  const pendingMembers = db.users.filter((u) => u.role === 'member' && u.status === 'pending').length;
  const activeMembers = db.users.filter((u) => u.role === 'member' && u.status === 'active').length;
  const suspendedMembers = db.users.filter((u) => u.role === 'member' && u.status === 'suspended').length;
  const rejectedMembers = db.users.filter((u) => u.role === 'member' && u.status === 'rejected').length;

  const pendingDeposits = db.depositRequests.filter((d) => d.status === 'pending').length;
  const approvedDepositsTotal = db.depositRequests
    .filter((d) => d.status === 'approved')
    .reduce((sum, d) => sum + d.amount, 0);

  const pendingWithdrawals = db.withdrawalRequests.filter((w) => w.status === 'pending').length;
  const approvedWithdrawalsTotal = db.withdrawalRequests
    .filter((w) => w.status === 'approved')
    .reduce((sum, w) => sum + w.amount, 0);

  const pendingSubmissions = db.taskSubmissions.filter((s) => s.status === 'pending').length;
  const totalMemberBalances = db.users
    .filter((u) => u.role === 'member')
    .reduce((sum, u) => sum + u.balance, 0);

  res.json({
    stats: {
      totalMembers,
      pendingMembers,
      activeMembers,
      suspendedMembers,
      rejectedMembers,
      pendingDeposits,
      approvedDepositsTotal,
      pendingWithdrawals,
      approvedWithdrawalsTotal,
      pendingSubmissions,
      totalMemberBalances,
    },
  });
});

// Member approval and management
apiRouter.get('/admin/members', requireAdmin, (req: Request, res: Response) => {
  const statusFilter = req.query.status as string;
  const db = getDatabase();
  let members = db.users.filter((u) => u.role === 'member');
  if (statusFilter && ['pending', 'active', 'suspended', 'rejected'].includes(statusFilter)) {
    members = members.filter((u) => u.status === statusFilter);
  }
  res.json({
    members: members.map((m) => ({
      id: m.id,
      fullName: m.fullName,
      phoneOrEmail: m.phoneOrEmail,
      status: m.status,
      balance: m.balance,
      totalEarned: m.totalEarned,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    })),
  });
});

apiRouter.post('/admin/members/:id/status', requireAdmin, (req: Request, res: Response) => {
  const admin = (req as any).adminUser as User;
  const memberId = req.params.id;
  const { status, reason } = req.body;

  if (!['pending', 'active', 'suspended', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const db = getDatabase();
  const member = db.users.find((u) => u.id === memberId && u.role === 'member');
  if (!member) {
    return res.status(404).json({ error: 'Member not found' });
  }

  const oldStatus = member.status;
  member.status = status;
  member.updatedAt = new Date().toISOString();

  // Create notification for member
  const notif: NotificationItem = {
    id: `notif_${crypto.randomUUID()}`,
    userId: member.id,
    title: `Account Status: ${status.toUpperCase()}`,
    titleUrdu:
      status === 'active'
        ? 'اکاؤنٹ منظور کر لیا گیا ہے'
        : status === 'suspended'
        ? 'اکاؤنٹ معطل کر دیا گیا ہے'
        : 'اکاؤنٹ مسترد کر دیا گیا ہے',
    message:
      status === 'active'
        ? 'Congratulations! Your account has been approved by the admin. You can now earn and withdraw.'
        : `Your account status was set to ${status}. ${reason || ''}`,
    read: false,
    createdAt: new Date().toISOString(),
  };
  db.notifications.unshift(notif);

  addAuditLog(admin.phoneOrEmail, 'UPDATE_MEMBER_STATUS', member.id, {
    oldStatus,
    newStatus: status,
    reason,
  });

  saveDatabase();

  res.json({
    success: true,
    message: `Member status updated to ${status}`,
    member: {
      id: member.id,
      fullName: member.fullName,
      status: member.status,
    },
  });
});

// Admin Deposit Approval/Rejection
apiRouter.get('/admin/deposits', requireAdmin, (_req: Request, res: Response) => {
  const db = getDatabase();
  res.json({ deposits: db.depositRequests });
});

apiRouter.post('/admin/deposits/:id/action', requireAdmin, (req: Request, res: Response) => {
  const admin = (req as any).adminUser as User;
  const depositId = req.params.id;
  const { action, reason } = req.body; // 'approve' | 'reject'

  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Action must be approve or reject' });
  }

  const db = getDatabase();
  const deposit = db.depositRequests.find((d) => d.id === depositId);
  if (!deposit) {
    return res.status(404).json({ error: 'Deposit request not found' });
  }

  if (deposit.status !== 'pending') {
    return res.status(400).json({ error: `Deposit is already ${deposit.status}` });
  }

  const user = db.users.find((u) => u.id === deposit.userId);
  if (!user) {
    return res.status(404).json({ error: 'Associated user account not found' });
  }

  const now = new Date().toISOString();

  if (action === 'approve') {
    // ATOMIC BALANCE CREDIT
    user.balance += deposit.amount;
    user.updatedAt = now;

    deposit.status = 'approved';
    deposit.processedAt = now;
    deposit.processedBy = admin.phoneOrEmail;

    // Create ledger entry
    const tx: Transaction = {
      id: `tx_${crypto.randomUUID()}`,
      userId: user.id,
      type: 'deposit',
      amount: deposit.amount,
      description: `Deposit Approved via ${deposit.paymentMethod} (TRX: ${deposit.transactionId})`,
      descriptionUrdu: `${deposit.paymentMethod} ڈپازٹ منظور ہوا (ٹی آر ایکس: ${deposit.transactionId})`,
      referenceId: deposit.id,
      createdAt: now,
    };
    db.transactions.unshift(tx);

    // Notification
    db.notifications.unshift({
      id: `notif_${crypto.randomUUID()}`,
      userId: user.id,
      title: 'Deposit Approved / ڈپازٹ منظور',
      titleUrdu: 'ڈپازٹ منظور کر لیا گیا ہے',
      message: `Your deposit of PKR ${deposit.amount} has been verified and added to your balance.`,
      read: false,
      createdAt: now,
    });
  } else {
    deposit.status = 'rejected';
    deposit.rejectionReason = reason || 'Payment not received or invalid TRX ID';
    deposit.processedAt = now;
    deposit.processedBy = admin.phoneOrEmail;

    db.notifications.unshift({
      id: `notif_${crypto.randomUUID()}`,
      userId: user.id,
      title: 'Deposit Rejected / ڈپازٹ مسترد',
      titleUrdu: 'ڈپازٹ مسترد کر دیا گیا ہے',
      message: `Your deposit request #${deposit.transactionId} was rejected: ${deposit.rejectionReason}`,
      read: false,
      createdAt: now,
    });
  }

  addAuditLog(admin.phoneOrEmail, `DEPOSIT_${action.toUpperCase()}`, deposit.id, {
    userId: user.id,
    amount: deposit.amount,
    trxId: deposit.transactionId,
    reason,
  });

  saveDatabase();

  res.json({
    success: true,
    message: `Deposit ${action === 'approve' ? 'approved and balance credited' : 'rejected'}`,
  });
});

// Admin Withdrawal Processing (Approve/Paid or Reject/Refund)
apiRouter.get('/admin/withdrawals', requireAdmin, (_req: Request, res: Response) => {
  const db = getDatabase();
  res.json({ withdrawals: db.withdrawalRequests });
});

apiRouter.post('/admin/withdrawals/:id/action', requireAdmin, (req: Request, res: Response) => {
  const admin = (req as any).adminUser as User;
  const withdrawalId = req.params.id;
  const { action, reason } = req.body; // 'approve' | 'reject'

  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Action must be approve or reject' });
  }

  const db = getDatabase();
  const withdrawal = db.withdrawalRequests.find((w) => w.id === withdrawalId);
  if (!withdrawal) {
    return res.status(404).json({ error: 'Withdrawal request not found' });
  }

  if (withdrawal.status !== 'pending') {
    return res.status(400).json({ error: `Withdrawal request is already ${withdrawal.status}` });
  }

  const user = db.users.find((u) => u.id === withdrawal.userId);
  if (!user) {
    return res.status(404).json({ error: 'Associated user account not found' });
  }

  const now = new Date().toISOString();

  if (action === 'approve') {
    // Marked as paid (funds were already reserved upon request)
    withdrawal.status = 'approved';
    withdrawal.processedAt = now;
    withdrawal.processedBy = admin.phoneOrEmail;

    db.notifications.unshift({
      id: `notif_${crypto.randomUUID()}`,
      userId: user.id,
      title: 'Withdrawal Sent & Paid / رقم بھیج دی گئی ہے',
      titleUrdu: 'رقم آپ کے اکاؤنٹ میں منتقل کر دی گئی ہے',
      message: `Your withdrawal of PKR ${withdrawal.amount} to ${withdrawal.paymentMethod} (${withdrawal.accountNumber}) has been sent.`,
      read: false,
      createdAt: now,
    });
  } else {
    // REJECTION: Refund reserved balance safely
    user.balance += withdrawal.amount;
    user.updatedAt = now;

    withdrawal.status = 'rejected';
    withdrawal.rejectionReason = reason || 'Account details incorrect or compliance review';
    withdrawal.processedAt = now;
    withdrawal.processedBy = admin.phoneOrEmail;

    // Refund ledger transaction
    const tx: Transaction = {
      id: `tx_${crypto.randomUUID()}`,
      userId: user.id,
      type: 'withdrawal_refund',
      amount: withdrawal.amount,
      description: `Refund for rejected withdrawal #${withdrawal.id} (${withdrawal.rejectionReason})`,
      descriptionUrdu: `مسترد شدہ رقم کی واپسی`,
      referenceId: withdrawal.id,
      createdAt: now,
    };
    db.transactions.unshift(tx);

    db.notifications.unshift({
      id: `notif_${crypto.randomUUID()}`,
      userId: user.id,
      title: 'Withdrawal Rejected (Refunded) / رقم واپس کر دی گئی',
      titleUrdu: 'رقم نکلوانے کی درخواست مسترد، رقم واپس کر دی گئی',
      message: `Your withdrawal request of PKR ${withdrawal.amount} was rejected and refunded to your balance: ${withdrawal.rejectionReason}`,
      read: false,
      createdAt: now,
    });
  }

  addAuditLog(admin.phoneOrEmail, `WITHDRAWAL_${action.toUpperCase()}`, withdrawal.id, {
    userId: user.id,
    amount: withdrawal.amount,
    reason,
  });

  saveDatabase();

  res.json({
    success: true,
    message: `Withdrawal ${action === 'approve' ? 'marked as paid' : 'rejected and balance refunded'}`,
  });
});

// Admin Task Management
apiRouter.get('/admin/tasks', requireAdmin, (_req: Request, res: Response) => {
  const db = getDatabase();
  res.json({ tasks: db.tasks });
});

apiRouter.post('/admin/tasks', requireAdmin, (req: Request, res: Response) => {
  const admin = (req as any).adminUser as User;
  const { title, titleUrdu, description, instructions, reward, category } = req.body;

  if (!title || !instructions || !reward) {
    return res.status(400).json({ error: 'Title, instructions, and reward amount are required' });
  }

  const numReward = Number(reward);
  if (isNaN(numReward) || numReward <= 0) {
    return res.status(400).json({ error: 'Reward must be a positive number in PKR' });
  }

  const db = getDatabase();
  const newTask: Task = {
    id: `task_${crypto.randomUUID()}`,
    title: title.trim(),
    titleUrdu: titleUrdu ? titleUrdu.trim() : undefined,
    description: description ? description.trim() : title.trim(),
    instructions: instructions.trim(),
    reward: numReward,
    isActive: true,
    category: category ? category.trim() : 'General',
    createdAt: new Date().toISOString(),
  };

  db.tasks.unshift(newTask);

  addAuditLog(admin.phoneOrEmail, 'CREATE_TASK', newTask.id, {
    title: newTask.title,
    reward: newTask.reward,
  });

  saveDatabase();

  res.status(201).json({ success: true, task: newTask });
});

apiRouter.put('/admin/tasks/:id', requireAdmin, (req: Request, res: Response) => {
  const admin = (req as any).adminUser as User;
  const taskId = req.params.id;
  const db = getDatabase();
  const task = db.tasks.find((t) => t.id === taskId);

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const { title, titleUrdu, description, instructions, reward, isActive, category } = req.body;

  if (title !== undefined) task.title = title.trim();
  if (titleUrdu !== undefined) task.titleUrdu = titleUrdu.trim();
  if (description !== undefined) task.description = description.trim();
  if (instructions !== undefined) task.instructions = instructions.trim();
  if (reward !== undefined) task.reward = Number(reward);
  if (isActive !== undefined) task.isActive = Boolean(isActive);
  if (category !== undefined) task.category = category.trim();

  addAuditLog(admin.phoneOrEmail, 'UPDATE_TASK', task.id, {
    title: task.title,
    isActive: task.isActive,
  });

  saveDatabase();

  res.json({ success: true, task });
});

apiRouter.delete('/admin/tasks/:id', requireAdmin, (req: Request, res: Response) => {
  const admin = (req as any).adminUser as User;
  const taskId = req.params.id;
  const db = getDatabase();
  const index = db.tasks.findIndex((t) => t.id === taskId);

  if (index === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const [deleted] = db.tasks.splice(index, 1);
  addAuditLog(admin.phoneOrEmail, 'DELETE_TASK', taskId, { title: deleted.title });
  saveDatabase();

  res.json({ success: true, message: 'Task deleted successfully' });
});

// Admin Task Submissions Review
apiRouter.get('/admin/submissions', requireAdmin, (_req: Request, res: Response) => {
  const db = getDatabase();
  res.json({ submissions: db.taskSubmissions });
});

apiRouter.post('/admin/submissions/:id/action', requireAdmin, (req: Request, res: Response) => {
  const admin = (req as any).adminUser as User;
  const subId = req.params.id;
  const { action, reason } = req.body; // 'approve' | 'reject'

  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'Action must be approve or reject' });
  }

  const db = getDatabase();
  const submission = db.taskSubmissions.find((s) => s.id === subId);
  if (!submission) {
    return res.status(404).json({ error: 'Task submission not found' });
  }

  if (submission.status !== 'pending') {
    return res.status(400).json({ error: `Submission is already ${submission.status}` });
  }

  const user = db.users.find((u) => u.id === submission.userId);
  if (!user) {
    return res.status(404).json({ error: 'Associated user account not found' });
  }

  const now = new Date().toISOString();

  if (action === 'approve') {
    // ATOMIC REWARD CREDIT
    user.balance += submission.reward;
    user.totalEarned += submission.reward;
    user.updatedAt = now;

    submission.status = 'approved';
    submission.reviewedAt = now;
    submission.reviewedBy = admin.phoneOrEmail;

    // Ledger entry
    const tx: Transaction = {
      id: `tx_${crypto.randomUUID()}`,
      userId: user.id,
      type: 'task_reward',
      amount: submission.reward,
      description: `Task Reward: ${submission.taskTitle}`,
      descriptionUrdu: `ٹاسک انعام: ${submission.taskTitle}`,
      referenceId: submission.id,
      createdAt: now,
    };
    db.transactions.unshift(tx);

    db.notifications.unshift({
      id: `notif_${crypto.randomUUID()}`,
      userId: user.id,
      title: 'Task Approved! Reward Added / ٹاسک منظور',
      titleUrdu: 'ٹاسک منظور، انعام شامل کر دیا گیا',
      message: `Your submission for "${submission.taskTitle}" was approved. PKR ${submission.reward} added to your balance!`,
      read: false,
      createdAt: now,
    });
  } else {
    submission.status = 'rejected';
    submission.rejectionReason = reason || 'Invalid proof or requirement not satisfied';
    submission.reviewedAt = now;
    submission.reviewedBy = admin.phoneOrEmail;

    db.notifications.unshift({
      id: `notif_${crypto.randomUUID()}`,
      userId: user.id,
      title: 'Task Submission Rejected / ٹاسک مسترد',
      titleUrdu: 'ٹاسک مسترد کر دیا گیا ہے',
      message: `Your submission for "${submission.taskTitle}" was rejected: ${submission.rejectionReason}`,
      read: false,
      createdAt: now,
    });
  }

  addAuditLog(admin.phoneOrEmail, `TASK_REVIEW_${action.toUpperCase()}`, submission.id, {
    userId: user.id,
    reward: submission.reward,
    taskTitle: submission.taskTitle,
    reason,
  });

  saveDatabase();

  res.json({
    success: true,
    message: `Task submission ${action === 'approve' ? 'approved and reward credited' : 'rejected'}`,
  });
});

// Admin Platform Settings Management
apiRouter.get('/admin/settings', requireAdmin, (_req: Request, res: Response) => {
  const db = getDatabase();
  res.json({ settings: db.settings });
});

apiRouter.post('/admin/settings', requireAdmin, (req: Request, res: Response) => {
  const admin = (req as any).adminUser as User;
  const { minDeposit, minWithdrawal, paymentAccounts, announcement, announcementUrdu } = req.body;

  const db = getDatabase();

  if (minDeposit !== undefined) {
    const num = Number(minDeposit);
    if (!isNaN(num) && num > 0) db.settings.minDeposit = num;
  }

  if (minWithdrawal !== undefined) {
    const num = Number(minWithdrawal);
    if (!isNaN(num) && num > 0) db.settings.minWithdrawal = num;
  }

  if (Array.isArray(paymentAccounts)) {
    db.settings.paymentAccounts = paymentAccounts;
  }

  if (announcement !== undefined) db.settings.announcement = announcement;
  if (announcementUrdu !== undefined) db.settings.announcementUrdu = announcementUrdu;

  addAuditLog(admin.phoneOrEmail, 'UPDATE_SETTINGS', 'platformSettings', {
    minDeposit: db.settings.minDeposit,
    minWithdrawal: db.settings.minWithdrawal,
  });

  saveDatabase();

  res.json({ success: true, settings: db.settings });
});

// System Audit Logs & Full Ledger
apiRouter.get('/admin/audit-logs', requireAdmin, (_req: Request, res: Response) => {
  const db = getDatabase();
  res.json({ auditLogs: db.auditLogs.slice(0, 100) });
});

apiRouter.get('/admin/ledger', requireAdmin, (_req: Request, res: Response) => {
  const db = getDatabase();
  res.json({ transactions: db.transactions.slice(0, 200) });
});
