import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { setMemoryAuthToken } from '../services/api.ts';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOutUser: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          setMemoryAuthToken(token);
          await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch (err) {
          console.error('Failed to retrieve ID token:', err);
        }
      } else {
        setMemoryAuthToken(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const credential = await signInWithPopup(auth, googleAuthProvider);
    const token = await credential.user.getIdToken();
    setMemoryAuthToken(token);
  };

  const signOutUser = async () => {
    await signOut(auth);
    setMemoryAuthToken(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, signInWithGoogle, signOutUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
