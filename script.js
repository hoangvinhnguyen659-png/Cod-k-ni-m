const firebaseConfig = {
    apiKey: "AIzaSyCNzWm4KPPNA06L0RCxK6blA2-SudRVw3U",
    databaseURL: "https://cod-ki-niem-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "cod-ki-niem",
    storageBucket: "cod-ki-niem.appspot.com"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Tạo mảng mặc định 42 học sinh
let allMembers = [];
for (let i = 1; i <= 42; i++) {
    allMembers.push({ 
        id: i, 
        name: `Thành viên ${i}`, 
        avatar: '', 
        hobbies: 'Chưa cập nhật thông tin.' 
    });
}

let isLoggedIn = false;
let currentEditingId = null;

// Lấy dữ liệu từ Firebase và ghi đè lên mảng mặc định
database.ref('users').on('value', snap => {
    if (snap.exists()) {
        const dbData = snap.val();
        for (const key in dbData) {
            const index = allMembers.findIndex(m => m.id == key);
            if (index !== -1) {
                // Ghi đè dữ liệu từ DB vào vị trí tương ứng
                allMembers[index] = { ...allMembers[index], ...dbData[key] };
            }
        }
    }
    renderMembers();
});

function renderMembers() {
    const container = document.getElementById('member-container');
    container.innerHTML = '';
    
    allMembers.forEach(m => {
        // Nếu có ảnh thì hiện ảnh, không thì hiện số thứ tự làm avatar
        let avatarTag = m.avatar 
            ? `<img src="${m.avatar}" alt="Avatar">` 
            : `<div class="placeholder-avatar">${m.id}</div>`;

        container.innerHTML += `
            <div class="member-card" onclick="openMemberModal(${m.id})">
                ${avatarTag}
                <div class="member-name-plate">${m.name}</div>
            </div>`;
    });
}

// Xử lý Modal Thành Viên
function openMemberModal(id) {
    currentEditingId = id;
    const member = allMembers.find(m => m.id === id);
    
    // Đổ dữ liệu vào giao diện Xem
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

    // Hiển thị nút sửa nếu đã đăng nhập
    document.getElementById('btn-edit-profile').style.display = isLoggedIn ? 'block' : 'none';
    
    // Mặc định luôn bật chế độ Xem
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

    // Đẩy dữ liệu lên Firebase đúng vào ID (từ 1 đến 42)
    database.ref('users/' + currentEditingId).set({
        name: newName,
        avatar: newAvatar,
        hobbies: newHobbies
    }).then(() => {
        alert("Cập nhật thành công!");
        openMemberModal(currentEditingId); // Reload lại modal đang xem
    }).catch(err => alert("Lỗi: " + err));
}

// Xử lý Đăng Nhập giả lập (Bạn có thể tích hợp Firebase Auth thật vào đây)
function toggleAuth() {
    if (isLoggedIn) {
        isLoggedIn = false;
        document.getElementById('auth-btn').innerText = "Đăng nhập";
        alert("Đã đăng xuất.");
        document.getElementById('member-modal').style.display = 'none'; // Tắt modal nếu đang mở
    } else {
        document.getElementById('login-mask').style.display = 'flex';
    }
}

function handleLogin() {
    // Để cho code chạy ngay lập tức, đây là giả lập đăng nhập thành công.
    isLoggedIn = true;
    document.getElementById('login-mask').style.display = 'none';
    document.getElementById('auth-btn').innerText = "Đăng xuất";
    alert("Đăng nhập thành công! Bạn có thể nhấn vào thẻ số thứ tự của bạn để cập nhật ảnh và sở thích.");
}

function closeModal(e, id) { 
    if(e.target.id === id) document.getElementById(id).style.display='none'; 
}

// Render dữ liệu trống cho Khoảnh Khắc và Lưu Bút
document.getElementById('moment-container').innerHTML = '<p style="text-align:center; width: 100%; grid-column: 1 / -1;">Chưa có ảnh nào.</p>';
document.getElementById('notes-container').innerHTML = '<p style="text-align:center; width: 100%; grid-column: 1 / -1;">Chưa có lời nhắn nào.</p>';

// Nhạc Spotify (Trạng thái rỗng)
const audio = document.getElementById('audio-player');
function togglePlay() { 
    alert("Hiện chưa có bài hát nào được thiết lập.");
}
