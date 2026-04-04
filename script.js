const firebaseConfig = {
    apiKey: "AIzaSyCNzWm4KPPNA06L0RCxK6blA2-SudRVw3U",
    authDomain: "cod-ki-niem.firebaseapp.com",
    databaseURL: "https://cod-ki-niem-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "cod-ki-niem",
    appId: "1:564135267081:web:ddc21cee697090914a61d8"
};
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();

// Theo dõi đăng nhập
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
    // Load Thành Viên
    database.ref('users').on('value', snap => {
        const container = document.getElementById('member-container');
        container.innerHTML = `<div class="member-card add-btn" onclick="updateProfile()"><i class="fa-solid fa-user-plus"></i><p>Sửa Profile mình</p></div>`;
        snap.forEach(child => {
            const val = child.val();
            container.innerHTML += `<div class="member-card"><img src="${val.avatar || 'https://via.placeholder.com/150'}"><h3>${val.name || 'Thành viên'}</h3></div>`;
        });
    });

    // Load Khoảnh Khắc
    database.ref('moments').on('value', snap => {
        const container = document.getElementById('moment-container');
        container.innerHTML = `<div class="moment-card add-btn" onclick="uploadMoment()"><i class="fa-solid fa-camera"></i><p>Thêm ảnh</p></div>`;
        snap.forEach(child => {
            const val = child.val();
            let div = document.createElement('div');
            div.className = 'moment-card';
            div.onclick = () => openPhotoModal(val.url, child.key);
            div.innerHTML = `<img src="${val.url}">`;
            container.insertBefore(div, container.firstChild);
        });
    });
}

function updateProfile() {
    const name = prompt("Nhập tên thật của bạn:");
    const avatar = prompt("Dán link ảnh chân dung (Imgur/Postimages):");
    if(name && avatar) {
        database.ref('users/' + auth.currentUser.uid).set({ name, avatar });
    }
}

function uploadMoment() {
    const url = prompt("Dán link ảnh kỷ niệm:");
    if(url) database.ref('moments').push({ url, owner: auth.currentUser.email });
}

function openPhotoModal(src, id) {
    currentPhotoId = id;
    document.getElementById('modal-photo-img').src = src;
    document.getElementById('photo-modal').style.display = 'flex';
    document.getElementById('modal-comments').innerHTML = "";

    database.ref('comments/' + id).on('child_added', snap => {
        const p = document.createElement('p');
        p.innerHTML = `<strong>Lớp mình</strong>${snap.val().msg}`;
        document.getElementById('modal-comments').appendChild(p);
    });

    database.ref('reactions/' + id).on('value', snap => {
        let counts = {};
        if(snap.val()) {
            Object.values(snap.val()).forEach(e => counts[e] = (counts[e] || 0) + 1);
            let html = "";
            for(let e in counts) html += `<span>${e} ${counts[e]}</span>`;
            document.getElementById('reaction-summary').innerHTML = html;
        }
    });
}

function postComment() {
    const msg = document.getElementById('new-comment').value;
    if(msg) {
        database.ref('comments/' + currentPhotoId).push({ msg });
        document.getElementById('new-comment').value = "";
    }
}

function sendReaction(e) {
    database.ref('reactions/' + currentPhotoId).push(e);
}

function closeModal(id) { document.getElementById(id).style.display = 'none'; }

document.addEventListener('contextmenu', e => e.preventDefault());
document.onkeydown = e => { if(e.keyCode == 123 || (e.ctrlKey && e.shiftKey && e.keyCode == 73)) return false; };
