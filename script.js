// ==========================================
// 1. DATA STORE (With LocalStorage Support)
// ==========================================
const defaultMemories = [
    {
        id: 101,
        title: "Kyoto Autumn Walk",
        description: "Golden leaves falling around the old temple path. Quiet afternoon in October.",
        category: "vault",
        image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=600&q=80",
        audioUrl: null,
        isTimeCapsule: false,
        unlockDate: null,
        tags: ["travel", "japan"]
    },
    {
        id: 102,
        title: "Future Birthday Wish",
        description: "A message left for my future self to open on my birthday next year!",
        category: "capsule",
        image: "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=600&q=80",
        audioUrl: null,
        isTimeCapsule: true,
        unlockDate: "2027-12-31",
        tags: ["future", "capsule"]
    }
];

// Load memories from localStorage or fallback to defaults
let memories = JSON.parse(localStorage.getItem("memoryVault_items")) || defaultMemories;

// MediaRecorder setup for Voice Notes
let mediaRecorder;
let audioChunks = [];
let recordedAudioBlobUrl = null;

// ==========================================
// 2. DOM ELEMENTS
// ==========================================
const memoryGrid = document.getElementById("memoryGrid");
const navItems = document.querySelectorAll(".nav-btn");
const searchInput = document.getElementById("searchInput");

const uploadModal = document.getElementById("uploadModal");
const openUploadBtn = document.getElementById("openUploadBtn");
const closeModalBtn = document.getElementById("closeModalBtn");
const memoryForm = document.getElementById("memoryForm");

const isCapsuleCheckbox = document.getElementById("isCapsule");
const capsuleDateGroup = document.getElementById("capsuleDateGroup");

const recordVoiceBtn = document.getElementById("recordVoiceBtn");
const voiceStatus = document.getElementById("voiceStatus");

const shareModal = document.getElementById("shareModal");
const closeShareBtn = document.getElementById("closeShareBtn");
const shareLinkInput = document.getElementById("shareLinkInput");
const copyLinkBtn = document.getElementById("copyLinkBtn");
const copyStatus = document.getElementById("copyStatus");

// ==========================================
// 3. RENDER FUNCTION
// ==========================================
function renderMemories(filterCategory = "navVault", searchQuery = "") {
    memoryGrid.innerHTML = "";

    const filtered = memories.filter(mem => {
        let matchCategory = true;
        if (filterCategory === "navUploads") matchCategory = mem.category === "uploads";
        else if (filterCategory === "navCapsules") matchCategory = mem.isTimeCapsule;

        const matchSearch = mem.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            mem.description.toLowerCase().includes(searchQuery.toLowerCase());

        return matchCategory && matchSearch;
    });

    if (filtered.length === 0) {
        memoryGrid.innerHTML = `<div class="empty-state" style="color:var(--text-secondary); text-align:center; grid-column: 1/-1; padding: 2rem;"><p>No memories found here yet!</p></div>`;
        return;
    }

    filtered.forEach(mem => {
        const isLocked = mem.isTimeCapsule && new Date() < new Date(mem.unlockDate);
        
        const card = document.createElement("div");
        card.className = `memory-card ${isLocked ? "time-capsule-locked" : ""}`;
        card.style.cssText = "background: rgba(17, 24, 39, 0.7); border: 1px solid var(--border-color); border-radius: 16px; overflow: hidden; display: flex; flex-direction: column;";
        
        card.innerHTML = `
            <div class="card-image-container" style="position: relative; height: 180px; overflow: hidden;">
                <img src="${mem.image}" alt="${mem.title}" class="card-image ${isLocked ? "blurred-image" : ""}" style="width: 100%; height: 100%; object-fit: cover; ${isLocked ? "filter: blur(8px);" : ""}">
                ${isLocked ? `<div class="lock-overlay" style="position: absolute; inset: 0; background: rgba(0,0,0,0.5); display: flex; flex-direction: column; align-items: center; justify-content: center; color: white;"><span class="lock-icon" style="font-size: 2rem;">🔒</span><p style="font-size: 0.85rem; margin-top: 0.5rem;">Unlocks: ${mem.unlockDate}</p></div>` : ""}
            </div>
            <div class="card-content" style="padding: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem; flex: 1;">
                <h3 style="margin: 0; font-size: 1.1rem; color: white;">${mem.title}</h3>
                <p style="margin: 0; color: var(--text-secondary); font-size: 0.9rem;">${isLocked ? "<em>This time capsule is locked tight until the unlock date!</em>" : mem.description}</p>
                
                ${!isLocked && mem.audioUrl ? `
                    <div class="audio-player-wrapper" style="margin-top: 0.5rem;">
                        <audio controls src="${mem.audioUrl}" style="width: 100%; height: 36px;"></audio>
                    </div>
                ` : ""}

                <div class="card-actions" style="margin-top: auto; padding-top: 0.5rem;">
                    <button class="share-action-btn" data-id="${mem.id}" style="background: rgba(59, 130, 246, 0.2); border: 1px solid #3b82f6; color: #60a5fa; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-weight: 600; width: 100%;">🔗 Share Memory</button>
                </div>
            </div>
        `;

        const shareBtn = card.querySelector(".share-action-btn");
        shareBtn.addEventListener("click", () => {
            const shareUrl = `https://chrollo-090.github.io/memory-vault/?view_id=${mem.id}&token=secure_key_${Math.random().toString(36).substring(2, 9)}`;
            shareLinkInput.value = shareUrl;
            copyStatus.textContent = "";
            shareModal.classList.remove("hidden");
        });

        memoryGrid.appendChild(card);
    });
}

// ==========================================
// 4. SIDEBAR & SEARCH EVENT LISTENERS
// ==========================================
navItems.forEach(item => {
    item.addEventListener("click", (e) => {
        e.preventDefault();
        navItems.forEach(i => i.classList.remove("active"));
        item.classList.add("active");
        renderMemories(item.id, searchInput.value);
    });
});

searchInput.addEventListener("input", (e) => {
    const activeNav = document.querySelector(".nav-btn.active");
    const activeId = activeNav ? activeNav.id : "navVault";
    renderMemories(activeId, e.target.value);
});

// ==========================================
// 5. MODALS & TOGGLES LOGIC
// ==========================================
if (openUploadBtn && uploadModal) {
    openUploadBtn.addEventListener("click", () => uploadModal.classList.remove("hidden"));
}
if (closeModalBtn && uploadModal) {
    closeModalBtn.addEventListener("click", () => uploadModal.classList.add("hidden"));
}
if (closeShareBtn && shareModal) {
    closeShareBtn.addEventListener("click", () => shareModal.classList.add("hidden"));
}

if (isCapsuleCheckbox && capsuleDateGroup) {
    isCapsuleCheckbox.addEventListener("change", (e) => {
        if (e.target.checked) {
            capsuleDateGroup.classList.remove("hidden");
        } else {
            capsuleDateGroup.classList.add("hidden");
        }
    });
}

if (copyLinkBtn && shareLinkInput && copyStatus) {
    copyLinkBtn.addEventListener("click", () => {
        shareLinkInput.select();
        navigator.clipboard.writeText(shareLinkInput.value);
        copyStatus.textContent = "Copied to clipboard! ✅";
    });
}

// ==========================================
// 6. LIVE MICROPHONE VOICE RECORDING
// ==========================================
if (recordVoiceBtn) {
    recordVoiceBtn.addEventListener("click", async () => {
        try {
            if (!mediaRecorder || mediaRecorder.state === "inactive") {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];

                mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
                mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
                    recordedAudioBlobUrl = URL.createObjectURL(audioBlob);
                    voiceStatus.textContent = "Voice note recorded! 🎙️✅";
                };

                mediaRecorder.start();
                recordVoiceBtn.textContent = "⏹️ Stop Recording";
                voiceStatus.textContent = "Recording in progress... 🔴";
            } else {
                mediaRecorder.stop();
                recordVoiceBtn.textContent = "🎙️ Record Voice Note";
            }
        } catch (err) {
            alert("Microphone permission denied or not available!");
        }
    });
}

// ==========================================
// 7. FORM SUBMISSION (Create New Memory)
// ==========================================
if (memoryForm) {
    memoryForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const title = document.getElementById("memoryTitle").value;
        const description = "Newly uploaded private memory.";
        const fileInput = document.getElementById("fileInput");
        const isCapsule = document.getElementById("isCapsule").checked;
        const unlockDate = document.getElementById("unlockDate").value;

        let imageUrl = "https://images.unsplash.com/photo-1518173946687-a4c8a383392e?auto=format&fit=crop&w=600&q=80";
        if (fileInput.files && fileInput.files[0]) {
            imageUrl = URL.createObjectURL(fileInput.files[0]);
        }

        const newMemory = {
            id: Date.now(),
            title: title,
            description: description,
            category: "uploads",
            image: imageUrl,
            audioUrl: recordedAudioBlobUrl,
            isTimeCapsule: isCapsule,
            unlockDate: isCapsule ? unlockDate : null,
            tags: ["upload"]
        };

        memories.unshift(newMemory);
        localStorage.setItem("memoryVault_items", JSON.stringify(memories));

        memoryForm.reset();
        recordedAudioBlobUrl = null;
        if (voiceStatus) voiceStatus.textContent = "Ready to record...";
        if (capsuleDateGroup) capsuleDateGroup.classList.add("hidden");
        uploadModal.classList.add("hidden");

        navItems.forEach(i => i.classList.remove("active"));
        const uploadsTab = document.getElementById("navUploads");
        if (uploadsTab) uploadsTab.classList.add("active");

        renderMemories("navUploads");
    });
}

// ==========================================
// 8. PAGE LOAD & DIRECT LINK ROUTING
// ==========================================
window.addEventListener("DOMContentLoaded", () => {
    renderMemories("navVault");

    const urlParams = new URLSearchParams(window.location.search);
    const viewId = urlParams.get("view_id");

    if (viewId) {
        const targetMemory = memories.find(m => m.id == viewId);
        if (targetMemory) {
            const isLocked = targetMemory.isTimeCapsule && new Date() < new Date(targetMemory.unlockDate);
            if (isLocked) {
                alert(`⏳ This Memory Vault capsule is locked until ${targetMemory.unlockDate}!`);
            } else {
                // Instantly pop up or highlight the targeted shared memory card!
                alert(`✨ Shared Memory Found: "${targetMemory.title}"\n\n${targetMemory.description}`);
            }
        } else {
            alert("⚠️ This shared memory item could not be found locally on this device.");
        }
    }
});
