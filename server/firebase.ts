import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// Your Firebase configuration
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

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Auth
export const auth = getAuth(app);

// Initialize Storage
export const storage = getStorage(app);

export default app;
