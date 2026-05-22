document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const browseBtn = document.getElementById('browse-btn');
    const uploadContent = document.querySelector('.upload-content');
    const previewContainer = document.getElementById('preview-container');
    const imagePreview = document.getElementById('image-preview');
    const removeBtn = document.getElementById('remove-btn');
    
    const processingSection = document.getElementById('processing-section');
    const progressBar = document.getElementById('progress-bar');
    
    const resultsSection = document.getElementById('results-section');
    const emailList = document.getElementById('email-list');
    const emailCount = document.getElementById('email-count');
    const emptyState = document.getElementById('empty-state');

    // Email Regex Pattern
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;

    // Event Listeners for Drag & Drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
    });

    dropZone.addEventListener('drop', handleDrop, false);

    // Browse Button Click
    browseBtn.addEventListener('click', () => {
        fileInput.click();
    });

    // File Input Change
    fileInput.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            handleFile(this.files[0]);
        }
    });

    // Remove Button Click
    removeBtn.addEventListener('click', () => {
        resetApp();
    });

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;

        if (files && files[0]) {
            if (files[0].type.startsWith('image/')) {
                handleFile(files[0]);
            } else {
                alert('Please upload an image file.');
            }
        }
    }

    function handleFile(file) {
        // Show Image Preview
        const reader = new FileReader();
        reader.onload = function(e) {
            imagePreview.src = e.target.result;
            uploadContent.classList.add('hidden');
            previewContainer.classList.remove('hidden');
            
            // Start Processing
            processImage(e.target.result);
        };
        reader.readAsDataURL(file);
    }

    async function processImage(imageData) {
        // Reset and Show Processing UI
        resultsSection.classList.add('hidden');
        processingSection.classList.remove('hidden');
        progressBar.style.width = '0%';

        try {
            // Run Tesseract v5
            const worker = await Tesseract.createWorker('eng', 1, {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        progressBar.style.width = `${Math.round(m.progress * 100)}%`;
                    } else {
                        // Keep progress bar moving slightly during initialization
                        progressBar.style.width = '10%';
                    }
                }
            });
            
            const { data: { text } } = await worker.recognize(imageData);
            await worker.terminate();

            // Extract Emails
            extractAndDisplayEmails(text);

        } catch (error) {
            console.error('Error processing image:', error);
            alert('An error occurred while processing the image. Please try again.');
            processingSection.classList.add('hidden');
        }
    }

    function extractAndDisplayEmails(text) {
        processingSection.classList.add('hidden');
        resultsSection.classList.remove('hidden');

        // Find emails using regex
        const foundEmails = text.match(emailRegex);
        
        // Remove duplicates and clean up
        const uniqueEmails = foundEmails 
            ? [...new Set(foundEmails.map(e => e.toLowerCase().trim()))] 
            : [];

        // Update UI
        emailList.innerHTML = '';
        
        if (uniqueEmails.length === 0) {
            emailCount.textContent = '0 found';
            emptyState.classList.remove('hidden');
        } else {
            emailCount.textContent = `${uniqueEmails.length} found`;
            emptyState.classList.add('hidden');
            
            uniqueEmails.forEach(email => {
                const emailItem = document.createElement('div');
                emailItem.className = 'email-item';
                
                emailItem.innerHTML = `
                    <span class="email-text">${email}</span>
                    <button class="btn btn-icon copy-btn" data-email="${email}" title="Copy to clipboard">
                        <i class="ph ph-copy"></i>
                    </button>
                `;
                
                emailList.appendChild(emailItem);
            });

            // Add copy listeners
            document.querySelectorAll('.copy-btn').forEach(btn => {
                btn.addEventListener('click', handleCopy);
            });
        }
    }

    async function handleCopy(e) {
        const btn = e.currentTarget;
        const email = btn.getAttribute('data-email');
        const icon = btn.querySelector('i');

        try {
            await navigator.clipboard.writeText(email);
            
            // Visual feedback
            btn.classList.add('success');
            icon.classList.replace('ph-copy', 'ph-check');
            
            setTimeout(() => {
                btn.classList.remove('success');
                icon.classList.replace('ph-check', 'ph-copy');
            }, 2000);
            
        } catch (err) {
            console.error('Failed to copy text: ', err);
            alert('Failed to copy to clipboard.');
        }
    }

    function resetApp() {
        fileInput.value = '';
        imagePreview.src = '';
        uploadContent.classList.remove('hidden');
        previewContainer.classList.add('hidden');
        processingSection.classList.add('hidden');
        resultsSection.classList.add('hidden');
        progressBar.style.width = '0%';
    }
});
