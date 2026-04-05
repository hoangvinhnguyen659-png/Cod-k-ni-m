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
for (let i = 1; i <= 42; i++) {
    allMembers.push({ 
        id: i, 
        name: `Thành viên ${i}`, 
        avatar: '', 
        hobbies: 'Chưa cập nhật.', 
        message: 'Yêu cả nhà!' 
    });
}

let allMoments = [];
let loggedInUserId = null;
let currentEditingId = null;
let currentMomentIdx = 0; 
let visibleMembersCount = 9;

// Danh sách nhạc với cấu hình màu sắc và class tương ứng HTML
const songs = [
    { title: "Lời Pháo Hoa Rực Rỡ", color: "#ff7675", class: "circle-coral", src: "" },
    { title: "Tháng Năm Không Quên", color: "#48dbfb", class: "circle-cyan", src: "" },
    { title: "Tình Bạn Diệu Kỳ", color: "#74b9ff", class: "circle-blue", src: "" }
];
let currentSongIdx = 0;
const audio = document.getElementById('main-audio');

// 3. KHỞI TẠO
function init() {
    // Lấy dữ liệu thành viên
    database.ref('users').on('value', snap => {
        if (snap.exists()) {
            const data = snap.val();
            for (const key in data) {
                const idx = allMembers.findIndex(m => m.id == key);
                if (idx !== -1) allMembers[idx] = { ...allMembers[idx], ...data[key] };
            }
        }
        renderMembers();
    });

    // Lấy dữ liệu khoảnh khắc
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
            const current = allMoments[currentMomentIdx];
            if(current) updateZoomStats(current.reactions || {});
        }
    });

    loadPlaylist();
    updateUploadButton(); // Kiểm tra ẩn hiện nút thêm ảnh lúc đầu
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
    showToast("Đã hiện tất cả 42 thành viên!");
}

// 5. MODAL CHI TIẾT THÀNH VIÊN
function openMemberModal(id) {
    currentEditingId = id;
    const m = allMembers.find(x => x.id === id);
    
    document.getElementById('modal-member-name').innerText = m.name;
    document.getElementById('modal-member-hobbies').innerText = m.hobbies;
    document.getElementById('modal-member-message').innerText = m.message || 'Yêu cả nhà!';
    
    const img = document.getElementById('modal-member-img');
    const placeholder = document.getElementById('modal-placeholder-avatar');
    
    if (m.avatar) {
        img.src = m.avatar; img.style.display = 'block'; placeholder.style.display = 'none';
    } else {
        img.style.display = 'none'; placeholder.innerText = m.id; placeholder.style.display = 'flex';
    }

    // Chỉ hiện nút sửa nếu đang đăng nhập đúng tài khoản này
    document.getElementById('btn-edit-profile').style.display = (loggedInUserId === id) ? 'block' : 'none';
    
    cancelEditMode();
    document.getElementById('member-modal').style.display = 'flex';
}

function enableEditMode() {
    const m = allMembers.find(x => x.id === currentEditingId);
    document.getElementById('edit-name').value = m.name.includes("Thành viên") ? "" : m.name;
    document.getElementById('edit-avatar').value = m.avatar;
    document.getElementById('edit-hobbies').value = m.hobbies === 'Chưa cập nhật.' ? "" : m.hobbies;
    document.getElementById('edit-message').value = m.message || '';
    
    document.getElementById('view-mode').style.display = 'none';
    document.getElementById('edit-mode').style.display = 'block';
}

function saveProfile() {
    const data = {
        name: document.getElementById('edit-name').value.trim() || `Thành viên ${currentEditingId}`,
        avatar: document.getElementById('edit-avatar').value.trim(),
        hobbies: document.getElementById('edit-hobbies').value.trim() || 'Chưa cập nhật.',
        message: document.getElementById('edit-message').value.trim() || 'Yêu cả nhà!'
    };
    
    database.ref('users/' + currentEditingId).set(data).then(() => {
        showToast("Cập nhật thành công ✨");
        openMemberModal(currentEditingId);
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
        container.innerHTML += `
            <div class="moment-card" onclick="openMoment(${idx})">
                <img src="${m.url}">
            </div>`;
    });
}

function openMoment(idx) {
    currentMomentIdx = idx;
    const m = allMoments[idx];
    if(!m) return;
    document.getElementById('zoom-img').src = m.url;
    updateZoomStats(m.reactions || {});
    document.getElementById('moment-modal').style.display = 'flex';
}

function changeMoment(step) {
    if(allMoments.length === 0) return;
    currentMomentIdx += step;
    if (currentMomentIdx < 0) currentMomentIdx = allMoments.length - 1;
    if (currentMomentIdx >= allMoments.length) currentMomentIdx = 0;
    
    openMoment(currentMomentIdx);
}

function addReaction(type) {
    const m = allMoments[currentMomentIdx];
    if(!m) return;
    database.ref(`moments/${m.id}/reactions/${type}`).transaction(count => (count || 0) + 1);
    showToast("Cảm ơn bạn đã tương tác! ❤️");
}

function updateZoomStats(reacts) {
    const icons = { love: '❤️', haha: '😆', wow: '😮', sad: '😢', angry: '😡' };
    let html = '';
    for (let key in icons) {
        if (reacts[key]) html += `<span>${icons[key]} ${reacts[key]}</span> `;
    }
    document.getElementById('zoom-reaction-stats').innerHTML = html;
}

function uploadNewMoment() {
    const url = prompt("Dán link ảnh (URL) bạn muốn chia sẻ:");
    if (url && url.startsWith('http')) {
        const newRef = database.ref('moments').push();
        newRef.set({ url: url, reactions: { love: 0 } }).then(() => showToast("Đã thêm ảnh vào kho kỷ niệm!"));
    } else if (url) {
        alert("Link ảnh không hợp lệ!");
    }
}

// 7. HỆ THỐNG ĐĂNG NHẬP & QUYỀN HẠN
function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-pass').value.trim();
    const match = email.match(/^ban(\d+)@lop\.com$/);
    
    if (match && pass !== "") {
        loggedInUserId = parseInt(match[1]);
        document.getElementById('login-mask').style.display = 'none';
        document.getElementById('auth-btn').innerText = "Đăng xuất";
        updateUploadButton(); // Hiện nút thêm ảnh
        showToast(`Chào mừng bạn số ${loggedInUserId} quay trở lại!`);
    } else { 
        showToast("Sai tài khoản hoặc mật khẩu!"); 
    }
}

function toggleAuth() {
    if (loggedInUserId) {
        loggedInUserId = null;
        document.getElementById('auth-btn').innerText = "Đăng nhập";
        updateUploadButton(); // Ẩn nút thêm ảnh
        showToast("Đã đăng xuất.");
        document.getElementById('member-modal').style.display = 'none';
    } else { 
        document.getElementById('login-mask').style.display = 'flex'; 
    }
}

// Hàm kiểm tra ẩn hiện nút thêm ảnh theo trạng thái đăng nhập
function updateUploadButton() {
    const btn = document.getElementById('add-moment-btn');
    if (btn) {
        btn.style.display = loggedInUserId ? 'block' : 'none';
    }
}

// 8. LOGIC PHÁT NHẠC (CUSTOM THEO ICON VÒNG TRÒN)
function loadPlaylist() {
    const container = document.getElementById('playlist-container');
    if(!container) return;
    container.innerHTML = '';
    songs.forEach((s, i) => {
        container.innerHTML += `
        <div class="music-item" onclick="playSong(${i})">
            <div class="track-circle ${s.class}">${i + 1}</div>
            <div class="track-info"><span>${s.title}</span></div>
        </div>`;
    });
    // Khởi tạo bài hát đầu tiên (không tự phát)
    playSong(0, false); 
}

function playSong(idx, autoPlay = true) {
    currentSongIdx = idx;
    const s = songs[idx];
    
    const npIcon = document.getElementById('np-icon');
    // Cập nhật class để đổi màu vòng tròn
    npIcon.className = `track-circle ${s.class}`;
    npIcon.innerText = idx + 1;
    document.getElementById('np-title').innerText = "Đang phát: " + s.title;

    if(autoPlay) {
        if(s.src) { 
            audio.src = s.src; 
            audio.play(); 
            document.getElementById('play-pause-btn').innerHTML = '<i class="fas fa-pause"></i>';
        } else { 
            showToast("Đang giả lập phát: " + s.title); 
        }
    }
}

function togglePlayMusic() {
    if(audio.paused && audio.src) {
        audio.play();
        document.getElementById('play-pause-btn').innerHTML = '<i class="fas fa-pause"></i>';
    } else if(!audio.paused && audio.src) {
        audio.pause();
        document.getElementById('play-pause-btn').innerHTML = '<i class="fas fa-play"></i>';
    } else {
        playSong(currentSongIdx);
    }
}

function prevSong() { playSong(currentSongIdx > 0 ? currentSongIdx - 1 : songs.length - 1); }
function nextSong() { playSong(currentSongIdx < songs.length - 1 ? currentSongIdx + 1 : 0); }

// 9. TIỆN ÍCH
function showToast(msg) {
    const t = document.getElementById("toast");
    if(!t) return;
    t.innerText = msg; t.className = "toast show";
    setTimeout(() => t.className = "toast", 3000);
}

function closeModal(e, id) { 
    if(e.target.id === id) document.getElementById(id).style.display = 'none'; 
}

// CHẠY KHỞI TẠO KHI TRANG LOAD XONG
window.onload = init;
