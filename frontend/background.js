// // background.js (Simplified Demo Version for Firefox)

// function blobToDataURL(blob) {
//     // This helper function remains the same
//     return new Promise((resolve, reject) => {
//         const reader = new FileReader();
//         reader.onload = () => resolve(reader.result);
//         reader.onerror = () => reject(reader.error);
//         reader.readAsDataURL(blob);
//     });
// }

// // The onMessage listener becomes an async function
// browser.runtime.onMessage.addListener(async (message, sender) => {
//     // *** CHANGE 1: We listen for a new, simpler action name ***
//     if (message.action === "fetchDemoResume") {
//         console.log("BACKGROUND: Received request for demo resume.");
        
//         // *** CHANGE 2: The URL is now a static, hardcoded path ***
//         const resumeUrl = "https://x.lynda.com/resume/Resume-1.pdf";

//         try {
//             // *** CHANGE 3: The logic is now just one fetch call ***
//             const response = await fetch(resumeUrl);
//             if (!response.ok) {
//                 // Check if the server is reachable but the file is not found (404)
//                 if (response.status === 404) {
//                      throw new Error(`File not found at ${resumeUrl} (404)`);
//                 }
//                 throw new Error(`Server error fetching resume: ${response.status}`);
//             }
            
//             console.log("BACKGROUND: Demo resume fetched successfully.");

//             const blob = await response.blob();
//             const dataUrl = await blobToDataURL(blob);
            
//             await browser.storage.local.set({ pendingResumeUrl: dataUrl });
//             console.log("BACKGROUND: Demo resume saved to local storage.");

//             browser.notifications.create({
//                 type: 'basic',
//                 iconUrl: 'icon.png',
//                 title: 'Demo Resume Ready!',
//                 message: 'The demo resume is ready for the upload step.'
//             });

//             return { success: true, message: "Demo resume saved to local storage." };

//         } catch (error) {
//             // This will catch fetch errors (like server down) and the errors we throw
//             console.error("BACKGROUND: Error in process:", error);
//             return { success: false, error: error.message };
//         }
//     }
// });

// function blobToDataURL(blob) {
//     // This helper function remains the same
//     return new Promise((resolve, reject) => {
//         const reader = new FileReader();
//         reader.onload = () => resolve(reader.result);
//         reader.onerror = () => reject(reader.error);
//         reader.readAsDataURL(blob);
//     });
// }

// // The onMessage listener becomes an async function
// browser.runtime.onMessage.addListener(async (message, sender) => {
//     // *** REVERT 1: Listen for the original action name ***
//     if (message.action === "generateAndFetchResume") {
//         console.log("BACKGROUND: Received job description. Starting generation process.");
        
//         // Make sure this is your correct server IP address
//         const localServerUrl = "https://x.lynda.com";

//         try {
//             // *** REVERT 2: Re-implement the two-step fetch logic ***

//             // Step 1: POST the job description to your server to trigger generation
//             // Make sure the '/generate-resume' endpoint matches your server's API
//             let generateResponse = await fetch(`${localServerUrl}/generate`, {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                 },
//                 // Use the jobDescription from the message
//                 body: JSON.stringify({ jobDescription: message.jobDescription }),
//             });

//             if (!generateResponse.ok) {
//                 throw new Error(`Server couldn't generate resume. Status: ${generateResponse.status}`);
//             }
            
//             console.log("BACKGROUND: Generation complete. Fetching the new resume.");
            
//             // Step 2: GET the newly created resume from your server
//             // Make sure the '/get-latest-resume' endpoint matches your server's API
//             // let resumeResponse = await fetch(`${localServerUrl}/get-latest-resume`);

//             // if (!resumeResponse.ok) {
//             //     throw new Error(`Server couldn't provide the new resume. Status: ${resumeResponse.status}`);
//             // }

//             console.log("BACKGROUND: Tailored resume fetched successfully.");

//             const blob = await generateResponse.blob();
//             const dataUrl = await blobToDataURL(blob);
            
//             await browser.storage.local.set({ pendingResumeUrl: dataUrl });
//             console.log("BACKGROUND: Tailored resume saved to local storage.");

//             browser.notifications.create({
//                 type: 'basic',
//                 iconUrl: 'icon.png',
//                 title: 'Resume Ready!',
//                 message: 'Your tailored resume is ready for the upload step.'
//             });

//             return { success: true, message: "Resume saved to local storage." };

//         } catch (error) {
//             console.error("BACKGROUND: Error in process:", error);
//             return { success: false, error: error.message };
//         }
//     }
// });

function blobToDataURL(blob) {
    // This helper function remains the same
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
    });
}

// --- Context Menu Setup ---
browser.runtime.onInstalled.addListener(() => {
    browser.contextMenus.create({
        id: "create-resume-from-text",
        title: "Create Resume from Selected Text",
        contexts: ["selection"] // This makes it appear only when text is selected
    });
});

// --- Context Menu Click Handler ---
browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === "create-resume-from-text" && info.selectionText) {
        console.log("BACKGROUND: 'Create Resume' context menu clicked.");
        
        const jobDescription = info.selectionText;
        const localServerUrl = "https://x.lynda.com"; // Ensure this is your correct server URL

        // Create a dynamic filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const resumeFilename = `resume-${timestamp}.pdf`;

        try {
            console.log("BACKGROUND: Sending selected text to server for resume generation.");
            let generateResponse = await fetch(`${localServerUrl}/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jobDescription: jobDescription }),
            });

            if (!generateResponse.ok) {
                throw new Error(`Server couldn't generate resume. Status: ${generateResponse.status}`);
            }
            
            console.log("BACKGROUND: Resume generated successfully. Preparing for download.");
            const blob = await generateResponse.blob();

            // Use the Downloads API to save the file
            const downloadUrl = URL.createObjectURL(blob);

            browser.downloads.download({
                url: downloadUrl,
                filename: resumeFilename,
                saveAs: true // Set to false if you want it to download automatically to the default folder
            }).then((downloadId) => {
                console.log(`BACKGROUND: Download started with ID: ${downloadId}`);
                // Revoke the object URL after a short delay to ensure the download has time to start
                setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
            }).catch((error) => {
                console.error("BACKGROUND: Download failed:", error);
                URL.revokeObjectURL(downloadUrl); // Clean up the object URL on failure
            });

            browser.notifications.create({
                type: 'basic',
                iconUrl: 'icon.png',
                title: 'Resume Download Started!',
                message: `Your resume "${resumeFilename}" is being downloaded.`
            });

        } catch (error) {
            console.error("BACKGROUND: Error in resume generation or download process:", error);
            browser.notifications.create({
                type: 'basic',
                iconUrl: 'icon.png',
                title: 'Error!',
                message: 'Failed to generate the resume. See the console for details.'
            });
        }
    }
});


// The onMessage listener becomes an async function
browser.runtime.onMessage.addListener(async (message, sender) => {
    if (message.action === "generateAndFetchResume") {
        console.log("BACKGROUND: Received job description. Starting generation process.");
        
        const localServerUrl = "https://webextension.sauravraj.dev";

        try {
            // ... (The fetch logic stays exactly the same)
            let generateResponse = await fetch(`${localServerUrl}/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jobDescription: message.jobDescription }),
            });

            if (!generateResponse.ok) {
                throw new Error(`Server couldn't generate resume. Status: ${generateResponse.status}`);
            }
            
            console.log("BACKGROUND: Tailored resume fetched successfully.");

            const blob = await generateResponse.blob();
            const dataUrl = await blobToDataURL(blob);
            
            // *** MODIFIED STORAGE LOGIC ***
            // Store both the URL and the filename received from the content script
            await browser.storage.local.set({ 
                pendingResume: {
                    url: dataUrl,
                    filename: message.resumeFilename // Use the filename from the message
                }
            });
            console.log("BACKGROUND: Tailored resume and filename saved to local storage.");
            // *** END MODIFICATION ***

            browser.notifications.create({
                type: 'basic',
                iconUrl: 'icon.png',
                title: 'Resume Ready!',
                message: `Your resume "${message.resumeFilename}" is ready for the upload step.`
            });

            return { success: true, message: "Resume saved to local storage." };

        } catch (error) {
            console.error("BACKGROUND: Error in process:", error);
            return { success: false, error: error.message };
        }
    }
});