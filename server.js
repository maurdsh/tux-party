const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Servir archivos estï¿½ticos desde la carpeta 'public'
app.use(express.static('public'));

// Objeto para almacenar informaciï¿½n de los jugadores
let players = {};

// Manejar nuevas conexiones de Socket.io
io.on('connection', (socket) => {
    console.log('Nuevo jugador conectado:', socket.id);

    // Asignar al jugador a gameArea1 por defecto
    players[socket.id] = { x: 0, y: 0, room: 'gameArea1' };
    socket.join('gameArea1');

    // Enviar la lista actual de jugadores en gameArea1
    const currentPlayers = Object.keys(players)
        .filter(id => players[id].room === 'gameArea1')
        .reduce((acc, id) => {
            acc[id] = { x: players[id].x, y: players[id].y };
            return acc;
        }, {});
    socket.emit('currentPlayers', currentPlayers);

    // Notificar a los demï¿½s jugadores sobre el nuevo jugador
    socket.to('gameArea1').emit('newPlayer', { id: socket.id, player: players[socket.id] });

    // Manejar el movimiento del pingï¿½ino
    socket.on('movePlayer', (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;

            // Emitir el movimiento a los jugadores en la misma sala
            socket.to(players[socket.id].room).emit('playerMoved', { id: socket.id, player: players[socket.id] });
        }
    });

    // Manejar el envï¿½o de mensajes
    socket.on('sendMessage', (message) => {
        if (players[socket.id]) {
            if (message.toUpperCase() === 'EXIT') {
                players[socket.id].room = 'gameArea2';
                socket.leave('gameArea1');
                socket.join('gameArea2');
                io.to(socket.id).emit('switchedArea', 'EXIT');
                socket.to('gameArea1').emit('playerDisconnected', socket.id);
            } else {
                socket.to(players[socket.id].room).emit('receiveMessage', { id: socket.id, message });
            }
        }
    });

    // Manejar la desconexiï¿½n de un jugador
    socket.on('disconnect', () => {
        console.log('Jugador desconectado:', socket.id);
        if (players[socket.id]) {
            const area = players[socket.id].room;
            delete players[socket.id];
            socket.to(area).emit('playerDisconnected', socket.id);
        }
    });
});

// Iniciar el servidor en el puerto especificado
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor 1 escuchando en el puerto ${PORT}`);
});
