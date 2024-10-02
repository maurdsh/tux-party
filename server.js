// server.js

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = process.env.PORT || 3000;

// Servir archivos estï¿½ticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Almacenar los jugadores actuales
const players = {};

// Manejar la conexiï¿½n de los sockets
io.on('connection', (socket) => {
    console.log('Nuevo jugador conectado:', socket.id);

    // Inicializar el jugador en la posiciï¿½n (0, 0)
    players[socket.id] = {
        x: 0,
        y: 0,
    };

    // Emitir a todos los clientes los jugadores actuales
    io.emit('currentPlayers', players);

    // Manejar el movimiento del jugador
    socket.on('movePlayer', (data) => {
        players[socket.id].x = data.x;
        players[socket.id].y = data.y;
        socket.broadcast.emit('playerMoved', {
            id: socket.id,
            player: players[socket.id],
        });
    });

    // Manejar la desconexiï¿½n del jugador
    socket.on('disconnect', () => {
        console.log('Jugador desconectado:', socket.id);
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });

    // Manejar el envï¿½o de mensajes
    socket.on('sendMessage', (message) => {
        io.emit('receiveMessage', {
            id: socket.id,
            message: message,
        });
    });
});

// Iniciar el servidor
server.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
