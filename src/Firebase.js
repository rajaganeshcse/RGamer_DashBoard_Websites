import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBjwxbcRvemLAtvtNxaAOSvdpN25MjOB8U",
  authDomain: "r-gamer-35915.firebaseapp.com",
  projectId: "r-gamer-35915",
  storageBucket: "r-gamer-35915.firebasestorage.app",
  messagingSenderId: "389812623522",
  appId: "1:389812623522:web:f478dd369658c28c491ffb"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
