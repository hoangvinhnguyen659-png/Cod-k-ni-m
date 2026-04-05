// 1. CẤU HÌNH (GIỮ NGUYÊN)
const firebaseConfig = {
    apiKey: "AIzaSyCNzWm4KPPNA06L0RCxK6blA2-SudRVw3U",
    databaseURL: "https://cod-ki-niem-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "cod-ki-niem",
    storageBucket: "cod-ki-niem.appspot.com"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const database = firebase.database();

const TELEGRAM_BOT_TOKEN = "8727433515:AAGcXg95sgxRghZcQXCzDO0bParEmjdq-uQ"; 
const TELEGRAM_CHAT_ID = "-1003326339658"; 
const WORKER_URL = "https://photo.hoangvinhnguyen659.workers.dev"; 

// 2. BIẾN TOÀN CỤC (GIỮ LOGIC CŨ)
let allMembers = [];
let allMoments = [];
let loggedInUserId = localStorage.getItem('myApp_userId') ? parseInt(localStorage.getItem('myApp_userId')) : null;
let currentEditingId = null;
let currentMomentIdx = 0; 
let visibleMembersCount = 12; // Bội số của 3 để đẹp Grid

const songs = [
    { id: 1, title: "Lời Pháo Hoa Rực Rỡ", class: "circle-coral", src: "" },
    { id: 2, title: "Tháng Năm Không Quên", class: "circle-cyan", src: "" },
    { id: 3, title: "Tình Bạn Diệu Kỳ", class: "circle-blue", src: "" }
];
let currentSongIdx = 0;
const audio = document.getElementById('main-audio');

// 3. KHỞI TẠO (KÈM CSS GIAO DIỆN MỚI)
function init() {
    applyResponsiveStyles(); // Tự động sửa giao diện theo yêu cầu mới

    // Lấy dữ liệu thành viên
    database.ref('users').on('value', snap => {
        let tempMembers = [];
        for (let i = 1; i <= 42; i++) {
            tempMembers.push({ 
                id: i, name: `Thành viên ${i}`, nickname: '', avatar: '', 
                hobbies: 'Chưa cập nhật.', message: 'Yêu cả nhà!' 
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

    // Lấy ảnh kỷ niệm (Giữ nguyên logic Reaction Realtime)
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

// 4. CSS INJECTOR (Xử lý Grid 3 cột, Header & Ẩn URL)
function applyResponsiveStyles() {
    const style = document.createElement('style');
    style.innerHTML = `
        /* Header: Thanh Xuân trái, Đăng nhập phải */
        header, .nav-container { 
            display: flex !important; 
            justify-content: space-between !important; 
            align-items: center !important; 
            padding: 10px 15px !important;
            width: 100%; box-sizing: border-box;
        }
        .logo-text { margin-right: auto !important; }
        #auth-btn { margin-left: auto !important; }

        /* Grid 3 cột trên mobile */
        #member-container {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 10px !important;
            padding: 10px !important;
            width: 100% !important;
            box-sizing: border-box !important;
        }
        .member-card { width: 100% !important; margin: 0 !important; }
        .member-card img, .placeholder-avatar { 
            width: 75px !important; height: 75px !important; 
        }

        /* Ẩn dòng URL và Label */
        #edit-avatar, label[for="edit-avatar"] { display: none !important; }

        /* Tablet/PC co giãn */
        @media (min-width: 768px) {
            #member-container { grid-template-columns: repeat(6, 1fr) !important; }
        }
    `;
    document.head.appendChild(style);
}

// 5. HIỂN THỊ THÀNH VIÊN
function renderMembers() {
    const container = document.getElementById('member-container');
    if (!container) return;
    container.innerHTML = '';
    const toShow = allMembers.slice(0, visibleMembersCount);
    toShow.forEach(m => {
        let avatarSrc = getImgUrl(m.avatar);
        let avatarTag = m.avatar ? `<img src="${avatarSrc}">` : `<div class="placeholder-avatar">${m.id}</div>`;
        container.innerHTML += `
            <div class="member-card" onclick="openMemberModal(${m.id})">
                ${avatarTag}
                <div class="member-name-plate" style="font-size: 11px;">${m.name}</div>
            </div>`;
    });
}

function loadAllMembers() { 
    visibleMembersCount = 42; 
    renderMembers(); 
    if(document.getElementById('btn-load-more-members'))
        document.getElementById('btn-load-more-members').style.display = 'none';
}

// 6. CHI TIẾT & SỬA HỒ SƠ (SẠCH PLACEHOLDER)
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
        img.src = getImgUrl(m.avatar); img.style.display = 'block'; placeholder.style.display = 'none';
    } else {
        img.style.display = 'none'; placeholder.innerText = m.id; placeholder.style.display = 'flex';
    }

    const editBtn = document.getElementById('btn-edit-profile');
    editBtn.style.display = (loggedInUserId === id) ? 'block' : 'none';
}

function enableEditMode() {
    const m = allMembers.find(x => x.id === currentEditingId);
    
    // Ẩn nội dung ghi sẵn (ví dụ, thật, trước đây)
    const nameInp = document.getElementById('edit-name');
    nameInp.value = m.name.includes("Thành viên") ? "" : m.name;
    nameInp.placeholder = "Họ và Tên";

    const nickInp = document.getElementById('edit-nickname');
    nickInp.value = m.nickname || "";
    nickInp.placeholder = "Biệt danh";

    const hobbyInp = document.getElementById('edit-hobbies');
    hobbyInp.value = m.hobbies === 'Chưa cập nhật.' ? "" : m.hobbies;
    hobbyInp.placeholder = "Sở thích";

    const msgInp = document.getElementById('edit-message');
    msgInp.value = m.message === 'Yêu cả nhà!' ? "" : m.message;
    msgInp.placeholder = "Lời nhắn của bạn";

    // Nút Lưu ngắn gọn
    const saveBtn = document.querySelector('button[onclick="saveProfile()"]');
    if (saveBtn) saveBtn.innerText = "Lưu";

    // Setup Click-to-Upload Avatar Tròn
    setupEditAvatarUI(m);

    document.getElementById('view-mode').style.display = 'none';
    document.getElementById('edit-mode').style.display = 'block';
}

function setupEditAvatarUI(m) {
    const fileInput = document.getElementById('edit-file-input');
    if(fileInput) fileInput.style.display = 'none';

    let avatarArea = document.getElementById('avatar-click-area');
    if (!avatarArea) {
        avatarArea = document.createElement('div');
        avatarArea.id = 'avatar-click-area';
        Object.assign(avatarArea.style, {
            width: '100px', height: '100px', borderRadius: '50%', border: '2px dashed #0984e3',
            margin: '0 auto 15px', cursor: 'pointer', overflow: 'hidden', position: 'relative',
            display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f2f6'
        });
        avatarArea.innerHTML = `
            <img id="edit-prev-img" style="width:100%; height:100%; object-fit:cover; display:none;">
            <div id="edit-prev-place" style="font-size:1.5rem; font-weight:bold; color:#999;"></div>
            <div style="position:absolute; bottom:0; width:100%; background:rgba(0,0,0,0.5); color:white; font-size:9px; padding:3px 0; text-align:center;">ĐỔI ẢNH</div>
        `;
        document.getElementById('edit-mode').prepend(avatarArea);
        avatarArea.onclick = () => fileInput.click();

        fileInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            showToast("Đang tải ảnh... ⏳");
            const fileId = await uploadPhotoToTelegram(file);
            if (fileId) {
                document.getElementById('edit-avatar').value = fileId;
                document.getElementById('edit-prev-img').src = getImgUrl(fileId);
                document.getElementById('edit-prev-img').style.display = 'block';
                document.getElementById('edit-prev-place').style.display = 'none';
                showToast("Đã sẵn sàng! ✨");
            }
        };
    }
    const pImg = document.getElementById('edit-prev-img');
    const pPlace = document.getElementById('edit-prev-place');
    if (m.avatar) {
        pImg.src = getImgUrl(m.avatar); pImg.style.display = 'block'; pPlace.style.display = 'none';
    } else {
        pImg.style.display = 'none'; pPlace.innerText = m.id; pPlace.style.display = 'block';
    }
}

// 7. KHOẢNH KHẮC (GIỮ NGUYÊN REACTION & XÓA)
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
    currentMomentIdx = (currentMomentIdx + step + allMoments.length) % allMoments.length;
    openMoment(currentMomentIdx);
}

function addReaction(type) {
    const m = allMoments[currentMomentIdx];
    if(!m) return;
    database.ref(`moments/${m.id}/reactions/${type}`).transaction(c => (c || 0) + 1);
}

function updateZoomStats(reacts, momentObj) {
    const icons = { love: '❤️', haha: '😆', wow: '😮', sad: '😢', angry: '😡' };
    let html = '';
    for (let key in icons) if (reacts[key]) html += `<span style="margin: 0 8px;">${icons[key]} ${reacts[key]}</span> `;
    document.getElementById('zoom-reaction-stats').innerHTML = html || 'Chưa có tương tác';
    
    const delBtn = document.getElementById('btn-delete-moment');
    if (delBtn) delBtn.style.display = loggedInUserId ? 'inline-block' : 'none';
}

function deleteMoment() {
    const m = allMoments[currentMomentIdx];
    if (m && confirm("Xóa vĩnh viễn ảnh này?")) {
        database.ref('moments/' + m.id).remove().then(() => {
            showToast("Đã xóa! 🗑️");
            document.getElementById('moment-modal').style.display = 'none';
        });
    }
}

// 8. LOGIC CHUNG (AUTH, UPLOAD, NHẠC)
async function uploadPhotoToTelegram(file) {
    const formData = new FormData();
    formData.append('chat_id', TELEGRAM_CHAT_ID); formData.append('photo', file);
    try {
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, { method: 'POST', body: formData });
        const res = await response.json();
        return res.ok ? res.result.photo[res.result.photo.length - 1].file_id : null;
    } catch (err) { return null; }
}

async function saveProfile() {
    const btn = document.querySelector('button[onclick="saveProfile()"]');
    btn.innerText = "Chờ..."; btn.disabled = true;
    const data = {
        name: document.getElementById('edit-name').value.trim() || `Thành viên ${currentEditingId}`,
        nickname: document.getElementById('edit-nickname').value.trim(),
        avatar: document.getElementById('edit-avatar').value.trim(),
        hobbies: document.getElementById('edit-hobbies').value.trim() || 'Chưa cập nhật.',
        message: document.getElementById('edit-message').value.trim() || 'Yêu cả nhà!'
    };
    database.ref('users/' + currentEditingId).set(data).then(() => {
        showToast("Đã lưu! ✨");
        btn.innerText = "Lưu"; btn.disabled = false;
        cancelEditMode();
    });
}

function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const match = email.match(/^ban(\d+)@lop\.com$/);
    if (match) {
        loggedInUserId = parseInt(match[1]);
        localStorage.setItem('myApp_userId', loggedInUserId);
        location.reload(); 
    } else { showToast("Sai thông tin!"); }
}

function toggleAuth() {
    if (loggedInUserId) { localStorage.removeItem('myApp_userId'); location.reload(); }
    else { document.getElementById('login-mask').style.display = 'flex'; }
}

function updateUploadButton() {
    const btn = document.getElementById('add-moment-btn');
    if (btn) btn.style.display = loggedInUserId ? 'block' : 'none';
}

function getImgUrl(p) { return p ? (p.startsWith('http') ? p : `${WORKER_URL}?file_id=${p}`) : ''; }

function showToast(msg) {
    const t = document.getElementById("toast");
    t.innerText = msg; t.className = "toast show";
    setTimeout(() => t.className = "toast", 3000);
}

function cancelEditMode() {
    document.getElementById('view-mode').style.display = 'block';
    document.getElementById('edit-mode').style.display = 'none';
}

function closeModal(e, id) { if(e.target.id === id) document.getElementById(id).style.display = 'none'; }

function loadPlaylist() {
    const container = document.getElementById('playlist-container');
    if(!container) return;
    container.innerHTML = songs.map((s, i) => `
        <div class="music-item" onclick="showToast('Đang phát: ${s.title}')">
            <div class="track-circle ${s.class}">${s.id}</div>
            <div class="track-info"><span>${s.title}</span></div>
        </div>`).join('');
}

window.onload = init;
