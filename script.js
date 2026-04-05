const firebaseConfig = {
    apiKey: "AIzaSyCNzWm4KPPNA06L0RCxK6blA2-SudRVw3U",
    databaseURL: "https://cod-ki-niem-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "cod-ki-niem",
    storageBucket: "cod-ki-niem.appspot.com"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let allMembers = [];
for (let i = 1; i <= 42; i++) {
    allMembers.push({ id: i, name: `Thành viên ${i}`, avatar: '', hobbies: 'Chưa cập nhật.', message: 'Yêu cả nhà!' });
}

let allMoments = [];
let loggedInUserId = null;
let currentEditingId = null;
let currentMomentIdx = 0;

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
}

function renderMembers() {
    const container = document.getElementById('member-container');
    container.innerHTML = '';
    allMembers.slice(0, 9).forEach(m => {
        let avatar = m.avatar ? `<img src="${m.avatar}">` : `<div class="placeholder-avatar">${m.id}</div>`;
        container.innerHTML += `<div class="member-card" onclick="openMemberModal(${m.id})">${avatar}<div class="member-name-plate">${m.name}</div></div>`;
    });
}

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
    document.getElementById('edit-name').value = m.name;
    document.getElementById('edit-avatar').value = m.avatar;
    document.getElementById('edit-hobbies').value = m.hobbies;
    document.getElementById('edit-message').value = m.message || '';
    document.getElementById('view-mode').style.display = 'none';
    document.getElementById('edit-mode').style.display = 'block';
}

function saveProfile() {
    const data = {
        name: document.getElementById('edit-name').value.trim(),
        avatar: document.getElementById('edit-avatar').value.trim(),
        hobbies: document.getElementById('edit-hobbies').value.trim(),
        message: document.getElementById('edit-message').value.trim()
    };
    database.ref('users/' + currentEditingId).update(data).then(() => {
        showToast("Cập nhật thành công!");
        document.getElementById('member-modal').style.display = 'none';
    });
}

function renderMoments() {
    const container = document.getElementById('moment-container');
    container.innerHTML = '';
    allMoments.forEach((m, idx) => {
        container.innerHTML += `<div class="moment-card" onclick="openMoment(${idx})"><img src="${m.url}"></div>`;
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
    openMoment(currentMomentIdx);
}

function addReaction(type) {
    const m = allMoments[currentMomentIdx];
    database.ref(`moments/${m.id}/reactions/${type}`).transaction(c => (c || 0) + 1);
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
    const url = prompt("Nhập link ảnh:");
    if (url) {
        const newRef = database.ref('moments').push();
        newRef.set({ url: url, reactions: { love: 0 } }).then(() => showToast("Đã thêm ảnh!"));
    }
}

function handleLogin() {
    const email = document.getElementById('login-email').value;
    const match = email.match(/^ban(\d+)@lop\.com$/);
    if (match) {
        loggedInUserId = parseInt(match[1]);
        document.getElementById('login-mask').style.display = 'none';
        document.getElementById('auth-btn').innerText = "Đăng xuất";
        showToast("Chào bạn số " + loggedInUserId);
    }
}

function showToast(msg) {
    const t = document.getElementById("toast");
    t.innerText = msg; t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 3000);
}

function cancelEditMode() {
    document.getElementById('view-mode').style.display = 'block';
    document.getElementById('edit-mode').style.display = 'none';
}

function closeModal(e, id) { if(e.target.id === id) document.getElementById(id).style.display = 'none'; }

init();
