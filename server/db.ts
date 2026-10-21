import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export interface User {
  id: string;
  fullName: string;
  phoneOrEmail: string;
  role: 'member' | 'admin';
  status: 'pending' | 'active' | 'suspended' | 'rejected';
  passwordHash: string;
  salt: string;
  balance: number;
  totalEarned: number;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  titleUrdu?: string;
  description: string;
  instructions: string;
  reward: number; // in PKR
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

export interface PlatformSettings {
  minDeposit: number;
  minWithdrawal: number;
  adminIdentifier: string;
  adminPasswordConfigured: boolean;
  paymentAccounts: {
    method: string;
    title: string;
    accountNumber: string;
    bankName?: string;
    instructions: string;
  }[];
  announcement?: string;
  announcementUrdu?: string;
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

export interface DatabaseSchema {
  users: User[];
  tasks: Task[];
  taskSubmissions: TaskSubmission[];
  depositRequests: DepositRequest[];
  withdrawalRequests: WithdrawalRequest[];
  transactions: Transaction[];
  settings: PlatformSettings;
  auditLogs: AuditLog[];
  notifications: NotificationItem[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DATA_DIR, 'database.json');

// Password hashing helper using Node crypto PBKDF2
export function hashPassword(password: string, salt = crypto.randomBytes(16).toString('hex')): { hash: string; salt: string } {
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const testHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return testHash === hash;
}

// In-memory cache synced with disk
let db: DatabaseSchema;

function getInitialData(): DatabaseSchema {
  // Hash default admin password for identifier 03208063725
  const adminCreds = hashPassword('Admin@03208063725');
  const now = new Date().toISOString();

  const adminUser: User = {
    id: 'admin_03208063725',
    fullName: 'Chief Administrator (Waqar)',
    phoneOrEmail: '03208063725',
    role: 'admin',
    status: 'active',
    passwordHash: adminCreds.hash,
    salt: adminCreds.salt,
    balance: 0,
    totalEarned: 0,
    createdAt: now,
    updatedAt: now,
  };

  const initialTasks: Task[] = [
    {
      id: 'task_youtube_sub',
      title: 'Subscribe to Official YouTube Channel',
      titleUrdu: 'یوٹیوب چینل کو سبسکرائب کریں',
      description: 'Subscribe to Waqar Official Channel, like the latest video, and submit your channel name or screenshot.',
      instructions: '1. Visit YouTube and search for Waqar Earn Official.\n2. Click Subscribe and hit the bell icon.\n3. Like the featured video.\n4. Enter your YouTube username and screenshot link in the proof box.',
      reward: 35,
      isActive: true,
      category: 'Social Media',
      createdAt: now,
    },
    {
      id: 'task_app_review',
      title: 'Submit Positive 5-Star Rating & Review',
      titleUrdu: 'پلے اسٹور پر 5 اسٹار ریویو دیں',
      description: 'Leave a 5-star rating and positive review on the Waqar Earn app/portal. Mention fast payments in PKR.',
      instructions: '1. Provide a thoughtful 5-star review.\n2. Take a screenshot or copy the review text.\n3. Paste the review text and your reviewer name below.',
      reward: 60,
      isActive: true,
      category: 'Reviews',
      createdAt: now,
    },
    {
      id: 'task_whatsapp_share',
      title: 'Share Waqar Earn Proof in 3 Earning Groups',
      titleUrdu: 'واٹس ایپ ارننگ گروپس میں شیئر کریں',
      description: 'Share payment screenshot and announcement in 3 active Pakistani WhatsApp earning groups.',
      instructions: '1. Share with group members.\n2. Submit group names and verification text.',
      reward: 45,
      isActive: true,
      category: 'Promotion',
      createdAt: now,
    },
    {
      id: 'task_daily_quiz',
      title: 'Daily Platform Survey & Questionnaire',
      titleUrdu: 'روزانہ سروے اور سوالنامہ مکمل کریں',
      description: 'Answer 3 short feedback questions about your experience on Waqar Earn.pk to help us improve.',
      instructions: 'Answer: How did you discover us? Which payment method do you prefer (EasyPaisa/JazzCash)? What is your daily target in PKR?',
      reward: 25,
      isActive: true,
      category: 'Survey',
      createdAt: now,
    },
  ];

  const initialSettings: PlatformSettings = {
    minDeposit: 250,
    minWithdrawal: 450,
    adminIdentifier: '03208063725',
    adminPasswordConfigured: true,
    paymentAccounts: [
      {
        method: 'EasyPaisa',
        title: 'Waqar Ahmad',
        accountNumber: '0320-8063725',
        instructions: 'Send exact PKR deposit to this EasyPaisa account. Note down the 11-digit TRX ID from SMS 3737.',
      },
      {
        method: 'JazzCash',
        title: 'Waqar Ahmad',
        accountNumber: '0320-8063725',
        instructions: 'Send exact PKR deposit to this JazzCash account. Enter the TID from SMS 8558.',
      },
      {
        method: 'Bank Transfer',
        title: 'Waqar Ahmad',
        accountNumber: '0129009801234567',
        bankName: 'Meezan Bank Limited (Islamic)',
        instructions: 'Transfer to Meezan Bank. Mention your registered mobile number in payment reference.',
      },
    ],
    announcement: 'Welcome to Waqar Earn.pk! Minimum deposit is PKR 250, minimum withdrawal is PKR 450. Approvals are processed swiftly by the admin.',
    announcementUrdu: 'وقار ارن ڈاٹ پی کے میں خوش آمدید! کم از کم ڈپازٹ 250 روپے اور کیش آؤٹ 450 روپے ہے۔ ایڈمن کی طرف سے تیزی سے منظوری دی جاتی ہے۔',
  };

  return {
    users: [adminUser],
    tasks: initialTasks,
    taskSubmissions: [],
    depositRequests: [],
    withdrawalRequests: [],
    transactions: [],
    settings: initialSettings,
    auditLogs: [
      {
        id: crypto.randomUUID(),
        adminIdentifier: '03208063725',
        action: 'SYSTEM_INITIALIZED',
        targetId: 'system',
        details: { message: 'Database initialized with official settings and default admin' },
        timestamp: now,
      },
    ],
    notifications: [],
  };
}

export function initDatabase(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      db = JSON.parse(raw);
      // Ensure admin with 03208063725 exists
      const hasAdmin = db.users.some((u) => u.phoneOrEmail === '03208063725' && u.role === 'admin');
      if (!hasAdmin) {
        const init = getInitialData();
        db.users.push(init.users[0]);
        saveDatabase();
      }
    } else {
      db = getInitialData();
      saveDatabase();
    }
  } catch (err) {
    console.error('Database initialization error, falling back to clean seed:', err);
    db = getInitialData();
    saveDatabase();
  }
}

export function saveDatabase(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(db, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('Failed to save database to disk:', err);
  }
}

export function getDatabase(): DatabaseSchema {
  if (!db) {
    initDatabase();
  }
  return db;
}
