const firebaseConfig = {
    apiKey: "AIzaSyCNzWm4KPPNA06L0RCxK6blA2-SudRVw3U",
    authDomain: "cod-ki-niem.firebaseapp.com",
    databaseURL: "https://cod-ki-niem-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "cod-ki-niem",
    storageBucket: "cod-ki-niem.firebasestorage.app",
    messagingSenderId: "564135267081",
    appId: "1:564135267081:web:ddc21cee697090914a61d8"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

document.addEventListener('DOMContentLoaded', () => {
    const musicSelect = document.getElementById('bg-music-select');
    const audioPlayer = document.getElementById('audio-player');
    musicSelect.onchange = function() {
        if(this.value) { audioPlayer.src = this.value; audioPlayer.play(); }
        else { audioPlayer.pause(); }
    };

    const memberContainer = document.getElementById('member-container');
    for(let i=1; i<=15; i++) {
        let div = document.createElement('div');
        div.className = `member-card ${i > 8 ? 'hidden-item' : ''}`;
        div.innerHTML = `<img src="https://via.placeholder.com/300x300.png?text=Ban+${i}"><h3>Bạn ${i}</h3>`;
        memberContainer.appendChild(div);
    }

    const momentContainer = document.getElementById('moment-container');
    for(let i=1; i<=12; i++) {
        let div = document.createElement('div');
        div.className = `moment-card ${i > 6 ? 'hidden-item' : ''}`;
        let imgUrl = `https://via.placeholder.com/600x600.png?text=Ky+Niem+${i}`;
        div.onclick = () => openPhotoModal(imgUrl, `anh_${i}`);
        div.innerHTML = `<img src="${imgUrl}">`;
        momentContainer.appendChild(div);
    }
});

let currentPhotoId = null;

function openPhotoModal(imgSrc, photoId) {
    currentPhotoId = photoId;
    document.getElementById('modal-photo-img').src = imgSrc;
    document.getElementById('modal-comments').innerHTML = "";
    document.getElementById('photo-modal').style.display = 'flex';

    database.ref('comments/' + photoId).on('child_added', (snapshot) => {
        const data = snapshot.val();
        const list = document.getElementById('modal-comments');
        const p = document.createElement('p');
        p.innerHTML = `<strong>${data.name}</strong>${data.message}`;
        list.appendChild(p);
        list.scrollTop = list.scrollHeight;
    });

    database.ref('reactions/' + photoId).on('value', (snapshot) => {
        const reactions = snapshot.val();
        const summaryDiv = document.getElementById('reaction-summary');
        if(!reactions) { summaryDiv.style.display = 'none'; return; }
        summaryDiv.style.display = 'flex';
        const count = Object.keys(reactions).length;
        const lastEmoji = Object.values(reactions).pop();
        summaryDiv.innerHTML = `${lastEmoji} <span>${count}</span>`;
    });
}

function postComment() {
    const input = document.getElementById('new-comment');
    if(input.value.trim() && currentPhotoId) {
        database.ref('comments/' + currentPhotoId).push({
            name: "Thành viên lớp",
            message: input.value.trim()
        });
        input.value = "";
    }
}

function sendReaction(emoji) {
    if(currentPhotoId) {
        database.ref('reactions/' + currentPhotoId).push(emoji);
    }
}

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
    if(id === 'photo-modal') {
        database.ref('comments/' + currentPhotoId).off();
        database.ref('reactions/' + currentPhotoId).off();
    }
}

function showMore(containerId, btnId) {
    document.getElementById(containerId).querySelectorAll('.hidden-item').forEach(item => item.classList.remove('hidden-item'));
    document.getElementById(btnId).style.display = 'none';
}

document.addEventListener('contextmenu', e => e.preventDefault());
document.onkeydown = function(e) {
    if (e.keyCode == 123 || (e.ctrlKey && e.shiftKey && (e.keyCode == 73 || e.keyCode == 74 || e.keyCode == 67)) || (e.ctrlKey && e.keyCode == 85)) {
        return false;
    }
};

window.onclick = (e) => { if(e.target.classList.contains('modal')) closeModal(e.target.id); };
