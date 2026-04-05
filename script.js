const firebaseConfig = {
    apiKey: "AIzaSyCNzWm4KPPNA06L0RCxK6blA2-SudRVw3U",
    databaseURL: "https://cod-ki-niem-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "cod-ki-niem",
    storageBucket: "cod-ki-niem.appspot.com"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let allMembers = [];
for (let i = 1; i <= 42; i++) {
    allMembers.push({ 
        id: i, 
        name: `Thành viên ${i}`, 
        avatar: '', 
        hobbies: 'Chưa cập nhật thông tin.' 
    });
}

let loggedInUserId = null; // Sẽ lưu số thứ tự tài khoản nếu đăng nhập thành công
let currentEditingId = null;
let visibleMembersCount = 9; // Giới hạn hiển thị ban đầu

// Hiển thị thông báo (Toast)
function showToast(message) {
    const toast = document.getElementById("toast");
    toast.innerText = message;
    toast.className = "toast show";
    setTimeout(function(){ toast.className = toast.className.replace("show", ""); }, 3000);
}

// Tải dữ liệu Firebase
database.ref('users').on('value', snap => {
    if (snap.exists()) {
        const dbData = snap.val();
        for (const key in dbData) {
            const index = allMembers.findIndex(m => m.id == key);
            if (index !== -1) {
                allMembers[index] = { ...allMembers[index], ...dbData[key] };
            }
        }
    }
    renderMembers();
});

// Load 9 thành viên, xếp ngang 3
function renderMembers() {
    const container = document.getElementById('member-container');
    container.innerHTML = '';
    
    for (let i = 0; i < visibleMembersCount && i < allMembers.length; i++) {
        const m = allMembers[i];
        let avatarTag = m.avatar 
            ? `<img src="${m.avatar}" alt="Avatar">` 
            : `<div class="placeholder-avatar">${m.id}</div>`;

        container.innerHTML += `
            <div class="member-card" onclick="openMemberModal(${m.id})">
                ${avatarTag}
                <div class="member-name-plate">${m.name}</div>
            </div>`;
    }

    // Ẩn/hiện nút "Xem thêm"
    const btnLoadMore = document.getElementById('btn-load-more');
    if (visibleMembersCount >= allMembers.length) {
        btnLoadMore.style.display = 'none';
    } else {
        btnLoadMore.style.display = 'block';
    }
}

function loadMoreMembers() {
    visibleMembersCount += 9; // Load thêm 9 người mỗi lần
    renderMembers();
}

function openMemberModal(id) {
    currentEditingId = id;
    const member = allMembers.find(m => m.id === id);
    
    document.getElementById('modal-member-name').innerText = member.name;
    document.getElementById('modal-member-hobbies').innerText = member.hobbies;
    
    const imgElement = document.getElementById('modal-member-img');
    const placeholderElement = document.getElementById('modal-placeholder-avatar');
    
    if (member.avatar) {
        imgElement.src = member.avatar;
        imgElement.style.display = 'block';
        placeholderElement.style.display = 'none';
    } else {
        imgElement.style.display = 'none';
        placeholderElement.innerText = member.id;
        placeholderElement.style.display = 'flex';
    }

    // TÍNH NĂNG CHỈ TÀI KHOẢN ĐÓ MỚI ĐƯỢC SỬA
    if (loggedInUserId === id) {
        document.getElementById('btn-edit-profile').style.display = 'block';
    } else {
        document.getElementById('btn-edit-profile').style.display = 'none';
    }
    
    cancelEditMode();
    document.getElementById('member-modal').style.display = 'flex';
}

function enableEditMode() {
    const member = allMembers.find(m => m.id === currentEditingId);
    document.getElementById('edit-name').value = member.name.includes("Thành viên") ? "" : member.name;
    document.getElementById('edit-avatar').value = member.avatar;
    document.getElementById('edit-hobbies').value = member.hobbies === 'Chưa cập nhật thông tin.' ? "" : member.hobbies;

    document.getElementById('view-mode').style.display = 'none';
    document.getElementById('edit-mode').style.display = 'block';
}

function cancelEditMode() {
    document.getElementById('view-mode').style.display = 'block';
    document.getElementById('edit-mode').style.display = 'none';
}

function saveProfile() {
    const newName = document.getElementById('edit-name').value.trim() || `Thành viên ${currentEditingId}`;
    const newAvatar = document.getElementById('edit-avatar').value.trim();
    const newHobbies = document.getElementById('edit-hobbies').value.trim() || 'Chưa cập nhật thông tin.';

    database.ref('users/' + currentEditingId).set({
        name: newName,
        avatar: newAvatar,
        hobbies: newHobbies
    }).then(() => {
        showToast("Cập nhật thành công!");
        openMemberModal(currentEditingId); 
    }).catch(err => showToast("Lỗi: " + err));
}

// Xử lý Đăng Nhập bằng định dạng ban[ID]@lop.com
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

function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-pass').value.trim();
    
    // Tách lấy số thứ tự từ email (VD: ban23@lop.com -> Lấy ra số 23)
    const match = email.match(/^ban(\d+)@lop\.com$/);

    if (match && pass !== "") {
        const id = parseInt(match[1]);
        if (id >= 1 && id <= 42) {
            loggedInUserId = id;
            document.getElementById('login-mask').style.display = 'none';
            document.getElementById('auth-btn').innerText = "Đăng xuất";
            showToast(`Đăng nhập thành công tài khoản số ${id}! Bạn có thể sửa thẻ của mình.`);
        } else {
            showToast("Sai tài khoản! Số thứ tự phải từ 1 đến 42.");
        }
    } else {
        showToast("Sai định dạng (Ví dụ: ban1@lop.com) hoặc thiếu mật khẩu!");
    }
}

function closeModal(e, id) { 
    if(e.target.id === id) document.getElementById(id).style.display='none'; 
}

// ===== PLAYLIST NHẠC (Thay cho thanh dưới đáy) =====
const songs = [
    { title: "Lời Pháo Hoa Rực Rỡ", img: "https://placehold.co/100x100/ff7675/white?text=1", src: "" },
    { title: "Tháng Năm Không Quên", img: "https://placehold.co/100x100/74b9ff/white?text=2", src: "" },
    { title: "Năm Tháng Trôi Qua", img: "https://placehold.co/100x100/55efc4/white?text=3", src: "" },
    { title: "Nhớ Mãi Chuyến Đi Này", img: "https://placehold.co/100x100/fdcb6e/white?text=4", src: "" }
];
let currentSongIdx = 0;
const audio = document.getElementById('main-audio');

function loadPlaylist() {
    const container = document.getElementById('playlist-container');
    container.innerHTML = '';
    songs.forEach((s, i) => {
        container.innerHTML += `
            <div class="playlist-item" onclick="playSong(${i})">
                <img src="${s.img}" alt="Thumb">
                <p style="font-weight: 600; font-size: 14px;">${s.title}</p>
            </div>
        `;
    });
}

function playSong(idx) {
    currentSongIdx = idx;
    const song = songs[idx];
    document.getElementById('np-img').src = song.img;
    document.getElementById('np-title').innerText = song.title;
    
    if(song.src) {
        audio.src = song.src;
        audio.play();
        document.getElementById('play-pause-btn').innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>'; 
    } else {
        showToast(`Đang giả lập phát: ${song.title} (Vì chưa điền link nhạc)`);
    }
}

function togglePlayMusic() {
    if(audio.paused && audio.src) {
        audio.play();
        document.getElementById('play-pause-btn').innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>'; 
    } else if (!audio.paused) {
        audio.pause();
        document.getElementById('play-pause-btn').innerHTML = '<path d="M8 5v14l11-7z"/>'; 
    } else {
        playSong(0);
    }
}

function prevSong() { playSong(currentSongIdx > 0 ? currentSongIdx - 1 : songs.length - 1); }
function nextSong() { playSong(currentSongIdx < songs.length - 1 ? currentSongIdx + 1 : 0); }

loadPlaylist(); // Khởi tạo playlist ban đầu
