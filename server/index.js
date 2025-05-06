// Importación de Módulos
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

// Se crea un mapa de usuarios conectados y guarda datos del usuario relacionados al socket.id
const users = new Map();

// Middleware
app.use(express.static(path.join(__dirname, '..', 'public')));

// Socket.io - Conexión con el cliente (cuando un cliente se conecta, se dispara el evento)
io.on('connection', (socket) => {
  console.log('Un usuario se ha conectado');

  // Eventos usados
  socket.on('user-data', (data) => {
    users.set(socket.id, data);
    io.emit('user-list', Array.from(users.values()));
    socket.broadcast.emit('user-joined', data);
    // Cuando un usuario inicia sesión se envía y se guarda su información en users usando su socket.id
    // Luego envía a todos la lista actualizada de usuarios y avisa a todos menos al nuevo de que
    // alguien se ha unido.
  });

  socket.on('chat-message', (msg) => {
    const user = users.get(socket.id);
    io.emit('chat-message', { ...msg, user });
    // Cuando se envia un mensaje, se emite a todos incluyendo a quién lo mandó.
  });

  socket.on('file-upload', (fileData) => {
    const user = users.get(socket.id);
    io.emit('file-received', { user, ...fileData });
    // Al subir un archivo, se recupera su información y se envia el archivo a todos en el chat.
  });

  socket.on('typing', (isTyping) => {
    const user = users.get(socket.id);
    socket.broadcast.emit('typing', { user, isTyping });
    // Para avisar a los demás de si alguien esta escribiendo o no.
  });

  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    users.delete(socket.id);
    io.emit('user-list', Array.from(users.values()));
    socket.broadcast.emit('user-left', user);
  });
  // Si alguien se desconecta se elimina del mapa users y se envía la nueva lista de usuarios a todos.
  // También se notifica de la desconexión.
});

// Muestra el enlace de donde se esta ejecutando el proyecto
const port = process.env.PORT || 3000;
http.listen(port, () => {
  console.log('Servidor corriendo en http://localhost:3000');
});
