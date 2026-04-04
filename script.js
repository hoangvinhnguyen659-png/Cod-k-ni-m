document.addEventListener('DOMContentLoaded', () => {
    const musicSelect = document.getElementById('bg-music-select');
    const audioPlayer = document.getElementById('audio-player');
    
    musicSelect.addEventListener('change', function() {
        if(this.value) {
            audioPlayer.src = this.value;
            audioPlayer.play();
        } else {
            audioPlayer.pause();
        }
    });

    const memberContainer = document.getElementById('member-container');
    for(let i=1; i<=15; i++) {
        let div = document.createElement('div');
        div.className = `member-card ${i > 9 ? 'hidden-item' : ''}`;
        div.onclick = () => openMemberModal(`Thành viên ${i}`);
        div.innerHTML = `<img src="https://via.placeholder.com/300x400.png?text=Anh+${i}"><h3>Thành viên ${i}</h3>`;
        memberContainer.appendChild(div);
    }

    const momentContainer = document.getElementById('moment-container');
    for(let i=1; i<=12; i++) {
        let div = document.createElement('div');
        div.className = `moment-card ${i > 6 ? 'hidden-item' : ''}`;
        div.onclick = () => openPhotoModal(`https://via.placeholder.com/800x600.png?text=Ky+Niem+${i}`);
        div.innerHTML = `<img src="https://via.placeholder.com/800x600.png?text=Ky+Niem+${i}">`;
        momentContainer.appendChild(div);
    }

    const noteContainer = document.getElementById('note-container');
    for(let i=1; i<=10; i++) {
        let div = document.createElement('div');
        div.className = `note ${i > 5 ? 'hidden-item' : ''}`;
        div.innerHTML = `Chúc mọi người luôn hạnh phúc! <br><br>- Bạn lớp mình ${i}`;
        noteContainer.appendChild(div);
    }
});

function showMore(containerId, btnId) {
    document.getElementById(containerId).querySelectorAll('.hidden-item').forEach(item => item.classList.remove('hidden-item'));
    document.getElementById(btnId).style.display = 'none';
}

function toggleTimeline() {
    const content = document.getElementById('timeline-text');
    const btn = document.getElementById('btn-timeline');
    content.classList.toggle('expanded');
    btn.innerText = content.classList.contains('expanded') ? 'Thu gọn' : 'Xem thêm';
}

function openMemberModal(name) {
    document.getElementById('modal-member-name').innerText = name;
    document.getElementById('modal-member-img').src = `https://via.placeholder.com/200?text=${name}`;
    document.getElementById('member-modal').style.display = 'flex';
}

function openPhotoModal(imgSrc) {
    document.getElementById('modal-photo-img').src = imgSrc;
    document.getElementById('modal-comments').innerHTML = ""; 
    document.getElementById('photo-modal').style.display = 'flex';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function react(emoji) {
    const commentList = document.getElementById('modal-comments');
    const newReact = document.createElement('p');
    newReact.style.borderLeft = "4px solid var(--primary)";
    newReact.innerHTML = `<strong>Bạn</strong> vừa thả: ${emoji}`;
    commentList.appendChild(newReact);
    commentList.scrollTop = commentList.scrollHeight;
}

function postComment() {
    const input = document.getElementById('new-comment');
    const text = input.value.trim();
    if(text !== "") {
        const commentList = document.getElementById('modal-comments');
        const newCmt = document.createElement('p');
        newCmt.innerHTML = `<strong>Bạn:</strong> ${text}`;
        commentList.appendChild(newCmt);
        input.value = "";
        commentList.scrollTop = commentList.scrollHeight;
    }
}

window.onclick = (e) => { if(e.target.classList.contains('modal')) e.target.style.display = "none"; };
