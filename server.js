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
    players[socket.id] = { x: 0, y: 0, room: 'gameArea1' };  // Se usa 'room' para indicar el ï¿½rea actual
    socket.join('gameArea1');

    // Enviar al nuevo jugador la lista actual de jugadores en su ï¿½rea actual (gameArea1)
    const currentPlayers = Object.keys(players)
        .filter(id => players[id].room === 'gameArea1')  // Filtrar solo jugadores en la misma sala
        .reduce((acc, id) => {
            acc[id] = { x: players[id].x, y: players[id].y };
            return acc;
        }, {});
    socket.emit('currentPlayers', currentPlayers);

    // Notificar a los demï¿½s jugadores en gameArea1 sobre el nuevo jugador
    socket.to('gameArea1').emit('newPlayer', { id: socket.id, player: players[socket.id] });

    // Manejar el movimiento del pingï¿½ino
    socket.on('movePlayer', (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;

            // Emitir el movimiento solo a los jugadores en la misma sala
            socket.to(players[socket.id].room).emit('playerMoved', { id: socket.id, player: players[socket.id] });
        }
    });

    // Manejar el envï¿½o de mensajes
    socket.on('sendMessage', (message) => {
        if (players[socket.id]) {
            if (message.toUpperCase() === 'EXIT') {
                // Mover al jugador a gameArea2
                players[socket.id].room = 'gameArea2';

                // Cambiar al socket a la nueva sala
                socket.leave('gameArea1');
                socket.join('gameArea2');

                // Emitir evento 'switchedArea' al cliente para redirigir a index2.html
                io.to(socket.id).emit('switchedArea', 'EXIT');

                // Notificar a los jugadores en gameArea1 que el jugador ha salido
                socket.to('gameArea1').emit('playerDisconnected', socket.id);
            } else if (message.toUpperCase() === 'NESCAFE') {
                // Mover al jugador a gameArea1
                players[socket.id].room = 'gameArea1';

                // Cambiar al socket a la nueva sala
                socket.leave('gameArea2');
                socket.join('gameArea1');

                // Emitir evento 'switchedArea' al cliente para redirigir a index.html
                io.to(socket.id).emit('switchedArea', 'NESCAFE');

                // Notificar a los demï¿½s jugadores en gameArea1 sobre el reingreso
                socket.to('gameArea1').emit('newPlayer', { id: socket.id, player: players[socket.id] });
            } else {
                // Enviar el mensaje a los jugadores en la misma sala
                socket.to(players[socket.id].room).emit('receiveMessage', { id: socket.id, message: message });
            }
        }
    });

    // Manejar la desconexiï¿½n de un jugador
    socket.on('disconnect', () => {
        console.log('Jugador desconectado:', socket.id);
        if (players[socket.id]) {
            const area = players[socket.id].room;
            delete players[socket.id];
            // Notificar a la sala que el jugador se ha desconectado
            socket.to(area).emit('playerDisconnected', socket.id);
        }
    });
});

// Iniciar el servidor en el puerto especificado
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});
