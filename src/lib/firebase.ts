// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyApGpULRisWS_wr226ZKakcleZxBwIT0mQ", // Inferred from your provided JSON
  authDomain: "cargainteligente-lxhac.firebaseapp.com",
  projectId: "cargainteligente-lxhac",
  storageBucket: "cargainteligente-lxhac.appspot.com",
  messagingSenderId: "901391150489",
  appId: "1:901391150489:web:your_app_id" // Placeholder, should be replaced with actual value from Firebase console
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

export const auth = getAuth(app);
