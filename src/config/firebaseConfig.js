const { initializeApp } = require("firebase/app");
const { getFirestore } = require("firebase/firestore");

// Tu configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAPFFGHNsuACJXI53aMEMuhblaYaM1GRn4",
  authDomain: "segproyectoshuila.firebaseapp.com",
  databaseURL: "https://segproyectoshuila-default-rtdb.firebaseio.com",
  projectId: "segproyectoshuila",
  storageBucket: "segproyectoshuila.firebasestorage.app",
  messagingSenderId: "463333164381",
  appId: "1:463333164381:web:27a0936f83277122e494b4",
  measurementId: "G-914WW888S1"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar y exportar Firestore (la base de datos)
const db = getFirestore(app);

module.exports = { db };