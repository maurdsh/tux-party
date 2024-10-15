const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

let players = {}; // Almacena información de los jugadores

// Manejar nuevas conexiones
io.on('connection', (socket) => {
    console.log('Nuevo jugador conectado:', socket.id);

    // Asignar al jugador al gameArea1 por defecto
    players[socket.id] = { x: 0, y: 0, hasExited: false };
    socket.join('gameArea1');

    // Enviar los jugadores actuales en gameArea1 al nuevo jugador
    const currentPlayers = Object.keys(players)
        .filter(id => !players[id].hasExited)
        .reduce((acc, id) => {
            acc[id] = { x: players[id].x, y: players[id].y, hasExited: players[id].hasExited };
            return acc;
        }, {});
    socket.emit('currentPlayers', currentPlayers);

    // Notificar a los demás jugadores en gameArea1 sobre el nuevo jugador
    socket.to('gameArea1').emit('newPlayer', { id: socket.id, player: players[socket.id] });

    // Manejar el movimiento del pingüino
    socket.on('movePlayer', (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;
            // Emitir el movimiento solo a los jugadores en la misma área
            if (!players[socket.id].hasExited) {
                socket.to('gameArea1').emit('playerMoved', { id: socket.id, player: players[socket.id] });
            } else {
                socket.to('gameArea2').emit('playerMoved', { id: socket.id, player: players[socket.id] });
            }
        }
    });

    // Manejar el envío de mensajes
    socket.on('sendMessage', (message) => {
        if (players[socket.id]) {
            if (message.toUpperCase() === 'EXIT') {
                // Cambiar de área
                players[socket.id].hasExited = true;

                // Salir de la sala actual y unirse a gameArea2
                socket.leave('gameArea1');
                socket.join('gameArea2');

                // Emitir el evento de cambio de área al cliente
                socket.emit('switchedArea', 'EXIT');

                // Notificar a la sala antigua que el jugador se ha desconectado
                socket.to('gameArea1').emit('playerDisconnected', socket.id);

                // Notificar a la nueva sala sobre el jugador que se ha unido
                socket.to('gameArea2').emit('newPlayer', { id: socket.id, player: players[socket.id] });

            } else {
                // Enviar el mensaje solo a los jugadores en la misma área
                if (!players[socket.id].hasExited) {
                    io.to('gameArea1').emit('receiveMessage', { id: socket.id, message: message, hasExited: players[socket.id].hasExited });
                } else {
                    io.to('gameArea2').emit('receiveMessage', { id: socket.id, message: message, hasExited: players[socket.id].hasExited });
                }
            }
        }
    });

    // Manejar la desconexión de un jugador
    socket.on('disconnect', () => {
        console.log('Jugador desconectado:', socket.id);
        if (players[socket.id]) {
            const area = players[socket.id].hasExited ? 'gameArea2' : 'gameArea1';
            delete players[socket.id];
            // Notificar a la sala que el jugador se ha desconectado
            socket.to(area).emit('playerDisconnected', socket.id);
        }
    });

    // Manejar el evento personalizado 'exitGameArea' si es necesario
    socket.on('exitGameArea', () => {
        if (players[socket.id] && !players[socket.id].hasExited) {
            players[socket.id].hasExited = true;
            socket.leave('gameArea1');
            socket.join('gameArea2');
            socket.emit('switchedArea', 'EXIT');
            socket.to('gameArea1').emit('playerDisconnected', socket.id);
            socket.to('gameArea2').emit('newPlayer', { id: socket.id, player: players[socket.id] });
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});
