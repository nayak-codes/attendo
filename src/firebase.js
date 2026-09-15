// Firebase configuration — EduTrack dedicated project
import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  getDocs,
  limit,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDqVbeqiIvzy4C_vMskuga6Zwr-fyLpYrI",
  authDomain: "edutrack-30521.firebaseapp.com",
  projectId: "edutrack-30521",
  storageBucket: "edutrack-30521.firebasestorage.app",
  messagingSenderId: "265736432808",
  appId: "1:265736432808:web:nef05527520e209022106d",
  measurementId: "G-1511C6E4FU"
};

// Prevent duplicate initialization
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);

export {
  collection, doc, setDoc, getDoc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, where, orderBy, getDocs, limit,
  serverTimestamp, writeBatch,
};

export default app;

