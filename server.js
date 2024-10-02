const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

// Crear la aplicaciï¿½n Express
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Configurar el servidor para servir archivos estï¿½ticos
app.use(express.static('public'));

const players = {};

// Manejar la conexiï¿½n de nuevos clientes
io.on('connection', (socket) => {
    console.log('Nuevo jugador conectado:', socket.id);

    // Cuando un nuevo jugador se conecta, se le envï¿½an los jugadores actuales
    socket.emit('currentPlayers', players);

    // Agregar el nuevo jugador al objeto de jugadores
    players[socket.id] = {
        x: Math.floor(Math.random() * 500), // Posiciï¿½n inicial X
        y: Math.floor(Math.random() * 500), // Posiciï¿½n inicial Y
    };

    // Informar a los demï¿½s jugadores que un nuevo jugador se ha unido
    socket.broadcast.emit('newPlayer', { id: socket.id, player: players[socket.id] });

    // Manejar el movimiento de un jugador
    socket.on('movePlayer', (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;
            // Se agrega la direcciï¿½n para la animaciï¿½n
            socket.broadcast.emit('playerMoved', { id: socket.id, player: players[socket.id], direction: data.direction });
        }
    });

    // Manejar la desconexiï¿½n de un jugador
    socket.on('disconnect', () => {
        console.log('Jugador desconectado:', socket.id);
        delete players[socket.id];
        // Informar a los demï¿½s jugadores que un jugador se ha desconectado
        socket.broadcast.emit('playerDisconnected', socket.id);
    });

    // Manejar el envï¿½o de mensajes en el chat
    socket.on('sendMessage', (message) => {
        io.emit('receiveMessage', { id: socket.id, message });
    });
});

// Configurar el servidor para escuchar en un puerto especï¿½fico
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});

