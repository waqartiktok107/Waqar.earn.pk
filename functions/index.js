const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

async function recordAuditLog(adminId, action, targetId, details) {
  await db.collection("auditLogs").add({
    adminId,
    action,
    targetId,
    details,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
}

// 1. Setup Admin Account for Identifier 03208063725
exports.setupAdminAccount = functions.https.onCall(async (data, context) => {
  const { secretKey, email, password } = data;
  const configuredSetupSecret = process.env.ADMIN_SETUP_SECRET || "WaqarEarnSetup2025SecureKey";

  if (secretKey !== configuredSetupSecret) {
    throw new functions.https.HttpsError("permission-denied", "Invalid setup key.");
  }

  const adminPhone = "03208063725";
  let userRecord;
  try {
    userRecord = await admin.auth().getUserByEmail(email);
  } catch (err) {
    userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: "System Admin (Waqar)",
    });
  }

  await admin.auth().setCustomUserClaims(userRecord.uid, { admin: true });

  await db.collection("users").doc(userRecord.uid).set(
    {
      uid: userRecord.uid,
      fullName: "Super Admin",
      phoneOrEmail: adminPhone,
      role: "admin",
      status: "active",
      balance: 0,
      totalEarned: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return { success: true, message: `Admin privileges successfully assigned to ${adminPhone}` };
});

// 2. Member status updates
exports.updateMemberStatus = functions.https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError("permission-denied", "Admin role required.");
  }

  const { targetUid, newStatus } = data;
  const validStatuses = ["pending", "active", "suspended", "rejected"];
  if (!validStatuses.includes(newStatus)) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid status value.");
  }

  await db.collection("users").doc(targetUid).update({
    status: newStatus,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await recordAuditLog(context.auth.uid, "UPDATE_MEMBER_STATUS", targetUid, { newStatus });
  return { success: true };
});

// 3. Member safe withdrawal request (Atomic deduction)
exports.submitWithdrawalRequest = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Please log in.");
  }

  const uid = context.auth.uid;
  const amount = Number(data.amount);
  const { paymentMethod, accountTitle, accountNumber } = data;

  if (isNaN(amount) || amount <= 0 || !paymentMethod || !accountTitle || !accountNumber) {
    throw new functions.https.HttpsError("invalid-argument", "Missing or invalid withdrawal details.");
  }

  return await db.runTransaction(async (transaction) => {
    const settingsDoc = await transaction.get(db.collection("settings").doc("general"));
    const minWithdrawal = settingsDoc.exists ? settingsDoc.data().minWithdrawal || 450 : 450;

    if (amount < minWithdrawal) {
      throw new functions.https.HttpsError("failed-precondition", `Minimum withdrawal is PKR ${minWithdrawal}.`);
    }

    const userRef = db.collection("users").doc(uid);
    const userDoc = await transaction.get(userRef);

    if (!userDoc.exists) throw new functions.https.HttpsError("not-found", "User record not found.");
    const userData = userDoc.data();

    if (userData.status !== "active") {
      throw new functions.https.HttpsError("permission-denied", "Your account is not active.");
    }

    if (userData.balance < amount) {
      throw new functions.https.HttpsError("failed-precondition", "Insufficient account balance.");
    }

    // Safely deduct balance
    const newBalance = userData.balance - amount;
    transaction.update(userRef, {
      balance: newBalance,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

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
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      processedAt: null,
    });

    const ledgerRef = db.collection("transactions").doc();
    transaction.set(ledgerRef, {
      userId: uid,
      type: "withdrawal",
      amount: -amount,
      description: `Withdrawal request #${withdrawalRef.id} pending review`,
      referenceId: withdrawalRef.id,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, newBalance };
  });
});

// 4. Admin process withdrawal (Approve/Paid or Reject/Refund)
exports.processWithdrawal = functions.https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError("permission-denied", "Admin role required.");
  }

  const { requestId, action } = data;
  const requestRef = db.collection("withdrawalRequests").doc(requestId);

  return await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(requestRef);
    if (!doc.exists) throw new functions.https.HttpsError("not-found", "Request not found.");

    const reqData = doc.data();
    if (reqData.status !== "pending") {
      throw new functions.https.HttpsError("failed-precondition", "Request already processed.");
    }

    const userRef = db.collection("users").doc(reqData.userId);

    if (action === "approve") {
      transaction.update(requestRef, {
        status: "approved",
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      // Refund balance
      transaction.update(userRef, {
        balance: admin.firestore.FieldValue.increment(reqData.amount),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      transaction.update(requestRef, {
        status: "rejected",
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const refundRef = db.collection("transactions").doc();
      transaction.set(refundRef, {
        userId: reqData.userId,
        type: "withdrawal_refund",
        amount: reqData.amount,
        description: `Refund for rejected withdrawal #${requestId}`,
        referenceId: requestId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    await recordAuditLog(context.auth.uid, `WITHDRAWAL_${action.toUpperCase()}`, requestId, {
      userId: reqData.userId,
      amount: reqData.amount,
    });

    return { success: true };
  });
});

// 5. Admin process deposit
exports.processDeposit = functions.https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError("permission-denied", "Admin role required.");
  }

  const { requestId, action } = data;
  const requestRef = db.collection("depositRequests").doc(requestId);

  return await db.runTransaction(async (transaction) => {
    const reqDoc = await transaction.get(requestRef);
    if (!reqDoc.exists) throw new functions.https.HttpsError("not-found", "Deposit not found.");

    const reqData = reqDoc.data();
    if (reqData.status !== "pending") {
      throw new functions.https.HttpsError("failed-precondition", "Deposit already processed.");
    }

    if (action === "approve") {
      const userRef = db.collection("users").doc(reqData.userId);
      transaction.update(userRef, {
        balance: admin.firestore.FieldValue.increment(reqData.amount),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      transaction.update(requestRef, {
        status: "approved",
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const txRef = db.collection("transactions").doc();
      transaction.set(txRef, {
        userId: reqData.userId,
        type: "deposit",
        amount: reqData.amount,
        description: `Deposit Approved (${reqData.paymentMethod} TRX: ${reqData.transactionId})`,
        referenceId: requestId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      transaction.update(requestRef, {
        status: "rejected",
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    await recordAuditLog(context.auth.uid, `DEPOSIT_${action.toUpperCase()}`, requestId, {
      userId: reqData.userId,
      amount: reqData.amount,
    });

    return { success: true };
  });
});
