// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyCaKKSo3SZQnJdbrMDnv20icp6n1w-T1HM",
    authDomain: "vdiocalling-79149.firebaseapp.com",
    projectId: "vdiocalling-79149",
    storageBucket: "vdiocalling-79149.appspot.com",
    messagingSenderId: "1066146546644",
    appId: "1:1066146546644:web:7d4ec99937a40060cccc41"
};


const app = initializeApp(firebaseConfig);

const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
