import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA-XzUQhUVT0C-d5jdx4PuMHLag2nBabbg",
  authDomain: "family-trips-9aef4.firebaseapp.com",
  projectId: "family-trips-9aef4",
  storageBucket: "family-trips-9aef4.firebasestorage.app",
  messagingSenderId: "615876704416",
  appId: "1:615876704416:web:69c55743d6f499319b31c5",
  measurementId: "G-J4RS16JD93",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
