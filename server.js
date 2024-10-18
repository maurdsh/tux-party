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
        socket.broadcast.emit('playerMoved', { id: socket.id, player: players[socket.id] });
    });

    // Manejar el envío de mensajes
    socket.on('sendMessage', (message) => {
        // Enviar el mensaje a todos los jugadores, con el ID del emisor
        io.emit('receiveMessage', { id: socket.id, message: message }); // Emitir el mensaje para todos
    });

    // Manejar comandos especiales como 'exit' y 'nescafe'
    socket.on('exit', () => {
        console.log(`El jugador ${socket.id} ha salido.`);
        socket.disconnect(); // Desconectar al usuario si ejecuta el comando 'exit'
    });

    socket.on('nescafe', () => {
        console.log(`El jugador ${socket.id} pidió un Nescafé.`);
        io.emit('receiveMessage', { id: socket.id, message: 'Aquí tienes un Nescafé para todos!' }); 
        // Emitir un mensaje a todos los usuarios
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

