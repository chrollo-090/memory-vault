// ==========================================
// 1. SUPABASE CONFIGURATION & INITIALIZATION
// ==========================================
const SUPABASE_URL = "https://yevyshrrkdxzoeccxmer.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlldnlzaHJya2R4em9lY2N4bWVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzOTcxNjAsImV4cCI6MjEwNzk3MzE2MH0._6MqLnoo5u9Cvth_FqBpjEp4QUty_BqD-pLmMMdtWQw"; 

if (!window.supabase) {
    alert("Error: Supabase library failed to load. Check your internet connection or script tag.");
}

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let memories = [];
let currentUser = null;

let mediaRecorder;
let audioChunks = [];
let recordedAudioBlob = null;

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
// 3. AUTHENTICATION & UI MANAGEMENT
// ==========================================
supabaseClient.auth.onAuthStateChange((event, session) => {
    currentUser = session ? session.user : null;
    updateAuthUI();
    if (currentUser) {
        fetchMemories();
    } else {
        memories = [];
        renderMemoryGrid();
    }
});

// Fallback check to ensure loading state clears promptly
setTimeout(() => {
    if (!currentUser && document.querySelector(".status-dot")) {
        updateAuthUI();
    }
}, 1000);

function updateAuthUI() {
    const sidebarFooter = document.querySelector(".sidebar-footer");
    if (!sidebarFooter) return;

    if (currentUser) {
        sidebarFooter.innerHTML = `
            <div class="user-badge" style="display:flex; flex-direction:column; gap:0.5rem; padding: 0.5rem;">
                <span style="font-size:0.8rem; color:var(--text-secondary); word-break:break-all;">👤 ${currentUser.email}</span>
                <button id="logoutBtn" style="background:rgba(239,68,68,0.2); border:1px solid #ef4444; color:#f87171; padding:0.4rem; border-radius:6px; cursor:pointer; font-weight:600;">Sign Out</button>
            </div>
        `;
        const logoutBtn = document.getElementById("logoutBtn");
        if (logoutBtn) {
            logoutBtn.addEventListener("click", async () => {
                await supabaseClient.auth.signOut();
            });
        }
    } else {
        sidebarFooter.innerHTML = `
            <button id="loginPromptBtn" class="primary-btn" style="width:100%; padding:0.5rem; font-size:0.85rem; background:#3b82f6; border:none; border-radius:8px; color:white; font-weight:600; cursor:pointer;">🔑 Sign In / Register</button>
        `;
        const loginPromptBtn = document.getElementById("loginPromptBtn");
        if (loginPromptBtn) {
            loginPromptBtn.addEventListener("click", showAuthModalOrPrompt);
        }
    }
}

async function showAuthModalOrPrompt() {
    const email = prompt("Enter your email address to sign in or create an account:");
    if (!email) return;
    const password = prompt("Enter your password (min 6 characters):");
    if (!password) return;

    let { error: signInError } = await supabaseClient.auth.signInWithPassword({ email, password });
    
    if (signInError) {
        let { error: signUpError } = await supabaseClient.auth.signUp({ email, password });
        if (signUpError) {
            alert("Authentication Error: " + signUpError.message);
        } else {
            alert("Account created and logged in successfully!");
        }
    } else {
        alert("Signed in successfully!");
    }
}

// ==========================================
// 4. FETCH MEMORIES & SHARED LINK ROUTING
// ==========================================
async function fetchMemories(filterCategory = "navVault", searchQuery = "") {
    if (!currentUser) return;

    // Fetch user's own memories securely
    let { data, error } = await supabaseClient
        .from("memories")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching memories:", error);
        return;
    }

    memories = data || [];

    // Check if user arrived via a shared link (?view_id=...)
    const urlParams = new URLSearchParams(window.location.search);
    const viewId = urlParams.get("view_id");

    if (viewId) {
        let targetMemory = memories.find(m => m.id == viewId);
        if (!targetMemory) {
            // Fetch the specific shared memory if it belongs to another user
            let { data: sharedData } = await supabaseClient
                .from("memories")
                .select("*")
                .eq("id", viewId)
                .single();
            
            if (sharedData) {
                memories.unshift(sharedData); // Temporarily include it in the grid view
                targetMemory = sharedData;
            }
        }

        if (targetMemory) {
            const isLocked = targetMemory.is_time_capsule && targetMemory.unlock_date && new Date() < new Date(targetMemory.unlock_date);
            if (isLocked) {
                alert(`⏳ This Time Capsule is locked until ${new Date(targetMemory.unlock_date).toLocaleDateString()}!`);
            } else {
                alert(`✨ Shared Memory Loaded: "${targetMemory.title}"`);
            }
        }
    }

    renderMemoryGrid(filterCategory, searchQuery);
}

// ==========================================
// 5. RENDER FUNCTION
// ==========================================
function renderMemoryGrid(filterCategory = "navVault", searchQuery = "") {
    memoryGrid.innerHTML = "";

    if (!currentUser) {
        memoryGrid.innerHTML = `<div class="empty-state" style="color:var(--text-secondary); text-align:center; grid-column: 1/-1; padding: 3rem;"><p>Please sign in using the sidebar to view your private memory vault.</p></div>`;
        return;
    }

    const filtered = memories.filter(mem => {
        let matchCategory = true;
        if (filterCategory === "navUploads") matchCategory = !mem.is_time_capsule;
        else if (filterCategory === "navCapsules") matchCategory = mem.is_time_capsule;

        const matchSearch = mem.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (mem.description && mem.description.toLowerCase().includes(searchQuery.toLowerCase()));

        return matchCategory && matchSearch;
    });

    if (filtered.length === 0) {
        memoryGrid.innerHTML = `<div class="empty-state" style="color:var(--text-secondary); text-align:center; grid-column: 1/-1; padding: 2rem;"><p>No memories found here yet!</p></div>`;
        return;
    }

    filtered.forEach(mem => {
        const isLocked = mem.is_time_capsule && mem.unlock_date && new Date() < new Date(mem.unlock_date);
        
        const card = document.createElement("div");
        card.className = `memory-card ${isLocked ? "time-capsule-locked" : ""}`;
        card.style.cssText = "background: rgba(17, 24, 39, 0.7); border: 1px solid var(--border-color); border-radius: 16px; overflow: hidden; display: flex; flex-direction: column;";
        
        card.innerHTML = `
            <div class="card-image-container" style="position: relative; height: 180px; overflow: hidden;">
                <img src="${mem.image_url || 'https://images.unsplash.com/photo-1518173946687-a4c8a383392e?auto=format&fit=crop&w=600&q=80'}" alt="${mem.title}" class="card-image ${isLocked ? "blurred-image" : ""}" style="width: 100%; height: 100%; object-fit: cover; ${isLocked ? "filter: blur(8px);" : ""}">
                ${isLocked ? `<div class="lock-overlay" style="position: absolute; inset: 0; background: rgba(0,0,0,0.5); display: flex; flex-direction: column; align-items: center; justify-content: center; color: white;"><span class="lock-icon" style="font-size: 2rem;">🔒</span><p style="font-size: 0.85rem; margin-top: 0.5rem;">Unlocks: ${new Date(mem.unlock_date).toLocaleDateString()}</p></div>` : ""}
            </div>
            <div class="card-content" style="padding: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem; flex: 1;">
                <h3 style="margin: 0; font-size: 1.1rem; color: white;">${mem.title}</h3>
                <p style="margin: 0; color: var(--text-secondary); font-size: 0.9rem;">${isLocked ? "<em>This time capsule is locked tight until the unlock date!</em>" : (mem.description || '')}</p>
                
                ${!isLocked && mem.audio_url ? `
                    <div class="audio-player-wrapper" style="margin-top: 0.5rem;">
                        <audio controls src="${mem.audio_url}" style="width: 100%; height: 36px;"></audio>
                    </div>
                ` : ""}

                <div class="card-actions" style="margin-top: auto; padding-top: 0.5rem;">
                    <button class="share-action-btn" data-id="${mem.id}" style="background: rgba(59, 130, 246, 0.2); border: 1px solid #3b82f6; color: #60a5fa; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-weight: 600; width: 100%;">🔗 Share Memory</button>
                </div>
            </div>
        `;

        const shareBtn = card.querySelector(".share-action-btn");
        shareBtn.addEventListener("click", () => {
            const shareUrl = `https://chrollo-090.github.io/memory-vault/?view_id=${mem.id}`;
            shareLinkInput.value = shareUrl;
            copyStatus.textContent = "";
            shareModal.classList.remove("hidden");
        });

        memoryGrid.appendChild(card);
    });
}

// ==========================================
// 6. EVENT LISTENERS & FORM SUBMISSION
// ==========================================
navItems.forEach(item => {
    item.addEventListener("click", (e) => {
        e.preventDefault();
        navItems.forEach(i => i.classList.remove("active"));
        item.classList.add("active");
        renderMemoryGrid(item.id, searchInput.value);
    });
});

searchInput.addEventListener("input", (e) => {
    const activeNav = document.querySelector(".nav-btn.active");
    const activeId = activeNav ? activeNav.id : "navVault";
    renderMemoryGrid(activeId, e.target.value);
});

if (openUploadBtn && uploadModal) {
    openUploadBtn.addEventListener("click", () => {
        if (!currentUser) {
            alert("Please sign in first to upload memories to the cloud.");
            showAuthModalOrPrompt();
            return;
        }
        uploadModal.classList.remove("hidden");
    });
}
if (closeModalBtn && uploadModal) closeModalBtn.addEventListener("click", () => uploadModal.classList.add("hidden"));
if (closeShareBtn && shareModal) closeShareBtn.addEventListener("click", () => shareModal.classList.add("hidden"));

if (isCapsuleCheckbox && capsuleDateGroup) {
    isCapsuleCheckbox.addEventListener("change", (e) => {
        capsuleDateGroup.classList.toggle("hidden", !e.target.checked);
    });
}

if (copyLinkBtn && shareLinkInput && copyStatus) {
    copyLinkBtn.addEventListener("click", () => {
        shareLinkInput.select();
        navigator.clipboard.writeText(shareLinkInput.value);
        copyStatus.textContent = "Copied to clipboard! ✅";
    });
}

// Voice Recording
if (recordVoiceBtn) {
    recordVoiceBtn.addEventListener("click", async () => {
        try {
            if (!mediaRecorder || mediaRecorder.state === "inactive") {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];

                mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
                mediaRecorder.onstop = () => {
                    recordedAudioBlob = new Blob(audioChunks, { type: "audio/webm" });
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

// Upload Form Submission to Supabase Cloud
if (memoryForm) {
    memoryForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!currentUser) return alert("You must be logged in.");

        const title = document.getElementById("memoryTitle").value;
        const fileInput = document.getElementById("fileInput");
        const isCapsule = document.getElementById("isCapsule").checked;
        const unlockDate = document.getElementById("unlockDate").value;

        let imageUrl = "https://images.unsplash.com/photo-1518173946687-a4c8a383392e?auto=format&fit=crop&w=600&q=80";
        let audioUrl = null;

        if (fileInput.files && fileInput.files[0]) {
            const file = fileInput.files[0];
            const filePath = `${currentUser.id}/${Date.now()}_${file.name}`;
            const { error: uploadError } = await supabaseClient.storage
                .from("memory-files")
                .upload(filePath, file);

            if (!uploadError) {
                const { data: publicUrlData } = supabaseClient.storage
                    .from("memory-files")
                    .getPublicUrl(filePath);
                imageUrl = publicUrlData.publicUrl;
            }
        }

        if (recordedAudioBlob) {
            const audioPath = `${currentUser.id}/${Date.now()}_audio.webm`;
            const { error: audioError } = await supabaseClient.storage
                .from("memory-files")
                .upload(audioPath, recordedAudioBlob);

            if (!audioError) {
                const { data: audioPublicUrl } = supabaseClient.storage
                    .from("memory-files")
                    .getPublicUrl(audioPath);
                audioUrl = audioPublicUrl.publicUrl;
            }
        }

        const { error: dbError } = await supabaseClient.from("memories").insert([
            {
                user_id: currentUser.id,
                title: title,
                description: "Cloud private memory upload.",
                image_url: imageUrl,
                audio_url: audioUrl,
                is_time_capsule: isCapsule,
                unlock_date: isCapsule && unlockDate ? unlockDate : null
            }
        ]);

        if (dbError) {
            alert("Error saving memory: " + dbError.message);
            return;
        }

        memoryForm.reset();
        recordedAudioBlob = null;
        if (voiceStatus) voiceStatus.textContent = "Ready to record...";
        if (capsuleDateGroup) capsuleDateGroup.classList.add("hidden");
        uploadModal.classList.add("hidden");

        fetchMemories("navVault");
    });
}

// ==========================================
// 7. PAGE LOAD INITIALIZATION
// ==========================================
window.addEventListener("DOMContentLoaded", () => {
    updateAuthUI();
});
