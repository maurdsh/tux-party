const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Servir archivos estï¿½ticos desde la carpeta 'public'
app.use(express.static('public'));

// Objeto para almacenar informaciï¿½n de los jugadores en gameArea2
let players = {};

// Manejar nuevas conexiones de Socket.io
io.on('connection', (socket) => {
    console.log('Nuevo jugador conectado en gameArea2:', socket.id);

    // Asignar al jugador a gameArea2 por defecto
    players[socket.id] = { x: 0, y: 0, room: 'gameArea2' }; // Se usa 'room' para indicar el ï¿½rea actual
    socket.join('gameArea2');

    // Enviar al nuevo jugador la lista actual de jugadores en su ï¿½rea actual (gameArea2)
    const currentPlayers = Object.keys(players)
        .filter(id => players[id].room === 'gameArea2') // Filtrar solo jugadores en la misma sala
        .reduce((acc, id) => {
            acc[id] = { x: players[id].x, y: players[id].y };
            return acc;
        }, {});
    socket.emit('currentPlayers', currentPlayers);

    // Notificar a los demï¿½s jugadores en gameArea2 sobre el nuevo jugador
    socket.to('gameArea2').emit('newPlayer', { id: socket.id, player: players[socket.id] });

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
            // Enviar el mensaje a los jugadores en la misma sala
            socket.to(players[socket.id].room).emit('receiveMessage', { id: socket.id, message: message });
        }
    });

    // Manejar la desconexiï¿½n de un jugador
    socket.on('disconnect', () => {
        console.log('Jugador desconectado de gameArea2:', socket.id);
        if (players[socket.id]) {
            const area = players[socket.id].room;
            delete players[socket.id];
            // Notificar a la sala que el jugador se ha desconectado
            socket.to(area).emit('playerDisconnected', socket.id);
        }
    });
});

// Iniciar el servidor en el puerto especificado
const PORT = process.env.PORT || 3001; // Cambiar el puerto a 3001
server.listen(PORT, () => {
    console.log(`Servidor 2 escuchando en el puerto ${PORT}`);
});
