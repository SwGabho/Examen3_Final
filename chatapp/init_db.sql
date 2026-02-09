-- Script de inicialización de la base de datos para ChatApp
-- Ejecutar este script en PostgreSQL antes de iniciar la aplicación

-- Crear la base de datos
DROP DATABASE IF EXISTS chat_db;
CREATE DATABASE chat_db;

-- Conectar a la base de datos
\c chat_db;

-- Tabla de salas
CREATE TABLE IF NOT EXISTS salas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de mensajes
CREATE TABLE IF NOT EXISTS mensajes (
    id SERIAL PRIMARY KEY,
    usuario VARCHAR(100) NOT NULL,
    sala VARCHAR(100),
    destinatario VARCHAR(100),
    mensaje TEXT NOT NULL,
    fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tipo VARCHAR(20) DEFAULT 'sala' CHECK (tipo IN ('sala', 'privado'))
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX idx_mensajes_sala ON mensajes(sala);
CREATE INDEX idx_mensajes_usuario ON mensajes(usuario);
CREATE INDEX idx_mensajes_destinatario ON mensajes(destinatario);
CREATE INDEX idx_mensajes_fecha ON mensajes(fecha_hora);
CREATE INDEX idx_mensajes_tipo ON mensajes(tipo);

-- Insertar sala por defecto
INSERT INTO salas (nombre) VALUES ('General');
INSERT INTO salas (nombre) VALUES ('Tecnología');
INSERT INTO salas (nombre) VALUES ('Casual');

-- Mensaje de confirmación
SELECT 'Base de datos inicializada correctamente' AS status;
