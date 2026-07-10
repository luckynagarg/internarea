// firebase.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
const firebaseConfig = {
  apiKey: "AIzaSyBsX-HgUNXszeOZunFBNbKfaNRxRHwQM80",
  authDomain: "internarea-1c6cd.firebaseapp.com",
  projectId: "internarea-1c6cd",
  storageBucket: "internarea-1c6cd.firebasestorage.app",
  messagingSenderId: "513389242059",
  appId: "1:513389242059:web:a67fa252826af0bb3fdd4e",
  measurementId: "G-JR38XZN5EM",
};
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();

export default app;