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
    allMembers.push({ id: i, name: `Thành viên ${i}`, avatar: '', hobbies: 'Chưa cập nhật thông tin.' });
}

// Danh sách ảnh Khoảnh khắc (Bạn có thể thay URL ảnh thật của lớp vào đây)
let allMoments = [];
for (let i = 1; i <= 15; i++) {
    allMoments.push({ id: 'photo' + i, url: `https://picsum.photos/400/400?random=${i}`, reactions: {} });
}

let loggedInUserId = null;
let currentEditingId = null;
let visibleMembersCount = 9;
let visibleMomentsCount = 9;
let currentMomentId = null;

// 3. KHỞI TẠO & LẮNG NGHE DỮ LIỆU
function init() {
    // Lắng nghe dữ liệu thành viên
    database.ref('users').on('value', snap => {
        if (snap.exists()) {
            const dbData = snap.val();
            for (const key in dbData) {
                const index = allMembers.findIndex(m => m.id == key);
                if (index !== -1) allMembers[index] = { ...allMembers[index], ...dbData[key] };
            }
        }
        renderMembers();
    });

    // Lắng nghe dữ liệu khoảnh khắc & biểu cảm
    database.ref('moments').on('value', snap => {
        const data = snap.val() || {};
        allMoments.forEach(m => {
            m.reactions = data[m.id] || {};
        });
        renderMoments();
        if (currentMomentId) updateZoomStats(data[currentMomentId] || {});
    });

    loadPlaylist();
}

// 4. HIỂN THỊ THÀNH VIÊN
function renderMembers() {
    const container = document.getElementById('member-container');
    container.innerHTML = '';
    for (let i = 0; i < visibleMembersCount && i < allMembers.length; i++) {
        const m = allMembers[i];
        let avatarTag = m.avatar ? `<img src="${m.avatar}">` : `<div class="placeholder-avatar">${m.id}</div>`;
        container.innerHTML += `
            <div class="member-card" onclick="openMemberModal(${m.id})">
                ${avatarTag}
                <div class="member-name-plate">${m.name}</div>
            </div>`;
    }
    document.getElementById('btn-load-more-members').style.display = (visibleMembersCount >= allMembers.length) ? 'none' : 'block';
}

function loadAllMembers() {
    visibleMembersCount = allMembers.length;
    renderMembers();
    showToast("Đã hiển thị tất cả thành viên!");
}

// 5. HIỂN THỊ KHOẢNH KHẮC (MOMENTS)
function renderMoments() {
    const container = document.getElementById('moment-container');
    container.innerHTML = '';
    for (let i = 0; i < visibleMomentsCount && i < allMoments.length; i++) {
        const m = allMoments[i];
        const total = Object.values(m.reactions).reduce((a, b) => a + b, 0);
        let reactionHTML = total > 0 ? `<div class="mini-reaction">❤️ ${total}</div>` : '';
        
        container.innerHTML += `
            <div class="moment-card" onclick="openMoment('${m.id}')">
                <img src="${m.url}">
                ${reactionHTML}
            </div>`;
    }
    document.getElementById('btn-load-more-moments').style.display = (visibleMomentsCount >= allMoments.length) ? 'none' : 'block';
}

function loadAllMoments() {
    visibleMomentsCount = allMoments.length;
    renderMoments();
    showToast("Đã tải toàn bộ khoảnh khắc!");
}

// 6. MODAL CHI TIẾT THÀNH VIÊN & CHỈNH SỬA
function openMemberModal(id) {
    currentEditingId = id;
    const member = allMembers.find(m => m.id === id);
    document.getElementById('modal-member-name').innerText = member.name;
    document.getElementById('modal-member-hobbies').innerText = member.hobbies;
    
    const imgEl = document.getElementById('modal-member-img');
    const sideEl = document.getElementById('modal-placeholder-avatar');
    
    if (member.avatar) {
        imgEl.src = member.avatar; imgEl.style.display = 'block'; sideEl.style.display = 'none';
    } else {
        imgEl.style.display = 'none'; sideEl.innerText = member.id; sideEl.style.display = 'flex';
    }

    // Chỉ hiện nút sửa nếu đúng là tài khoản đang đăng nhập
    document.getElementById('btn-edit-profile').style.display = (loggedInUserId === id) ? 'block' : 'none';
    cancelEditMode();
    document.getElementById('member-modal').style.display = 'flex';
}

function enableEditMode() {
    const member = allMembers.find(m => m.id === currentEditingId);
    document.getElementById('edit-name').value = member.name.includes("Thành viên") ? "" : member.name;
    document.getElementById('edit-avatar').value = member.avatar;
    document.getElementById('edit-hobbies').value = member.hobbies.includes("Chưa cập nhật") ? "" : member.hobbies;
    document.getElementById('view-mode').style.display = 'none';
    document.getElementById('edit-mode').style.display = 'block';
}

function cancelEditMode() {
    document.getElementById('view-mode').style.display = 'block';
    document.getElementById('edit-mode').style.display = 'none';
}

function saveProfile() {
    const name = document.getElementById('edit-name').value.trim() || `Thành viên ${currentEditingId}`;
    const avatar = document.getElementById('edit-avatar').value.trim();
    const hobbies = document.getElementById('edit-hobbies').value.trim() || 'Chưa cập nhật thông tin.';

    database.ref('users/' + currentEditingId).set({ name, avatar, hobbies }).then(() => {
        showToast("Cập nhật thành công!");
        openMemberModal(currentEditingId);
    });
}

// 7. MODAL PHÓNG TO ẢNH & THẢ BIỂU CẢM
function openMoment(id) {
    currentMomentId = id;
    const m = allMoments.find(x => x.id === id);
    document.getElementById('zoom-img').src = m.url;
    updateZoomStats(m.reactions);
    document.getElementById('moment-modal').style.display = 'flex';
}

function updateZoomStats(reactions) {
    const statDiv = document.getElementById('zoom-reaction-stats');
    statDiv.innerHTML = "";
    for (const [emoji, count] of Object.entries(reactions)) {
        if(count > 0) statDiv.innerHTML += `<span>${emoji} ${count}</span>`;
    }
}

function addReaction(emoji) {
    if(!currentMomentId) return;
    database.ref(`moments/${currentMomentId}/${emoji}`).transaction(c => (c || 0) + 1);
    showToast("Cảm ơn bạn đã thả biểu cảm!");
}

// 8. ĐĂNG NHẬP / ĐĂNG XUẤT
function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-pass').value.trim();
    const match = email.match(/^ban(\d+)@lop\.com$/);

    if (match && pass !== "") {
        const id = parseInt(match[1]);
        if (id >= 1 && id <= 42) {
            loggedInUserId = id;
            document.getElementById('login-mask').style.display = 'none';
            document.getElementById('auth-btn').innerText = "Đăng xuất";
            showToast(`Chào bạn số ${id}! Bạn đã có quyền sửa thẻ của mình.`);
        } else { showToast("Số thứ tự từ 1-42 thôi nè!"); }
    } else { showToast("Sai định dạng hoặc mật khẩu!"); }
}

function toggleAuth() {
    if (loggedInUserId) {
        loggedInUserId = null;
        document.getElementById('auth-btn').innerText = "Đăng nhập";
        showToast("Đã đăng xuất.");
    } else { document.getElementById('login-mask').style.display = 'flex'; }
}

// 9. NHẠC (PLAYLIST)
const songs = [
    { title: "Lời Pháo Hoa Rực Rỡ", img: "https://placehold.co/100x100/ff7675/white?text=1", src: "" },
    { title: "Tháng Năm Không Quên", img: "https://placehold.co/100x100/74b9ff/white?text=2", src: "" }
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
    if(s.src) { audio.src = s.src; audio.play(); } 
    else { showToast("Đang giả lập phát: " + s.title); }
}

function togglePlayMusic() {
    if(audio.paused && audio.src) audio.play();
    else if(!audio.paused) audio.pause();
    else playSong(0);
}

function prevSong() { playSong(currentSongIdx > 0 ? currentSongIdx - 1 : songs.length - 1); }
function nextSong() { playSong(currentSongIdx < songs.length - 1 ? currentSongIdx + 1 : 0); }

// 10. TIỆN ÍCH KHÁC
function showToast(msg) {
    const t = document.getElementById("toast");
    t.innerText = msg; t.className = "toast show";
    setTimeout(() => { t.className = "toast"; }, 3000);
}

function closeModal(e, id) { 
    if(e.target.id === id) document.getElementById(id).style.display = 'none'; 
}

// Chạy khởi tạo
init();
