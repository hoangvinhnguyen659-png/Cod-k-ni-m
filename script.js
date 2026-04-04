const firebaseConfig = {
    apiKey: "AIzaSyCNzWm4KPPNA06L0RCxK6blA2-SudRVw3U",
    databaseURL: "https://cod-ki-niem-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "cod-ki-niem",
    storageBucket: "cod-ki-niem.appspot.com"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();

let allMembers = [];
let allMoments = [];
let limitMembers = 10;
let limitMoments = 10;
let limitNotes = 10;

// Khởi tạo 42 Giấy Note
const allNotes = Array.from({length: 42}, (_, i) => ({
    msg: `Lớp mình mãi đỉnh! Chúc mọi người thi tốt và đạt được ước mơ nhé. Hẹn gặp lại vào ngày họp lớp!`,
    author: `Thành viên ${i + 1}`,
    color: ['#ffeb3b', '#ffcdd2', '#b2ebf2', '#c8e6c9', '#e1bee7'][i % 5]
}));

const iconEdit = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="custom-icon-large"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;

// Load Thành viên & Tự động bù đủ 42
database.ref('users').on('value', snap => {
    allMembers = [];
    snap.forEach(child => { allMembers.push({...child.val(), id: child.key}); });
    
    while(allMembers.length < 42) {
        allMembers.push({ name: `Thành viên ${allMembers.length + 1}`, avatar: 'https://via.placeholder.com/150' });
    }
    renderMembers();
});

function renderMembers() {
    const container = document.getElementById('member-container');
    container.innerHTML = `<div class="member-card add-btn" onclick="updateProfile()">${iconEdit}<p>Sửa Profile</p></div>`;
    allMembers.slice(0, limitMembers).forEach(m => {
        container.innerHTML += `<div class="member-card" onclick="openMemberModal('${m.name}', '${m.avatar}')">
            <img src="${m.avatar}"><div class="member-name-plate">${m.name}</div>
        </div>`;
    });
    document.getElementById('load-more-members').style.display = limitMembers < 42 ? 'block' : 'none';
}

function loadMoreMembers() { limitMembers += 10; renderMembers(); }

// Render Ảnh (Mẫu 42 ảnh)
function renderMoments() {
    const container = document.getElementById('moment-container');
    container.innerHTML = '';
    for(let i=1; i<=limitMoments; i++){
        container.innerHTML += `<div class="moment-card"><img src="https://picsum.photos/300/300?random=${i}"></div>`;
    }
    document.getElementById('load-more-moments').style.display = limitMoments < 42 ? 'block' : 'none';
}
function loadMoreMoments() { limitMoments += 10; renderMoments(); }

// Render 42 Note
function renderNotes() {
    const container = document.getElementById('notes-container');
    container.innerHTML = '';
    allNotes.slice(0, limitNotes).forEach(n => {
        container.innerHTML += `<div class="note-card" style="background:${n.color}"><p>"${n.msg}"</p><span>- ${n.author}</span></div>`;
    });
    document.getElementById('load-more-notes').style.display = limitNotes < 42 ? 'block' : 'none';
}
function loadMoreNotes() { limitNotes += 10; renderNotes(); }

// Khởi chạy
renderMoments();
renderNotes();

// Nhạc Spotify (Giữ nguyên logic cũ nhưng fix giao diện)
const songs = [{ title: "Tháng Năm Không Quên", artist: "Học sinh 12", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", cover: "https://picsum.photos/100/100?music=1" }];
const audio = document.getElementById('audio-player');
function togglePlay() { 
    if(audio.paused) { audio.play(); document.getElementById('play-icon').innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>'; }
    else { audio.pause(); document.getElementById('play-icon').innerHTML = '<path d="M8 5v14l11-7z"/>'; }
}
audio.src = songs[0].url;
document.getElementById('sp-title').innerText = songs[0].title;
document.getElementById('sp-cover').src = songs[0].cover;

function closeModal(e, id) { if(e.target.id === id) document.getElementById(id).style.display='none'; }
function openMemberModal(name, img) {
    document.getElementById('modal-member-name').innerText = name;
    document.getElementById('modal-member-img').src = img;
    document.getElementById('member-modal').style.display = 'flex';
}
