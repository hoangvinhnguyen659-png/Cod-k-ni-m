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
const WORKER_URL = "https://photo.hoangvinhnguyen659.workers.dev"; // Tự động xử lý dấu gạch chéo trong hàm getImgUrl

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
    // A. Lấy dữ liệu thành viên Realtime
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

    // B. Lấy dữ liệu khoảnh khắc
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
            if(m) updateZoomStats(m.reactions || {});
        }
    });

    if (loggedInUserId) {
        document.getElementById('auth-btn').innerText = "Đăng xuất";
    }
    updateUploadButton();
    loadPlaylist();
}

// 4. HÀM TRỢ GIÚP HIỂN THỊ ẢNH (Tối ưu xử lý dấu gạch chéo)
function getImgUrl(path) {
    if (!path) return '';
    // Nếu là link web http thì dùng luôn
    if (path.startsWith('http')) return path;
    
    // Nếu là file_id Telegram thì qua Worker (Xử lý dọn dẹp dấu / ở cuối URL)
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

    // ĐIỀU KIỆN: Chỉ hiện nút sửa nếu loggedInUserId (số thứ tự đã login) khớp với id hồ sơ đang mở
    const editBtn = document.getElementById('btn-edit-profile');
    if (loggedInUserId !== null && loggedInUserId === id) {
        editBtn.style.display = 'block';
    } else {
        editBtn.style.display = 'none';
    }
}

function enableEditMode() {
    const m = allMembers.find(x => x.id === currentEditingId);
    document.getElementById('edit-name').value = m.name.includes("Thành viên") ? "" : m.name;
    document.getElementById('edit-nickname').value = m.nickname || "";
    document.getElementById('edit-avatar').value = (m.avatar && !m.avatar.includes("AgA")) ? m.avatar : "";
    document.getElementById('edit-hobbies').value = m.hobbies === 'Chưa cập nhật.' ? "" : m.hobbies;
    document.getElementById('edit-message').value = m.message || "";
    
    document.getElementById('view-mode').style.display = 'none';
    document.getElementById('edit-mode').style.display = 'block';
}

// --- HÀM UPLOAD ẢNH LÊN TELEGRAM ---
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
            // Lấy file_id bản to nhất
            return res.result.photo[res.result.photo.length - 1].file_id;
        }
    } catch (err) {
        console.error("Lỗi Telegram:", err);
    }
    return null;
}

async function saveProfile() {
    const saveBtn = document.querySelector('#edit-mode .btn-action');
    const fileInput = document.getElementById('edit-file-input'); 
    let finalAvatar = document.getElementById('edit-avatar').value.trim();

    saveBtn.innerText = "Đang tải & lưu vĩnh viễn...";
    saveBtn.disabled = true;

    // Ưu tiên tải ảnh từ máy lên Telegram trước
    if (fileInput && fileInput.files.length > 0) {
        const fileId = await uploadPhotoToTelegram(fileInput.files[0]);
        if (fileId) finalAvatar = fileId;
    }

    const data = {
        name: document.getElementById('edit-name').value.trim() || `Thành viên ${currentEditingId}`,
        nickname: document.getElementById('edit-nickname').value.trim(),
        avatar: finalAvatar,
        hobbies: document.getElementById('edit-hobbies').value.trim() || 'Chưa cập nhật.',
        message: document.getElementById('edit-message').value.trim() || 'Yêu cả nhà!'
    };
    
    database.ref('users/' + currentEditingId).set(data).then(() => {
        showToast("Đã lưu lên mây thành công! ✨");
        saveBtn.innerText = "Lưu thay đổi";
        saveBtn.disabled = false;
        cancelEditMode();
    }).catch(err => {
        showToast("Lỗi kết nối Firebase! Kiểm tra Rules.");
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
    updateZoomStats(m.reactions || {});
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
    showToast("Đã thả tim! ❤️");
}

function updateZoomStats(reacts) {
    const icons = { love: '❤️', haha: '😆', wow: '😮', sad: '😢', angry: '😡' };
    let html = '';
    for (let key in icons) {
        if (reacts[key]) html += `<span style="margin: 0 8px;">${icons[key]} ${reacts[key]}</span> `;
    }
    document.getElementById('zoom-reaction-stats').innerHTML = html || 'Chưa có tương tác nào';
}

async function uploadNewMoment() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            showToast("Đang đẩy ảnh vào kho kỷ niệm... ⏳");
            const fileId = await uploadPhotoToTelegram(file);
            if (fileId) {
                database.ref('moments').push().set({ url: fileId, reactions: { love: 0 } })
                .then(() => showToast("Đã thêm khoảnh khắc mới! 📸"));
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
    } else { 
        showToast("Thông tin không đúng!"); 
    }
}

function toggleAuth() {
    if (loggedInUserId) {
        loggedInUserId = null;
        localStorage.removeItem('myApp_userId');
        document.getElementById('auth-btn').innerText = "Đăng nhập";
        updateUploadButton();
        showToast("Đã đăng xuất.");
        document.getElementById('member-modal').style.display = 'none';
    } else { 
        document.getElementById('login-mask').style.display = 'flex'; 
    }
}

function updateUploadButton() {
    const btn = document.getElementById('add-moment-btn');
    if (btn) {
        // Chỉ hiện nút thêm ảnh khi đã đăng nhập
        btn.style.display = (loggedInUserId !== null) ? 'block' : 'none';
    }
}

// 9. LOGIC NHẠC (Sửa lại tên icon np-icon)
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

// 10. TIỆN ÍCH
function showToast(msg) {
    const t = document.getElementById("toast");
    t.innerText = msg; t.className = "toast show";
    setTimeout(() => t.className = "toast", 3000);
}

function closeModal(e, id) { 
    if(e.target.id === id) {
        document.getElementById(id).style.display = 'none'; 
        if(id === 'member-modal') currentEditingId = null;
    }
}

window.onload = init;
