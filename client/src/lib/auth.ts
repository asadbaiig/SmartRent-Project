import { signInWithPopup } from "firebase/auth";
import { auth as firebaseAuth, googleProvider } from "./firebase-client";

interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  verificationStatus: string;
  phone?: string;
  cnicNumber?: string;
  profileImage?: string;
}

interface AuthResponse {
  user: User;
  token: string;
}

const API_BASE = '/api';

export const auth = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    const data = await response.json();
    localStorage.setItem('token', data.token);
    return data;
  },

  async register(userData: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    role: string;
  }): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Registration failed');
    }

    const data = await response.json();
    localStorage.setItem('token', data.token);
    return data;
  },

  async getCurrentUser(): Promise<User | null> {
    const token = localStorage.getItem('token');
    if (!token) return null;

    try {
      const response = await fetch(`${API_BASE}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        localStorage.removeItem('token');
        return null;
      }

      return await response.json();
    } catch (error) {
      localStorage.removeItem('token');
      return null;
    }
  },

  logout() {
    localStorage.removeItem('token');
  },

  getToken(): string | null {
    return localStorage.getItem('token');
  },

  async loginWithGoogle(): Promise<AuthResponse> {
    try {
      // Sign in with Google using Firebase
      const result = await signInWithPopup(firebaseAuth, googleProvider);
      const user = result.user;
      
      // Get ID token
      const idToken = await user.getIdToken();
      
      // Send user data and token to backend
      const response = await fetch(`${API_BASE}/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user: {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            phoneNumber: user.phoneNumber,
          },
          idToken,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Google login failed');
      }

      const data = await response.json();
      localStorage.setItem('token', data.token);
      return data;
    } catch (error: any) {
      // Handle popup closed by user
      if (error.code === 'auth/popup-closed-by-user') {
        throw new Error('Sign-in popup was closed');
      }
      throw error;
    }
  },

  async registerWithGoogle(role: string): Promise<AuthResponse> {
    try {
      // Sign in with Google using Firebase
      const result = await signInWithPopup(firebaseAuth, googleProvider);
      const user = result.user;
      
      // Get ID token
      const idToken = await user.getIdToken();
      
      // Send user data, token, and role to backend
      const response = await fetch(`${API_BASE}/auth/google/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user: {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            phoneNumber: user.phoneNumber,
          },
          idToken,
          role,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Google registration failed');
      }

      const data = await response.json();
      localStorage.setItem('token', data.token);
      return data;
    } catch (error: any) {
      // Handle popup closed by user
      if (error.code === 'auth/popup-closed-by-user') {
        throw new Error('Sign-in popup was closed');
      }
      throw error;
    }
  },
};
