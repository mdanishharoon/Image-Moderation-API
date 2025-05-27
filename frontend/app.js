const API_URL = 'https://image-moderation-api.onrender.com' | 'http://localhost:7000';
let currentToken = localStorage.getItem('token');
let adminToken = null;

// Tab switching functionality
function switchTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab content
    document.getElementById(tabName + '-tab').classList.add('active');
    
    // Add active class to clicked tab button
    event.target.classList.add('active');
}

// Image preview on file selection
function setupImagePreview() {
    const fileInput = document.getElementById('imageInput');
    fileInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            showImagePreview(file);
        }
    });
}

function showImagePreview(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('imagePreview').innerHTML =
            `<img src="${e.target.result}" alt="Selected Image" />`;
    };
    reader.readAsDataURL(file);
}

// Image Moderation Functions (existing)
function setToken() {
    const tokenInput = document.getElementById('tokenInput');
    const token = tokenInput.value.trim();
    
    if (!token) {
        showTokenStatus('Please enter a token', false);
        return;
    }

    currentToken = token;
    localStorage.setItem('token', token);
    showTokenStatus('Token set successfully!', true);
}

function showTokenStatus(message, isSuccess) {
    const statusDiv = document.getElementById('tokenStatus');
    statusDiv.textContent = message;
    statusDiv.className = isSuccess ? 'success' : 'error';
}

function showLoadingIndicator(elementId, message = 'Loading...') {
    const element = document.getElementById(elementId);
    element.innerHTML = `
        <div class="loading">
            <div class="loading-spinner"></div>
            <span>${message}</span>
        </div>
    `;
}

async function uploadImage() {
    if (!currentToken) {
        showTokenStatus('Please set a token first', false);
        return;
    }

    const fileInput = document.getElementById('imageInput');
    const file = fileInput.files[0];

    if (!file) {
        showResult('Please select an image file', false);
        return;
    }

    // Show loading indicator
    showLoadingIndicator('result', 'Analyzing image for content safety...');
    
    // Disable the button during upload
    const uploadButton = document.querySelector('button[onclick="uploadImage()"]');
    uploadButton.disabled = true;
    uploadButton.textContent = 'Analyzing...';

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(`${API_URL}/moderate`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentToken}`
            },
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        displayResult(result);
    } catch (error) {
        console.error('Upload error:', error);
        showResult(`Error: ${error.message}`, false);
    } finally {
        // Re-enable the button
        uploadButton.disabled = false;
        uploadButton.textContent = 'Moderate Image';
    }
}

// Admin Functions
async function authenticateAdmin() {
    const tokenInput = document.getElementById('adminTokenInput');
    const token = tokenInput.value.trim();
    
    if (!token) {
        showAdminAuthStatus('Please enter an admin token', 'error');
        return;
    }

    // Show loading
    showAdminAuthStatus('Authenticating...', 'loading');
    
    const authButton = document.querySelector('button[onclick="authenticateAdmin()"]');
    authButton.disabled = true;

    try {
        // Test the token by trying to list tokens
        const response = await fetch(`${API_URL}/auth/tokens`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            adminToken = token;
            showAdminAuthStatus('Admin authentication successful!', 'success');
            document.getElementById('adminControls').style.display = 'block';
            loadTokens(); // Automatically load tokens after successful auth
        } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Authentication failed');
        }
    } catch (error) {
        showAdminAuthStatus(`Authentication failed: ${error.message}`, 'error');
        document.getElementById('adminControls').style.display = 'none';
    } finally {
        authButton.disabled = false;
    }
}

async function createToken() {
    if (!adminToken) {
        showCreateTokenResult('Please authenticate as admin first', 'error');
        return;
    }

    const isAdmin = document.getElementById('isAdminToken').checked;
    const createButton = document.querySelector('button[onclick="createToken()"]');
    
    // Show loading
    showCreateTokenResult('Creating token...', 'loading');
    createButton.disabled = true;

    try {
        const response = await fetch(`${API_URL}/auth/tokens`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                is_admin: isAdmin
            })
        });

        if (response.ok) {
            const result = await response.json();
            showCreateTokenResult(
                `Token created successfully! Token: ${result.token}`, 
                'success'
            );
            document.getElementById('isAdminToken').checked = false;
            loadTokens(); // Refresh the token list
        } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to create token');
        }
    } catch (error) {
        showCreateTokenResult(`Error creating token: ${error.message}`, 'error');
    } finally {
        createButton.disabled = false;
    }
}

async function loadTokens() {
    if (!adminToken) {
        return;
    }

    // Show loading in token list
    document.getElementById('tokenList').innerHTML = 
        '<div class="loading"><div class="loading-spinner"></div><span>Loading tokens...</span></div>';

    try {
        const response = await fetch(`${API_URL}/auth/tokens`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });

        if (response.ok) {
            const tokens = await response.json();
            displayTokenList(tokens);
        } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to load tokens');
        }
    } catch (error) {
        document.getElementById('tokenList').innerHTML = 
            `<div class="error">Error loading tokens: ${error.message}</div>`;
    }
}

async function deleteToken(token) {
    if (!adminToken) {
        return;
    }

    if (!confirm('Are you sure you want to delete this token?')) {
        return;
    }

    // Find the delete button and disable it
    const deleteButtons = document.querySelectorAll('.delete-btn');
    deleteButtons.forEach(btn => {
        if (btn.onclick && btn.onclick.toString().includes(token)) {
            btn.disabled = true;
            btn.textContent = 'Deleting...';
        }
    });

    try {
        const response = await fetch(`${API_URL}/auth/tokens/${token}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });

        if (response.ok) {
            loadTokens(); // Refresh the token list
        } else {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to delete token');
        }
    } catch (error) {
        alert(`Error deleting token: ${error.message}`);
        // Re-enable buttons on error
        deleteButtons.forEach(btn => {
            btn.disabled = false;
            btn.textContent = 'Delete';
        });
    }
}

function displayTokenList(tokens) {
    const tokenListDiv = document.getElementById('tokenList');
    
    if (tokens.length === 0) {
        tokenListDiv.innerHTML = '<div class="warning">No tokens found</div>';
        return;
    }

    const tokenHTML = tokens.map(token => {
        const createdDate = new Date(token.created_at).toLocaleString();
        return `
            <div class="token-item">
                <div class="token-header">
                    <span class="token-type ${token.is_admin ? 'admin' : 'user'}">
                        ${token.is_admin ? 'Admin' : 'User'}
                    </span>
                    <button class="delete-btn" onclick="deleteToken('${token.token}')">
                        Delete
                    </button>
                </div>
                <div class="token-value">${token.token}</div>
                <div class="token-created">Created: ${createdDate}</div>
            </div>
        `;
    }).join('');

    tokenListDiv.innerHTML = tokenHTML;
}

function showAdminAuthStatus(message, type) {
    const statusDiv = document.getElementById('adminAuthStatus');
    if (type === 'loading') {
        statusDiv.innerHTML = `
            <div class="loading">
                <div class="loading-spinner"></div>
                <span>${message}</span>
            </div>
        `;
        statusDiv.className = '';
    } else {
        statusDiv.textContent = message;
        statusDiv.className = type;
    }
}

function showCreateTokenResult(message, type) {
    const resultDiv = document.getElementById('createTokenResult');
    if (type === 'loading') {
        resultDiv.innerHTML = `
            <div class="loading">
                <div class="loading-spinner"></div>
                <span>${message}</span>
            </div>
        `;
        resultDiv.className = '';
    } else {
        resultDiv.textContent = message;
        resultDiv.className = type;
    }
}

// Existing helper functions
function getSeverityLabel(severity) {
    const labels = ['Safe', 'Low', 'Medium', 'High', 'Very High', 'Extreme', 'Critical'];
    return labels[severity] || 'Unknown';
}

function getSeverityColor(severity) {
    const colors = ['#10b981', '#10b981', '#f59e0b', '#f59e0b', '#f97316', '#ef4444', '#ef4444'];
    return colors[severity] || '#6b7280';
}

function displayResult(result) {
    const resultDiv = document.getElementById('result');
    const categories = Object.entries(result.categories)
        .map(([category, severity]) => {
            const label = getSeverityLabel(severity);
            const color = getSeverityColor(severity);
            return `
                <div class="category-item">
                    <span class="category-name">${category}:</span>
                    <span class="severity" style="color: ${color}">${label} (${severity})</span>
                </div>
            `;
        })
        .join('');

    resultDiv.innerHTML = `
        <h3>Moderation Results</h3>
        <div class="overall-safety ${result.is_safe ? 'safe' : 'unsafe'}">
            <strong>Overall Safety:</strong> ${result.is_safe ? 'Safe' : 'Unsafe'}
        </div>
        <div class="confidence">
            <strong>Confidence:</strong> ${(result.confidence * 100).toFixed(1)}%
        </div>
        <div class="categories">
            <strong>Categories:</strong>
            ${categories}
        </div>
    `;
}

function showResult(message, isSuccess) {
    const resultDiv = document.getElementById('result');
    resultDiv.textContent = message;
    resultDiv.className = isSuccess ? 'success' : 'error';
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    setupImagePreview();
    
    // Check for existing token on page load
    if (currentToken) {
        document.getElementById('tokenInput').value = currentToken;
        showTokenStatus('Token loaded from storage', true);
    }
}); 
