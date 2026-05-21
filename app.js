// Global Variables
let currentUser = null;
let currentChatId = null;
let currentChatType = 'dm'; // 'dm' or 'group'
let users = {};
let chats = {};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            loadUserData();
            showPage('chat');
        } else {
            showPage('landing');
        }
    });
});

// Page Navigation
function showPage(pageName) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.add('hidden');
    });
    document.getElementById(pageName).classList.remove('hidden');
}

// Authentication Functions
function handleSignup(event) {
    event.preventDefault();
    
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const university = document.getElementById('signupUniversity').value;
    const course = document.getElementById('signupCourse').value;

    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            
            // Save user info to database
            database.ref('users/' + user.uid).set({
                uid: user.uid,
                name: name,
                email: email,
                university: university,
                course: course,
                avatar: name.charAt(0).toUpperCase(),
                createdAt: new Date().toISOString(),
                onlineStatus: 'online'
            });
            
            showPage('chat');
        })
        .catch((error) => {
            alert('Signup Error: ' + error.message);
        });
}

function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    auth.signInWithEmailAndPassword(email, password)
        .then(() => {
            showPage('chat');
        })
        .catch((error) => {
            alert('Login Error: ' + error.message);
        });
}

function handleLogout() {
    auth.signOut()
        .then(() => {
            currentUser = null;
            currentChatId = null;
            showPage('landing');
        })
        .catch((error) => {
            alert('Logout Error: ' + error.message);
        });
}

// Load User Data
function loadUserData() {
    // Load user's direct messages
    database.ref('chats/dm/' + currentUser.uid).on('value', (snapshot) => {
        const dms = snapshot.val() || {};
        displayDirectMessages(dms);
    });

    // Load user's study groups
    database.ref('chats/groups/' + currentUser.uid).on('value', (snapshot) => {
        const groups = snapshot.val() || {};
        displayStudyGroups(groups);
    });
}

// Display Direct Messages
function displayDirectMessages(dms) {
    const dmList = document.getElementById('dmList');
    
    if (Object.keys(dms).length === 0) {
        dmList.innerHTML = '<p class="empty-state">No chats yet</p>';
        return;
    }
    
    dmList.innerHTML = '';
    
    Object.keys(dms).forEach(userId => {
        const dmInfo = dms[userId];
        
        // Fetch user details
        database.ref('users/' + userId).once('value', (snapshot) => {
            const userData = snapshot.val();
            
            const dmElement = document.createElement('div');
            dmElement.className = 'chat-item';
            dmElement.onclick = () => selectChat(userId, 'dm');
            
            dmElement.innerHTML = `
                <div class="chat-avatar">${userData.avatar}</div>
                <div class="chat-item-info">
                    <div class="chat-item-name">${userData.name}</div>
                    <div class="chat-item-preview">${dmInfo.lastMessage || 'No messages'}</div>
                </div>
            `;
            
            dmList.appendChild(dmElement);
        });
    });
}

// Display Study Groups
function displayStudyGroups(groups) {
    const groupList = document.getElementById('groupList');
    
    if (Object.keys(groups).length === 0) {
        groupList.innerHTML = '<p class="empty-state">No groups yet</p>';
        return;
    }
    
    groupList.innerHTML = '';
    
    Object.keys(groups).forEach(groupId => {
        const groupInfo = groups[groupId];
        
        const groupElement = document.createElement('div');
        groupElement.className = 'chat-item';
        groupElement.onclick = () => selectChat(groupId, 'group');
        
        groupElement.innerHTML = `
            <div class="chat-avatar">📚</div>
            <div class="chat-item-info">
                <div class="chat-item-name">${groupInfo.name}</div>
                <div class="chat-item-preview">${groupInfo.members ? Object.keys(groupInfo.members).length : 0} members</div>
            </div>
        `;
        
        groupList.appendChild(groupElement);
    });
}

// Select Chat
function selectChat(chatId, type) {
    currentChatId = chatId;
    currentChatType = type;
    
    // Update UI
    document.querySelectorAll('.chat-item').forEach(item => {
        item.classList.remove('active');
    });
    event.target.closest('.chat-item').classList.add('active');
    
    // Load chat messages
    loadMessages();
    
    // Update chat header
    if (type === 'dm') {
        database.ref('users/' + chatId).once('value', (snapshot) => {
            const userData = snapshot.val();
            document.getElementById('chatName').textContent = userData.name;
            document.getElementById('chatStatus').textContent = userData.onlineStatus === 'online' ? '● Online' : '● Offline';
        });
    } else {
        database.ref('chats/groups/' + currentUser.uid + '/' + chatId).once('value', (snapshot) => {
            const groupData = snapshot.val();
            document.getElementById('chatName').textContent = groupData.name;
        });
    }
}

// Load Messages
function loadMessages() {
    const messagesContainer = document.getElementById('messagesContainer');
    messagesContainer.innerHTML = '';
    
    const path = currentChatType === 'dm' 
        ? `messages/dm/${currentUser.uid}/${currentChatId}`
        : `messages/group/${currentChatId}`;
    
    database.ref(path).on('child_added', (snapshot) => {
        const message = snapshot.val();
        displayMessage(message);
    });
}

// Display Message
function displayMessage(message) {
    const messagesContainer = document.getElementById('messagesContainer');
    
    const messageElement = document.createElement('div');
    messageElement.className = `message ${message.senderId === currentUser.uid ? 'sent' : 'received'}`;
    
    const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    messageElement.innerHTML = `
        <div class="message-content">${escapeHtml(message.text)}</div>
        <div class="message-time">${time}</div>
    `;
    
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Send Message
function sendMessage() {
    if (!currentChatId) {
        alert('Please select a chat first');
        return;
    }
    
    const messageInput = document.getElementById('messageInput');
    const text = messageInput.value.trim();
    
    if (!text) return;
    
    const message = {
        senderId: currentUser.uid,
        text: text,
        timestamp: new Date().toISOString()
    };
    
    const path = currentChatType === 'dm'
        ? `messages/dm/${currentUser.uid}/${currentChatId}`
        : `messages/group/${currentChatId}`;
    
    database.ref(path).push(message);
    
    messageInput.value = '';
}

// Handle Key Press
function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

// Create Study Group
function showCreateGroup() {
    const groupName = prompt('Enter group name:');
    if (!groupName) return;
    
    const groupId = database.ref('chats/groups').push().key;
    
    const groupData = {
        id: groupId,
        name: groupName,
        createdBy: currentUser.uid,
        createdAt: new Date().toISOString(),
        members: {
            [currentUser.uid]: true
        }
    };
    
    database.ref('chats/groups/' + currentUser.uid + '/' + groupId).set(groupData);
    
    alert('Group created! Share the group ID to invite others.');
}

// Search Students
function searchStudents() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    
    if (query.length < 2) return;
    
    database.ref('users').orderByChild('name').on('value', (snapshot) => {
        const results = snapshot.val() || {};
        
        const filteredUsers = Object.values(results).filter(user => 
            user.name.toLowerCase().includes(query) && user.uid !== currentUser.uid
        );
        
        displaySearchResults(filteredUsers);
    });
}

// Display Search Results
function displaySearchResults(users) {
    console.log('Search results:', users);
    // Could show results in a modal or sidebar
}

// Show Profile
function showProfile() {
    alert('Profile feature coming soon!');
}

// Utility Function
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}