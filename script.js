// 1. CẤU HÌNH FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyCNzWm4KPPNA06L0RCxK6blA2-SudRVw3U",
    databaseURL: "https://cod-ki-niem-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "cod-ki-niem",
    storageBucket: "cod-ki-niem.appspot.com"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// --- CẤU HÌNH BỔ SUNG TELEGRAM & WORKER ---
const TELEGRAM_BOT_TOKEN = "8727433515:AAGcXg95sgxRghZcQXCzDO0bParEmjdq-uQ"; 
const TELEGRAM_CHAT_ID = "-1003326339658"; 
const WORKER_URL = "https://photo.hoangvinhnguyen659.workers.dev"; 

// 2. BIẾN TOÀN CỤC
let allMembers = [];
let allMoments = [];
let loggedInUserId = localStorage.getItem('myApp_userId') ? parseInt(localStorage.getItem('myApp_userId')) : null;
let currentEditingId = null;
let currentMomentIdx = 0; 
let visibleMembersCount = 9;

const songs = [
    { id: 1, title: "Lời Pháo Hoa Rực Rỡ", class: "circle-coral", src: "" },
    { id: 2, title: "Tháng Năm Không Quên", class: "circle-cyan", src: "" },
    { id: 3, title: "Tình Bạn Diệu Kỳ", class: "circle-blue", src: "" }
];
let currentSongIdx = 0;
const audio = document.getElementById('main-audio');

// 3. KHỞI TẠO (ĐỒNG BỘ DỮ LIỆU)
function init() {
    database.ref('users').on('value', snap => {
        let tempMembers = [];
        for (let i = 1; i <= 42; i++) {
            tempMembers.push({ 
                // Đã xóa lời nhắn và sở thích mặc định
                id: i, name: `Thành viên ${i}`, nickname: '', avatar: '', 
                hobbies: '', message: '' 
            });
        }
        if (snap.exists()) {
            const data = snap.val();
            for (const key in data) {
                const idx = tempMembers.findIndex(m => m.id == key);
                if (idx !== -1) tempMembers[idx] = { ...tempMembers[idx], ...data[key] };
            }
        }
        allMembers = tempMembers;
        renderMembers();
        if (currentEditingId) updateModalUI(currentEditingId);
    });

    database.ref('moments').on('value', snap => {
        allMoments = [];
        if (snap.exists()) {
            const data = snap.val();
            for (const id in data) {
                allMoments.push({ id, ...data[id] });
            }
        }
        renderMoments();
        if (document.getElementById('moment-modal').style.display === 'flex') {
            const m = allMoments[currentMomentIdx];
            if(m) updateZoomStats(m.reactions || {}, m);
        }
    });

    if (loggedInUserId) {
        document.getElementById('auth-btn').innerText = "Đăng xuất";
    }
    updateUploadButton();
    loadPlaylist();
}

// 4. HÀM TRỢ GIÚP HIỂN THỊ ẢNH
function getImgUrl(path) {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const cleanWorker = WORKER_URL.replace(/\/$/, ""); 
    return `${cleanWorker}?file_id=${path}`;
}

// 5. HIỂN THỊ THÀNH VIÊN
function renderMembers() {
    const container = document.getElementById('member-container');
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < visibleMembersCount && i < allMembers.length; i++) {
        const m = allMembers[i];
        let avatarSrc = getImgUrl(m.avatar);
        let avatarTag = m.avatar ? `<img src="${avatarSrc}">` : `<div class="placeholder-avatar">${m.id}</div>`;
        container.innerHTML += `
            <div class="member-card" onclick="openMemberModal(${m.id})">
                ${avatarTag}
                <div class="member-name-plate">${m.name}</div>
            </div>`;
    }
}

function loadAllMembers() { 
    visibleMembersCount = 42; 
    renderMembers(); 
    document.getElementById('btn-load-more-members').style.display = 'none';
}

// 6. CHI TIẾT THÀNH VIÊN & LƯU DỮ LIỆU
function openMemberModal(id) {
    currentEditingId = id;
    updateModalUI(id);
    cancelEditMode();
    document.getElementById('member-modal').style.display = 'flex';
}

function updateModalUI(id) {
    const m = allMembers.find(x => x.id === id);
    if (!m) return;

    document.getElementById('modal-member-name').innerText = m.name;
    document.getElementById('modal-member-nickname').innerText = m.nickname ? `@${m.nickname}` : '';
    document.getElementById('modal-member-hobbies').innerText = m.hobbies;
    document.getElementById('modal-member-message').innerText = m.message;
    
    const img = document.getElementById('modal-member-img');
    const placeholder = document.getElementById('modal-placeholder-avatar');
    
    if (m.avatar) {
        img.src = getImgUrl(m.avatar); 
        img.style.display = 'block'; 
        placeholder.style.display = 'none';
    } else {
        img.style.display = 'none'; 
        placeholder.innerText = m.id; 
        placeholder.style.display = 'flex';
    }

    const editBtn = document.getElementById('btn-edit-profile');
    if (loggedInUserId !== null && loggedInUserId === id) {
        editBtn.style.display = 'block';
    } else {
        editBtn.style.display = 'none';
    }
}

// --- HÀM BẬT CHẾ ĐỘ SỬA & TẠO GIAO DIỆN UPLOAD ẢNH CHUYÊN NGHIỆP ---
function enableEditMode() {
    const m = allMembers.find(x => x.id === currentEditingId);
    document.getElementById('edit-name').value = m.name.includes("Thành viên") ? "" : m.name;
    document.getElementById('edit-nickname').value = m.nickname || "";
    document.getElementById('edit-avatar').value = (m.avatar && !m.avatar.includes("AgA")) ? m.avatar : "";
    document.getElementById('edit-hobbies').value = m.hobbies;
    document.getElementById('edit-message').value = m.message;
    
    const saveBtn = document.querySelector('button[onclick="saveProfile()"]');
    if (saveBtn) saveBtn.innerText = "Lưu";

    const fileInput = document.getElementById('edit-file-input');
    if (fileInput) {
        fileInput.style.display = 'none';
        const labelText = fileInput.previousElementSibling;
        if (labelText && labelText.tagName === 'LABEL') {
            labelText.style.display = 'none';
        }
    }

    let editAvatarArea = document.getElementById('edit-avatar-area');
    if (!editAvatarArea) {
        editAvatarArea = document.createElement('div');
        editAvatarArea.id = 'edit-avatar-area';
        editAvatarArea.style.textAlign = 'center';
        editAvatarArea.style.cursor = 'pointer';
        editAvatarArea.style.position = 'relative';
        editAvatarArea.style.margin = '0 auto 20px auto';
        editAvatarArea.style.width = '120px';
        editAvatarArea.style.height = '120px';
        editAvatarArea.style.borderRadius = '50%';
        editAvatarArea.style.border = '3px dashed #74b9ff'; 
        editAvatarArea.style.overflow = 'hidden';
        editAvatarArea.style.display = 'flex';
        editAvatarArea.style.alignItems = 'center';
        editAvatarArea.style.justifyContent = 'center';
        editAvatarArea.style.backgroundColor = '#f1f2f6';
        
        // Đã xóa icon FontAwesome ở đây
        editAvatarArea.innerHTML = `
            <img id="edit-preview-img" src="" style="width: 100%; height: 100%; object-fit: cover; display: none;">
            <div id="edit-preview-placeholder" style="font-size: 2.5rem; font-weight: bold; color: #a4b0be;"></div>
            <div style="position: absolute; bottom: 0; width: 100%; background: rgba(0,0,0,0.6); color: white; font-size: 0.8rem; padding: 5px 0; font-weight: bold;">
                Đổi ảnh
            </div>
        `;
        
        const editMode = document.getElementById('edit-mode');
        const firstLabel = editMode.querySelector('label'); 
        editMode.insertBefore(editAvatarArea, firstLabel);

        editAvatarArea.onclick = () => { if (fileInput) fileInput.click(); };

        if (fileInput) {
            fileInput.addEventListener('change', async function(e) {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = function(event) {
                    document.getElementById('edit-preview-img').src = event.target.result;
                    document.getElementById('edit-preview-img').style.display = 'block';
                    document.getElementById('edit-preview-placeholder').style.display = 'none';
                }
                reader.readAsDataURL(file);

                showToast("Đang tải ảnh lên... ⏳");
                if (saveBtn) { saveBtn.innerText = "Đang tải ảnh... ⏳"; saveBtn.disabled = true; }
                
                const fileId = await uploadPhotoToTelegram(file);
                if (fileId) {
                    document.getElementById('edit-avatar').value = fileId;
                    showToast("Tải ảnh xong! Nhấn 'Lưu' để hoàn tất. ✨");
                } else {
                    showToast("Lỗi khi tải ảnh lên! 😥");
                }
                if (saveBtn) { saveBtn.innerText = "Lưu"; saveBtn.disabled = false; }
            });
        }
    }

    const previewImg = document.getElementById('edit-preview-img');
    const previewPlaceholder = document.getElementById('edit-preview-placeholder');
    if (m.avatar) {
        previewImg.src = getImgUrl(m.avatar);
        previewImg.style.display = 'block';
        previewPlaceholder.style.display = 'none';
    } else {
        previewImg.style.display = 'none';
        previewPlaceholder.innerText = m.id;
        previewPlaceholder.style.display = 'block';
    }

    document.getElementById('view-mode').style.display = 'none';
    document.getElementById('edit-mode').style.display = 'block';
}

function removeCurrentAvatar() {
    if (!confirm("Bạn có chắc muốn gỡ ảnh đại diện hiện tại?")) return;
    document.getElementById('edit-avatar').value = "";
    document.getElementById('edit-file-input').value = "";
    
    const previewImg = document.getElementById('edit-preview-img');
    const previewPlaceholder = document.getElementById('edit-preview-placeholder');
    if (previewImg && previewPlaceholder) {
        previewImg.style.display = 'none';
        previewPlaceholder.innerText = currentEditingId;
        previewPlaceholder.style.display = 'block';
    }
    
    showToast("Đã gỡ ảnh. Hãy nhấn 'Lưu' để hoàn tất.");
}

async function uploadPhotoToTelegram(file) {
    const formData = new FormData();
    formData.append('chat_id', TELEGRAM_CHAT_ID);
    formData.append('photo', file);

    try {
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
            method: 'POST',
            body: formData
        });
        const res = await response.json();
        if (res.ok) {
            return res.result.photo[res.result.photo.length - 1].file_id;
        }
    } catch (err) { console.error("Lỗi:", err); }
    return null;
}

// LƯU HỒ SƠ 
async function saveProfile() {
    const saveBtn = document.querySelector('button[onclick="saveProfile()"]');
    let finalAvatar = document.getElementById('edit-avatar').value.trim();

    saveBtn.innerText = "Đang lưu...";
    saveBtn.disabled = true;

    const data = {
        name: document.getElementById('edit-name').value.trim() || `Thành viên ${currentEditingId}`,
        nickname: document.getElementById('edit-nickname').value.trim(),
        avatar: finalAvatar,
        hobbies: document.getElementById('edit-hobbies').value.trim(),
        message: document.getElementById('edit-message').value.trim()
    };
    
    database.ref('users/' + currentEditingId).set(data).then(() => {
        showToast("Đã cập nhật hồ sơ! ✨");
        saveBtn.innerText = "Lưu";
        saveBtn.disabled = false;
        cancelEditMode();
    }).catch(err => {
        showToast("Lỗi kết nối Firebase!");
        saveBtn.disabled = false;
    });
}

function cancelEditMode() {
    document.getElementById('view-mode').style.display = 'block';
    document.getElementById('edit-mode').style.display = 'none';
}

// 7. KHOẢNH KHẮC & TƯƠNG TÁC
function renderMoments() {
    const container = document.getElementById('moment-container');
    if (!container) return;
    container.innerHTML = '';
    allMoments.forEach((m, idx) => {
        container.innerHTML += `<div class="moment-card" onclick="openMoment(${idx})"><img src="${getImgUrl(m.url)}"></div>`;
    });
}

function openMoment(idx) {
    if(allMoments.length === 0) return;
    currentMomentIdx = idx;
    const m = allMoments[idx];
    document.getElementById('zoom-img').src = getImgUrl(m.url);
    updateZoomStats(m.reactions || {}, m);
    document.getElementById('moment-modal').style.display = 'flex';
}

function changeMoment(step) {
    currentMomentIdx += step;
    if (currentMomentIdx < 0) currentMomentIdx = allMoments.length - 1;
    if (currentMomentIdx >= allMoments.length) currentMomentIdx = 0;
    openMoment(currentMomentIdx);
}

function addReaction(type) {
    const m = allMoments[currentMomentIdx];
    if(!m) return;
    database.ref(`moments/${m.id}/reactions/${type}`).transaction(count => (count || 0) + 1);
}

function updateZoomStats(reacts, momentObj) {
    const icons = { love: '❤️', haha: '😆', wow: '😮', sad: '😢', angry: '😡' };
    let html = '';
    for (let key in icons) {
        if (reacts[key]) html += `<span style="margin: 0 8px;">${icons[key]} ${reacts[key]}</span> `;
    }
    document.getElementById('zoom-reaction-stats').innerHTML = html || 'Chưa có tương tác nào';
    
    const delBtn = document.getElementById('btn-delete-moment');
    if (delBtn) delBtn.style.display = loggedInUserId ? 'inline-block' : 'none';
}

function deleteMoment() {
    const m = allMoments[currentMomentIdx];
    if (!m) return;
    if (confirm("Xóa vĩnh viễn ảnh kỷ niệm này?")) {
        database.ref('moments/' + m.id).remove().then(() => {
            showToast("Đã xóa ảnh! 🗑️");
            document.getElementById('moment-modal').style.display = 'none';
        });
    }
}

async function uploadNewMoment() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            showToast("Đang tải lên... ⏳");
            const fileId = await uploadPhotoToTelegram(file);
            if (fileId) {
                database.ref('moments').push().set({ url: fileId, reactions: { love: 0 } })
                .then(() => showToast("Đã thêm ảnh! 📸"));
            }
        }
    };
    fileInput.click();
}

// 8. ĐĂNG NHẬP & ĐĂNG XUẤT
function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-pass').value.trim();
    const match = email.match(/^ban(\d+)@lop\.com$/);
    
    if (match && pass !== "") {
        loggedInUserId = parseInt(match[1]);
        localStorage.setItem('myApp_userId', loggedInUserId);
        document.getElementById('login-mask').style.display = 'none';
        document.getElementById('auth-btn').innerText = "Đăng xuất";
        updateUploadButton();
        const user = allMembers.find(m => m.id === loggedInUserId);
        showToast(`Chào ${user.nickname || user.name}! ✨`);
    } else { showToast("Thông tin không đúng!"); }
}

function toggleAuth() {
    if (loggedInUserId) {
        loggedInUserId = null;
        localStorage.removeItem('myApp_userId');
        document.getElementById('auth-btn').innerText = "Đăng nhập";
        updateUploadButton();
        showToast("Đã đăng xuất.");
        document.getElementById('member-modal').style.display = 'none';
    } else { document.getElementById('login-mask').style.display = 'flex'; }
}

function updateUploadButton() {
    const btn = document.getElementById('add-moment-btn');
    if (btn) btn.style.display = loggedInUserId ? 'block' : 'none';
}

// 9. LOGIC NHẠC
function loadPlaylist() {
    const container = document.getElementById('playlist-container');
    if(!container) return;
    container.innerHTML = '';
    songs.forEach((s, i) => {
        container.innerHTML += `
        <div class="music-item" onclick="playSong(${i})">
            <div class="track-circle ${s.class}">${s.id}</div>
            <div class="track-info"><span>${s.title}</span></div>
        </div>`;
    });
}

function playSong(idx, autoPlay = true) {
    currentSongIdx = idx;
    const s = songs[idx];
    const npIcon = document.getElementById('np-icon');
    if (npIcon) { 
        npIcon.className = `track-circle ${s.class}`; 
        npIcon.innerText = s.id; 
    }
    document.getElementById('np-title').innerText = "Đang phát: " + s.title;
    if(autoPlay && s.src) {
        audio.src = s.src;
        audio.play();
    }
}

// 10. TIỆN ÍCH THÔNG BÁO LÀM ĐẸP
function showToast(msg) {
    const t = document.getElementById("toast");
    t.innerText = msg; 
    t.className = "toast show";
    setTimeout(() => t.className = "toast", 3000);
}

function closeModal(e, id) { 
    if(e.target.id === id) {
        document.getElementById(id).style.display = 'none'; 
        if(id === 'member-modal') currentEditingId = null;
    }
}

window.onload = init;
