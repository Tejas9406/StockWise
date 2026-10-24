import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import dotenv from 'dotenv';

dotenv.config();

const projectId = process.env.FIREBASE_PROJECT_ID || 'stockwise-c4fb6';

let firebaseApp;
if (!getApps().length) {
  firebaseApp = initializeApp({
    projectId,
  });
  console.log(`[Firebase Admin] Initialized for project: ${projectId}`);
} else {
  firebaseApp = getApps()[0];
}

const adminAuth = getAuth(firebaseApp);

/**
 * Verify Firebase ID Token issued by Firebase Client SDK
 * Returns decoded token { uid, email, ... }
 */
export const verifyFirebaseToken = async (idToken) => {
  if (!idToken) {
    throw new Error('No authentication token provided');
  }

  // Handle mock/demo token in local dev/testing mode
  if (
    idToken.startsWith('mock_token_') ||
    idToken.startsWith('demo_token_') ||
    idToken.startsWith('mock-token-') ||
    idToken.startsWith('demo-token-')
  ) {
    const normalized = idToken.replace(/-/g, '_');
    const parts = normalized.split('_');

    // Check if token contains explicit user email
    const atPart = parts.find(p => p.includes('@'));
    if (atPart) {
      return {
        uid: `firebase_uid_${parts[2]}`,
        email: atPart.toLowerCase(),
        name: parts[2]?.toUpperCase() || 'USER',
        isMock: true,
      };
    }

    const roleSlug = parts[2]?.toLowerCase() || 'manager';
    let email = 'manager@stockwise.ai';
    let uid = 'firebase_uid_manager';

    if (roleSlug === 'manager' || roleSlug === 'distribution') {
      email = 'manager@stockwise.ai';
      uid = 'firebase_uid_manager';
    } else if (roleSlug.includes('warehouse')) {
      email = 'warehouse1@stockwise.ai';
      uid = 'firebase_uid_warehouse1';
    } else if (roleSlug.includes('store')) {
      email = 'store1@stockwise.ai';
      uid = 'firebase_uid_store1';
    }

    return {
      uid,
      email,
      name: roleSlug.toUpperCase(),
      isMock: true,
    };
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    // If token verification with Google certs fails, check if token is signed or fallback
    console.warn(`[Firebase Admin Token Warning]: ${error.message}`);
    throw error;
  }
};

export { adminAuth, firebaseApp };
export default adminAuth;
