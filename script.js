const firebaseConfig = {
    apiKey: "AIzaSyCNzWm4KPPNA06L0RCxK6blA2-SudRVw3U",
    databaseURL: "https://cod-ki-niem-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "cod-ki-niem",
    storageBucket: "cod-ki-niem.appspot.com"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();

// Các mảng dữ liệu trống, đợi bạn tự thêm sau
let allMembers = [];
let allMoments = [];
let allNotes = [];

const iconEdit = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="custom-icon-large"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;

// Load Thành viên từ Firebase (hiện tại sẽ chỉ lấy đúng số lượng thực tế có trên DB)
database.ref('users').on('value', snap => {
    allMembers = [];
    if (snap.exists()) {
        snap.forEach(child => { allMembers.push({...child.val(), id: child.key}); });
    }
    renderMembers();
});

// Hàm hiển thị thành viên
function renderMembers() {
    const container = document.getElementById('member-container');
    
    // Nút Sửa Profile vẫn giữ lại để thao tác
    container.innerHTML = `<div class="member-card add-btn" onclick="updateProfile()">${iconEdit}<p>Sửa Profile</p></div>`;
    
    // Nếu có dữ liệu sẽ render ra, nếu mảng trống thì vòng lặp này sẽ bị bỏ qua
    allMembers.forEach(m => {
        let avatarTag = m.avatar ? `<img src="${m.avatar}" alt="Avatar">` : '';
        container.innerHTML += `<div class="member-card" onclick="openMemberModal('${m.name}', '${m.avatar || ''}')">
            ${avatarTag}
            <div class="member-name-plate">${m.name}</div>
        </div>`;
    });
}

// Hàm hiển thị khoảnh khắc (đã làm sạch)
function renderMoments() {
    const container = document.getElementById('moment-container');
    container.innerHTML = '';
    
    allMoments.forEach(imgUrl => {
        container.innerHTML += `<div class="moment-card"><img src="${imgUrl}" alt="Khoảnh khắc"></div>`;
    });
}

// Hàm hiển thị lưu bút (đã làm sạch)
function renderNotes() {
    const container = document.getElementById('notes-container');
    container.innerHTML = '';
    
    allNotes.forEach(n => {
        container.innerHTML += `<div class="note-card" style="background:${n.color || '#fff'}"><p>"${n.msg}"</p><span>- ${n.author}</span></div>`;
    });
}

// Chạy lần đầu để setup giao diện rỗng
renderMoments();
renderNotes();

// Nhạc Spotify (Trạng thái rỗng)
const audio = document.getElementById('audio-player');
function togglePlay() { 
    if(!audio.src) {
        alert("Hiện chưa có bài hát nào được thiết lập.");
        return;
    }
    if(audio.paused) { 
        audio.play(); 
        document.getElementById('play-icon').innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>'; 
    } else { 
        audio.pause(); 
        document.getElementById('play-icon').innerHTML = '<path d="M8 5v14l11-7z"/>'; 
    }
}

// Các hàm đóng mở Modal & Giao diện
function closeModal(e, id) { 
    if(e.target.id === id) document.getElementById(id).style.display='none'; 
}

function openMemberModal(name, img) {
    document.getElementById('modal-member-name').innerText = name;
    
    const imgElement = document.getElementById('modal-member-img');
    if (img) {
        imgElement.src = img;
        imgElement.style.display = 'block';
    } else {
        imgElement.style.display = 'none';
    }
    
    document.getElementById('member-modal').style.display = 'flex';
}

function toggleAuth() {
    document.getElementById('login-mask').style.display = 'flex';
}

function handleLogin() {
    // Logic đăng nhập thêm sau
    alert("Chức năng đăng nhập sẽ được cập nhật!");
}

function updateProfile() {
    // Logic cập nhật thêm sau
    alert("Chức năng sửa thông tin sẽ được cập nhật!");
}

// Placeholder cho nút next/prev song
function nextSong() { console.log('Chuyển bài hát tiếp theo'); }
function prevSong() { console.log('Chuyển bài hát trước'); }
