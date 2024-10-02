const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

// Crear la aplicación Express
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Configurar el servidor para servir archivos estáticos
app.use(express.static('public'));

const players = {};

// Manejar la conexión de nuevos clientes
io.on('connection', (socket) => {
    console.log('Nuevo jugador conectado:', socket.id);

    // Cuando un nuevo jugador se conecta, se le envían los jugadores actuales
    socket.emit('currentPlayers', players);

    // Agregar el nuevo jugador al objeto de jugadores
    players[socket.id] = {
        x: Math.floor(Math.random() * 500), // Posición inicial X
        y: Math.floor(Math.random() * 500), // Posición inicial Y
    };

    // Informar a los demás jugadores que un nuevo jugador se ha unido
    socket.broadcast.emit('newPlayer', { id: socket.id, player: players[socket.id] });

    // Manejar el movimiento de un jugador
    socket.on('movePlayer', (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;
            // Se agrega la dirección para la animación
            socket.broadcast.emit('playerMoved', { id: socket.id, player: players[socket.id] });
        }
    });

    // Manejar la desconexión de un jugador
    socket.on('disconnect', () => {
        console.log('Jugador desconectado:', socket.id);
        delete players[socket.id];
        // Informar a los demás jugadores que un jugador se ha desconectado
        socket.broadcast.emit('playerDisconnected', socket.id);
    });

    // Manejar el envío de mensajes en el chat
    socket.on('sendMessage', (message) => {
        io.emit('receiveMessage', { id: socket.id, message });
    });
});

// Configurar el servidor para escuchar en un puerto específico
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});
