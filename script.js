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
let visibleMembersCount = 12;

const songs = [
    { id: 1, title: "Lời Pháo Hoa Rực Rỡ", class: "circle-coral", src: "" },
    { id: 2, title: "Tháng Năm Không Quên", class: "circle-cyan", src: "" },
    { id: 3, title: "Tình Bạn Diệu Kỳ", class: "circle-blue", src: "" }
];
let currentSongIdx = 0;
const audio = document.getElementById('main-audio');

// 3. KHỞI TẠO
function init() {
    // Tự động thêm CSS Responsive để đảm bảo co giãn và Grid 3 cột
    applyGlobalStyles();

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

    database.ref('moments').on('value', snap => {
        allMoments = [];
        if (snap.exists()) {
            const data = snap.val();
            for (const id in data) {
                allMoments.push({ id, ...data[id] });
            }
        }
        renderMoments();
    });

    if (loggedInUserId) {
        document.getElementById('auth-btn').innerText = "Đăng xuất";
    }
    updateUploadButton();
    loadPlaylist();
}

// 4. CSS INJECTOR (Đảm bảo co giãn & Header & Grid 3 cột)
function applyGlobalStyles() {
    const style = document.createElement('style');
    style.innerHTML = `
        /* Header: Thanh xuân bên trái, Đăng nhập bên phải */
        header { 
            display: flex !important; 
            justify-content: space-between !important; 
            align-items: center !important; 
            padding: 10px 15px !important; 
            width: 100%; box-sizing: border-box;
        }
        .logo-text { margin: 0 !important; font-size: 1.2rem; }
        #auth-btn { margin: 0 !important; padding: 6px 12px; }

        /* Grid 3 thành viên mỗi hàng trên mobile */
        #member-container {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 10px !important;
            padding: 10px !important;
            width: 100% !important;
            box-sizing: border-box !important;
        }
        .member-card { width: 100% !important; margin: 0 !important; cursor: pointer; }
        .member-card img, .placeholder-avatar { 
            width: 75px !important; height: 75px !important; 
            border-radius: 50%; object-fit: cover; margin: 0 auto;
        }

        /* Responsive cho PC */
        @media (min-width: 768px) {
            #member-container { grid-template-columns: repeat(6, 1fr) !important; gap: 20px !important; }
            .member-card img, .placeholder-avatar { width: 100px !important; height: 100px !important; }
        }

        /* Ẩn URL Input */
        #edit-avatar, label[for="edit-avatar"] { display: none !important; }
    `;
    document.head.appendChild(style);
}

// 5. HÀM TRỢ GIÚP ẢNH
function getImgUrl(path) {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${WORKER_URL.replace(/\/$/, "")}?file_id=${path}`;
}

// 6. HIỂN THỊ THÀNH VIÊN
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
                <div class="member-name-plate" style="font-size: 11px; margin-top: 5px;">${m.name}</div>
            </div>`;
    }
}

// 7. CHI TIẾT & SỬA HỒ SƠ
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
    
    // Xử lý các Input: Xóa chữ ghi sẵn, đặt Placeholder sạch sẽ
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
    msgInp.placeholder = "Lời nhắn";

    // Nút Lưu ngắn gọn
    const saveBtn = document.querySelector('button[onclick="saveProfile()"]');
    if (saveBtn) {
        saveBtn.innerText = "Lưu";
        saveBtn.innerHTML = "Lưu"; // Bỏ icon
    }

    // Xử lý Avatar Click-to-Upload
    setupAvatarUpload(m);

    document.getElementById('view-mode').style.display = 'none';
    document.getElementById('edit-mode').style.display = 'block';
}

function setupAvatarUpload(m) {
    const fileInput = document.getElementById('edit-file-input');
    const editMode = document.getElementById('edit-mode');

    // Ẩn các thành phần thừa
    if (fileInput) {
        fileInput.style.display = 'none';
        const label = fileInput.previousElementSibling;
        if (label && label.tagName === 'LABEL') label.style.display = 'none';
    }

    let avatarArea = document.getElementById('avatar-click-area');
    if (!avatarArea) {
        avatarArea = document.createElement('div');
        avatarArea.id = 'avatar-click-area';
        Object.assign(avatarArea.style, {
            width: '100px', height: '100px', borderRadius: '50%', border: '2px dashed #0984e3',
            margin: '0 auto 15px', cursor: 'pointer', overflow: 'hidden', position: 'relative',
            display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f6fa'
        });
        avatarArea.innerHTML = `
            <img id="edit-prev-img" style="width:100%; height:100%; object-fit:cover; display:none;">
            <div id="edit-prev-place" style="font-size:1.5rem; color:#b2bec3; font-weight:bold;"></div>
            <div style="position:absolute; bottom:0; width:100%; background:rgba(0,0,0,0.5); color:white; font-size:9px; padding:3px 0; text-align:center;">ĐỔI ẢNH</div>
        `;
        editMode.prepend(avatarArea);
        avatarArea.onclick = () => fileInput.click();

        fileInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            // Preview ngay
            const reader = new FileReader();
            reader.onload = (ev) => {
                document.getElementById('edit-prev-img').src = ev.target.result;
                document.getElementById('edit-prev-img').style.display = 'block';
                document.getElementById('edit-prev-place').style.display = 'none';
            };
            reader.readAsDataURL(file);

            showToast("Đang tải ảnh... ⏳");
            const fileId = await uploadPhotoToTelegram(file);
            if (fileId) {
                document.getElementById('edit-avatar').value = fileId;
                showToast("Đã tải ảnh xong! ✨");
            }
        };
    }

    const img = document.getElementById('edit-prev-img');
    const place = document.getElementById('edit-prev-place');
    if (m.avatar) {
        img.src = getImgUrl(m.avatar); img.style.display = 'block'; place.style.display = 'none';
    } else {
        img.style.display = 'none'; place.innerText = m.id; place.style.display = 'block';
    }
}

// 8. TELEGRAM & SAVE
async function uploadPhotoToTelegram(file) {
    const formData = new FormData();
    formData.append('chat_id', TELEGRAM_CHAT_ID);
    formData.append('photo', file);
    try {
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, { method: 'POST', body: formData });
        const res = await response.json();
        return res.ok ? res.result.photo[res.result.photo.length - 1].file_id : null;
    } catch (err) { return null; }
}

async function saveProfile() {
    const saveBtn = document.querySelector('button[onclick="saveProfile()"]');
    saveBtn.innerText = "Đang lưu..."; saveBtn.disabled = true;

    const data = {
        name: document.getElementById('edit-name').value.trim() || `Thành viên ${currentEditingId}`,
        nickname: document.getElementById('edit-nickname').value.trim(),
        avatar: document.getElementById('edit-avatar').value.trim(),
        hobbies: document.getElementById('edit-hobbies').value.trim() || 'Chưa cập nhật.',
        message: document.getElementById('edit-message').value.trim() || 'Yêu cả nhà!'
    };
    
    database.ref('users/' + currentEditingId).set(data).then(() => {
        showToast("Thành công! ✨");
        saveBtn.innerText = "Lưu"; saveBtn.disabled = false;
        cancelEditMode();
    });
}

function cancelEditMode() {
    document.getElementById('view-mode').style.display = 'block';
    document.getElementById('edit-mode').style.display = 'none';
}

// 9. KHOẢNH KHẮC & TƯƠNG TÁC
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
    document.getElementById('moment-modal').style.display = 'flex';
}

async function uploadNewMoment() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file'; fileInput.accept = 'image/*';
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

// 10. AUTH & UTILS
function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const match = email.match(/^ban(\d+)@lop\.com$/);
    if (match) {
        loggedInUserId = parseInt(match[1]);
        localStorage.setItem('myApp_userId', loggedInUserId);
        location.reload(); 
    } else { showToast("Thông tin không đúng!"); }
}

function toggleAuth() {
    if (loggedInUserId) {
        localStorage.removeItem('myApp_userId');
        location.reload();
    } else { document.getElementById('login-mask').style.display = 'flex'; }
}

function updateUploadButton() {
    const btn = document.getElementById('add-moment-btn');
    if (btn) btn.style.display = loggedInUserId ? 'block' : 'none';
}

function loadPlaylist() {
    const container = document.getElementById('playlist-container');
    if(!container) return;
    container.innerHTML = '';
    songs.forEach((s, i) => {
        container.innerHTML += `<div class="music-item" onclick="playSong(${i})"><span>${s.title}</span></div>`;
    });
}

function showToast(msg) {
    const t = document.getElementById("toast");
    t.innerText = msg; t.className = "toast show";
    setTimeout(() => t.className = "toast", 3000);
}

function closeModal(e, id) { 
    if(e.target.id === id) document.getElementById(id).style.display = 'none'; 
}

window.onload = init;
