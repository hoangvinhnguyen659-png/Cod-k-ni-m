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
    // Thêm mặc định mục message (Lời nhắn)
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
let currentMomentIdx = 0; // Lưu vị trí ảnh đang xem để chuyển ảnh
let visibleMembersCount = 9;

// 3. KHỞI TẠO & LẮNG NGHE DỮ LIỆU REALTIME
function init() {
    // Theo dõi dữ liệu Thành viên
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

    // Theo dõi dữ liệu Khoảnh khắc (Moments)
    database.ref('moments').on('value', snap => {
        allMoments = [];
        if (snap.exists()) {
            const data = snap.val();
            for (const id in data) {
                allMoments.push({ id, ...data[id] });
            }
        }
        renderMoments();
        // Nếu đang mở modal ảnh thì cập nhật số lượt thả tim ngay lập tức
        if (document.getElementById('moment-modal').style.display === 'flex') {
            updateZoomStats(allMoments[currentMomentIdx].reactions || {});
        }
    });

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
    showToast("Đã hiện tất cả 42 thành viên!");
}

// 5. MODAL CHI TIẾT & CHỈNH SỬA (CÓ LỜI NHẮN)
function openMemberModal(id) {
    currentEditingId = id;
    const m = allMembers.find(x => x.id === id);
    
    // Đổ dữ liệu vào giao diện xem
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

    // Phân quyền: Chỉ chủ tài khoản mới thấy nút sửa
    document.getElementById('btn-edit-profile').style.display = (loggedInUserId === id) ? 'block' : 'none';
    
    cancelEditMode();
    document.getElementById('member-modal').style.display = 'flex';
}

function enableEditMode() {
    const m = allMembers.find(x => x.id === currentEditingId);
    // Hỗ trợ gõ tiếng Việt có dấu
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

// 6. KHOẢNH KHẮC (MOMENTS) - CHUYỂN ẢNH & THẢ TIM CUSTOM
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
    document.getElementById('zoom-img').src = m.url;
    updateZoomStats(m.reactions || {});
    document.getElementById('moment-modal').style.display = 'flex';
}

function changeMoment(step) {
    currentMomentIdx += step;
    if (currentMomentIdx < 0) currentMomentIdx = allMoments.length - 1;
    if (currentMomentIdx >= allMoments.length) currentMomentIdx = 0;
    
    const m = allMoments[currentMomentIdx];
    document.getElementById('zoom-img').src = m.url;
    updateZoomStats(m.reactions || {});
}

function addReaction(type) {
    const m = allMoments[currentMomentIdx];
    // Dùng transaction để không bị mất dữ liệu khi nhiều người thả tim cùng lúc
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
        newRef.set({ 
            url: url, 
            reactions: { love: 0 } 
        }).then(() => showToast("Đã thêm ảnh vào kho kỷ niệm!"));
    } else if (url) {
        alert("Link ảnh không hợp lệ!");
    }
}

// 7. ĐĂNG NHẬP / ĐĂNG XUẤT
function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-pass').value.trim();
    const match = email.match(/^ban(\d+)@lop\.com$/);
    
    if (match && pass !== "") {
        loggedInUserId = parseInt(match[1]);
        document.getElementById('login-mask').style.display = 'none';
        document.getElementById('auth-btn').innerText = "Đăng xuất";
        showToast(`Chào mừng bạn số ${loggedInUserId} quay trở lại!`);
    } else { 
        showToast("Sai tài khoản (Ví dụ: ban1@lop.com) hoặc mật khẩu!"); 
    }
}

function toggleAuth() {
    if (loggedInUserId) {
        loggedInUserId = null;
        document.getElementById('auth-btn').innerText = "Đăng nhập";
        showToast("Đã đăng xuất.");
        document.getElementById('member-modal').style.display = 'none';
    } else { 
        document.getElementById('login-mask').style.display = 'flex'; 
    }
}

// 8. NHẠC & TIỆN ÍCH
const songs = [
    { title: "Lời Pháo Hoa Rực Rỡ", img: "https://placehold.co/100/ff7675/white?text=1", src: "" },
    { title: "Tháng Năm Không Quên", img: "https://placehold.co/100/74b9ff/white?text=2", src: "" }
];
let currentSongIdx = 0;
const audio = document.getElementById('main-audio');

function loadPlaylist() {
    const container = document.getElementById('playlist-container');
    if(!container) return;
    container.innerHTML = '';
    songs.forEach((s, i) => {
        container.innerHTML += `<div class="playlist-item" onclick="playSong(${i})"><img src="${s.img}"><p>${s.title}</p></div>`;
    });
}

function playSong(idx) {
    currentSongIdx = idx;
    const s = songs[idx];
    document.getElementById('np-img').src = s.img;
    document.getElementById('np-title').innerText = s.title;
    if(s.src) { 
        audio.src = s.src; 
        audio.play(); 
        document.getElementById('play-pause-btn').innerText = "⏸️";
    } else { 
        showToast("Đang giả lập phát: " + s.title); 
    }
}

function togglePlayMusic() {
    if(audio.paused && audio.src) {
        audio.play();
        document.getElementById('play-pause-btn').innerText = "⏸️";
    } else if(!audio.paused) {
        audio.pause();
        document.getElementById('play-pause-btn').innerText = "▶️";
    } else {
        playSong(0);
    }
}

function prevSong() { playSong(currentSongIdx > 0 ? currentSongIdx - 1 : songs.length - 1); }
function nextSong() { playSong(currentSongIdx < songs.length - 1 ? currentSongIdx + 1 : 0); }

function showToast(msg) {
    const t = document.getElementById("toast");
    t.innerText = msg; t.className = "toast show";
    setTimeout(() => t.className = "toast", 3000);
}

function closeModal(e, id) { 
    if(e.target.id === id) document.getElementById(id).style.display = 'none'; 
}

// CHẠY LỆNH KHỞI TẠO
init();
