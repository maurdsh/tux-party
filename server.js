const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

let players = {};

// Manejar nuevas conexiones
io.on('connection', (socket) => {
    console.log('Nuevo jugador conectado:', socket.id);

    // Agregar nuevo jugador
    players[socket.id] = { x: 0, y: 0 };
    
    // Enviar todos los jugadores actuales al nuevo jugador
    socket.emit('currentPlayers', players);

    // Notificar a los demás jugadores sobre el nuevo jugador
    socket.broadcast.emit('newPlayer', { id: socket.id, player: players[socket.id] });

    // Manejar el movimiento del pingüino
socket.on('movePlayer', (data) => {
    players[socket.id].x = data.x;
    players[socket.id].y = data.y;
    io.emit('playerMoved', { id: socket.id, player: players[socket.id] });
});

    // Escuchar evento de movimiento de jugador
socket.on('playerMoved', (data) => {
  animateMove(data.id, data.player.x, data.player.y);
});
    
    // Manejar el envío de mensajes
    socket.on('sendMessage', (message) => {
        // Enviar el mensaje a todos los jugadores, con el ID del emisor
        io.emit('receiveMessage', { id: socket.id, message: message }); // Emitir el mensaje para todos
    });

    // Manejar la desconexión de un jugador
    socket.on('disconnect', () => {
        console.log('Jugador desconectado:', socket.id);
        delete players[socket.id];
        socket.broadcast.emit('playerDisconnected', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});

