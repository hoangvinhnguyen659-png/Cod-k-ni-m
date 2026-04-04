// Cấu hình Firebase (Thay bằng thông tin của bạn nếu cần)
const firebaseConfig = {
    apiKey: "AIzaSyCNzWm4KPPNA06L0RCxK6blA2-SudRVw3U",
    authDomain: "cod-ki-niem.firebaseapp.com",
    databaseURL: "https://cod-ki-niem-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "cod-ki-niem",
    storageBucket: "cod-ki-niem.appspot.com", // Đảm bảo bạn có dòng này cho Storage
    appId: "1:564135267081:web:ddc21cee697090914a61d8"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const database = firebase.database();
const auth = firebase.auth();
const storage = firebase.storage(); // Khởi tạo Storage để up file
let currentPhotoId = null;

// Kiểm tra đăng nhập
auth.onAuthStateChanged(user => {
    if (user) {
        document.getElementById('login-mask').style.display = 'none';
        loadData();
    } else {
        document.getElementById('login-mask').style.display = 'flex';
    }
});

function handleLogin() {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-pass').value;
    auth.signInWithEmailAndPassword(email, pass).catch(err => alert("Sai tài khoản hoặc mật khẩu!"));
}

function loadData() {
    // 1. Tải danh sách Thành Viên (42 người)
    database.ref('users').on('value', snap => {
        const container = document.getElementById('member-container');
        // Nút cập nhật hồ sơ cá nhân
        container.innerHTML = `<div class="member-card add-btn" onclick="updateProfile()">
            <i class="fa-solid fa-user-pen"></i><p>Sửa Profile của tôi</p>
        </div>`;
        
        snap.forEach(child => {
            const val = child.val();
            let div = document.createElement('div');
            div.className = 'member-card';
            // Click vào thẻ sẽ mở popup thông tin
            div.onclick = () => openMemberModal(val);
            div.innerHTML = `
                <img src="${val.avatar || 'https://via.placeholder.com/150'}" alt="avt">
                <div class="member-name-plate">${val.name || 'Thành viên'}</div>
            `;
            container.appendChild(div);
        });
    });

    // 2. Tải Khoảnh Khắc
    database.ref('moments').on('value', snap => {
        const container = document.getElementById('moment-container');
        // Nút up ảnh từ máy tính
        container.innerHTML = `<div class="moment-card add-btn" onclick="uploadMomentFromDevice()">
            <i class="fa-solid fa-cloud-arrow-up"></i><p>Tải ảnh lên</p>
        </div>`;
        
        snap.forEach(child => {
            const val = child.val();
            let div = document.createElement('div');
            div.className = 'moment-card';
            div.onclick = () => openPhotoModal(val.url, child.key);
            div.innerHTML = `<img src="${val.url}">`;
            container.insertBefore(div, container.firstChild); // Ảnh mới lên đầu
        });
    });
}

// Cập nhật Profile
function updateProfile() {
    const name = prompt("Nhập tên thật của bạn:");
    const nickname = prompt("Nhập biệt danh:");
    const hobbies = prompt("Sở thích của bạn:");
    const message = prompt("Lời nhắn nhủ cho lớp:");
    const avatar = prompt("Dán link ảnh chân dung (Tạm thời dùng link, up file sẽ cấu hình sau):");
    
    if(name && avatar) {
        database.ref('users/' + auth.currentUser.uid).set({ 
            name: name, nickname: nickname, hobbies: hobbies, message: message, avatar: avatar 
        });
    }
}

// Upload ảnh kỷ niệm TỪ MÁY TÍNH
function uploadMomentFromDevice() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;

        const fileName = Date.now() + '_' + file.name;
        const storageRef = storage.ref('kiniem/' + fileName);

        alert("Đang tải ảnh lên, bạn đợi xíu nhé...");

        storageRef.put(file).then(snapshot => {
            return snapshot.ref.getDownloadURL();
        }).then(downloadURL => {
            database.ref('moments').push({ url: downloadURL, owner: auth.currentUser.email });
            alert("Tải ảnh thành công!");
        }).catch(error => {
            console.error(error);
            alert("Lỗi tải ảnh. Vui lòng kiểm tra quyền Storage trên Firebase.");
        });
    };
    input.click();
}

// --- MỞ CÁC MODALS --- //

function openMemberModal(data) {
    document.getElementById('modal-member-img').src = data.avatar || 'https://via.placeholder.com/150';
    document.getElementById('modal-member-name').innerText = data.name || 'Chưa cập nhật tên';
    document.getElementById('modal-member-nickname').innerText = data.nickname || '';
    document.getElementById('modal-member-hobbies').innerText = data.hobbies || 'Chưa có thông tin';
    document.getElementById('modal-member-message').innerText = data.message || 'Chưa có lời nhắn';
    document.getElementById('member-modal').style.display = 'flex';
}

function openPhotoModal(src, id) {
    currentPhotoId = id;
    document.getElementById('modal-photo-img').src = src;
    document.getElementById('photo-modal').style.display = 'flex';
    document.getElementById('modal-comments').innerHTML = "";

    // Load comments
    database.ref('comments/' + id).on('child_added', snap => {
        const p = document.createElement('p');
        p.innerHTML = `<strong>Bạn học</strong>${snap.val().msg}`;
        document.getElementById('modal-comments').appendChild(p);
    });

    // Load reactions
    database.ref('reactions/' + id).on('value', snap => {
        let counts = {};
        if(snap.val()) {
            Object.values(snap.val()).forEach(e => counts[e] = (counts[e] || 0) + 1);
            let html = "";
            for(let e in counts) html += `<span>${e} ${counts[e]}</span>`;
            document.getElementById('reaction-summary').innerHTML = html;
        } else {
            document.getElementById('reaction-summary').innerHTML = "";
        }
    });
}

// Chơi nhạc
function playMusic(src) {
    const audio = document.getElementById('audio-player');
    audio.src = src;
    audio.play();
    document.getElementById('music-modal').style.display = 'none';
}

// Tính năng bình luận & Reaction
function postComment() {
    const msg = document.getElementById('new-comment').value;
    if(msg && currentPhotoId) {
        database.ref('comments/' + currentPhotoId).push({ msg });
        document.getElementById('new-comment').value = "";
        // Cuộn xuống cuối
        const commentList = document.getElementById('modal-comments');
        setTimeout(() => commentList.scrollTop = commentList.scrollHeight, 100);
    }
}

function sendReaction(icon) {
    if(currentPhotoId) {
        database.ref('reactions/' + currentPhotoId).push(icon);
    }
}

// Đóng modal khi bấm ra ngoài nền đen
function closeModal(event, modalId) {
    if (event.target.id === modalId) {
        document.getElementById(modalId).style.display = 'none';
    }
}

// Chống click chuột phải (Tùy chọn)
document.addEventListener('contextmenu', e => e.preventDefault());
