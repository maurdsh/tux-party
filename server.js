const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

let players = {};

io.on('connection', (socket) => {
    console.log('Nuevo jugador conectado:', socket.id);

    // Agregar nuevo jugador
    players[socket.id] = { x: 0, y: 0 };
    
    // Enviar a todos los jugadores actuales al nuevo jugador
    socket.emit('currentPlayers', players);

    // Notificar a los demás jugadores sobre el nuevo jugador
    socket.broadcast.emit('newPlayer', { id: socket.id, player: players[socket.id] });

    // Manejar el movimiento del pingüino
    socket.on('movePlayer', (data) => {
        players[socket.id].x = data.x;
        players[socket.id].y = data.y;
        socket.broadcast.emit('playerMoved', { id: socket.id, player: players[socket.id] });
    });

    // Manejar el envío de mensajes
    socket.on('sendMessage', (message) => {
        // Enviar el mensaje solo al jugador correspondiente
        io.emit('receiveMessage', message); // Emitir el mensaje al jugador emisor
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        socket.broadcast.emit('playerDisconnected', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});

