#!/bin/bash

# Script de inicio rápido para ChatApp
# Este script verifica dependencias e inicia la aplicación

echo "=================================="
echo "    ChatApp - Inicio Rápido"
echo "=================================="
echo ""

# Verificar Python
#echo "✓ Verificando Python..."
#if ! command -v python &> /dev/null; then
#    echo "❌ Python 3 no está instalado"
#    exit 1
#fi
#echo "  Python $(python --version) detectado"

# Verificar PostgreSQL
echo "✓ Verificando PostgreSQL..."
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL no está instalado o no está en PATH"
    echo "  Por favor, instala PostgreSQL antes de continuar"
    exit 1
fi
echo "  PostgreSQL detectado"

# Verificar si existe venv
if [ ! -d "venv" ]; then
    echo ""
    echo "✓ Creando entorno virtual..."
    python3 -m venv venv
fi

# Activar entorno virtual
echo "✓ Activando entorno virtual..."
source venv/bin/activate

# Instalar dependencias
echo "✓ Instalando dependencias..."
pip install -q -r requirements.txt

echo ""
echo "=================================="
echo "  Configuración de Base de Datos"
echo "=================================="
echo ""
echo "Asegúrate de haber ejecutado el script SQL:"
echo "  psql -U postgres -f init_db.sql"
echo ""
echo "Y de haber configurado tus credenciales en app.py"
echo ""
read -p "¿Has configurado la base de datos? (s/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo "Por favor, configura la base de datos primero"
    exit 1
fi

echo ""
echo "=================================="
echo "  Iniciando ChatApp..."
echo "=================================="
echo ""
echo "Servidor corriendo en: http://localhost:5000"
echo "Presiona Ctrl+C para detener el servidor"
echo ""

# Iniciar la aplicación
python app.py
