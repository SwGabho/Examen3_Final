// Estado global de la aplicación
const app = {
    socket: null,
    username: null,
    currentRoom: null,
    currentPrivateChat: null,
    chatType: null, // 'sala' o 'privado'
    salas: [],
    usuarios: [],
    mensajesCache: {}
};

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', () => {
    initializeLogin();
    initializeSocketConnection();
});

// === SISTEMA DE LOGIN ===
function initializeLogin() {
    const loginBtn = document.getElementById('login-btn');
    const usernameInput = document.getElementById('username-input');
    
    loginBtn.addEventListener('click', () => handleLogin());
    usernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
}

function handleLogin() {
    const username = document.getElementById('username-input').value.trim();
    const errorDiv = document.getElementById('login-error');
    
    if (!username) {
        errorDiv.textContent = 'Por favor ingresa un nombre';
        return;
    }
    
    if (username.length < 2) {
        errorDiv.textContent = 'El nombre debe tener al menos 2 caracteres';
        return;
    }
    
    app.username = username;
    app.socket.emit('registrar_usuario', { username });
}

// === CONEXIÓN SOCKET.IO ===
function initializeSocketConnection() {
    app.socket = io();
    
    app.socket.on('connect', () => {
        console.log('Conectado al servidor');
    });
    
    app.socket.on('registro_exitoso', (data) => {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('chat-app').style.display = 'flex';
        document.getElementById('current-username').textContent = data.username;
        document.getElementById('user-initial').textContent = data.username[0].toUpperCase();
        
        cargarSalas();
        initializeChatApp();
    });
    
    app.socket.on('error', (data) => {
        const errorDiv = document.getElementById('login-error');
        errorDiv.textContent = data.mensaje;
    });
    
    app.socket.on('usuarios_conectados', (data) => {
        actualizarListaUsuarios(data.usuarios);
    });
    
    app.socket.on('actualizar_usuarios_globales', (data) => {
        actualizarListaUsuarios(data.usuarios);
    });
    
    app.socket.on('usuario_unido', (data) => {
        if (app.currentRoom === app.chatType && app.chatType === 'sala') {
            actualizarParticipantes(data.usuarios);
            mostrarMensajeSistema(`${data.username} se unió a la sala`);
        }
    });
    
    app.socket.on('usuario_salio', (data) => {
        if (app.currentRoom === app.chatType && app.chatType === 'sala') {
            actualizarParticipantes(data.usuarios);
            mostrarMensajeSistema(`${data.username} salió de la sala`);
        }
    });
    
    app.socket.on('nuevo_mensaje', (data) => {
        if (app.chatType === 'sala' && app.currentRoom === data.sala) {
            mostrarMensaje(data);
        }
    });
    
    app.socket.on('mensaje_privado', (data) => {
        const otroUsuario = data.remitente === app.username ? data.destinatario : data.remitente;
        
        if (app.chatType === 'privado' && app.currentPrivateChat === otroUsuario) {
            mostrarMensajePrivado(data);
        } else {
            // Notificación visual de nuevo mensaje
            actualizarIndicadorMensajeNuevo(otroUsuario);
        }
    });
    
    app.socket.on('nueva_sala', (data) => {
        agregarSalaALista(data.sala);
    });
    
    app.socket.on('usuarios_sala', (data) => {
        actualizarParticipantes(data.usuarios);
    });
}

// === INICIALIZACIÓN DE LA APP ===
function initializeChatApp() {
    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => cambiarTab(btn.dataset.tab));
    });
    
    // Botón crear sala
    document.getElementById('crear-sala-btn').addEventListener('click', () => {
        document.getElementById('modal-crear-sala').classList.add('active');
    });
    
    // Modal crear sala
    document.getElementById('confirmar-sala-btn').addEventListener('click', crearSala);
    document.getElementById('cancelar-sala-btn').addEventListener('click', () => {
        document.getElementById('modal-crear-sala').classList.remove('active');
    });
    
    // Cerrar modales
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.modal').classList.remove('active');
        });
    });
    
    // Enter en input de nueva sala
    document.getElementById('nueva-sala-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') crearSala();
    });
    
    // Enviar mensaje
    document.getElementById('enviar-btn').addEventListener('click', enviarMensaje);
    document.getElementById('mensaje-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') enviarMensaje();
    });
    
    // Botón info
    document.getElementById('info-btn').addEventListener('click', () => {
        if (app.chatType === 'sala') {
            app.socket.emit('solicitar_usuarios_sala', { sala: app.currentRoom });
            document.getElementById('modal-info').classList.add('active');
        }
    });
    
    // Búsqueda
    document.getElementById('search-input').addEventListener('input', (e) => {
        filtrarLista(e.target.value);
    });
}

// === GESTIÓN DE TABS ===
function cambiarTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `${tab}-panel`);
    });
}

// === GESTIÓN DE SALAS ===
async function cargarSalas() {
    try {
        const response = await fetch('/api/salas');
        const salas = await response.json();
        app.salas = salas;
        
        const lista = document.getElementById('salas-lista');
        lista.innerHTML = '';
        
        salas.forEach(sala => {
            agregarSalaALista(sala);
        });
        
        // Unirse a sala General por defecto
        if (salas.includes('General')) {
            unirseASala('General');
        }
    } catch (error) {
        console.error('Error cargando salas:', error);
    }
}

function agregarSalaALista(nombreSala) {
    if (!app.salas.includes(nombreSala)) {
        app.salas.push(nombreSala);
    }
    
    const lista = document.getElementById('salas-lista');
    
    // Verificar si ya existe
    if (lista.querySelector(`[data-sala="${nombreSala}"]`)) {
        return;
    }
    
    const div = document.createElement('div');
    div.className = 'contacto-item';
    div.dataset.sala = nombreSala;
    div.innerHTML = `
        <div class="contacto-avatar">
            <span>${nombreSala[0].toUpperCase()}</span>
        </div>
        <div class="contacto-info">
            <div class="contacto-nombre">${nombreSala}</div>
            <div class="contacto-estado">Sala de chat</div>
        </div>
    `;
    
    div.addEventListener('click', () => unirseASala(nombreSala));
    lista.appendChild(div);
}

async function crearSala() {
    const input = document.getElementById('nueva-sala-input');
    const errorDiv = document.getElementById('crear-sala-error');
    const nombreSala = input.value.trim();
    
    if (!nombreSala) {
        errorDiv.textContent = 'Por favor ingresa un nombre para la sala';
        return;
    }
    
    try {
        const response = await fetch('/api/crear-sala', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre: nombreSala })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            document.getElementById('modal-crear-sala').classList.remove('active');
            input.value = '';
            errorDiv.textContent = '';
            unirseASala(nombreSala);
        } else {
            errorDiv.textContent = data.error;
        }
    } catch (error) {
        errorDiv.textContent = 'Error al crear la sala';
    }
}

async function unirseASala(nombreSala) {
    app.currentRoom = nombreSala;
    app.chatType = 'sala';
    app.currentPrivateChat = null;
    
    // Actualizar UI
    document.querySelectorAll('.contacto-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-sala="${nombreSala}"]`)?.classList.add('active');
    
    // Mostrar chat
    document.getElementById('chat-placeholder').style.display = 'none';
    document.getElementById('chat-container').style.display = 'flex';
    
    // Actualizar header
    document.getElementById('chat-title').textContent = nombreSala;
    document.getElementById('chat-initial').textContent = nombreSala[0].toUpperCase();
    
    // Emitir evento de unirse
    app.socket.emit('unirse_sala', { sala: nombreSala });
    
    // Cargar historial
    await cargarHistorial(nombreSala);
}

async function cargarHistorial(sala) {
    try {
        const response = await fetch(`/api/historial/${sala}`);
        const mensajes = await response.json();
        
        const container = document.getElementById('mensajes-container');
        container.innerHTML = '';
        
        mensajes.forEach(msg => {
            mostrarMensaje({
                usuario: msg.usuario,
                mensaje: msg.mensaje,
                fecha_hora: msg.fecha_hora
            });
        });
        
        scrollToBottom();
    } catch (error) {
        console.error('Error cargando historial:', error);
    }
}

// === GESTIÓN DE USUARIOS ===
function actualizarListaUsuarios(usuarios) {
    app.usuarios = usuarios.filter(u => u !== app.username);
    
    const lista = document.getElementById('usuarios-lista');
    lista.innerHTML = '';
    
    if (app.usuarios.length === 0) {
        lista.innerHTML = '<div style="padding: 20px; text-align: center; color: #667781;">No hay otros usuarios conectados</div>';
        return;
    }
    
    app.usuarios.forEach(usuario => {
        const div = document.createElement('div');
        div.className = 'contacto-item';
        div.dataset.usuario = usuario;
        div.innerHTML = `
            <div class="contacto-avatar">
                <span>${usuario[0].toUpperCase()}</span>
            </div>
            <div class="contacto-info">
                <div class="contacto-nombre">${usuario}</div>
                <div class="contacto-estado">Disponible</div>
            </div>
            <div class="status-indicator"></div>
        `;
        
        div.addEventListener('click', () => abrirChatPrivado(usuario));
        lista.appendChild(div);
    });
}

function abrirChatPrivado(usuario) {
    app.currentPrivateChat = usuario;
    app.chatType = 'privado';
    app.currentRoom = null;
    
    // Actualizar UI
    document.querySelectorAll('.contacto-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-usuario="${usuario}"]`)?.classList.add('active');
    
    // Mostrar chat
    document.getElementById('chat-placeholder').style.display = 'none';
    document.getElementById('chat-container').style.display = 'flex';
    
    // Actualizar header
    document.getElementById('chat-title').textContent = usuario;
    document.getElementById('chat-initial').textContent = usuario[0].toUpperCase();
    document.getElementById('chat-subtitle').textContent = 'Chat privado';
    
    // Limpiar mensajes
    document.getElementById('mensajes-container').innerHTML = '';
    
    // TODO: Cargar historial de mensajes privados si existe
}

function actualizarParticipantes(usuarios) {
    const subtitle = document.getElementById('chat-subtitle');
    const count = usuarios.length;
    subtitle.textContent = `${count} participante${count !== 1 ? 's' : ''}`;
    
    // Actualizar modal de info
    const lista = document.getElementById('participantes-lista');
    lista.innerHTML = '';
    
    usuarios.forEach(usuario => {
        const div = document.createElement('div');
        div.className = 'participante-item';
        div.innerHTML = `
            <div class="participante-avatar">
                <span>${usuario[0].toUpperCase()}</span>
            </div>
            <div class="participante-nombre">${usuario}</div>
        `;
        lista.appendChild(div);
    });
}

// === MENSAJES ===
function enviarMensaje() {
    const input = document.getElementById('mensaje-input');
    const mensaje = input.value.trim();
    
    if (!mensaje) return;
    
    if (app.chatType === 'sala') {
        app.socket.emit('enviar_mensaje', {
            mensaje: mensaje,
            sala: app.currentRoom
        });
    } else if (app.chatType === 'privado') {
        app.socket.emit('enviar_mensaje_privado', {
            mensaje: mensaje,
            destinatario: app.currentPrivateChat
        });
    }
    
    input.value = '';
    input.focus();
    
    // Asegurar scroll al fondo después de enviar
    setTimeout(scrollToBottom, 100);
}

function mostrarMensaje(data) {
    const container = document.getElementById('mensajes-container');
    const esPropio = data.usuario === app.username;
    
    // Verificar si el usuario está cerca del fondo antes de agregar el mensaje
    const estaEnFondo = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    
    const div = document.createElement('div');
    div.className = `mensaje ${esPropio ? 'propio' : ''}`;
    
    const fecha = new Date(data.fecha_hora);
    const hora = fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    
    div.innerHTML = `
        <div class="mensaje-bubble">
            ${!esPropio ? `<div class="mensaje-usuario">${data.usuario}</div>` : ''}
            <div class="mensaje-texto">${escapeHtml(data.mensaje)}</div>
            <div class="mensaje-hora">${hora}</div>
        </div>
    `;
    
    container.appendChild(div);
    
    // Solo hacer scroll automático si el usuario estaba cerca del fondo
    // o si es su propio mensaje
    if (estaEnFondo || esPropio) {
        scrollToBottom();
    }
}

function mostrarMensajePrivado(data) {
    const container = document.getElementById('mensajes-container');
    const esPropio = data.remitente === app.username;
    
    // Verificar si el usuario está cerca del fondo
    const estaEnFondo = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    
    const div = document.createElement('div');
    div.className = `mensaje ${esPropio ? 'propio' : ''}`;
    
    const fecha = new Date(data.fecha_hora);
    const hora = fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    
    div.innerHTML = `
        <div class="mensaje-bubble">
            <div class="mensaje-privado-badge">Privado</div>
            ${!esPropio ? `<div class="mensaje-usuario">${data.remitente}</div>` : ''}
            <div class="mensaje-texto">${escapeHtml(data.mensaje)}</div>
            <div class="mensaje-hora">${hora}</div>
        </div>
    `;
    
    container.appendChild(div);
    
    // Scroll automático si estaba en el fondo o es mensaje propio
    if (estaEnFondo || esPropio) {
        scrollToBottom();
    }
}

function mostrarMensajeSistema(texto) {
    const container = document.getElementById('mensajes-container');
    
    const div = document.createElement('div');
    div.style.textAlign = 'center';
    div.style.margin = '10px 0';
    div.innerHTML = `
        <span style="background: rgba(0,0,0,0.1); padding: 5px 12px; border-radius: 12px; font-size: 13px; color: #667781;">
            ${texto}
        </span>
    `;
    
    container.appendChild(div);
    scrollToBottom();
}

// === UTILIDADES ===
function scrollToBottom() {
    const container = document.getElementById('mensajes-container');
    if (container) {
        // Usar requestAnimationFrame para asegurar que el DOM se ha actualizado
        requestAnimationFrame(() => {
            container.scrollTop = container.scrollHeight;
        });
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function filtrarLista(termino) {
    const items = document.querySelectorAll('.contacto-item');
    const terminoLower = termino.toLowerCase();
    
    items.forEach(item => {
        const nombre = item.querySelector('.contacto-nombre').textContent.toLowerCase();
        item.style.display = nombre.includes(terminoLower) ? 'flex' : 'none';
    });
}

function actualizarIndicadorMensajeNuevo(usuario) {
    // Agregar indicador visual de nuevo mensaje (opcional)
    const item = document.querySelector(`[data-usuario="${usuario}"]`);
    if (item && !item.classList.contains('active')) {
        item.style.background = '#e9f5e9';
        setTimeout(() => {
            item.style.background = '';
        }, 3000);
    }
}