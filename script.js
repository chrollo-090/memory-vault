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
            const shareUrl = `
