document.addEventListener('DOMContentLoaded', () => {
    // === XỬ LÝ NHẠC ===
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

    // === TẠO DỮ LIỆU MẪU ===
    // 1. Thành viên (15 người)
    const memberContainer = document.getElementById('member-container');
    for(let i=1; i<=15; i++) {
        let div = document.createElement('div');
        div.className = `member-card ${i > 9 ? 'hidden-item' : ''}`;
        div.onclick = () => openMemberModal(`Thành viên ${i}`);
        div.innerHTML = `
            <img src="https://via.placeholder.com/300x400.png?text=Anh+The+${i}" alt="Thành viên ${i}">
            <h3>Thành viên ${i}</h3>
        `;
        memberContainer.appendChild(div);
    }

    // 2. Khoảnh khắc (12 ảnh)
    const momentContainer = document.getElementById('moment-container');
    for(let i=1; i<=12; i++) {
        let reacts = Math.floor(Math.random() * 50) + 10;
        let div = document.createElement('div');
        div.className = `moment-card ${i > 6 ? 'hidden-item' : ''}`;
        div.onclick = () => openPhotoModal(`https://via.placeholder.com/600x400.png?text=Ky+Niem+${i}`, reacts);
        div.innerHTML = `
            <img src="https://via.placeholder.com/600x400.png?text=Ky+Niem+${i}" alt="Khoảnh khắc">
            <div class="moment-reacts"><i class="fa-solid fa-heart" style="color: red;"></i> ${reacts}</div>
        `;
        momentContainer.appendChild(div);
    }

    // 3. Giấy note (10 note)
    const noteContainer = document.getElementById('note-container');
    for(let i=1; i<=10; i++) {
        let div = document.createElement('div');
        div.className = `note ${i > 5 ? 'hidden-item' : ''}`;
        div.innerHTML = `Chúc mọi người luôn thành công trên con đường sắp tới! <br><br>- Bạn giấu tên ${i}`;
        noteContainer.appendChild(div);
    }
});

// === LOGIC CÁC HÀM TƯƠNG TÁC ===

function showMore(containerId, btnId) {
    const container = document.getElementById(containerId);
    const hiddenItems = container.querySelectorAll('.hidden-item');
    hiddenItems.forEach(item => item.classList.remove('hidden-item'));
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

let currentReacts = 0;
function openPhotoModal(imgSrc, reacts) {
    document.getElementById('modal-photo-img').src = imgSrc;
    currentReacts = reacts;
    document.getElementById('react-count').innerText = currentReacts;
    document.getElementById('photo-modal').style.display = 'flex';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function addReaction() {
    currentReacts++;
    document.getElementById('react-count').innerText = currentReacts;
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

window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = "none";
    }
};
