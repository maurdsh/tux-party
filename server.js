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

    // Notificar a los demï¿½s jugadores sobre el nuevo jugador
@@ -31,11 +32,13 @@ io.on('connection', (socket) => {

    // Manejar el envï¿½o de mensajes
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
              
