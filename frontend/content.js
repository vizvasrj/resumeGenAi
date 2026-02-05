// content.js (Fixed: Wide Screen Support & Robust Selectors)

// --- State Variables ---
let isGenerationInProgress = false;
let isUploadInProgress = false;

// --- Helper Functions ---
function dataURLtoFile(dataurl, filename) {
    let arr = dataurl.split(','),
        mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]),
        n = bstr.length,
        u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
}

// --- Styles ---
function injectLoaderCSS() {
    const styleId = 'resume-loader-style';
    if (document.getElementById(styleId)) return;
    const css = `
        .resume-loader-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(255, 255, 255, 0.9); z-index: 1000; display: flex; flex-direction: column; justify-content: center; align-items: center; border-radius: 8px; padding: 20px; text-align: center; }
        .resume-loader-spinner { border: 4px solid rgba(0, 0, 0, 0.1); width: 36px; height: 36px; border-radius: 50%; border-left-color: #0a66c2; animation: spin 1s ease infinite; }
        .resume-loader-text { margin-top: 15px; font-size: 1.1rem; color: #333; font-weight: 600; }
        .custom-gen-btn { margin: 12px 0; background-color: #057642; color: white; border: none; padding: 8px 16px; border-radius: 20px; font-weight: bold; cursor: pointer; transition: background 0.2s; display: block; width: 100%; text-align: center; }
        .custom-gen-btn:hover { background-color: #046236; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    `;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = css;
    document.head.appendChild(style);
}

function showLoadingScreen(targetContainer) {
    if (!targetContainer || document.getElementById('resume-loader')) return;
    if (getComputedStyle(targetContainer).position === 'static') {
        targetContainer.style.position = 'relative';
    }
    const loaderHTML = `<div id="resume-loader" class="resume-loader-overlay"><div class="resume-loader-spinner"></div><p class="resume-loader-text">Generating Your Tailored Resume...</p></div>`;
    targetContainer.insertAdjacentHTML('beforeend', loaderHTML);
}

function hideLoadingScreen() {
    const loader = document.getElementById('resume-loader');
    if (loader) loader.remove();
}

// --- [FIXED] Smart Layout Finder ---
function findResumeSectionContainer() {
    // Strategy 1: Look for the specific "Be sure to include..." element class
    // This class "jobs-document-upload__title--is-required" is present in your wide screen HTML
    const specificPrompt = document.querySelector('.jobs-document-upload__title--is-required');
    if (specificPrompt && specificPrompt.textContent.includes('resume')) {
        // Go up to the container that holds the header and the content
        // In your HTML: span -> div (full-width) -> div (Xiijho... / Container)
        return specificPrompt.closest('.full-width')?.parentElement || specificPrompt.parentElement?.parentElement;
    }

    // Strategy 2: Look for any H3 containing "Resume" (Relaxed check)
    // We removed .t-16 and .t-bold because those change on wide screens.
    const headers = Array.from(document.querySelectorAll('h3'));
    const resumeHeader = headers.find(el => el.textContent.trim().includes('Resume'));
    
    if (resumeHeader) {
        return resumeHeader.parentElement;
    }

    // Strategy 3: Fallback text search
    const spans = Array.from(document.querySelectorAll('span'));
    const textPrompt = spans.find(el => el.textContent.includes('Be sure to include an updated resume'));
    
    if (textPrompt) {
        return textPrompt.closest('.full-width')?.parentElement || textPrompt.parentElement?.parentElement;
    }

    return null;
}

// --- [FIXED] Button Injector ---
function injectGenerateButton(container) {
    if (container.querySelector('.custom-gen-btn')) return; 

    const btn = document.createElement('button');
    btn.className = 'custom-gen-btn';
    btn.innerText = '✨ Generate Tailored Resume';
    btn.type = 'button';
    
    btn.onclick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log("CONTENT: Manual Generate button clicked.");
        await handleApplyClick(); 
        if (isGenerationInProgress) showLoadingScreen(container);
    };

    // Try to find the header to place the button nicely under it
    // We use a generic 'h3' selector now to be safe
    const header = Array.from(container.querySelectorAll('h3')).find(el => el.textContent.includes('Resume'));
    
    if (header) {
        header.insertAdjacentElement('afterend', btn);
    } else {
        // If header not found (weird layout), just put it at the top
        container.insertBefore(btn, container.firstChild);
    }
}

// --- Core Logic ---
const jobDescriptionSelector = ".jobs-box__html-content, .jobs-description-content__text";
const jobTitleSelector = ".job-details-jobs-unified-top-card__job-title";
const fileInputSelector = "input.hidden[id^='jobs-document-upload-file-input-']";

async function simulateUpload(fileInput, file) {
    if (!fileInput || !file) return;
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    fileInput.files = dataTransfer.files;
    fileInput.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    fileInput.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
    fileInput.dispatchEvent(new Event('blur', { bubbles: true, cancelable: true }));
}

async function attemptUpload(fileInputElement) {
    if (isUploadInProgress) return;

    try {
        const result = await browser.storage.local.get('pendingResume');
        if (!result || !result.pendingResume) return;

        isUploadInProgress = true;
        console.log("CONTENT: Resume found. Uploading...");
        observer.disconnect(); 

        await browser.storage.local.remove('pendingResume');

        const resumeDataUrl = result.pendingResume.url;
        const resumeFilename = result.pendingResume.filename;
        const resumeFile = dataURLtoFile(resumeDataUrl, resumeFilename);
        
        await simulateUpload(fileInputElement, resumeFile);
        
        hideLoadingScreen();
        isGenerationInProgress = false;

    } catch (e) {
        console.error("Error during upload:", e);
        hideLoadingScreen();
        isGenerationInProgress = false;
    } finally {
        setTimeout(() => {
            isUploadInProgress = false;
            observer.observe(document.body, { childList: true, subtree: true });
        }, 1000);
    }
}

async function handleApplyClick() {
    if (isGenerationInProgress) return;
    
    const jdElement = document.querySelector(jobDescriptionSelector);
    const titleElement = document.querySelector(jobTitleSelector);
    
    if (!jdElement) {
        alert("Could not find Job Description. Please ensure the job details are loaded.");
        return;
    }

    isGenerationInProgress = true;
    const jobDescription = jdElement.textContent;
    const jobTitle = titleElement ? titleElement.textContent.trim() : "Resume";
    const resumeFilename = jobTitle.toLowerCase().replace(/[\s\W]+/g, '_') + ".pdf";

    try {
        const response = await browser.runtime.sendMessage({
            action: "generateAndFetchResume",
            jobDescription: jobDescription,
            resumeFilename: resumeFilename
        });
        if (!response?.success) {
            console.error("CONTENT: Background error:", response?.error);
            isGenerationInProgress = false;
            hideLoadingScreen();
        }
    } catch (e) {
         console.error("Error sending message:", e);
         isGenerationInProgress = false;
         hideLoadingScreen();
    }
}

// --- Listeners ---
browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.pendingResume?.newValue) {
        const fileInput = document.querySelector(fileInputSelector);
        if (fileInput) attemptUpload(fileInput);
    }
});

const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
        if (mutation.type !== 'childList') continue;

        const resumeContainer = findResumeSectionContainer();

        if (resumeContainer) {
            injectGenerateButton(resumeContainer);
            if (isGenerationInProgress) showLoadingScreen(resumeContainer);
        }
        
        const fileInput = document.querySelector(fileInputSelector);
        if (fileInput) attemptUpload(fileInput);
    }
});

observer.observe(document.body, { childList: true, subtree: true });

injectLoaderCSS();
console.log("CONTENT: Firefox extension active (Fixed Wide Screen Selectors).");