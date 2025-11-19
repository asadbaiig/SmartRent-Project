import { Request, Response, NextFunction } from 'express';
import { auth } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { firebaseStorage } from './firebase-storage';
import type { InsertUser } from '@shared/schema';

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email: string;
    role: string;
    fullName: string;
    verificationStatus: string;
  };
}

// Middleware to verify Firebase ID token
export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const idToken = authHeader && authHeader.split(' ')[1];

    if (!idToken) {
      return res.status(401).json({ message: 'ID token required' });
    }

    // Simplified token validation: we treat token as the Firebase UID
    // In production, verify the Firebase ID token using Firebase Admin SDK.
    const user = await firebaseStorage.getUserById(idToken);
    
    if (!user) {
      return res.status(403).json({ message: 'User not found' });
    }

    req.user = {
      uid: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      verificationStatus: user.verificationStatus
    };
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(403).json({ message: 'Invalid token' });
  }
};

// Role-based middleware
export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
};

// Firebase Auth helper functions
export const firebaseAuth = {
  // Sign up with email and password
  async signUp(email: string, password: string, userData: Omit<InsertUser, 'password'>) {
    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Clean up userData to remove undefined values and ensure required fields
      const cleanUserData = {
        email: userData.email,
        fullName: userData.fullName,
        phone: userData.phone || null,
        role: userData.role || 'tenant',
        verificationStatus: userData.verificationStatus || 'pending',
        cnicNumber: userData.cnicNumber || null,
        profileImage: userData.profileImage || null
      };

      // Create user in our database
      const dbUser = await firebaseStorage.createUser({
        ...cleanUserData,
        password: '', // We don't store passwords in our database when using Firebase Auth
        id: user.uid // Use Firebase UID as our user ID
      });

      return {
        user: {
          uid: dbUser.id,
          email: dbUser.email,
          fullName: dbUser.fullName,
          role: dbUser.role,
          verificationStatus: dbUser.verificationStatus
        },
        firebaseUser: user
      };
    } catch (error: any) {
      throw new Error(error.message);
    }
  },

  // Sign in with email and password
  async signIn(email: string, password: string) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Get user data from our database
      const dbUser = await firebaseStorage.getUserById(user.uid);
      
      if (!dbUser) {
        throw new Error('User not found in database');
      }

      return {
        user: {
          uid: dbUser.id,
          email: dbUser.email,
          fullName: dbUser.fullName,
          role: dbUser.role,
          verificationStatus: dbUser.verificationStatus
        },
        firebaseUser: user
      };
    } catch (error: any) {
      throw new Error(error.message);
    }
  },

  // Sign out
  async signOut() {
    try {
      await signOut(auth);
      return { message: 'Signed out successfully' };
    } catch (error: any) {
      throw new Error(error.message);
    }
  },

  // Sign in with Google
  async signInWithGoogle(idToken: string) {
    try {
      // Verify the ID token is from Google (in production, verify with Firebase Admin SDK)
      // For now, we'll trust the token from the client
      // The client will send us the ID token after Google sign-in
      
      // Note: In a real implementation, you should verify the ID token server-side
      // using Firebase Admin SDK. For now, we'll rely on the client to provide valid tokens.
      
      // Since we can't verify the token here without Admin SDK, we'll need to handle
      // Google auth differently - the client will authenticate with Firebase and send us
      // the user info which we'll then sync with our database
      throw new Error('Google sign-in should be handled via client-side Firebase Auth');
    } catch (error: any) {
      throw new Error(error.message);
    }
  },

  // Handle Google authentication result from client
  async handleGoogleAuth(firebaseUser: any, role?: string) {
    try {
      // Check if user exists in our database
      let dbUser = await firebaseStorage.getUserById(firebaseUser.uid);
      
      if (!dbUser) {
        // Create new user from Google account
        const cleanUserData = {
          email: firebaseUser.email || '',
          fullName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          phone: firebaseUser.phoneNumber || null,
          role: role || 'tenant',
          verificationStatus: 'pending',
          cnicNumber: null,
          profileImage: firebaseUser.photoURL || null
        };

        dbUser = await firebaseStorage.createUser({
          ...cleanUserData,
          password: '', // No password for Google auth
          id: firebaseUser.uid
        });
      }

      return {
        user: {
          uid: dbUser.id,
          email: dbUser.email,
          fullName: dbUser.fullName,
          role: dbUser.role,
          verificationStatus: dbUser.verificationStatus
        },
        firebaseUser: firebaseUser
      };
    } catch (error: any) {
      throw new Error(error.message);
    }
  }
};
