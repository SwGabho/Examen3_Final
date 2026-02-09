# 💬 ChatApp - Aplicación de Chat Distribuida

![Status](https://img.shields.io/badge/status-ready-brightgreen)
![Python](https://img.shields.io/badge/python-3.8+-blue)
![Flask](https://img.shields.io/badge/flask-3.0-orange)
![PostgreSQL](https://img.shields.io/badge/postgresql-12+-blue)

Aplicación de mensajería en tiempo real construida con Flask, Socket.IO y PostgreSQL.

## 🚀 Características

- ✅ **Chat en Tiempo Real** con WebSockets
- ✅ **Salas de Chat** públicas con gestión completa
- ✅ **Mensajes Privados** entre usuarios
- ✅ **Lista de Usuarios** conectados en tiempo real
- ✅ **Historial Persistente** en PostgreSQL
- ✅ **Interfaz Moderna** tipo WhatsApp Web
- ✅ **Notificaciones** de unión/salida de usuarios
- ✅ **Búsqueda** de salas y usuarios
- ✅ **Sin Autenticación** (nombre/alias simple)

## 🖼️ Vista Previa

```
┌────────────────────────────────────────────────────────┐
│  ChatApp                                               │
├──────────────┬─────────────────────────────────────────┤
│              │  Sala General                           │
│  Salas       │  ┌──────────────────────────────────┐  │
│  ✓ General   │  │ Ana: Hola a todos!               │  │
│  ✓ Proyecto  │  │ Bob: Hola Ana                    │  │
│  ✓ Casual    │  │ Carlos: Buenas tardes            │  │
│              │  └──────────────────────────────────┘  │
│  Usuarios    │                                         │
│  ⚫ Ana      │  [Escribe un mensaje...]          [>]  │
│  ⚫ Bob      │                                         │
│  ⚫ Carlos   │                                         │
└──────────────┴─────────────────────────────────────────┘
```

## 🛠️ Tecnologías

### Backend
- **Python 3.8+**
- **Flask 3.0** - Framework web
- **Flask-SocketIO 5.3** - WebSockets en tiempo real
- **PostgreSQL** - Base de datos relacional
- **psycopg2** - Driver PostgreSQL

### Frontend
- **HTML5** - Estructura semántica
- **CSS3** - Estilos modernos responsive
- **JavaScript ES6+** - Lógica del cliente
- **Socket.IO Client 4.5** - Comunicación bidireccional

## 📋 Requisitos

- Python 3.8 o superior
- PostgreSQL 12 o superior
- pip (gestor de paquetes de Python)

## ⚡ Inicio Rápido

### 1. Clonar el repositorio
```bash
git clone <tu-repositorio>
cd chatapp
```

### 2. Instalar dependencias
```bash
pip install -r requirements.txt
```

### 3. Configurar PostgreSQL

**Ejecutar script de inicialización:**
```bash
psql -U postgres -f init_db.sql
```

**Configurar credenciales en `app.py` (línea 24):**
```python
DB_CONFIG = {
    'dbname': 'chat_db',
    'user': 'postgres',
    'password': 'TU_PASSWORD',  # ⚠️ CAMBIAR ESTO
    'host': 'localhost',
    'port': '5432'
}
```

### 4. Ejecutar la aplicación

**Linux/Mac:**
```bash
./start.sh
```

**Windows:**
```bash
start.bat
```

**Manual:**
```bash
python app.py
```

### 5. Acceder
Abrir navegador en: **http://localhost:5000**

## 📖 Documentación

- **[CONFIG.md](CONFIG.md)** - Documentación técnica completa
- **[INICIO_RAPIDO.md](INICIO_RAPIDO.md)** - Guía paso a paso de instalación
- **[GIT_GUIDE.md](GIT_GUIDE.md)** - Instrucciones para Git/GitHub/GitLab
- **[RESUMEN_PROYECTO.md](RESUMEN_PROYECTO.md)** - Resumen ejecutivo completo

## 📁 Estructura del Proyecto

```
chatapp/
├── app.py                 # Servidor Flask principal
├── requirements.txt       # Dependencias Python
├── init_db.sql           # Script de base de datos
├── start.sh              # Script de inicio (Linux/Mac)
├── start.bat             # Script de inicio (Windows)
├── templates/
│   └── index.html        # Interfaz de usuario
├── static/
│   ├── styles.css        # Estilos CSS
│   └── app.js            # Lógica del cliente
└── docs/
    ├── CONFIG.md
    ├── INICIO_RAPIDO.md
    ├── GIT_GUIDE.md
    └── RESUMEN_PROYECTO.md
```

## 🎯 Funcionalidades Detalladas

### Chat en Salas
- Ver salas disponibles
- Crear nuevas salas
- Unirse y salir de salas
- Ver historial de mensajes
- Contador de participantes
- Notificaciones en tiempo real

### Mensajes Privados
- Lista de usuarios conectados
- Chat 1-a-1 privado
- Etiqueta "Privado" visible
- Solo visible para emisor/receptor

### Sistema en Tiempo Real
- WebSockets bidireccionales
- Actualizaciones instantáneas
- Sin recargas de página
- Latencia < 50ms

## 🧪 Testing

### Escenario de Prueba Básico

1. **Abrir 3 ventanas del navegador**
2. **Registrar 3 usuarios**: Ana, Bob, Carlos
3. **Probar chat en sala:**
   - Todos en "General"
   - Enviar mensajes
   - Verificar recepción instantánea
4. **Probar mensajes privados:**
   - Ana → Bob (privado)
   - Verificar que Carlos no ve el mensaje
5. **Probar persistencia:**
   - Cerrar navegador
   - Reabrir y ver historial

## 🏗️ Arquitectura

```
┌─────────────┐         ┌─────────────┐         ┌──────────────┐
│   Cliente   │ ◄──────►│   Servidor  │ ◄──────►│  PostgreSQL  │
│  (Browser)  │ WebSocket│   (Flask)   │ psycopg2│  (Database)  │
│  Socket.IO  │         │  SocketIO   │         │   chat_db    │
└─────────────┘         └─────────────┘         └──────────────┘
```

### Flujo de Mensaje

1. Usuario escribe mensaje → JavaScript captura evento
2. Cliente envía vía WebSocket → Socket.IO
3. Servidor recibe y procesa → Flask handler
4. Servidor guarda en BD → PostgreSQL
5. Servidor broadcast a sala → Socket.IO emit
6. Todos los clientes reciben → Actualización UI

## 📊 Base de Datos

### Tabla: salas
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | SERIAL | Primary Key |
| nombre | VARCHAR(100) | Nombre único |
| fecha_creacion | TIMESTAMP | Fecha de creación |

### Tabla: mensajes
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | SERIAL | Primary Key |
| usuario | VARCHAR(100) | Nombre del usuario |
| sala | VARCHAR(100) | Sala (si mensaje público) |
| destinatario | VARCHAR(100) | Usuario destino (si privado) |
| mensaje | TEXT | Contenido del mensaje |
| fecha_hora | TIMESTAMP | Timestamp del mensaje |
| tipo | VARCHAR(20) | 'sala' o 'privado' |

## 🔧 Resolución de Problemas

### Error de conexión a PostgreSQL
```bash
# Verificar que PostgreSQL está corriendo
sudo service postgresql status

# Verificar credenciales en app.py
```

### Puerto 5000 en uso
```python
# Cambiar puerto en app.py (última línea)
socketio.run(app, port=5001)
```

### Módulos no encontrados
```bash
pip install -r requirements.txt
```

## 🚀 Despliegue

### Producción (Recomendaciones)

- Usar **Gunicorn** + **Nginx**
- Habilitar **HTTPS** con Let's Encrypt
- Configurar **variables de entorno** para credenciales
- Implementar **rate limiting**
- Agregar **autenticación JWT**
- Usar **Redis** para cache y sesiones

## 🤝 Contribuir

1. Fork el proyecto
2. Crear rama feature (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📝 Licencia

Este proyecto es para uso educativo.

## 👥 Autor

**Tu Nombre** - Proyecto de Aplicaciones Distribuidas

## 🙏 Agradecimientos

- Flask y Socket.IO por las excelentes bibliotecas
- WhatsApp Web por la inspiración del diseño
- La comunidad de Python por el soporte

---

**¿Preguntas?** Revisa la [documentación completa](CONFIG.md) o abre un issue.

**⭐ Si te gusta este proyecto, dale una estrella!**
