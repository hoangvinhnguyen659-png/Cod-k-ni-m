// 1. CẤU HÌNH FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyCNzWm4KPPNA06L0RCxK6blA2-SudRVw3U",
    databaseURL: "https://cod-ki-niem-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "cod-ki-niem",
    storageBucket: "cod-ki-niem.appspot.com"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// 2. BIẾN TOÀN CỤC
let allMembers = [];
let allMoments = [];
// Khôi phục trạng thái đăng nhập từ bộ nhớ trình duyệt
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
        // Tạo danh sách 42 người mặc định
        let tempMembers = [];
        for (let i = 1; i <= 42; i++) {
            tempMembers.push({ 
                id: i, name: `Thành viên ${i}`, nickname: '', avatar: '', 
                hobbies: 'Chưa cập nhật.', message: 'Yêu cả nhà!' 
            });
        }

        // Nếu Firebase có dữ liệu, đè dữ liệu đó lên danh sách mặc định
        if (snap.exists()) {
            const data = snap.val();
            for (const key in data) {
                const idx = tempMembers.findIndex(m => m.id == key);
                if (idx !== -1) tempMembers[idx] = { ...tempMembers[idx], ...data[key] };
            }
        }
        
        allMembers = tempMembers;
        renderMembers();

        // Cập nhật Modal nếu đang mở để thấy dữ liệu mới nhất ngay lập tức
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
    });

    // C. Kiểm tra trạng thái đăng nhập để hiển thị giao diện
    if (loggedInUserId) {
        document.getElementById('auth-btn').innerText = "Đăng xuất";
    }
    updateUploadButton();
    loadPlaylist();
}

// 4. HIỂN THỊ THÀNH VIÊN
function renderMembers() {
    const container = document.getElementById('member-container');
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < visibleMembersCount && i < allMembers.length; i++) {
        const m = allMembers[i];
        let avatar = m.avatar ? `<img src="${m.avatar}">` : `<div class="placeholder-avatar">${m.id}</div>`;
        container.innerHTML += `
            <div class="member-card" onclick="openMemberModal(${m.id})">
                ${avatar}
                <div class="member-name-plate">${m.name}</div>
            </div>`;
    }
}

function loadAllMembers() { 
    visibleMembersCount = 42; 
    renderMembers(); 
    document.getElementById('btn-load-more-members').style.display = 'none';
}

// 5. CHI TIẾT THÀNH VIÊN
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
        img.src = m.avatar; img.style.display = 'block'; placeholder.style.display = 'none';
    } else {
        img.style.display = 'none'; placeholder.innerText = m.id; placeholder.style.display = 'flex';
    }

    // Nút sửa chỉ hiện khi ID đang xem trùng với ID đã đăng nhập
    document.getElementById('btn-edit-profile').style.display = (loggedInUserId === id) ? 'block' : 'none';
}

function enableEditMode() {
    const m = allMembers.find(x => x.id === currentEditingId);
    document.getElementById('edit-name').value = m.name.includes("Thành viên") ? "" : m.name;
    document.getElementById('edit-nickname').value = m.nickname || "";
    document.getElementById('edit-avatar').value = m.avatar || "";
    document.getElementById('edit-hobbies').value = m.hobbies === 'Chưa cập nhật.' ? "" : m.hobbies;
    document.getElementById('edit-message').value = m.message || "";
    
    document.getElementById('view-mode').style.display = 'none';
    document.getElementById('edit-mode').style.display = 'block';
}

function saveProfile() {
    const data = {
        name: document.getElementById('edit-name').value.trim() || `Thành viên ${currentEditingId}`,
        nickname: document.getElementById('edit-nickname').value.trim(),
        avatar: document.getElementById('edit-avatar').value.trim(),
        hobbies: document.getElementById('edit-hobbies').value.trim() || 'Chưa cập nhật.',
        message: document.getElementById('edit-message').value.trim() || 'Yêu cả nhà!'
    };
    
    database.ref('users/' + currentEditingId).set(data).then(() => {
        showToast("Đã lưu vĩnh viễn lên mây! ✨");
        cancelEditMode();
    });
}

function cancelEditMode() {
    document.getElementById('view-mode').style.display = 'block';
    document.getElementById('edit-mode').style.display = 'none';
}

// 6. KHOẢNH KHẮC & TƯƠNG TÁC
function renderMoments() {
    const container = document.getElementById('moment-container');
    if (!container) return;
    container.innerHTML = '';
    allMoments.forEach((m, idx) => {
        container.innerHTML += `<div class="moment-card" onclick="openMoment(${idx})"><img src="${m.url}"></div>`;
    });
}

function openMoment(idx) {
    if(allMoments.length === 0) return;
    currentMomentIdx = idx;
    const m = allMoments[idx];
    document.getElementById('zoom-img').src = m.url;
    updateZoomStats(m.reactions || {});
    document.getElementById('moment-modal').style.display = 'flex';
}

function addReaction(type) {
    const m = allMoments[currentMomentIdx];
    if(!m) return;
    database.ref(`moments/${m.id}/reactions/${type}`).transaction(count => (count || 0) + 1);
}

function updateZoomStats(reacts) {
    const icons = { love: '❤️', haha: '😆', wow: '😮', sad: '😢', angry: '😡' };
    let html = '';
    for (let key in icons) {
        if (reacts[key]) html += `<span style="margin: 0 8px;">${icons[key]} ${reacts[key]}</span> `;
    }
    document.getElementById('zoom-reaction-stats').innerHTML = html || 'Chưa có tương tác nào';
}

function uploadNewMoment() {
    const url = prompt("Dán link ảnh (URL):");
    if (url && url.startsWith('http')) {
        database.ref('moments').push().set({ url: url, reactions: { love: 0 } }).then(() => showToast("Đã thêm ảnh! 📸"));
    }
}

// 7. ĐĂNG NHẬP & ĐĂNG XUẤT
function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-pass').value.trim();
    const match = email.match(/^ban(\d+)@lop\.com$/);
    
    if (match && pass !== "") {
        loggedInUserId = parseInt(match[1]);
        // Lưu trạng thái đăng nhập vào trình duyệt
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
        localStorage.removeItem('myApp_userId'); // Xóa phiên đăng nhập
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
    if (btn) btn.style.display = loggedInUserId ? 'block' : 'none';
}

// 8. LOGIC NHẠC (Giữ nguyên)
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
    playSong(1, false); 
}

function playSong(idx, autoPlay = true) {
    currentSongIdx = idx;
    const s = songs[idx];
    const npIcon = document.getElementById('np-icon');
    if (npIcon) { npIcon.className = `track-circle ${s.class}`; npIcon.innerText = s.id; }
    document.getElementById('np-title').innerText = "Đang phát: " + s.title;
}

// 9. TIỆN ÍCH
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
