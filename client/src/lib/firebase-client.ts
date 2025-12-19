import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// Firebase configuration - should match your Firebase project
const firebaseConfig = {
  apiKey: "AIzaSyB4lf8lYPSz_FanK9Zm5EfZp2g8rLOxXoQ",
  authDomain: "smartrent-5e12c.firebaseapp.com",
  projectId: "smartrent-5e12c",
  storageBucket: "smartrent-5e12c.appspot.com",
  messagingSenderId: "535400801989",
  appId: "1:535400801989:web:cd6f17e24eebca911732ac",
  measurementId: "G-8YJ3ZNZ4HL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth
export const auth = getAuth(app);

// Initialize Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export default app;
















