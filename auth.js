import { auth, db } from './firebase.js';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// DOM Elements
const startBtn = document.getElementById('start-btn');
const usernameInput = document.getElementById('username');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorMessage = document.getElementById('error-message');

// Check if username is available
async function isUsernameAvailable(username) {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('username', '==', username));
  const snapshot = await getDocs(q);
  return snapshot.empty;
}

// Register new user
async function registerUser(email, password, username) {
  try {
    // Check username availability
    if (!await isUsernameAvailable(username)) {
      throw new Error('Username already taken');
    }

    // Create auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Create user profile
    await addDoc(collection(db, 'users'), {
      userId: userCredential.user.uid,
      username: username,
      email: email,
      createdAt: new Date(),
      lastLogin: new Date(),
      totalClicks: 0,
      premium: false
    });

    // Redirect to dashboard
    window.location.href = 'dashboard.html';
  } catch (error) {
    errorMessage.textContent = error.message;
    console.error("Registration error:", error);
  }
}

// Login existing user
async function loginUser(email, password) {
  try {
    await signInWithEmailAndPassword(auth, email, password);
    window.location.href = 'dashboard.html';
  } catch (error) {
    errorMessage.textContent = error.message;
    console.error("Login error:", error);
  }
}

// Handle auth state changes
onAuthStateChanged(auth, (user) => {
  if (user && window.location.pathname.includes('index.html')) {
    window.location.href = 'dashboard.html';
  }
});

// Event listeners
if (startBtn) {
  startBtn.addEventListener('click', async () => {
    const username = usernameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!username || !email || !password) {
      errorMessage.textContent = 'Please fill all fields';
      return;
    }

    if (username.length < 4) {
      errorMessage.textContent = 'Username must be at least 4 characters';
      return;
    }

    if (password.length < 6) {
      errorMessage.textContent = 'Password must be at least 6 characters';
      return;
    }

    // Check if user exists
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      await registerUser(email, password, username);
    } else {
      await loginUser(email, password);
    }
  });
}