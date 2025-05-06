// Conexión Inicial a Socket.IO
const socket = io();

// Elementos deL DOM (para guardar las referencias a los 
// elemenos html que voy a manipular)
const loginDiv = document.getElementById('login');
const chatDiv = document.getElementById('chat');
const loginBtn = document.getElementById('loginBtn');
const usernameInput = document.getElementById('username');
const statusInput = document.getElementById('status');
const avatarSelect = document.getElementById('avatarSelect');
const avatarFile = document.getElementById('avatarFile');
const avatarPreview = document.getElementById('avatarPreview');
const usersList = document.getElementById('usersList');
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const fileInput = document.getElementById('fileInput');
const typingIndicator = document.getElementById('typingIndicator');
const loginError = document.getElementById('loginError');

let avatarDataURL = null; // Variable para guardar la imagen subida por el usuario.
let user = null; // Variable para guardar la información del usuario logueado.
let typingTimeout = null; // Para controlar cuánto tiempo se considera "escribiendo"

// Muestra el mensaje de error en el login
function showLoginError(message) {
  loginError.textContent = message;
  loginError.classList.remove('hidden');
}

// Limpia cualquier error mostrado
function clearLoginError() {
  loginError.textContent = '';
  loginError.classList.add('hidden');
}

// Vista previa de la imagen personalizada
avatarFile.addEventListener('change', () => {
  const file = avatarFile.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      avatarDataURL = reader.result;
      avatarPreview.src = avatarDataURL;
      avatarPreview.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  }
  // Se lee con FileReader y se muestra la vista previa en el HTML.
});

// Al hacer click en "entrar" valida el nombre, estado y su 
// imagen de usuario
loginBtn.addEventListener('click', () => {
  const name = usernameInput.value.trim();
  const status = statusInput.value.trim();
  const selectedAvatar = avatarSelect.value;

  clearLoginError();

  if (!name || !status) {
    showLoginError('Por favor completa el nombre y estado.');
    return;
  }

  let avatar;

  if (avatarDataURL) {
    avatar = avatarDataURL;
  } else if (selectedAvatar) {
    avatar = `avatars/${selectedAvatar}`;
  } else {
    showLoginError('Debes seleccionar un avatar o subir uno propio.');
    return;
  }

  user = { name, status, avatar };
  socket.emit('user-data', user);
  loginDiv.classList.add('hidden');
  chatDiv.classList.remove('hidden');
  // Si todo es correcto, se guarda la info en "user" y se envia "user-data"
  // al servidor vía Socket.IO.
  //Además oculta el div login y muestra el div del chat.
});

// Detecta si se está escribiendo 
messageInput.addEventListener('input', () => {
  socket.emit('typing', true);
  
  if (typingTimeout) clearTimeout(typingTimeout);
  
  // Y si pasa 2 segundos sin teclear, se manda typing: false
  typingTimeout = setTimeout(() => {
    socket.emit('typing', false); 
  }, 2000);
});

// Envía el mensaje
messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && messageInput.value.trim() !== '') {
    socket.emit('chat-message', { text: messageInput.value });
    messageInput.value = '';
    socket.emit('typing', false);
    if (typingTimeout) clearTimeout(typingTimeout);
  }
  // Al darle Enter: se envia el mensaje, se limpia el imput y se manda typing:
  // false (es decir, dejó de escribir)
});

// Botón para enviar archivo
fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      socket.emit('file-upload', {
        filename: file.name,
        filetype: file.type,
        data: reader.result
      });
    };
    reader.readAsDataURL(file);
  }
  // Cuando se elije el archivo, este se envía al servidor con (nombre, tipo y datos)
});

// Recibe la lista de Usuarios
socket.on('user-list', (users) => {
  usersList.innerHTML = '';
  users.forEach((u) => {
    const li = document.createElement('li');
    li.innerHTML = `<img src="${u.avatar}" width="32"> <strong>${u.name}</strong> - ${u.status}`;
    usersList.appendChild(li);
  });
  // Se limpia #userList y vuelve a renderizar la lista completa de usuarios conectados.
});

// Recibe mensaje del chat
socket.on('chat-message', ({ user, text }) => {
  const div = document.createElement('div');
  div.innerHTML = `<strong>${user.name}:</strong> ${text}`;
  messagesDiv.appendChild(div);
  // Además el mensaje al "#messagesDiv" mostrando el nombre del usuario y su texto.
});

// Evento para recibir el archivo
socket.on('file-received', ({ user, filename, filetype, data }) => {
  const div = document.createElement('div');
  if (filetype.startsWith('image/')) {
    div.innerHTML = `<strong>${user.name}:</strong><br>
      <img src="${data}" alt="${filename}" style="max-width: 200px; display:block; margin:8px 0;">
      <a href="${data}" download="${filename}">Descargar imagen</a>`;
  } else {
    div.innerHTML = `<strong>${user.name}:</strong> <a href="${data}" download="${filename}">Descargar archivo (${filename})</a>`;
  }
  messagesDiv.appendChild(div);
  // Si es imagen la muestra + link de descarga y si es otro tipo de archivo pues muestra el link.
});

// Notificación de usuario nuevo
socket.on('user-joined', (u) => {
  const div = document.createElement('div');
  div.textContent = `${u.name} se ha unido al chat.`;
  messagesDiv.appendChild(div);
  // Muestra un mensaje en el chat de que alguien se ha conectado.
});

// Notificación de un usuario que se ha desconectado
socket.on('user-left', (u) => {
  if (u) {
    const div = document.createElement('div');
    div.textContent = `${u.name} ha salido del chat.`;
    messagesDiv.appendChild(div);
  }
});

// Indicador de si alguien está escribiendo
socket.on('typing', ({ user, isTyping }) => {
  typingIndicator.textContent = isTyping ? `${user.name} está escribiendo...` : '';
  // Si alguien está escribiendo muestra su nombre y si deja de escribir, se borra el texto. 
});
