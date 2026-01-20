//firebase-config.js
// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-analytics.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCyHn3W1oJSFp2f7TlSHL2cMO5bnN2gOII",
  authDomain: "portfolio-be948.firebaseapp.com",
  projectId: "portfolio-be948",
  storageBucket: "portfolio-be948.firebasestorage.app",
  messagingSenderId: "853731625503",
  appId: "1:853731625503:web:d8210ef213f6ebe0a0e32a",
  measurementId: "G-JHBH6779W0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

export { db };