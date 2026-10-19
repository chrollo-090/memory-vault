// ==========================================
// 1. DATA STORE (Demo Cards + Saved State)
// ==========================================
let memories = [
    {
        id: 101,
        title: "Kyoto Autumn Walk",
        description: "Golden leaves falling around the old temple path. Quiet afternoon in October.",
        category: "vault", // Default Vault item
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
        unlockDate: "2027-12-31", // Future date = locked
        tags: ["future", "capsule"]
    }
];

// MediaRecorder setup for Voice Notes
let mediaRecorder;
let audioChunks = [];
let recordedAudioBlobUrl = null;

// ==========================================
// 2. DOM ELEMENTS
// ==========================================
const memoryGrid = document.getElementById("memoryGrid");
const navItems = document.querySelectorAll(".nav-item");
const searchInput = document.getElementById("searchInput");

// Modal Elements
const createModal = document.getElementById("createModal");
const openModalBtn = document.getElementById("openModalBtn");
const closeModalBtn = document.getElementById("closeModalBtn");
const memoryForm = document.getElementById("memoryForm");

// Audio Elements
const recordAudioBtn = document.getElementById("recordAudioBtn");
const stopAudioBtn = document.getElementById("stopAudioBtn");
const audioStatus = document.getElementById("audioStatus");

// Share Modal Elements
const shareModal = document.getElementById("shareModal");
const closeShareModalBtn = document.getElementById("closeShareModalBtn");
const shareLinkInput = document.getElementById("shareLinkInput");
const copyShareBtn = document.getElementById("copyShareBtn");
const copyStatus = document.getElementById("copyStatus");

// ==========================================
// 3. RENDER FUNCTION
// ==========================================
function renderMemories(filterCategory = "all", searchQuery = "") {
    memoryGrid.innerHTML = "";

    const filtered = memories.filter(mem => {
        // Category Filter
        let matchCategory = true;
        if (filterCategory === "uploads") matchCategory = mem.category === "uploads";
        else if (filterCategory === "capsule") matchCategory = mem.isTimeCapsule;
        else if (filterCategory === "shared") matchCategory = mem.isShared;

        // Search Filter
        const matchSearch = mem.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            mem.description.toLowerCase().includes(searchQuery.toLowerCase());

        return matchCategory && matchSearch;
    });

    if (filtered.length === 0) {
        memoryGrid.innerHTML = `<div class="empty-state"><p>No memories found here yet!</p></div>`;
        return;
    }

    filtered.forEach(mem => {
        const isLocked = mem.isTimeCapsule && new Date() < new Date(mem.unlockDate);
        
        const card = document.createElement("div");
        card.className = `memory-card ${isLocked ? "time-capsule-locked" : ""}`;
        
        card.innerHTML = `
            <div class="card-image-container">
                <img src="${mem.image}" alt="${mem.title}" class="card-image ${isLocked ? "blurred-image" : ""}">
                ${isLocked ? `<div class="lock-overlay"><span class="lock-icon">🔒</span><p>Unlocks: ${mem.unlockDate}</p></div>` : ""}
            </div>
            <div class="card-content">
                <h3>${mem.title}</h3>
                <p>${isLocked ? "<em>This time capsule is locked tight until the unlock date!</em>" : mem.description}</p>
                
                ${!isLocked && mem.audioUrl ? `
                    <div class="audio-player-wrapper">
                        <audio controls src="${mem.audioUrl}"></audio>
                    </div>
                ` : ""}

                <div class="card-actions">
                    <button class="share-action-btn" data-id="${mem.id}">🔗 Share Memory</button>
                </div>
            </div>
        `;

        // Share button listener inside rendered card
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
        
        const category = item.getAttribute("data-category");
        renderMemories(category, searchInput.value);
    });
});

searchInput.addEventListener("input", (e) => {
    const activeNav = document.querySelector(".nav-item.active");
    const activeCategory = activeNav ? activeNav.getAttribute("data-category") : "all";
    renderMemories(activeCategory, e.target.value);
});

// ==========================================
// 5. MODALS OPEN / CLOSE LOGIC
// ==========================================
openModalBtn.addEventListener("click", () => createModal.classList.remove("hidden"));
closeModalBtn.addEventListener("click", () => createModal.classList.add("hidden"));
closeShareModalBtn.addEventListener("click", () => shareModal.classList.add("hidden"));

// Copy Share Link to Clipboard
copyShareBtn.addEventListener("click", () => {
    shareLinkInput.select();
    navigator.clipboard.writeText(shareLinkInput.value);
    copyStatus.textContent = "Copied to clipboard! ✅";
});

// ==========================================
// 6. LIVE MICROPHONE VOICE RECORDING
// ==========================================
recordAudioBtn.addEventListener("click", async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
            recordedAudioBlobUrl = URL.createObjectURL(audioBlob);
            audioStatus.textContent = "Voice note recorded! 🎙️✅";
        };

        mediaRecorder.start();
        recordAudioBtn.disabled = true;
        stopAudioBtn.disabled = false;
        audioStatus.textContent = "Recording in progress... 🔴";
    } catch (err) {
        alert("Microphone permission denied or not available!");
    }
});

stopAudioBtn.addEventListener("click", () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
        recordAudioBtn.disabled = false;
        stopAudioBtn.disabled = true;
    }
});

// ==========================================
// 7. FORM SUBMISSION (Create New Memory)
// ==========================================
memoryForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const title = document.getElementById("titleInput").value;
    const description = document.getElementById("descriptionInput").value;
    const imageFileInput = document.getElementById("imageFileInput");
    const isCapsule = document.getElementById("capsuleCheckbox").checked;
    const unlockDate = document.getElementById("unlockDateInput").value;

    let imageUrl = "https://images.unsplash.com/photo-1518173946687-a4c8a383392e?auto=format&fit=crop&w=600&q=80"; // Default placeholder
    if (imageFileInput.files && imageFileInput.files[0]) {
        imageUrl = URL.createObjectURL(imageFileInput.files[0]);
    }

    const newMemory = {
        id: Date.now(),
        title: title,
        description: description,
        category: "uploads", // Goes to "My Uploads"
        image: imageUrl,
        audioUrl: recordedAudioBlobUrl,
        isTimeCapsule: isCapsule,
        unlockDate: isCapsule ? unlockDate : null,
        tags: ["upload"]
    };

    memories.unshift(newMemory);

    // Reset Form State
    memoryForm.reset();
    recordedAudioBlobUrl = null;
    audioStatus.textContent = "";
    createModal.classList.add("hidden");

    // Switch view to 'My Uploads' automatically
    navItems.forEach(i => i.classList.remove("active"));
    const uploadsTab = document.querySelector('[data-category="uploads"]');
    if (uploadsTab) uploadsTab.classList.add("active");

    renderMemories("uploads");
});

// ==========================================
// 8. PAGE LOAD & DIRECT LINK ROUTING
// ==========================================
window.addEventListener("DOMContentLoaded", () => {
    renderMemories("all");

    // Check if the URL contains a shared memory ID query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const viewId = urlParams.get("view_id");

    if (viewId) {
        const targetMemory = memories.find(m => m.id == viewId);
        if (targetMemory) {
            const isLocked = targetMemory.isTimeCapsule && new Date() < new Date(targetMemory.unlockDate);
            if (isLocked) {
                alert(`⏳ This Memory Vault capsule is locked until ${targetMemory.unlockDate}!`);
            } else {
                alert(`✨ Shared Memory: "${targetMemory.title}"\n\n${targetMemory.description}`);
            }
        }
    }
});
