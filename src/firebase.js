import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyA-XzUQhUVT0C-d5jdx4PuMHLag2nBabbg',
  authDomain: 'family-trips-9aef4.firebaseapp.com',
  projectId: 'family-trips-9aef4',
  storageBucket: 'family-trips-9aef4.firebasestorage.app',
  messagingSenderId: '615876704416',
  appId: '1:615876704416:web:1d0b89ad1240fe739b31c5',
  measurementId: 'G-T7YQQGLZM4',
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);
