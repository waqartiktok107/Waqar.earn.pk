# Waqar Earn.pk - Deployment & Firebase Setup Guide

## Quick Overview
- **Website Name**: Waqar Earn.pk (وقار ارن)
- **Admin Identifier**: `03208063725`
- **Default Min Deposit**: PKR 250
- **Default Min Withdrawal**: PKR 450
- **Referral System**: Disabled
- **Public Admin Registration**: Strictly Disabled

---

## 1. Local & Production Server Execution
The application includes a complete full-stack Node/Express server and Vite frontend.

```bash
# 1. Install dependencies
npm install

# 2. Run in development mode
npm run dev

# 3. Build & start full-stack production server
npm run build
npm start
```

Default administrator credentials:
- **Identifier**: `03208063725`
- **Password**: `Admin@03208063725` (can be changed anytime in the Admin Dashboard)

---

## 2. Deploying to Firebase (Free Hosting + Firestore + Cloud Functions)

### Prerequisites
- Node.js 18 or 20
- Firebase CLI: `npm install -g firebase-tools`
- A Firebase project created at [Firebase Console](https://console.firebase.google.com/)

### Step 1: Login & Select Project
```bash
firebase login
firebase use --add <YOUR_FIREBASE_PROJECT_ID>
```

### Step 2: Enable Firebase Authentication
1. Go to Firebase Console > **Authentication** > **Sign-in method**.
2. Enable **Email/Password**.

### Step 3: Deploy Firestore Security Rules & Indexes
```bash
firebase deploy --only firestore:rules,firestore:indexes
```

### Step 4: Deploy Cloud Functions
```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

### Step 5: Provision the Admin Identifier (03208063725)
Run the administrative setup script using the Firebase Admin SDK to attach the custom claim `admin: true`:

```bash
node -e '
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function setup() {
  const email = "admin@waqarearn.pk";
  const password = "YourSecurePassword123#";
  const phone = "03208063725";

  let user;
  try {
    user = await admin.auth().getUserByEmail(email);
  } catch(e) {
    user = await admin.auth().createUser({
      email,
      password,
      displayName: "Super Admin",
    });
  }

  await admin.auth().setCustomUserClaims(user.uid, { admin: true });
  await admin.firestore().collection("users").doc(user.uid).set({
    uid: user.uid,
    fullName: "Super Admin",
    phoneOrEmail: phone,
    role: "admin",
    status: "active",
    balance: 0,
    totalEarned: 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  console.log("Admin account provisioned for 03208063725!");
  process.exit(0);
}
setup();
'
```

### Step 6: Deploy Hosting
```bash
npm run build
firebase deploy --only hosting
```
Your website will be live at `https://<YOUR_FIREBASE_PROJECT_ID>.web.app`.
