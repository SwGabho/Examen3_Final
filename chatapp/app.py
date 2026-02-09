from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime
import os

app = Flask(__name__)
app.config["SECRET_KEY"] = "tu_clave_secreta_123456"
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Configuración de la base de datos PostgreSQL
DB_CONFIG = {
    'dbname': 'chat_db',
    'user': 'postgres',
    'password': ' ',  # Cambia esto por tu password de PostgreSQL
    'host': 'localhost',
    'port': '5432'
}

# Almacenar usuarios conectados en memoria
usuarios_conectados = {}  # {sid: {'username': 'nombre', 'room': 'sala'}}
salas_usuarios = {}  # {'sala': [lista de usernames]}

def get_db_connection():
    """Crear conexión a la base de datos"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        return conn
    except Exception as e:
        print(f"Error conectando a la base de datos: {e}")
        return None

def init_database():
    """Inicializar las tablas de la base de datos"""
    conn = get_db_connection()
    if conn:
        try:
            cur = conn.cursor()
            
            # Tabla de salas
            cur.execute('''
                CREATE TABLE IF NOT EXISTS salas (
                    id SERIAL PRIMARY KEY,
                    nombre VARCHAR(100) UNIQUE NOT NULL,
                    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Tabla de mensajes
            cur.execute('''
                CREATE TABLE IF NOT EXISTS mensajes (
                    id SERIAL PRIMARY KEY,
                    usuario VARCHAR(100) NOT NULL,
                    sala VARCHAR(100),
                    destinatario VARCHAR(100),
                    mensaje TEXT NOT NULL,
                    fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    tipo VARCHAR(20) DEFAULT 'sala'
                )
            ''')
            
            # Crear sala general por defecto
            cur.execute('''
                INSERT INTO salas (nombre) 
                VALUES ('General') 
                ON CONFLICT (nombre) DO NOTHING
            ''')
            
            conn.commit()
            cur.close()
            print("[DB] Base de datos inicializada correctamente")
        except Exception as e:
            print(f"Error inicializando base de datos: {e}")
        finally:
            conn.close()

@app.route("/")
def index():
    """Página principal"""
    return render_template("index.html")

@app.route("/api/salas", methods=["GET"])
def obtener_salas():
    """Obtener lista de salas disponibles"""
    conn = get_db_connection()
    if conn:
        try:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute("SELECT nombre FROM salas ORDER BY nombre")
            salas = cur.fetchall()
            cur.close()
            conn.close()
            return jsonify([sala['nombre'] for sala in salas])
        except Exception as e:
            print(f"Error obteniendo salas: {e}")
            return jsonify([])
    return jsonify([])

@app.route("/api/crear-sala", methods=["POST"])
def crear_sala():
    """Crear una nueva sala"""
    data = request.json
    nombre_sala = data.get('nombre')
    
    if not nombre_sala:
        return jsonify({'error': 'Nombre de sala requerido'}), 400
    
    conn = get_db_connection()
    if conn:
        try:
            cur = conn.cursor()
            cur.execute("INSERT INTO salas (nombre) VALUES (%s)", (nombre_sala,))
            conn.commit()
            cur.close()
            conn.close()
            
            # Notificar a todos los usuarios sobre la nueva sala
            socketio.emit('nueva_sala', {'sala': nombre_sala}, broadcast=True)
            
            return jsonify({'success': True, 'sala': nombre_sala})
        except psycopg2.IntegrityError:
            return jsonify({'error': 'La sala ya existe'}), 400
        except Exception as e:
            print(f"Error creando sala: {e}")
            return jsonify({'error': 'Error al crear sala'}), 500
    return jsonify({'error': 'Error de conexión'}), 500

@app.route("/api/historial/<sala>", methods=["GET"])
def obtener_historial(sala):
    """Obtener historial de mensajes de una sala"""
    conn = get_db_connection()
    if conn:
        try:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute("""
                SELECT usuario, mensaje, fecha_hora 
                FROM mensajes 
                WHERE sala = %s AND tipo = 'sala'
                ORDER BY fecha_hora ASC
                LIMIT 100
            """, (sala,))
            mensajes = cur.fetchall()
            cur.close()
            conn.close()
            
            # Convertir datetime a string
            for msg in mensajes:
                msg['fecha_hora'] = msg['fecha_hora'].strftime('%Y-%m-%d %H:%M:%S')
            
            return jsonify(mensajes)
        except Exception as e:
            print(f"Error obteniendo historial: {e}")
            return jsonify([])
    return jsonify([])

@socketio.on('connect')
def handle_connect():
    """Manejar conexión de usuario"""
    print(f"[CONNECT] Cliente conectado: {request.sid}")
    emit('conectado', {'sid': request.sid})

@socketio.on('disconnect')
def handle_disconnect():
    """Manejar desconexión de usuario"""
    sid = request.sid
    if sid in usuarios_conectados:
        usuario_info = usuarios_conectados[sid]
        username = usuario_info['username']
        room = usuario_info.get('room')
        
        # Remover de la sala si estaba en una
        if room and room in salas_usuarios:
            if username in salas_usuarios[room]:
                salas_usuarios[room].remove(username)
            
            # Notificar a la sala que el usuario salió
            emit('usuario_salio', {
                'username': username,
                'usuarios': salas_usuarios.get(room, [])
            }, room=room)
        
        # Remover de usuarios conectados
        del usuarios_conectados[sid]
        
        # Actualizar lista global de usuarios
        todos_usuarios = list(set([u['username'] for u in usuarios_conectados.values()]))
        emit('actualizar_usuarios_globales', {'usuarios': todos_usuarios}, broadcast=True)
        
        print(f"[DISCONNECT] {username} desconectado")

@socketio.on('registrar_usuario')
def handle_registrar_usuario(data):
    """Registrar usuario en el sistema"""
    username = data.get('username')
    sid = request.sid
    
    if not username:
        emit('error', {'mensaje': 'Nombre de usuario requerido'})
        return
    
    # Verificar si el nombre ya está en uso
    nombres_en_uso = [u['username'] for u in usuarios_conectados.values()]
    if username in nombres_en_uso:
        emit('error', {'mensaje': 'Nombre de usuario ya en uso'})
        return
    
    # Registrar usuario
    usuarios_conectados[sid] = {'username': username, 'room': None}
    
    # Enviar lista de usuarios conectados
    todos_usuarios = list(set([u['username'] for u in usuarios_conectados.values()]))
    emit('usuarios_conectados', {'usuarios': todos_usuarios}, broadcast=True)
    emit('registro_exitoso', {'username': username})
    
    print(f"[REGISTER] Usuario registrado: {username}")

@socketio.on('unirse_sala')
def handle_unirse_sala(data):
    """Usuario se une a una sala"""
    sala = data.get('sala')
    sid = request.sid
    
    if sid not in usuarios_conectados:
        emit('error', {'mensaje': 'Usuario no registrado'})
        return
    
    username = usuarios_conectados[sid]['username']
    sala_anterior = usuarios_conectados[sid].get('room')
    
    # Salir de sala anterior si existe
    if sala_anterior:
        leave_room(sala_anterior)
        if sala_anterior in salas_usuarios and username in salas_usuarios[sala_anterior]:
            salas_usuarios[sala_anterior].remove(username)
        emit('usuario_salio', {
            'username': username,
            'usuarios': salas_usuarios.get(sala_anterior, [])
        }, room=sala_anterior)
    
    # Unirse a nueva sala
    join_room(sala)
    usuarios_conectados[sid]['room'] = sala
    
    if sala not in salas_usuarios:
        salas_usuarios[sala] = []
    if username not in salas_usuarios[sala]:
        salas_usuarios[sala].append(username)
    
    # Notificar a la sala
    emit('usuario_unido', {
        'username': username,
        'usuarios': salas_usuarios[sala]
    }, room=sala)
    
    print(f"[JOIN] {username} se unió a {sala}")

@socketio.on('enviar_mensaje')
def handle_enviar_mensaje(data):
    """Enviar mensaje a una sala"""
    mensaje = data.get('mensaje')
    sala = data.get('sala')
    sid = request.sid
    
    if sid not in usuarios_conectados:
        emit('error', {'mensaje': 'Usuario no registrado'})
        return
    
    username = usuarios_conectados[sid]['username']
    fecha_hora = datetime.now()
    
    # Guardar mensaje en base de datos
    conn = get_db_connection()
    if conn:
        try:
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO mensajes (usuario, sala, mensaje, fecha_hora, tipo)
                VALUES (%s, %s, %s, %s, 'sala')
            """, (username, sala, mensaje, fecha_hora))
            conn.commit()
            cur.close()
            conn.close()
        except Exception as e:
            print(f"Error guardando mensaje: {e}")
    
    # Enviar mensaje a todos en la sala
    emit('nuevo_mensaje', {
        'usuario': username,
        'mensaje': mensaje,
        'fecha_hora': fecha_hora.strftime('%Y-%m-%d %H:%M:%S'),
        'sala': sala
    }, room=sala)
    
    print(f"[MESSAGE] {username} en {sala}: {mensaje}")

@socketio.on('enviar_mensaje_privado')
def handle_enviar_mensaje_privado(data):
    """Enviar mensaje privado a un usuario"""
    mensaje = data.get('mensaje')
    destinatario = data.get('destinatario')
    sid = request.sid
    
    if sid not in usuarios_conectados:
        emit('error', {'mensaje': 'Usuario no registrado'})
        return
    
    remitente = usuarios_conectados[sid]['username']
    fecha_hora = datetime.now()
    
    # Guardar mensaje privado en base de datos
    conn = get_db_connection()
    if conn:
        try:
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO mensajes (usuario, destinatario, mensaje, fecha_hora, tipo)
                VALUES (%s, %s, %s, %s, 'privado')
            """, (remitente, destinatario, mensaje, fecha_hora))
            conn.commit()
            cur.close()
            conn.close()
        except Exception as e:
            print(f"Error guardando mensaje privado: {e}")
    
    # Encontrar el SID del destinatario
    destinatario_sid = None
    for sid_usuario, info in usuarios_conectados.items():
        if info['username'] == destinatario:
            destinatario_sid = sid_usuario
            break
    
    mensaje_data = {
        'remitente': remitente,
        'destinatario': destinatario,
        'mensaje': mensaje,
        'fecha_hora': fecha_hora.strftime('%Y-%m-%d %H:%M:%S')
    }
    
    # Enviar al destinatario
    if destinatario_sid:
        emit('mensaje_privado', mensaje_data, room=destinatario_sid)
    
    # Enviar confirmación al remitente
    emit('mensaje_privado', mensaje_data)
    
    print(f"[PRIVATE] {remitente} -> {destinatario}: {mensaje}")

@socketio.on('solicitar_usuarios_sala')
def handle_solicitar_usuarios_sala(data):
    """Obtener lista de usuarios en una sala"""
    sala = data.get('sala')
    usuarios = salas_usuarios.get(sala, [])
    emit('usuarios_sala', {'sala': sala, 'usuarios': usuarios})

if __name__ == "__main__":
    print("[SERVER] Inicializando servidor...")
    init_database()
    print("[SERVER] Servidor corriendo en http://localhost:5000")
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)
