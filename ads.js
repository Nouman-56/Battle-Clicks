import { auth, db } from './firebase.js';
import { collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { activateAdBoost } from './game.js';

// DOM elements
const adBtn = document.getElementById('ad-btn');
let adCooldown = false;
const AD_BOOST_DURATION = 10; // minutes
const AD_COOLDOWN = 30; // minutes

// Initialize ad system
export function initAdSystem() {
    if (!auth.currentUser) return;
    
    setupAdButton();
    checkExistingBoosts();
}

// Set up ad button handler
function setupAdButton() {
    adBtn.addEventListener('click', async () => {
        if (adCooldown) return;
        
        // Show mock ad (replace with real ad network)
        if (confirm("Watch a 30-second ad to get 10 minutes of 2x clicks?")) {
            showMockAd();
        }
    });
}

// Show mock ad flow
function showMockAd() {
    adBtn.disabled = true;
    adBtn.innerHTML = '<span class="ad-icon">⏳</span> Ad playing...';
    
    // Simulate ad playback (30 seconds)
    setTimeout(async () => {
        try {
            // Record boost activation
            await addDoc(collection(db, 'boosts'), {
                userId: auth.currentUser.uid,
                type: 'ad',
                duration: AD_BOOST_DURATION,
                timestamp: serverTimestamp()
            });
            
            // Activate boost in game
            activateAdBoost(AD_BOOST_DURATION);
            startAdCooldown();
            
            adBtn.innerHTML = '<span class="ad-icon">✅</span> Boost Active!';
            setTimeout(() => {
                updateAdButtonText();
            }, 2000);
        } catch (error) {
            console.error("Error recording ad boost:", error);
            adBtn.innerHTML = '<span class="ad-icon">❌</span> Error';
        }
    }, 30000); // 30-second ad
}

// Start cooldown period
function startAdCooldown() {
    adCooldown = true;
    let secondsLeft = AD_COOLDOWN * 60;
    
    const cooldownInterval = setInterval(() => {
        secondsLeft--;
        
        if (secondsLeft <= 0) {
            clearInterval(cooldownInterval);
            adCooldown = false;
            updateAdButtonText();
            adBtn.disabled = false;
            return;
        }
        
        const minutes = Math.floor(secondsLeft / 60);
        const seconds = secondsLeft % 60;
        adBtn.innerHTML = `<span class="ad-icon">⏳</span> ${minutes}m ${seconds}s`;
    }, 1000);
}

// Update button text based on state
function updateAdButtonText() {
    if (adCooldown) return;
    
    adBtn.innerHTML = `
        <span class="ad-icon">📺</span>
        <span>Watch Ad for 2x (${AD_BOOST_DURATION}min)</span>
    `;
}

// Check for existing boosts
async function checkExistingBoosts() {
    try {
        const boostsRef = collection(db, 'boosts');
        const q = query(boostsRef, 
            where('userId', '==', auth.currentUser.uid),
            where('type', '==', 'ad'),
            where('timestamp', '>', new Date(Date.now() - AD_BOOST_DURATION * 60000))
        );
        
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            // Boost still active
            activateAdBoost(AD_BOOST_DURATION);
            startAdCooldown();
        }
    } catch (error) {
        console.error("Error checking boosts:", error);
    }
}

// Initialize when auth state changes
auth.onAuthStateChanged(user => {
    if (user) {
        initAdSystem();
    }
});