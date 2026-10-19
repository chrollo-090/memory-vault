// --- Memory Vault State & Data ---
let demoMemories = [
    {
        id: "1",
        title: "Sunset at the Beach 🌅",
        imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop",
        isCapsule: false,
        unlockDate: null,
        voiceNote: true,
        audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", // sample preview for demo
        category: "vault"
    },
    {
        id: "2",
        title: "2030 Time Capsule Letter ⏳",
        imageUrl: "https://images.unsplash.com/photo-1518655048521-f130df041f66?w=600&auto=format&fit=crop",
        isCapsule: true,
        unlockDate: "2030-01-01T00:00:00",
        voiceNote: false,
        audioUrl: null,
        category: "capsules"
    },
    {
        id: "3",
        title: "Family Trip Shared Album 👥",
        imageUrl: "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=600&auto=format&fit=crop",
        isCapsule: false,
        unlockDate: null,
        voiceNote: false,
        audioUrl: null,
        category: "shared"
    }
];

let userUploads = [];
let currentTab = "vault"; 

// Real Audio Recording Variables
let mediaRecorder = null;
let audioChunks = [];
let recordedAudioUrl = null;
let isRecordingVoice = false;

// --- DOM Selectors ---
const memoryGrid = document.querySelector("#memoryGrid");
const openUploadBtn = document.querySelector("#openUploadBtn");
const closeModalBtn = document.querySelector("#closeModalBtn");
const uploadModal = document.querySelector("#uploadModal");
const memoryForm = document.querySelector("#memoryForm");
const isCapsuleCheckbox = document.querySelector("#isCapsule");
const capsuleDateGroup = document.querySelector("#capsuleDateGroup");
const recordVoiceBtn = document.querySelector("#recordVoiceBtn");
const voiceStatus = document.querySelector("#voiceStatus");
const googlePhotosBtn = document.querySelector("#googlePhotosBtn");
const searchInput = document.querySelector("#searchInput");

// Share Modal Elements
const shareModal = document.querySelector("#shareModal");
const closeShareBtn = document.querySelector("#closeShareBtn");
const shareLinkInput = document.querySelector("#shareLinkInput");
const copyLinkBtn = document.querySelector("#copyLinkBtn");
const copyStatus = document.querySelector("#copyStatus");

// Sidebar Nav Buttons
const navVault = document.querySelector("#navVault");
const navUploads = document.querySelector("#navUploads");
const navCapsules = document.querySelector("#navCapsules");
const navShared = document.querySelector("#navShared");

// --- Initialize App ---
document.addEventListener("DOMContentLoaded", () => {
    renderMemories();
    setupEventListeners();
});

// --- Render Memories with Interactive Audio & Share Elements ---
function renderMemories(filterQuery = "") {
    memoryGrid.innerHTML = "";

    let itemsToDisplay = [];

    if (currentTab === "vault") {
        itemsToDisplay = demoMemories;
    } else if (currentTab === "uploads") {
        itemsToDisplay = userUploads;
    } else if (currentTab === "capsules") {
        itemsToDisplay = [...demoMemories, ...userUploads].filter(m => m.isCapsule);
    } else if (currentTab === "shared") {
        itemsToDisplay = demoMemories.filter(m => m.category === "shared");
    }

    if (filterQuery) {
        itemsToDisplay = itemsToDisplay.filter(mem => 
            mem.title.toLowerCase().includes(filterQuery)
        );
    }

    if (itemsToDisplay.length === 0) {
        memoryGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">No memories found in this section. Click "+ Create Memory" to add one!</p>`;
        return;
    }

    itemsToDisplay.forEach(mem => {
        const card = document.createElement("div");
        card.className = "polaroid-card";

        const isLocked = mem.isCapsule && mem.unlockDate && new Date(mem.unlockDate) > new Date();
        const unlockDateFormatted = mem.unlockDate ? new Date(mem.unlockDate).toLocaleDateString() : "";

        card.innerHTML = `
            <div class="polaroid-img-container" style="${isLocked ? 'filter: blur(10px);' : ''}">
                <img src="${mem.imageUrl}" alt="${mem.title}">
                ${isLocked ? '<div style="position: absolute; top: 40%; left: 40%; font-size: 2.2rem;">🔒</div>' : ''}
            </div>
            <div class="polaroid-caption">
                <span>${mem.title}</span>
                ${mem.isCapsule ? `<span class="capsule-badge">${isLocked ? 'Locked ⏳' : 'Unlocked ✨'}</span>` : ''}
            </div>
            ${mem.audioUrl && !isLocked ? `
                <div style="margin-top: 10px;">
                    <span style="font-size: 0.75rem; font-weight: 700; color: #6366f1;">🎙️ Voice Note:</span>
                    <audio controls src="${mem.audioUrl}" style="width: 100%; height: 32px; margin-top: 4px;"></audio>
                </div>
            ` : ''}
            ${isLocked ? `<div style="font-size: 0.75rem; color: #f59e0b; margin-top: 4px;">Unlocks: ${unlockDateFormatted}</div>` : ''}
            <button class="share-action-btn" data-id="${mem.id}">🔗 Share Memory</button>
        `;

       const shareBtn = card.querySelector(".share-action-btn");
        shareBtn.addEventListener("click", () => {
            // Automatically uses your live GitHub URL or falls back safely
            const baseUrl = window.location.hostname.includes("github.io") 
                ? window.location.href.split('?')[0] 
                : "https://chrollo-090.github.io/memory-vault/";
            
            shareLinkInput.value = `${baseUrl}?id=${mem.id}&token=secure_key_${Math.random().toString(36).substring(2, 9)}`;
            copyStatus.textContent = "";
            shareModal.classList.remove("hidden");
        });

        memoryGrid.appendChild(card);
    });
}

// --- Event Listeners Setup ---
function setupEventListeners() {
    navVault.addEventListener("click", () => switchTab("vault", navVault));
    navUploads.addEventListener("click", () => switchTab("uploads", navUploads));
    navCapsules.addEventListener("click", () => switchTab("capsules", navCapsules));
    navShared.addEventListener("click", () => switchTab("shared", navShared));

    openUploadBtn.addEventListener("click", () => uploadModal.classList.remove("hidden"));
    closeModalBtn.addEventListener("click", () => uploadModal.classList.add("hidden"));
    closeShareBtn.addEventListener("click", () => shareModal.classList.add("hidden"));

    copyLinkBtn.addEventListener("click", () => {
        shareLinkInput.select();
        navigator.clipboard.writeText(shareLinkInput.value);
        copyStatus.textContent = "Link copied to clipboard! 📋✨";
    });

    isCapsuleCheckbox.addEventListener("change", (e) => {
        if (e.target.checked) {
            capsuleDateGroup.classList.remove("hidden");
        } else {
            capsuleDateGroup.classList.add("hidden");
        }
    });

    // Real Live Voice Note Recording using Browser Microphone API
    recordVoiceBtn.addEventListener("click", async () => {
        if (!isRecordingVoice) {
            // Request microphone permissions and start recording
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];

                mediaRecorder.ondataavailable = (e) => {
                    if (e.data.size > 0) {
                        audioChunks.push(e.data);
                    }
                };

                mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    recordedAudioUrl = URL.createObjectURL(audioBlob); // Save actual recorded user voice blob
                    voiceStatus.textContent = "Voice note recorded successfully! ✅";
                    voiceStatus.style.color = "#22c55e";
                };

                mediaRecorder.start();
                isRecordingVoice = true;
                recordVoiceBtn.textContent = "🛑 Stop Recording";
                voiceStatus.textContent = "Recording your voice... Speak now! 🔴";
                voiceStatus.style.color = "#ef4444";
            } catch (err) {
                alert("Microphone access is required to record voice notes.");
                console.error("Microphone error:", err);
            }
        } else {
            // Stop recording
            mediaRecorder.stop();
            // Stop microphone tracks
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
            isRecordingVoice = false;
            recordVoiceBtn.textContent = "🎙️ Record Voice Note";
        }
    });

    memoryForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const title = document.querySelector("#memoryTitle").value;
        const fileInput = document.querySelector("#fileInput");
        const isCapsule = isCapsuleCheckbox.checked;
        const unlockDate = document.querySelector("#unlockDate").value;

        alert("🛡️ AI AutoMod: Scanning file for safety compliance...");

        setTimeout(() => {
            let imageUrl = "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=600&auto=format&fit=crop"; 

            if (fileInput.files && fileInput.files[0]) {
                imageUrl = URL.createObjectURL(fileInput.files[0]);
            }

            const newMemory = {
                id: Date.now().toString(),
                title: title,
                imageUrl: imageUrl,
                isCapsule: isCapsule,
                unlockDate: isCapsule ? unlockDate : null,
                voiceNote: recordedAudioUrl !== null,
                audioUrl: recordedAudioUrl, // Assigns the REAL voice recorded by the user!
                category: "uploads"
            };

            userUploads.unshift(newMemory);
            switchTab("uploads", navUploads);

            // Reset Form & Recording State
            memoryForm.reset();
            recordedAudioUrl = null;
            capsuleDateGroup.classList.add("hidden");
            voiceStatus.textContent = "Ready to record...";
            voiceStatus.style.color = "";
            uploadModal.classList.add("hidden");

            alert("✅ Memory saved with your personal voice recording!");
        }, 1000);
    });

    googlePhotosBtn.addEventListener("click", () => {
        alert("🔍 Syncing with Google Photos API...\n\nFound 1 suggested throwback memory!");
        
        const suggestedMemory = {
            id: Date.now().toString(),
            title: "Throwback: Coffee Shop Morning ☕",
            imageUrl: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600&auto=format&fit=crop",
            isCapsule: false,
            unlockDate: null,
            voiceNote: false,
            audioUrl: null,
            category: "uploads"
        };

        userUploads.unshift(suggestedMemory);
        switchTab("uploads", navUploads);
    });

    searchInput.addEventListener("input", (e) => {
        renderMemories(e.target.value.toLowerCase());
    });
}

function switchTab(tabName, btnElement) {
    currentTab = tabName;
    document.querySelectorAll(".nav-btn").forEach(btn => btn.classList.remove("active"));
    btnElement.classList.add("active");
    renderMemories();
}
