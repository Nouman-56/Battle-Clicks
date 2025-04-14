import { auth, db } from './firebase.js';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Game state
let totalClicks = 0;
let clickMultiplier = 1;
let clickSpeed = 0;
let lastClickTime = 0;
let adBoostActive = false;
let permanentBoost = false;
const MAX_CLICKS_PER_SECOND = 10; // Anti-cheat measure

// DOM elements
const warBtn = document.getElementById('war-btn');
const userClicksDisplay = document.getElementById('user-clicks');
const clickSpeedDisplay = document.getElementById('click-speed');
const clickMultiplierDisplay = document.getElementById('click-multiplier');

// Initialize game
export async function initGame() {
    if (!auth.currentUser) return;
    
    await loadUserClicks();
    setupClickHandler();
    startClickTracking();
    
    // Update multiplier display
    updateMultiplierDisplay();
}

// Load user's existing clicks
async function loadUserClicks() {
    try {
        const clicksRef = collection(db, 'clicks');
        const q = query(clicksRef, where('userId', '==', auth.currentUser.uid));
        const snapshot = await getDocs(q);
        
        totalClicks = snapshot.docs.reduce((sum, doc) => sum + doc.data().clicks, 0);
        updateClickDisplay();
    } catch (error) {
        console.error("Error loading clicks:", error);
    }
}

// Set up click handler with anti-cheat
function setupClickHandler() {
    warBtn.addEventListener('click', async () => {
        const now = Date.now();
        const timeDiff = now - lastClickTime;
        
        // Anti-cheat: Prevent unrealistic click speeds
        if (timeDiff < 1000/MAX_CLICKS_PER_SECOND) {
            console.warn("Click speed limit exceeded");
            return;
        }
        
        // Calculate click speed
        if (lastClickTime > 0) {
            clickSpeed = Math.min(1000 / timeDiff, MAX_CLICKS_PER_SECOND).toFixed(1);
            clickSpeedDisplay.textContent = `${clickSpeed} clicks/sec`;
        }
        lastClickTime = now;
        
        // Record click with multiplier
        const clicksToAdd = 1 * clickMultiplier;
        totalClicks += clicksToAdd;
        
        try {
            await addDoc(collection(db, 'clicks'), {
                userId: auth.currentUser.uid,
                username: auth.currentUser.displayName,
                clicks: clicksToAdd,
                multiplier: clickMultiplier,
                timestamp: serverTimestamp()
            });
            
            updateClickDisplay();
        } catch (error) {
            console.error("Error recording click:", error);
            totalClicks -= clicksToAdd; // Revert if failed
        }
    });
}

// Update displays
function updateClickDisplay() {
    userClicksDisplay.textContent = totalClicks.toLocaleString();
}

function updateMultiplierDisplay() {
    clickMultiplierDisplay.textContent = `${clickMultiplier}x`;
}

// Track click speed over time
function startClickTracking() {
    setInterval(() => {
        if (clickSpeed > 0) {
            clickSpeed = Math.max(0, clickSpeed - 0.5).toFixed(1);
            clickSpeedDisplay.textContent = `${clickSpeed} clicks/sec`;
        }
    }, 1000);
}

// Boost functions
export function activatePermanentBoost() {
    clickMultiplier = 2;
    permanentBoost = true;
    updateMultiplierDisplay();
    document.getElementById('boost-btn').classList.add('purchased');
}

export function activateAdBoost(durationMinutes) {
    if (adBoostActive) return;
    
    clickMultiplier = 2;
    adBoostActive = true;
    updateMultiplierDisplay();
    
    setTimeout(() => {
        clickMultiplier = permanentBoost ? 2 : 1;
        adBoostActive = false;
        updateMultiplierDisplay();
    }, durationMinutes * 60 * 1000);
}

// Initialize when auth state changes
auth.onAuthStateChanged(user => {
    if (user) {
        initGame();
    }
});