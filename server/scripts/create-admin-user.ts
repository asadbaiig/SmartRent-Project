// Script to create admin user
// Run with: npx tsx server/scripts/create-admin-user.ts

import 'dotenv/config';
import { auth } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { firebaseStorage } from '../firebase-storage';
import type { InsertUser } from '@shared/schema';

async function createAdminUser() {
  try {
    // Using admin@smartrent.com as email since Firebase requires valid email format
    // Users can login with either "admin" or "admin@smartrent.com" - both will work
    const email = 'admin@smartrent.com';
    const password = 'password';

    console.log('Creating admin user...');
    
    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    
    console.log('Firebase user created:', firebaseUser.uid);

    // Create user in Firestore
    const userData: InsertUser = {
      email: email,
      fullName: 'Admin User',
      password: '', // We don't store passwords in Firestore when using Firebase Auth
      role: 'admin',
      verificationStatus: 'verified', // Admin is pre-verified
      phone: null,
      cnicNumber: null,
      profileImage: null
    };

    const dbUser = await firebaseStorage.createUser({
      ...userData,
      id: firebaseUser.uid // Use Firebase UID as our user ID
    });

    console.log('✅ Admin user created successfully!');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('User ID:', dbUser.id);
    console.log('Role:', dbUser.role);
    
    process.exit(0);
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      console.log('⚠️  Admin user already exists!');
      console.log('Email: admin@smartrent.com (or use "admin" as username)');
      console.log('Password: password');
    } else {
      console.error('❌ Error creating admin user:', error.message);
    }
    process.exit(1);
  }
}

createAdminUser();

