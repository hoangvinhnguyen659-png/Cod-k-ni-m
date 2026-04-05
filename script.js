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

// 3. KHỞI TẠO
function init() {
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

// 5. MODAL CHI TIẾT
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

// 6. KHOẢNH KHẮC
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

// 7. ĐĂNG NHẬP
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
        showToast("Sai tài khoản hoặc mật khẩu!"); 
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

// 8. CẬP NHẬT GIAO DIỆN NHẠC (THEO MÀU SẮC TRONG ẢNH)
const songs = [
    { title: "Lời Pháo Hoa Rực Rỡ", color: "#ff7675", src: "" },
    { title: "Tháng Năm Không Quên", color: "#74b9ff", src: "" }
];
let currentSongIdx = 0;
const audio = document.getElementById('main-audio');

function loadPlaylist() {
    const container = document.getElementById('playlist-container');
    if(!container) return;
    container.innerHTML = '';
    songs.forEach((s, i) => {
        container.innerHTML += `
        <div class="playlist-item" onclick="playSong(${i})">
            <div class="song-icon" style="background-color: ${s.color};">${i + 1}</div>
            <p>${s.title}</p>
        </div>`;
    });
    // Set mặc định giao diện bài hát đầu tiên
    playSong(0, false); 
}

function playSong(idx, autoPlay = true) {
    currentSongIdx = idx;
    const s = songs[idx];
    
    const npIcon = document.getElementById('np-icon');
    npIcon.style.backgroundColor = s.color;
    npIcon.innerText = idx + 1;
    document.getElementById('np-title').innerText = s.title;

    if(autoPlay) {
        if(s.src) { 
            audio.src = s.src; 
            audio.play(); 
            document.getElementById('play-pause-btn').innerText = "⏸️";
        } else { 
            showToast("Đang giả lập phát: " + s.title); 
        }
    }
}

function togglePlayMusic() {
    if(audio.paused && audio.src) {
        audio.play();
        document.getElementById('play-pause-btn').innerText = "⏸️";
    } else if(!audio.paused && audio.src) {
        audio.pause();
        document.getElementById('play-pause-btn').innerText = "▶️";
    } else {
        playSong(currentSongIdx);
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

// CHẠY KHỞI TẠO
init();
