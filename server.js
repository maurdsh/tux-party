const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

let players = {}; // Almacena todos los jugadores con su información y sala actual

// Manejar nuevas conexiones
io.on('connection', (socket) => {
    console.log('Nuevo jugador conectado:', socket.id);

    // Asignar al jugador al gameArea1 por defecto
    players[socket.id] = { x: 0, y: 0, area: 'gameArea1' };
    socket.join('gameArea1');

    // Enviar todos los jugadores actuales en gameArea1 al nuevo jugador
    const currentPlayers = Object.keys(players).filter(id => players[id].area === 'gameArea1')
        .reduce((acc, id) => {
            acc[id] = { x: players[id].x, y: players[id].y };
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
            socket.to(players[socket.id].area).emit('playerMoved', { id: socket.id, player: players[socket.id] });
        }
    });

    // Manejar el envío de mensajes
    socket.on('sendMessage', (message) => {
        if (players[socket.id]) {
            if (message.toUpperCase() === 'EXIT') {
                // Cambiar de área
                const currentArea = players[socket.id].area;
                const newArea = currentArea === 'gameArea1' ? 'gameArea2' : 'gameArea1';
                
                // Salir de la sala actual y unirse a la nueva
                socket.leave(currentArea);
                socket.join(newArea);
                
                // Actualizar la sala en la información del jugador
                players[socket.id].area = newArea;

                // Notificar al cliente que ha cambiado de área
                socket.emit('switchedArea', newArea);

                // Notificar a la sala antigua que el jugador se ha desconectado
                socket.to(currentArea).emit('playerDisconnected', socket.id);

                // Enviar los jugadores actuales en la nueva sala al jugador que cambió de área
                const newAreaPlayers = Object.keys(players).filter(id => players[id].area === newArea)
                    .reduce((acc, id) => {
                        acc[id] = { x: players[id].x, y: players[id].y };
                        return acc;
                    }, {});
                socket.emit('currentPlayers', newAreaPlayers);

                // Notificar a la nueva sala sobre el jugador que se ha unido
                socket.to(newArea).emit('newPlayer', { id: socket.id, player: players[socket.id] });

            } else {
                // Enviar el mensaje solo a los jugadores en la misma área
                io.to(players[socket.id].area).emit('receiveMessage', { id: socket.id, message: message });
            }
        }
    });

    // Manejar la desconexión de un jugador
    socket.on('disconnect', () => {
        console.log('Jugador desconectado:', socket.id);
        if (players[socket.id]) {
            const currentArea = players[socket.id].area;
            delete players[socket.id];
            // Notificar a la sala que el jugador se ha desconectado
            socket.to(currentArea).emit('playerDisconnected', socket.id);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});
