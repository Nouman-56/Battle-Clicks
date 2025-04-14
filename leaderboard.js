import { auth, db, realtimeDB } from './firebase.js';
import { ref, onValue } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Initialize leaderboard
export function initLeaderboard() {
    if (!auth.currentUser) return;
    
    setupRealtimeLeaderboard();
    updateTotalWarriors();
}

// Real-time leaderboard updates
function setupRealtimeLeaderboard() {
    const leaderboardRef = ref(realtimeDB, 'leaderboard');
    
    onValue(leaderboardRef, (snapshot) => {
        const leaderboardData = snapshot.val();
        if (leaderboardData) {
            updateLeaderboardUI(leaderboardData);
            updateUserRank(leaderboardData);
        }
    }, {
        onlyOnce: false // Keep listening for updates
    });
}

// Update leaderboard UI
function updateLeaderboardUI(leaderboardData) {
    const leaderboardList = document.getElementById('leaderboard-list');
    leaderboardList.innerHTML = '';
    
    // Convert to array and sort
    const sortedEntries = Object.entries(leaderboardData)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 100); // Top 100 only
    
    if (sortedEntries.length === 0) {
        leaderboardList.innerHTML = '<li class="leaderboard-entry">No warriors yet!</li>';
        return;
    }
    
    sortedEntries.forEach((entry, index) => {
        const li = document.createElement('li');
        li.className = 'leaderboard-entry';
        
        // Highlight current user
        if (auth.currentUser && entry.id === auth.currentUser.uid) {
            li.classList.add('current-user');
        }
        
        // Special styling for top 3
        if (index < 3) {
            li.classList.add(`top-${index + 1}`);
        }
        
        li.innerHTML = `
            <span class="rank">${index + 1}</span>
            <span class="username">${entry.username || 'Anonymous'}</span>
            <span class="clicks">${entry.clicks.toLocaleString()}</span>
        `;
        
        leaderboardList.appendChild(li);
    });
}

// Update user's rank
function updateUserRank(leaderboardData) {
    const sortedEntries = Object.values(leaderboardData)
        .sort((a, b) => b.clicks - a.clicks);
    
    const userIndex = sortedEntries.findIndex(entry => 
        entry.id === auth.currentUser.uid);
    
    if (userIndex !== -1) {
        document.getElementById('user-rank').textContent = `#${userIndex + 1}`;
    }
}

// Update total warriors count
async function updateTotalWarriors() {
    try {
        const usersRef = collection(db, 'users');
        const snapshot = await getDocs(usersRef);
        document.getElementById('total-warriors').textContent = snapshot.size.toLocaleString();
    } catch (error) {
        console.error("Error counting warriors:", error);
    }
}

// Initialize when auth state changes
auth.onAuthStateChanged(user => {
    if (user) {
        initLeaderboard();
    }
});