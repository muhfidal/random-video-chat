const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
const cors = require('cors');

app.use(cors());
app.use(express.static('public'));

// Menyimpan pengguna yang sedang mencari pasangan
let waitingUsers = [];

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Ketika pengguna ingin mencari pasangan
    socket.on('find-partner', () => {
        if (waitingUsers.includes(socket.id)) {
            return;
        }

        if (waitingUsers.length > 0) {
            // Ada pengguna yang sedang menunggu
            const partner = waitingUsers.shift();
            socket.emit('partner-found', { partnerId: partner, isCaller: false });
            io.to(partner).emit('partner-found', { partnerId: socket.id, isCaller: true });
        } else {
            // Tidak ada pengguna yang menunggu, tambahkan ke antrian
            waitingUsers.push(socket.id);
            socket.emit('waiting');
        }
    });

    // Menangani sinyal WebRTC
    socket.on('signal', ({ to, signal }) => {
        io.to(to).emit('signal', { from: socket.id, signal });
    });

    // Ketika pengguna ingin mencari pasangan baru
    socket.on('next-partner', () => {
        // Hapus dari antrian jika ada
        waitingUsers = waitingUsers.filter(id => id !== socket.id);
        // Cari pasangan baru
        socket.emit('find-partner');
    });

    // Ketika pengguna disconnect
    socket.on('disconnect', () => {
        waitingUsers = waitingUsers.filter(id => id !== socket.id);
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Mendengarkan di semua interface jaringan

http.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
    console.log('Untuk mengakses dari perangkat lain, gunakan IP komputer Anda di jaringan lokal');
}); 