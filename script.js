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
        nickname: '',
        avatar: '', 
        hobbies: 'Chưa cập nhật.', 
        message: 'Yêu cả nhà!' 
    });
}

let allMoments = [];
// Khôi phục ID đăng nhập từ trình duyệt nếu có
let loggedInUserId = localStorage.getItem('user_id') ? parseInt(localStorage.getItem('user_id')) : null;
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

// 3. KHỞI TẠO (ĐỒNG BỘ REALTIME)
function init() {
    // Lấy dữ liệu thành viên - Tự động cập nhật khi có ai đó sửa
    database.ref('users').on('value', snap => {
        if (snap.exists()) {
            const data = snap.val();
            for (const key in data) {
                const idx = allMembers.findIndex(m => m.id == key);
                if (idx !== -1) allMembers[idx] = { ...allMembers[idx], ...data[key] };
            }
        }
        renderMembers();
        // Nếu đang mở modal của ai đó, cập nhật nội dung modal ngay lập tức
        if (currentEditingId) updateModalUI(currentEditingId);
    });

    // Lấy dữ liệu khoảnh khắc - Tự động hiện ảnh mới khi có người đăng
    database.ref('moments').on('value', snap => {
        allMoments = [];
        if (snap.exists()) {
            const data = snap.val();
            for (const id in data) {
                allMoments.push({ id, ...data[id] });
            }
        }
        renderMoments();
        // Cập nhật thống kê reaction nếu đang xem ảnh
        if (document.getElementById('moment-modal').style.display === 'flex') {
            const current = allMoments[currentMomentIdx];
            if(current) updateZoomStats(current.reactions || {});
        }
    });

    // Kiểm tra trạng thái đăng nhập để hiện nút "Thêm ảnh"
    if (loggedInUserId) {
        document.getElementById('auth-btn').innerText = "Đăng xuất";
        updateUploadButton();
    }

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

// 5. MODAL CHI TIẾT THÀNH VIÊN
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

    // Chỉ hiện nút sửa nếu loggedInUserId khớp với ID thành viên đang xem
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
        showToast("Đã lưu lên hệ thống! ✨");
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
        container.innerHTML += `
            <div class="moment-card" onclick="openMoment(${idx})">
                <img src="${m.url}">
            </div>`;
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

function updateZoomStats(reacts) {
    const icons = { love: '❤️', haha: '😆', wow: '😮', sad: '😢', angry: '😡' };
    let html = '';
    for (let key in icons) {
        if (reacts[key]) html += `<span style="margin: 0 8px;">${icons[key]} ${reacts[key]}</span> `;
    }
    document.getElementById('zoom-reaction-stats').innerHTML = html || 'Chưa có tương tác nào';
}

function uploadNewMoment() {
    const url = prompt("Dán link ảnh (URL) bạn muốn chia sẻ:");
    if (url && url.startsWith('http')) {
        const newRef = database.ref('moments').push();
        newRef.set({ url: url, reactions: { love: 0 } }).then(() => showToast("Đã lưu ảnh mới! 📸"));
    }
}

// 7. HỆ THỐNG ĐĂNG NHẬP & CHÀO HỎI
function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-pass').value.trim();
    const match = email.match(/^ban(\d+)@lop\.com$/);
    
    if (match && pass !== "") {
        loggedInUserId = parseInt(match[1]);
        // Lưu vào localStorage để không bị mất khi load lại trang
        localStorage.setItem('user_id', loggedInUserId);

        document.getElementById('login-mask').style.display = 'none';
        document.getElementById('auth-btn').innerText = "Đăng xuất";
        updateUploadButton();
        
        const user = allMembers.find(m => m.id === loggedInUserId);
        let displayName = user.nickname || user.name;
        showToast(`Chào mừng ${displayName} quay trở lại! ✨`);
    } else { 
        showToast("Thông tin đăng nhập không đúng!"); 
    }
}

function toggleAuth() {
    if (loggedInUserId) {
        loggedInUserId = null;
        localStorage.removeItem('user_id'); // Xóa dấu vết khi đăng xuất
        document.getElementById('auth-btn').innerText = "Đăng nhập";
        updateUploadButton();
        showToast("Đã đăng xuất.");
        document.getElementById('member-modal').style.display = 'none';
        location.reload(); // Reload để sạch dữ liệu
    } else { 
        document.getElementById('login-mask').style.display = 'flex'; 
    }
}

function updateUploadButton() {
    const btn = document.getElementById('add-moment-btn');
    if (btn) btn.style.display = loggedInUserId ? 'block' : 'none';
}

// 8. LOGIC PHÁT NHẠC
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
    if (npIcon) {
        npIcon.className = `track-circle ${s.class}`;
        npIcon.innerText = s.id;
    }
    document.getElementById('np-title').innerText = "Đang phát: " + s.title;

    if(autoPlay && s.src) {
        audio.src = s.src; 
        audio.play(); 
        document.getElementById('play-pause-btn').className = 'fas fa-pause';
    }
}

function togglePlayMusic() {
    if(audio.paused && audio.src) {
        audio.play();
        document.getElementById('play-pause-btn').className = 'fas fa-pause';
    } else if(!audio.paused && audio.src) {
        audio.pause();
        document.getElementById('play-pause-btn').className = 'fas fa-play';
    } else {
        playSong(currentSongIdx);
    }
}

// 9. TIỆN ÍCH
function showToast(msg) {
    const t = document.getElementById("toast");
    if(!t) return;
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
