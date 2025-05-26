const API_URL = 'http://localhost:7000';
let currentToken = localStorage.getItem('token');

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

    // Show image preview
    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('imagePreview').innerHTML =
            `<img src="${e.target.result}" alt="Uploaded Image" style="max-width: 300px; max-height: 300px; margin-bottom: 1rem; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"/>`;
    };
    reader.readAsDataURL(file);

    console.log('Uploading file:', file.name, 'Size:', file.size, 'Type:', file.type);

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
    }
}

function getSeverityLabel(severity) {
    const labels = ['Safe', 'Low', 'Medium', 'High', 'Very High', 'Extreme', 'Critical'];
    return labels[severity] || 'Unknown';
}

function getSeverityColor(severity) {
    const colors = ['#28a745', '#28a745', '#ffc107', '#ffc107', '#fd7e14', '#dc3545', '#dc3545'];
    return colors[severity] || '#6c757d';
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

// Check for existing token on page load
if (currentToken) {
    document.getElementById('tokenInput').value = currentToken;
    showTokenStatus('Token loaded from storage', true);
} 