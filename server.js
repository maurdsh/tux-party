// server.js

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
    players[socket.id] = { x: 0, y: 0, hasExited: false };
    socket.join('gameArea1');

    // Enviar al nuevo jugador la lista actual de jugadores en gameArea1
    const currentPlayers = Object.keys(players)
        .filter(id => !players[id].hasExited)
        .reduce((acc, id) => {
            acc[id] = { x: players[id].x, y: players[id].y, hasExited: players[id].hasExited };
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

            // Determinar la sala actual del jugador
            const currentArea = players[socket.id].hasExited ? 'gameArea2' : 'gameArea1';

            // Emitir el movimiento solo a los jugadores en la misma ï¿½rea
            io.to(currentArea).emit('playerMoved', { id: socket.id, player: players[socket.id] });
        }
    });

    // Manejar el envï¿½o de mensajes
    socket.on('sendMessage', (message) => {
        if (players[socket.id]) {
            if (message.toUpperCase() === 'EXIT') {
                // Actualizar el estado del jugador a hasExited: true
                players[socket.id].hasExited = true;

                // Mover el socket de gameArea1 a gameArea2
                socket.leave('gameArea1');
                socket.join('gameArea2');

                // Emitir evento 'switchedArea' al cliente para redirigir a index2.html
                io.to(socket.id).emit('switchedArea', 'EXIT');

                // Notificar a los jugadores en gameArea1 que el jugador ha salido
                socket.to('gameArea1').emit('playerDisconnected', socket.id);

                // Enviar un mensaje al jugador que ha salido
                io.to(socket.id).emit('receiveMessage', { id: 'Server', message: 'Has salido del ï¿½rea de juego.', hasExited: true });

                console.log(`Jugador ${socket.id} ha salido del ï¿½rea de juego.`);
            } else {
                // Determinar la sala actual del jugador
                const currentArea = players[socket.id].hasExited ? 'gameArea2' : 'gameArea1';

                // Enviar el mensaje a los jugadores en la misma ï¿½rea
                io.to(currentArea).emit('receiveMessage', { id: socket.id, message: message, hasExited: players[socket.id].hasExited });
            }
        }
    });

    // Manejar la reconexiï¿½n al ï¿½rea de juego (opcional)
    socket.on('reenterGameArea', () => {
        if (players[socket.id] && players[socket.id].hasExited) {
            players[socket.id].hasExited = false;

            // Mover el socket de gameArea2 a gameArea1
            socket.leave('gameArea2');
            socket.join('gameArea1');

            // Emitir evento 'switchedArea' al cliente para redirigir a index.html
            io.to(socket.id).emit('switchedArea', 'NORMAL');

            // Notificar a los demï¿½s jugadores en gameArea1 sobre el reingreso
            socket.to('gameArea1').emit('newPlayer', { id: socket.id, player: players[socket.id] });

            console.log(`Jugador ${socket.id} ha reingresado al ï¿½rea de juego.`);
        }
    });

    // Manejar la desconexiï¿½n de un jugador
    socket.on('disconnect', () => {
        console.log('Jugador desconectado:', socket.id);
        if (players[socket.id]) {
            const area = players[socket.id].hasExited ? 'gameArea2' : 'gameArea1';
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
