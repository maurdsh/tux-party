const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let players = {};

// Servir archivos estï¿½ticos
app.use(express.static(path.join(__dirname, 'public')));

// Servir el archivo HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Manejar conexiones de jugadores
io.on('connection', (socket) => {
    console.log('Jugador conectado:', socket.id);

    // Asignar un nuevo jugador
    players[socket.id] = { x: 100, y: 100 };
    socket.emit('yourID', socket.id);
    io.emit('updatePlayers', players);

    // Manejar movimiento
    socket.on('movePlayer', (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;
            io.emit('updatePlayers', players);
        }
    });

    // Desconexiï¿½n
    socket.on('disconnect', () => {
        console.log('Jugador desconectado:', socket.id);
        delete players[socket.id];
        io.emit('updatePlayers', players);
    });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});
