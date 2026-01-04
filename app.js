// Password Manager Application
// State Management
let passwords = [];
let currentCategory = 'all';
let currentPasswordId = null;
let isLoggedIn = false;
let currentUser = null;
let isRegisterMode = false;

// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const mainApp = document.getElementById('mainApp');
const loginForm = document.getElementById('loginForm');
const passwordGrid = document.getElementById('passwordGrid');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const categoryTitle = document.getElementById('categoryTitle');

// Modal Elements
const passwordModal = document.getElementById('passwordModal');
const generatorModal = document.getElementById('generatorModal');
const passwordForm = document.getElementById('passwordForm');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    checkAutoLogin();
});

// Simple hash function for password (in production, use bcrypt or similar)
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString(36);
}

// User Management
function getUsers() {
    const users = localStorage.getItem('vaultUsers');
    return users ? JSON.parse(users) : [];
}

function saveUsers(users) {
    localStorage.setItem('vaultUsers', JSON.stringify(users));
}

function getUserByEmail(email) {
    const users = getUsers();
    return users.find(u => u.email.toLowerCase() === email.toLowerCase());
}

function createUser(name, email, password) {
    const users = getUsers();

    // Check if email already exists
    if (getUserByEmail(email)) {
        return { success: false, error: 'This email is already registered. Please login instead.' };
    }

    const newUser = {
        id: Date.now(),
        name: name,
        email: email.toLowerCase(),
        passwordHash: simpleHash(password),
        createdAt: new Date().toISOString()
    };

    users.push(newUser);
    saveUsers(users);

    return { success: true, user: newUser };
}

function validateLogin(email, password) {
    const user = getUserByEmail(email);

    if (!user) {
        return { success: false, error: 'No vault found with this email. Please create a new vault.' };
    }

    const passwordHash = simpleHash(password);
    if (user.passwordHash !== passwordHash) {
        return { success: false, error: 'Incorrect password. Please try again.' };
    }

    return { success: true, user: user };
}

// Check for auto-login
function checkAutoLogin() {
    const savedSession = localStorage.getItem('currentSession');
    if (savedSession) {
        const session = JSON.parse(savedSession);
        const user = getUserByEmail(session.email);
        if (user && user.id === session.userId) {
            currentUser = user;
            login();
        }
    }
}

// Event Listeners Setup
function setupEventListeners() {
    // Login/Register Form
    loginForm.addEventListener('submit', handleAuth);
    document.getElementById('toggleAuthMode').addEventListener('click', toggleAuthMode);
    document.getElementById('lockVaultBtn').addEventListener('click', logout);

    // Mobile Menu
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileOverlay = document.getElementById('mobileOverlay');
    const sidebar = document.querySelector('.sidebar');

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('mobile-open');
            mobileOverlay.classList.toggle('active');
        });
    }

    if (mobileOverlay) {
        mobileOverlay.addEventListener('click', () => {
            sidebar.classList.remove('mobile-open');
            mobileOverlay.classList.remove('active');
        });
    }

    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const category = e.currentTarget.dataset.category;
            filterByCategory(category);
            // Close mobile menu after selection
            sidebar.classList.remove('mobile-open');
            mobileOverlay.classList.remove('active');
        });
    });

    // Search
    searchInput.addEventListener('input', handleSearch);

    // Add New Password
    document.getElementById('addNewBtn').addEventListener('click', openAddModal);

    // Password Form
    passwordForm.addEventListener('submit', handlePasswordSubmit);
    document.getElementById('cancelBtn').addEventListener('click', closePasswordModal);
    document.getElementById('deleteBtn').addEventListener('click', handleDelete);
    document.getElementById('closeModalBtn').addEventListener('click', closePasswordModal);

    // Password Input Controls
    document.getElementById('togglePasswordBtn').addEventListener('click', togglePasswordVisibility);
    document.getElementById('openGeneratorBtn').addEventListener('click', openGeneratorModal);
    document.getElementById('password').addEventListener('input', updatePasswordStrength);

    // Password Generator
    document.getElementById('generateBtn').addEventListener('click', generatePassword);
    document.getElementById('copyGeneratedBtn').addEventListener('click', copyGeneratedPassword);
    document.getElementById('usePasswordBtn').addEventListener('click', useGeneratedPassword);
    document.getElementById('closeGeneratorBtn').addEventListener('click', closeGeneratorModal);
    document.getElementById('passwordLength').addEventListener('input', updateLengthDisplay);

    // Close modals on backdrop click
    passwordModal.addEventListener('click', (e) => {
        if (e.target === passwordModal) closePasswordModal();
    });
    generatorModal.addEventListener('click', (e) => {
        if (e.target === generatorModal) closeGeneratorModal();
    });
}

// Toggle between Login and Register modes
function toggleAuthMode() {
    isRegisterMode = !isRegisterMode;

    const nameGroup = document.getElementById('nameGroup');
    const confirmPasswordGroup = document.getElementById('confirmPasswordGroup');
    const loginSubtitle = document.getElementById('loginSubtitle');
    const submitBtnText = document.getElementById('submitBtnText');
    const toggleText = document.getElementById('toggleText');
    const errorMessage = document.getElementById('errorMessage');
    const userName = document.getElementById('userName');
    const confirmPassword = document.getElementById('confirmPassword');

    // Hide error message
    errorMessage.style.display = 'none';

    if (isRegisterMode) {
        // Switch to Register mode
        nameGroup.style.display = 'block';
        confirmPasswordGroup.style.display = 'block';
        userName.required = true;
        confirmPassword.required = true;
        loginSubtitle.textContent = 'Create a new vault to securely store your passwords';
        submitBtnText.textContent = 'Create Vault';
        toggleText.innerHTML = 'Already have a vault? <button type="button" id="toggleAuthMode" class="link-btn">Login Here</button>';
    } else {
        // Switch to Login mode
        nameGroup.style.display = 'none';
        confirmPasswordGroup.style.display = 'none';
        userName.required = false;
        confirmPassword.required = false;
        loginSubtitle.textContent = 'Enter your master password to unlock your vault';
        submitBtnText.textContent = 'Unlock Vault';
        toggleText.innerHTML = 'Don\'t have a vault? <button type="button" id="toggleAuthMode" class="link-btn">Create New Vault</button>';
    }

    // Re-attach event listener to new button
    document.getElementById('toggleAuthMode').addEventListener('click', toggleAuthMode);

    // Clear form
    loginForm.reset();
}

// Handle Authentication (Login or Register)
function handleAuth(e) {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('masterPassword').value;
    const errorMessage = document.getElementById('errorMessage');

    // Hide previous errors
    errorMessage.style.display = 'none';

    if (isRegisterMode) {
        // Registration
        const name = document.getElementById('userName').value.trim();
        const confirmPassword = document.getElementById('confirmPassword').value;

        // Validation
        if (!name) {
            showError('Please enter your name');
            return;
        }

        if (password.length < 6) {
            showError('Password must be at least 6 characters long');
            return;
        }

        if (password !== confirmPassword) {
            showError('Passwords do not match');
            return;
        }

        // Create new user
        const result = createUser(name, email, password);

        if (!result.success) {
            showError(result.error);
            return;
        }

        // Auto-login after registration
        currentUser = result.user;
        showToast('Vault created successfully! Welcome, ' + name, 'success');
        login();

    } else {
        // Login
        const result = validateLogin(email, password);

        if (!result.success) {
            showError(result.error);
            return;
        }

        currentUser = result.user;
        showToast('Welcome back, ' + result.user.name + '!', 'success');
        login();
    }
}

function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
}

// Authentication
function login() {
    isLoggedIn = true;

    // Save session
    localStorage.setItem('currentSession', JSON.stringify({
        userId: currentUser.id,
        email: currentUser.email
    }));

    // Load user's passwords
    loadPasswords();

    loginScreen.style.display = 'none';
    mainApp.style.display = 'flex';
    renderPasswords();
    updateCategoryCounts();
}

function logout() {
    if (confirm('Are you sure you want to lock your vault?')) {
        isLoggedIn = false;
        currentUser = null;
        passwords = [];

        // Clear session
        localStorage.removeItem('currentSession');

        mainApp.style.display = 'none';
        loginScreen.style.display = 'flex';
        loginForm.reset();

        // Reset to login mode
        if (isRegisterMode) {
            toggleAuthMode();
        }

        document.getElementById('errorMessage').style.display = 'none';
    }
}

// Password Management (User-specific)
function loadPasswords() {
    if (!currentUser) {
        passwords = [];
        return;
    }

    const storageKey = `passwords_${currentUser.id}`;
    const saved = localStorage.getItem(storageKey);

    if (saved) {
        passwords = JSON.parse(saved);
    } else {
        // Initialize with demo data for new users
        passwords = [
            {
                id: Date.now() + 1,
                website: 'https://google.com',
                accountName: 'Google.com',
                username: 'user@google.com',
                password: 'SecurePass123!',
                category: 'work',
                notes: '',
                favorite: false,
                icon: '🌐'
            },
            {
                id: Date.now() + 2,
                website: 'https://facebook.com',
                accountName: 'Facebook',
                username: '@facebook',
                password: 'MyPass456!',
                category: 'social',
                notes: '',
                favorite: false,
                icon: '📘'
            },
            {
                id: Date.now() + 3,
                website: 'https://twitter.com',
                accountName: 'Twitter',
                username: '@twitter',
                password: 'Tweet789!',
                category: 'social',
                notes: '',
                favorite: false,
                icon: '🐦'
            }
        ];
        savePasswords();
    }
}

function savePasswords() {
    if (!currentUser) return;

    const storageKey = `passwords_${currentUser.id}`;
    localStorage.setItem(storageKey, JSON.stringify(passwords));
}

function renderPasswords() {
    const filtered = getFilteredPasswords();

    if (filtered.length === 0) {
        passwordGrid.style.display = 'none';
        emptyState.style.display = 'flex';
        return;
    }

    passwordGrid.style.display = 'grid';
    emptyState.style.display = 'none';

    passwordGrid.innerHTML = filtered.map(pwd => `
        <div class="password-card" onclick="openEditModal(${pwd.id})">
            <div class="card-header">
                <div class="card-icon">${pwd.icon || '🔐'}</div>
                <div class="card-info">
                    <h3>${escapeHtml(pwd.accountName)}</h3>
                    <p>${escapeHtml(pwd.username)}</p>
                </div>
            </div>
            <div class="card-details">
                <div class="detail-row">
                    <span>Password</span>
                    <span>••••••••</span>
                </div>
            </div>
            <div class="card-actions">
                <button class="btn-icon" onclick="event.stopPropagation(); copyToClipboard('${escapeHtml(pwd.password)}', 'Password')" title="Copy password">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/>
                        <path d="M5 15H4C3.46957 15 2.96086 14.7893 2.58579 14.4142C2.21071 14.0391 2 13.5304 2 13V4C2 3.46957 2.21071 2.96086 2.58579 2.58579C2.96086 2.21071 3.46957 2 4 2H13C13.5304 2 14.0391 2.21071 14.4142 2.58579C14.7893 2.96086 15 3.46957 15 4V5" stroke="currentColor" stroke-width="2"/>
                    </svg>
                </button>
                <button class="btn-icon favorite-btn ${pwd.favorite ? 'active' : ''}" onclick="event.stopPropagation(); toggleFavorite(${pwd.id})" title="Toggle favorite">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="${pwd.favorite ? 'currentColor' : 'none'}" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" stroke-width="2"/>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');
}

function getFilteredPasswords() {
    let filtered = passwords;

    // Filter by category
    if (currentCategory === 'favorites') {
        filtered = filtered.filter(p => p.favorite);
    } else if (currentCategory !== 'all') {
        filtered = filtered.filter(p => p.category === currentCategory);
    }

    // Filter by search
    const searchTerm = searchInput.value.toLowerCase();
    if (searchTerm) {
        filtered = filtered.filter(p =>
            p.accountName.toLowerCase().includes(searchTerm) ||
            p.username.toLowerCase().includes(searchTerm) ||
            p.website.toLowerCase().includes(searchTerm)
        );
    }

    return filtered;
}

function filterByCategory(category) {
    currentCategory = category;

    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.category === category) {
            item.classList.add('active');
        }
    });

    // Update title
    const titles = {
        all: 'All Items',
        favorites: 'Favorites',
        banking: 'Banking',
        social: 'Social Media',
        work: 'Work'
    };
    categoryTitle.textContent = titles[category] || 'All Items';

    renderPasswords();
}

function handleSearch() {
    renderPasswords();
}

function updateCategoryCounts() {
    document.getElementById('allCount').textContent = passwords.length;
    document.getElementById('favCount').textContent = passwords.filter(p => p.favorite).length;
    document.getElementById('bankingCount').textContent = passwords.filter(p => p.category === 'banking').length;
    document.getElementById('socialCount').textContent = passwords.filter(p => p.category === 'social').length;
    document.getElementById('workCount').textContent = passwords.filter(p => p.category === 'work').length;
}

// Modal Management
function openAddModal() {
    currentPasswordId = null;
    document.getElementById('modalTitle').textContent = 'Add New Password';
    document.getElementById('deleteBtn').style.display = 'none';
    passwordForm.reset();
    document.getElementById('passwordId').value = '';
    updatePasswordStrength();
    passwordModal.classList.add('active');
}

function openEditModal(id) {
    currentPasswordId = id;
    const pwd = passwords.find(p => p.id === id);
    if (!pwd) return;

    document.getElementById('modalTitle').textContent = 'Edit Password';
    document.getElementById('deleteBtn').style.display = 'flex';

    document.getElementById('passwordId').value = pwd.id;
    document.getElementById('websiteUrl').value = pwd.website;
    document.getElementById('accountName').value = pwd.accountName;
    document.getElementById('username').value = pwd.username;
    document.getElementById('password').value = pwd.password;
    document.getElementById('category').value = pwd.category;
    document.getElementById('notes').value = pwd.notes || '';

    updatePasswordStrength();
    passwordModal.classList.add('active');
}

function closePasswordModal() {
    passwordModal.classList.remove('active');
    passwordForm.reset();
    currentPasswordId = null;
}

function handlePasswordSubmit(e) {
    e.preventDefault();

    const formData = {
        website: document.getElementById('websiteUrl').value,
        accountName: document.getElementById('accountName').value,
        username: document.getElementById('username').value,
        password: document.getElementById('password').value,
        category: document.getElementById('category').value,
        notes: document.getElementById('notes').value,
        icon: getIconForWebsite(document.getElementById('websiteUrl').value)
    };

    if (currentPasswordId) {
        // Update existing
        const index = passwords.findIndex(p => p.id === currentPasswordId);
        if (index !== -1) {
            passwords[index] = { ...passwords[index], ...formData };
            showToast('Password updated successfully', 'success');
        }
    } else {
        // Add new
        passwords.push({
            id: Date.now(),
            ...formData,
            favorite: false
        });
        showToast('Password added successfully', 'success');
    }

    savePasswords();
    renderPasswords();
    updateCategoryCounts();
    closePasswordModal();
}

function handleDelete() {
    if (!currentPasswordId) return;

    if (confirm('Are you sure you want to delete this password?')) {
        passwords = passwords.filter(p => p.id !== currentPasswordId);
        savePasswords();
        renderPasswords();
        updateCategoryCounts();
        closePasswordModal();
        showToast('Password deleted successfully', 'success');
    }
}

function toggleFavorite(id) {
    const pwd = passwords.find(p => p.id === id);
    if (pwd) {
        pwd.favorite = !pwd.favorite;
        savePasswords();
        renderPasswords();
        updateCategoryCounts();
    }
}

// Password Strength
function updatePasswordStrength() {
    const password = document.getElementById('password').value;
    const strength = calculatePasswordStrength(password);

    const progressBar = document.getElementById('strengthProgress');
    const strengthText = document.getElementById('strengthText');

    progressBar.style.width = strength.percentage + '%';
    progressBar.style.background = strength.color;
    strengthText.textContent = strength.label;
    strengthText.style.color = strength.color;
}

function calculatePasswordStrength(password) {
    if (!password) {
        return { percentage: 0, label: 'No password', color: '#718096' };
    }

    let score = 0;

    // Length
    if (password.length >= 8) score += 20;
    if (password.length >= 12) score += 20;
    if (password.length >= 16) score += 10;

    // Character types
    if (/[a-z]/.test(password)) score += 15;
    if (/[A-Z]/.test(password)) score += 15;
    if (/[0-9]/.test(password)) score += 10;
    if (/[^a-zA-Z0-9]/.test(password)) score += 10;

    if (score < 30) {
        return { percentage: score, label: 'Weak', color: '#ef4444' };
    } else if (score < 60) {
        return { percentage: score, label: 'Fair', color: '#f59e0b' };
    } else if (score < 80) {
        return { percentage: score, label: 'Good', color: '#3b82f6' };
    } else {
        return { percentage: score, label: 'Very Strong', color: '#10b981' };
    }
}

function togglePasswordVisibility() {
    const input = document.getElementById('password');
    const type = input.type === 'password' ? 'text' : 'password';
    input.type = type;
}

// Password Generator
function openGeneratorModal() {
    generatorModal.classList.add('active');
    generatePassword();
}

function closeGeneratorModal() {
    generatorModal.classList.remove('active');
}

function updateLengthDisplay() {
    const length = document.getElementById('passwordLength').value;
    document.getElementById('lengthValue').textContent = length;
}

function generatePassword() {
    const length = parseInt(document.getElementById('passwordLength').value);
    const includeUppercase = document.getElementById('includeUppercase').checked;
    const includeLowercase = document.getElementById('includeLowercase').checked;
    const includeNumbers = document.getElementById('includeNumbers').checked;
    const includeSymbols = document.getElementById('includeSymbols').checked;

    let charset = '';
    if (includeUppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (includeLowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
    if (includeNumbers) charset += '0123456789';
    if (includeSymbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';

    if (!charset) {
        showToast('Please select at least one character type', 'error');
        return;
    }

    let password = '';
    for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    document.getElementById('generatedPassword').value = password;
    updateGeneratorStrength(password);
}

function updateGeneratorStrength(password) {
    const strength = calculatePasswordStrength(password);

    const progressBar = document.getElementById('genStrengthProgress');
    const strengthText = document.getElementById('genStrengthText');

    progressBar.style.width = strength.percentage + '%';
    progressBar.style.background = strength.color;
    strengthText.textContent = strength.label;
    strengthText.style.color = strength.color;
}

function copyGeneratedPassword() {
    const password = document.getElementById('generatedPassword').value;
    copyToClipboard(password, 'Generated password');
}

function useGeneratedPassword() {
    const password = document.getElementById('generatedPassword').value;
    document.getElementById('password').value = password;
    updatePasswordStrength();
    closeGeneratorModal();
    showToast('Password applied', 'success');
}

// Utility Functions
function copyToClipboard(text, label = 'Text') {
    navigator.clipboard.writeText(text).then(() => {
        showToast(`${label} copied to clipboard`, 'success');
    }).catch(() => {
        showToast('Failed to copy', 'error');
    });
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            ${type === 'success'
            ? '<path d="M22 11.08V12C21.9988 14.1564 21.3005 16.2547 20.0093 17.9818C18.7182 19.7088 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.87979 13.4881 2.02168 11.3363C2.16356 9.18455 2.99721 7.13631 4.39828 5.49706C5.79935 3.85781 7.69279 2.71537 9.79619 2.24013C11.8996 1.7649 14.1003 1.98232 16.07 2.85999" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M22 4L12 14.01L9 11.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
            : '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 8V12M12 16H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'}
        </svg>
        <span>${escapeHtml(message)}</span>
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideInRight 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getIconForWebsite(url) {
    try {
        const domain = new URL(url).hostname.toLowerCase();

        const icons = {
            'google.com': '🌐',
            'facebook.com': '📘',
            'twitter.com': '🐦',
            'instagram.com': '📷',
            'linkedin.com': '💼',
            'github.com': '🐙',
            'youtube.com': '📺',
            'amazon.com': '🛒',
            'netflix.com': '🎬',
            'spotify.com': '🎵'
        };

        for (const [key, icon] of Object.entries(icons)) {
            if (domain.includes(key)) return icon;
        }

        return '🔐';
    } catch {
        return '🔐';
    }
}
