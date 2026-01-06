// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBLG9rtj6iI1PdHO1ayCAAXVuiUi9cYQSY",
  authDomain: "canteen-cravings-55588.firebaseapp.com",
  projectId: "canteen-cravings-55588",
  storageBucket: "",
  messagingSenderId: "495399243221",
  appId: "1:495399243221:web:1def6ac6d79002614c415c"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
