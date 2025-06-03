// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyDBRFrzmnXigqP9au3WohG5GvFg7cJd4YI",
    authDomain: "zchat-f2b41.firebaseapp.com",
    projectId: "zchat-f2b41",
    storageBucket: "zchat-f2b41.firebasestorage.app",
    messagingSenderId: "711186608249",
    appId: "1:711186608249:web:f53b41a0ae630e952c24a8",
    measurementId: "G-VXDF17PGNX"
};


const app = initializeApp(firebaseConfig);

const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };

