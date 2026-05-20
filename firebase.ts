import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged, 
  User, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut 
} from 'firebase/auth';
import { 
  getDatabase, 
  ref, 
  set, 
  get, 
  onValue, 
  off, 
  update, 
  push, 
  remove, 
  onDisconnect, 
  child 
} from 'firebase/database';


const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getDatabase(app);

export const googleProvider = new GoogleAuthProvider();

// Re-export Auth types and functions
export { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  signInAnonymously 
};
export type { User };

// Re-export Database functions
export { 
  ref, 
  set, 
  get, 
  onValue, 
  off, 
  update, 
  push, 
  remove, 
  onDisconnect, 
  child 
};

// Helper to guarantee user is authenticated (using anonymous login by default)
export const ensureAuthenticated = async (): Promise<string> => {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe();
      if (user) {
        resolve(user.uid);
      } else {
        try {
          const cred = await signInAnonymously(auth);
          if (cred.user) {
            resolve(cred.user.uid);
          } else {
            reject(new Error("Anonymous sign in failed"));
          }
        } catch (error) {
          reject(error);
        }
      }
    });
  });
};
