const socket = io();
let localStream;
let peerConnection;
let currentPartner = null;
let permissionModal;
let isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
let isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
let isCaller = false;

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const startButton = document.getElementById('startButton');
const nextButton = document.getElementById('nextButton');
const stopButton = document.getElementById('stopButton');
const statusDiv = document.getElementById('status');
const permissionStatus = document.getElementById('permissionStatus');
const requestPermissionBtn = document.getElementById('requestPermissionBtn');
const browserInstructions = document.getElementById('browserInstructions');

const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

// Inisialisasi modal
document.addEventListener('DOMContentLoaded', () => {
    permissionModal = new bootstrap.Modal(document.getElementById('permissionModal'));
    if (isMobile) {
        browserInstructions.classList.remove('d-none');
    }
});

// Event Listeners
startButton.addEventListener('click', checkAndRequestPermissions);
nextButton.addEventListener('click', findNextPartner);
stopButton.addEventListener('click', stopChat);
requestPermissionBtn.addEventListener('click', requestPermissions);

// Socket Events
socket.on('waiting', () => {
    updateStatus('Mencari partner...');
});

socket.on('partner-found', async ({ partnerId, isCaller: caller }) => {
    currentPartner = partnerId;
    isCaller = caller;
    updateStatus('Partner ditemukan!');
    nextButton.disabled = false;
    stopButton.disabled = false;
    startButton.disabled = true;
    await createPeerConnection();
});

socket.on('signal', async ({ from, signal }) => {
    if (signal.type === 'offer') {
        await handleOffer(signal);
    } else if (signal.type === 'answer') {
        await handleAnswer(signal);
    } else if (signal.type === 'candidate') {
        await handleCandidate(signal);
    }
});

// Functions
async function checkAndRequestPermissions() {
    try {
        // Cek izin yang sudah ada
        const permissions = await navigator.permissions.query({ name: 'camera' });
        if (permissions.state === 'granted') {
            // Cek juga apakah localStream sudah ada
            if (!localStream) {
                localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                localVideo.srcObject = localStream;
            }
            await startChat();
        } else {
            permissionModal.show();
        }
    } catch (error) {
        console.error('Error checking permissions:', error);
        permissionModal.show();
    }
}

async function requestPermissions() {
    try {
        permissionStatus.textContent = 'Meminta izin kamera dan mikrofon...';
        permissionStatus.className = 'alert alert-info';
        
        if (isMobile && isChrome) {
            // Pendekatan khusus untuk Chrome mobile
            try {
                // Buat elemen video tersembunyi
                const tempVideo = document.createElement('video');
                tempVideo.style.display = 'none';
                tempVideo.setAttribute('playsinline', '');
                tempVideo.setAttribute('webkit-playsinline', '');
                tempVideo.setAttribute('autoplay', '');
                document.body.appendChild(tempVideo);

                // Minta izin kamera terlebih dahulu
                const videoStream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: 'user',
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    },
                    audio: false
                });

                // Minta izin mikrofon
                const audioStream = await navigator.mediaDevices.getUserMedia({
                    video: false,
                    audio: true
                });

                // Gabungkan stream
                localStream = videoStream;
                audioStream.getAudioTracks().forEach(track => {
                    localStream.addTrack(track);
                });

                // Hapus elemen video sementara
                document.body.removeChild(tempVideo);

                // Set video stream ke elemen video
                localVideo.srcObject = localStream;
                
                permissionStatus.textContent = 'Izin diberikan!';
                permissionStatus.className = 'alert alert-success';
                
                setTimeout(() => {
                    permissionModal.hide();
                    startChat();
                }, 1500);

            } catch (error) {
                console.error('Error in Chrome mobile:', error);
                if (error.name === 'NotAllowedError') {
                    permissionStatus.textContent = 'Izin ditolak. Mohon izinkan akses kamera dan mikrofon di pengaturan Chrome.';
                    permissionStatus.className = 'alert alert-danger';
                    browserInstructions.classList.remove('d-none');
                } else {
                    throw error;
                }
            }
        } else {
            // Untuk browser lain
            localStream = await navigator.mediaDevices.getUserMedia({ 
                video: true, 
                audio: true 
            });
            
            permissionStatus.textContent = 'Izin diberikan!';
            permissionStatus.className = 'alert alert-success';
            
            setTimeout(() => {
                permissionModal.hide();
                startChat();
            }, 1500);
        }
    } catch (error) {
        console.error('Error accessing media devices:', error);
        permissionStatus.textContent = 'Error: Izin ditolak. Mohon izinkan akses kamera dan mikrofon.';
        permissionStatus.className = 'alert alert-danger';
        
        if (error.name === 'NotAllowedError') {
            updateStatus('Error: Izin kamera/mikrofon ditolak. Mohon izinkan di pengaturan browser.');
            if (isMobile) {
                browserInstructions.classList.remove('d-none');
            }
        } else if (error.name === 'NotFoundError') {
            updateStatus('Error: Kamera/mikrofon tidak ditemukan.');
        } else {
            updateStatus('Error: Tidak dapat mengakses kamera/mikrofon');
        }
    }
}

async function startChat() {
    try {
        if (!localStream) {
            throw new Error('No local stream available');
        }
        socket.emit('find-partner');
        updateStatus('Memulai chat...');
    } catch (error) {
        console.error('Error starting chat:', error);
        updateStatus('Error: Gagal memulai chat');
    }
}

async function createPeerConnection() {
    peerConnection = new RTCPeerConnection(configuration);

    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    peerConnection.ontrack = event => {
        remoteVideo.srcObject = event.streams[0];
    };

    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            socket.emit('signal', {
                to: currentPartner,
                signal: event.candidate
            });
        }
    };

    if (isCaller) {
        try {
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            socket.emit('signal', {
                to: currentPartner,
                signal: offer
            });
        } catch (error) {
            console.error('Error creating offer:', error);
            updateStatus('Error: Gagal membuat koneksi');
        }
    }
}

async function handleOffer(offer) {
    try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('signal', {
            to: currentPartner,
            signal: answer
        });
    } catch (error) {
        console.error('Error handling offer:', error);
        updateStatus('Error: Gagal menangani koneksi');
    }
}

async function handleAnswer(answer) {
    try {
        if (!peerConnection) {
            console.error('peerConnection belum dibuat saat menerima answer');
            updateStatus('Error: PeerConnection tidak tersedia.');
            return;
        }
        if (peerConnection.signalingState === "have-local-offer") {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        } else {
            console.warn('Signaling state tidak sesuai untuk menerima answer:', peerConnection.signalingState);
        }
    } catch (error) {
        console.error('Error handling answer:', error, answer);
        updateStatus('Error: Gagal menangani jawaban');
    }
}

async function handleCandidate(candidate) {
    try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
        console.error('Error handling candidate:', error);
        updateStatus('Error: Gagal menangani kandidat ICE');
    }
}

function findNextPartner() {
    if (peerConnection) {
        peerConnection.close();
    }
    if (currentPartner) {
        socket.emit('next-partner');
        currentPartner = null;
    }
    updateStatus('Mencari partner baru...');
}

function stopChat() {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    if (peerConnection) {
        peerConnection.close();
    }
    localVideo.srcObject = null;
    remoteVideo.srcObject = null;
    currentPartner = null;
    startButton.disabled = false;
    nextButton.disabled = true;
    stopButton.disabled = true;
    updateStatus('Chat dihentikan');
}

function updateStatus(message) {
    statusDiv.textContent = message;
} 