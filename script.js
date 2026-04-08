// 1. CẤU HÌNH FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyCNzWm4KPPNA06L0RCxK6blA2-SudRVw3U",
    databaseURL: "https://cod-ki-niem-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "cod-ki-niem",
    storageBucket: "cod-ki-niem.appspot.com"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// --- CẤU HÌNH BỔ SUNG TELEGRAM & WORKER ---
const TELEGRAM_BOT_TOKEN = "8727433515:AAGcXg95sgxRghZcQXCzDO0bParEmjdq-uQ"; 
const TELEGRAM_CHAT_ID = "-1003326339658"; 
const WORKER_URL = "https://photo.hoangvinhnguyen659.workers.dev"; 

// 2. BIẾN TOÀN CỤC
let allMembers = [];
let allMoments = [];
let loggedInUserId = localStorage.getItem('myApp_userId') ? parseInt(localStorage.getItem('myApp_userId')) : null;
let currentEditingId = null;
let currentMomentIdx = 0; 
let visibleMembersCount = 9;

// Biến cho tính năng xem ảnh toàn màn hình
let isViewingMomentFullscreen = false;
let isZoomed = false;
let touchstartX = 0;
let touchendX = 0;

const songs = [
    { id: 1, title: "Lời Pháo Hoa Rực Rỡ", class: "circle-coral", src: "FILE_ID_BÀI_1" },
    { id: 2, title: "Tháng Năm Không Quên", class: "circle-cyan", src: "FILE_ID_BÀI_2" },
    { id: 3, title: "Tình Bạn Diệu Kỳ", class: "circle-blue", src: "FILE_ID_BÀI_3" }
];
let currentSongIdx = 0;
const audio = document.getElementById('main-audio');

// 3. KHỞI TẠO (ĐỒNG BỘ DỮ LIỆU)
function init() {
    database.ref('users').on('value', snap => {
        let tempMembers = [];
        for (let i = 1; i <= 42; i++) {
            tempMembers.push({ 
                id: i, name: `Thành viên ${i}`, nickname: '', avatar: '', 
                hobbies: '', message: '' 
            });
        }
        if (snap.exists()) {
            const data = snap.val();
            for (const key in data) {
                const idx = tempMembers.findIndex(m => m.id == key);
                if (idx !== -1) tempMembers[idx] = { ...tempMembers[idx], ...data[key] };
            }
        }
        allMembers = tempMembers;
        renderMembers();
        if (currentEditingId) updateModalUI(currentEditingId);
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
            const m = allMoments[currentMomentIdx];
            if(m) updateZoomStats(m.reactions || {}, m);
        }
    });

    if (loggedInUserId) {
        document.getElementById('auth-btn').innerHTML = '<i class="fa-solid fa-right-from-bracket"></i> Đăng xuất';
    }
    updateUploadButton();
    loadPlaylist();
    setupSwipeEvents();
    setupLoginEnterKey();
}

// 4. HÀM TRỢ GIÚP HIỂN THỊ ẢNH & NHẠC QUA WORKER
function getImgUrl(path) {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const cleanWorker = WORKER_URL.replace(/\/$/, ""); 
    return `${cleanWorker}?file_id=${path}`;
}

// 5. HIỂN THỊ THÀNH VIÊN
function renderMembers() {
    const container = document.getElementById('member-container');
    if (!container) return;
    
    let htmlContent = ''; 
    for (let i = 0; i < visibleMembersCount && i < allMembers.length; i++) {
        const m = allMembers[i];
        let avatarSrc = getImgUrl(m.avatar);
        let avatarTag = m.avatar ? `<img src="${avatarSrc}" loading="lazy">` : `<div class="placeholder-avatar"><i class="fa-solid fa-user"></i></div>`;
        htmlContent += `
            <div class="member-card" onclick="openMemberModal(${m.id})">
                ${avatarTag}
                <div class="member-name-plate">${m.name}</div>
            </div>`;
    }
    container.innerHTML = htmlContent; 
}

function loadAllMembers() { 
    visibleMembersCount = 42; 
    renderMembers(); 
    document.getElementById('btn-load-more-members').style.display = 'none';
}

// 6. CHI TIẾT THÀNH VIÊN & LƯU DỮ LIỆU
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
    document.getElementById('modal-member-hobbies').innerHTML = `<i class="fa-solid fa-heart" style="color:#ff7675"></i> ${m.hobbies || 'Chưa cập nhật'}`;
    document.getElementById('modal-member-message').innerText = m.message;
    
    const img = document.getElementById('modal-member-img');
    const placeholder = document.getElementById('modal-placeholder-avatar');
    
    if (m.avatar) {
        img.src = getImgUrl(m.avatar); 
        img.style.display = 'block'; 
        placeholder.style.display = 'none';
        
        img.style.cursor = 'zoom-in'; 
        img.onclick = () => viewFullScreen(getImgUrl(m.avatar), false); // Avatar truyền false
    } else {
        img.style.display = 'none'; 
        placeholder.innerHTML = `<i class="fa-solid fa-user" style="font-size: 3rem; color: #a4b0be;"></i>`; 
        placeholder.style.display = 'flex';
    }

    const editBtn = document.getElementById('btn-edit-profile');
    if (loggedInUserId !== null && loggedInUserId === id) {
        editBtn.style.display = 'block';
        editBtn.innerHTML = `<i class="fa-solid fa-user-pen"></i> Chỉnh sửa hồ sơ`;
    } else {
        editBtn.style.display = 'none';
    }
}

function enableEditMode() {
    const m = allMembers.find(x => x.id === currentEditingId);
    document.getElementById('edit-name').value = m.name.includes("Thành viên") ? "" : m.name;
    document.getElementById('edit-nickname').value = m.nickname || "";
    document.getElementById('edit-avatar').value = (m.avatar && !m.avatar.includes("AgA")) ? m.avatar : "";
    document.getElementById('edit-hobbies').value = m.hobbies;
    document.getElementById('edit-message').value = m.message;
    
    const saveBtn = document.querySelector('button[onclick="saveProfile()"]');
    if (saveBtn) saveBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Lưu`;

    const fileInput = document.getElementById('edit-file-input');
    if (fileInput) fileInput.style.display = 'none';

    let editAvatarArea = document.getElementById('edit-avatar-area');
    if (!editAvatarArea) {
        editAvatarArea = document.createElement('div');
        editAvatarArea.id = 'edit-avatar-area';
        editAvatarArea.style = "text-align:center; cursor:pointer; position:relative; margin:0 auto 20px auto; width:120px; height:120px; border-radius:50%; border:3px dashed #74b9ff; overflow:hidden; display:flex; align-items:center; justify-content:center; background-color:#f1f2f6;";
        
        editAvatarArea.innerHTML = `
            <img id="edit-preview-img" src="" style="width: 100%; height: 100%; object-fit: cover; display: none;">
            <div id="edit-preview-placeholder" style="font-size: 2.5rem; color: #a4b0be;"><i class="fa-solid fa-camera"></i></div>
            <div style="position: absolute; bottom: 0; width: 100%; background: rgba(0,0,0,0.6); color: white; font-size: 0.8rem; padding: 5px 0;">Đổi ảnh</div>
        `;
        
        const editMode = document.getElementById('edit-mode');
        editMode.insertBefore(editAvatarArea, editMode.querySelector('label'));

        editAvatarArea.onclick = () => { if (fileInput) fileInput.click(); };

        if (fileInput) {
            fileInput.addEventListener('change', async function(e) {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (event) => {
                    document.getElementById('edit-preview-img').src = event.target.result;
                    document.getElementById('edit-preview-img').style.display = 'block';
                    document.getElementById('edit-preview-placeholder').style.display = 'none';
                }
                reader.readAsDataURL(file);

                showToast("Đang tải ảnh lên...");
                if (saveBtn) { saveBtn.innerHTML = "Đang tải..."; saveBtn.disabled = true; }
                
                const compressedAvatar = await compressImage(file, 800, 800);
                const fileId = await uploadPhotoToTelegram(compressedAvatar);
                
                if (fileId) {
                    document.getElementById('edit-avatar').value = fileId;
                    showToast("Tải ảnh xong!");
                } else {
                    showToast("Lỗi khi tải ảnh lên!");
                }
                if (saveBtn) { saveBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Lưu`; saveBtn.disabled = false; }
            });
        }
    }

    const previewImg = document.getElementById('edit-preview-img');
    const previewPlaceholder = document.getElementById('edit-preview-placeholder');
    if (m.avatar) {
        previewImg.src = getImgUrl(m.avatar);
        previewImg.style.display = 'block';
        previewPlaceholder.style.display = 'none';
    } else {
        previewImg.style.display = 'none';
        previewPlaceholder.style.display = 'block';
    }

    document.getElementById('view-mode').style.display = 'none';
    document.getElementById('edit-mode').style.display = 'block';
}

function removeCurrentAvatar() {
    if (!confirm("Bạn có chắc muốn gỡ ảnh đại diện hiện tại?")) return;
    document.getElementById('edit-avatar').value = "";
    document.getElementById('edit-file-input').value = "";
    const previewImg = document.getElementById('edit-preview-img');
    const previewPlaceholder = document.getElementById('edit-preview-placeholder');
    if (previewImg) previewImg.style.display = 'none';
    if (previewPlaceholder) previewPlaceholder.style.display = 'block';
    showToast("Đã gỡ ảnh.");
}

function compressImage(file, maxWidth = 1920, maxHeight = 1080) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round(height * (maxWidth / width));
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round(width * (maxHeight / height));
                        height = maxHeight;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    const compressedFile = new File([blob], file.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now(),
                    });
                    resolve(compressedFile);
                }, 'image/jpeg', 0.8);
            };
        };
    });
}

async function uploadPhotoToTelegram(file) {
    const formData = new FormData();
    formData.append('chat_id', TELEGRAM_CHAT_ID);
    formData.append('photo', file);
    try {
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
            method: 'POST', body: formData
        });
        const res = await response.json();
        if (res.ok) {
            return res.result.photo[res.result.photo.length - 1].file_id;
        } else {
            console.error("Lỗi từ Telegram API:", res.description);
            return null;
        }
    } catch (err) { 
        console.error("Lỗi mạng khi upload:", err); 
        return null;
    }
}

async function saveProfile() {
    const saveBtn = document.querySelector('button[onclick="saveProfile()"]');
    let finalAvatar = document.getElementById('edit-avatar').value.trim();
    saveBtn.innerText = "Đang lưu...";
    saveBtn.disabled = true;

    const data = {
        name: document.getElementById('edit-name').value.trim() || `Thành viên ${currentEditingId}`,
        nickname: document.getElementById('edit-nickname').value.trim(),
        avatar: finalAvatar,
        hobbies: document.getElementById('edit-hobbies').value.trim(),
        message: document.getElementById('edit-message').value.trim()
    };
    
    database.ref('users/' + currentEditingId).set(data).then(() => {
        showToast("Đã cập nhật hồ sơ!");
        saveBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Lưu`;
        saveBtn.disabled = false;
        cancelEditMode();
    }).catch(err => {
        showToast("Lỗi kết nối Firebase!");
        saveBtn.disabled = false;
    });
}

function cancelEditMode() {
    document.getElementById('view-mode').style.display = 'block';
    document.getElementById('edit-mode').style.display = 'none';
}

// 7. KHOẢNH KHẮC & TƯƠNG TÁC
function renderMoments() {
    const container = document.getElementById('moment-container');
    if (!container) return;
    
    let htmlContent = ''; 
    allMoments.forEach((m, idx) => {
        htmlContent += `<div class="moment-card" onclick="openMoment(${idx})"><img src="${getImgUrl(m.url)}" loading="lazy"></div>`;
    });
    container.innerHTML = htmlContent; 
}

function openMoment(idx) {
    if(allMoments.length === 0) return;
    currentMomentIdx = idx;
    const m = allMoments[idx];
    
    const zoomImg = document.getElementById('zoom-img');
    zoomImg.src = getImgUrl(m.url);
    zoomImg.style.cursor = 'zoom-in';
    zoomImg.onclick = () => viewFullScreen(getImgUrl(m.url), true); // Kỷ niệm truyền true

    updateZoomStats(m.reactions || {}, m);
    document.getElementById('moment-modal').style.display = 'flex';
}

function changeMoment(step) {
    currentMomentIdx += step;
    if (currentMomentIdx < 0) currentMomentIdx = allMoments.length - 1;
    if (currentMomentIdx >= allMoments.length) currentMomentIdx = 0;
    
    // Nếu đang xem trong modal
    if(document.getElementById('moment-modal').style.display === 'flex') {
        openMoment(currentMomentIdx);
    }
}

function addReaction(type) {
    const m = allMoments[currentMomentIdx];
    if(!m) return;
    database.ref(`moments/${m.id}/reactions/${type}`).transaction(count => (count || 0) + 1);
}

function updateZoomStats(reacts, momentObj) {
    const icons = { love: '❤️', haha: '😆', wow: '😮', sad: '😢', angry: '😡' };
    let html = '';
    for (let key in icons) {
        if (reacts[key]) html += `<span style="margin: 0 8px;">${icons[key]} ${reacts[key]}</span> `;
    }
    document.getElementById('zoom-reaction-stats').innerHTML = html || 'Chưa có tương tác nào';
    
    const delBtn = document.getElementById('btn-delete-moment');
    if (delBtn) {
        delBtn.style.display = loggedInUserId ? 'inline-block' : 'none';
        delBtn.innerHTML = `<i class="fa-solid fa-trash-can"></i> Xóa ảnh`;
    }
}

function deleteMoment() {
    const m = allMoments[currentMomentIdx];
    if (!m) return;
    if (confirm("Xóa vĩnh viễn ảnh kỷ niệm này?")) {
        database.ref('moments/' + m.id).remove().then(() => {
            showToast("Đã xóa ảnh!");
            document.getElementById('moment-modal').style.display = 'none';
        });
    }
}

// TẢI NHIỀU ẢNH CÙNG LÚC + KẾT HỢP NÉN ẢNH VÀ XỬ LÝ SONG SONG
async function uploadNewMoment() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.multiple = true; 
    
    fileInput.onchange = async (e) => {
        const files = e.target.files;
        if (files.length === 0) return;

        showToast(`Đang xử lý và tải lên ${files.length} ảnh...`);
        
        const uploadPromises = Array.from(files).map(async (originalFile) => {
            try {
                const compressedFile = await compressImage(originalFile);
                const fileId = await uploadPhotoToTelegram(compressedFile);
                if (fileId) {
                    await database.ref('moments').push().set({ 
                        url: fileId, 
                        reactions: { love: 0 } 
                    });
                    return true;
                }
            } catch (err) {
                console.error("Lỗi khi tải ảnh:", err);
            }
            return false;
        });

        const results = await Promise.all(uploadPromises);
        const successCount = results.filter(res => res === true).length;
        const failCount = files.length - successCount;

        if (failCount === 0) {
            showToast(`Đã thêm thành công ${successCount} ảnh!`);
        } else {
            showToast(`Đã thêm ${successCount} ảnh. Lỗi ${failCount} ảnh!`);
        }
    };
    fileInput.click();
}

// 8. ĐĂNG NHẬP & ĐĂNG XUẤT
function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-pass').value.trim();
    const match = email.match(/^ban(\d+)@lop\.com$/);
    
    if (match && pass !== "") {
        loggedInUserId = parseInt(match[1]);
        localStorage.setItem('myApp_userId', loggedInUserId);
        document.getElementById('login-mask').style.display = 'none';
        document.getElementById('auth-btn').innerHTML = '<i class="fa-solid fa-right-from-bracket"></i> Đăng xuất';
        updateUploadButton();
        const user = allMembers.find(m => m.id === loggedInUserId);
        showToast(`Chào ${user.nickname || user.name}!`);
    } else { showToast("Thông tin không đúng!"); }
}

function toggleAuth() {
    if (loggedInUserId) {
        loggedInUserId = null;
        localStorage.removeItem('myApp_userId');
        document.getElementById('auth-btn').innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Đăng nhập';
        updateUploadButton();
        showToast("Đã đăng xuất.");
        document.getElementById('member-modal').style.display = 'none';
    } else { document.getElementById('login-mask').style.display = 'flex'; }
}

function updateUploadButton() {
    const btn = document.getElementById('add-moment-btn');
    if (btn) {
        btn.style.display = loggedInUserId ? 'block' : 'none';
        btn.innerHTML = `<i class="fa-solid fa-camera-retro"></i> Đăng ảnh kỷ niệm`;
    }
}

// Lắng nghe sự kiện Enter khi đăng nhập
function setupLoginEnterKey() {
    const emailInput = document.getElementById('login-email');
    const passInput = document.getElementById('login-pass');
    const handleEnter = (e) => {
        if (e.key === 'Enter') handleLogin();
    };
    if (emailInput) emailInput.addEventListener('keypress', handleEnter);
    if (passInput) passInput.addEventListener('keypress', handleEnter);
}

// 9. LOGIC NHẠC
function loadPlaylist() {
    const container = document.getElementById('playlist-container');
    if(!container) return;
    container.innerHTML = '';
    songs.forEach((s, i) => {
        container.innerHTML += `
        <div class="music-item" onclick="playSong(${i})">
            <div class="track-circle ${s.class}"><i class="fa-solid fa-music"></i></div>
            <div class="track-info"><span>${s.title}</span></div>
        </div>`;
    });
}

function playSong(idx, autoPlay = true) {
    currentSongIdx = idx;
    const s = songs[idx];
    const npIcon = document.getElementById('np-icon');
    if (npIcon) { 
        npIcon.className = `track-circle ${s.class}`; 
        npIcon.innerHTML = `<i class="fa-solid fa-compact-disc fa-spin"></i>`; 
    }
    document.getElementById('np-title').innerText = "Đang phát: " + s.title;
    if(autoPlay && s.src) {
        audio.src = getImgUrl(s.src);
        audio.play().catch(e => console.log("Cần thao tác để phát nhạc"));
    }
}

// 10. TIỆN ÍCH
function showToast(msg) {
    const t = document.getElementById("toast");
    t.innerHTML = `<i class="fa-solid fa-circle-info"></i> ${msg}`; 
    t.className = "toast show";
    setTimeout(() => t.className = "toast", 3000);
}

function closeModal(e, id) { 
    if(e.target.id === id) {
        document.getElementById(id).style.display = 'none'; 
        if(id === 'member-modal') currentEditingId = null;
    }
}

// 11. TÍNH NĂNG XEM ẢNH TOÀN MÀN HÌNH (CÓ ZOOM CHUẨN XÁC & SWIPE)
function viewFullScreen(imgSrc, isMoment = false) {
    if (!imgSrc) return;
    isViewingMomentFullscreen = isMoment; 
    isZoomed = false; 

    const overlay = document.getElementById('fullscreen-overlay');
    const img = document.getElementById('fullscreen-img');
    if (overlay && img) {
        img.src = imgSrc;
        overlay.style.display = 'flex';
        img.style.transform = "scale(1)";
        img.style.transformOrigin = "center center"; // Đặt lại tâm mặc định khi mở ảnh mới
        img.style.transition = "transform 0.2s ease"; 
        
        // Sự kiện click để zoom tại vị trí click
        img.onclick = function(e) {
            e.stopPropagation(); // Ngăn sự kiện click làm đóng overlay
            isZoomed = !isZoomed;
            
            if (isZoomed) {
                // Lấy kích thước và vị trí của ảnh trên màn hình
                const rect = img.getBoundingClientRect();
                
                // Tính tọa độ click chuột tương đối so với góc trên bên trái của ảnh
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                // Chuyển đổi tọa độ thành phần trăm (%)
                const originX = (x / rect.width) * 100;
                const originY = (y / rect.height) * 100;
                
                // Đặt tâm zoom (transform-origin) vào đúng vị trí click
                img.style.transformOrigin = `${originX}% ${originY}%`;
                img.style.transform = "scale(2.5)";
                img.style.cursor = "zoom-out";
            } else {
                // Thu nhỏ lại bình thường
                img.style.transform = "scale(1)";
                img.style.cursor = "zoom-in";
                
                // Trả lại tâm zoom mặc định sau khi hiệu ứng thu nhỏ (0.2s) kết thúc
                setTimeout(() => {
                    if(!isZoomed) img.style.transformOrigin = "center center";
                }, 200); 
            }
        };
    } else {
        console.warn("Chưa thêm HTML cho giao diện xem ảnh toàn màn hình");
    }
}

function closeFullScreen() {
    const overlay = document.getElementById('fullscreen-overlay');
    const img = document.getElementById('fullscreen-img');
    if (overlay && img) {
        overlay.style.display = 'none';
        img.src = '';
        img.style.transform = "scale(1)";
    }
}

// Lắng nghe sự kiện vuốt trên điện thoại
function setupSwipeEvents() {
    const fsOverlay = document.getElementById('fullscreen-overlay');
    if (fsOverlay) {
        fsOverlay.addEventListener('touchstart', e => {
            touchstartX = e.changedTouches[0].screenX;
        }, {passive: true});

        fsOverlay.addEventListener('touchend', e => {
            touchendX = e.changedTouches[0].screenX;
            handleSwipe();
        }, {passive: true});
    }
}

function handleSwipe() {
    if (!isViewingMomentFullscreen) return; 
    if (isZoomed) return; 
    
    if (touchendX < touchstartX - 50) {
        changeMoment(1);
        updateFullscreenImage();
    }
    if (touchendX > touchstartX + 50) {
        changeMoment(-1);
        updateFullscreenImage();
    }
}

function updateFullscreenImage() {
    const m = allMoments[currentMomentIdx];
    const img = document.getElementById('fullscreen-img');
    if (m && img) {
        img.src = getImgUrl(m.url);
        img.style.transform = "scale(1)"; 
        isZoomed = false;
    }
}

window.onload = init;
