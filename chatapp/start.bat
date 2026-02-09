@echo off
REM Script de inicio rápido para ChatApp en Windows

echo ==================================
echo     ChatApp - Inicio Rapido
echo ==================================
echo.

REM Verificar Python
echo Verificando Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python no esta instalado
    pause
    exit /b 1
)
echo   Python detectado

REM Verificar PostgreSQL
echo Verificando PostgreSQL...
psql --version >nul 2>&1
if errorlevel 1 (
    echo ADVERTENCIA: PostgreSQL no esta instalado o no esta en PATH
    echo   Por favor, instala PostgreSQL antes de continuar
    pause
    exit /b 1
)
echo   PostgreSQL detectado

REM Crear entorno virtual si no existe
if not exist "venv" (
    echo.
    echo Creando entorno virtual...
    python -m venv venv
)

REM Activar entorno virtual
echo Activando entorno virtual...
call venv\Scripts\activate.bat

REM Instalar dependencias
echo Instalando dependencias...
pip install -q -r requirements.txt

echo.
echo ==================================
echo   Configuracion de Base de Datos
echo ==================================
echo.
echo Asegurate de haber ejecutado el script SQL:
echo   psql -U postgres -f init_db.sql
echo.
echo Y de haber configurado tus credenciales en app.py
echo.
set /p respuesta="¿Has configurado la base de datos? (s/n): "

if /i not "%respuesta%"=="s" (
    echo Por favor, configura la base de datos primero
    pause
    exit /b 1
)

echo.
echo ==================================
echo   Iniciando ChatApp...
echo ==================================
echo.
echo Servidor corriendo en: http://localhost:5000
echo Presiona Ctrl+C para detener el servidor
echo.

REM Iniciar la aplicación
python app.py

pause
