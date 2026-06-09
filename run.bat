@echo off
echo =======================================================
echo           INICIALIZANDO FINSCRIPT WEB APP
echo =======================================================
echo.

echo [1/3] Verificando e instalando dependencias Python...
python -m pip install -r requirements.txt
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERRO] Falha ao instalar dependencias. Verifique se o Python esta no seu PATH.
    pause
    exit /b %ERRORLEVEL%
)
echo.

echo [2/3] Abrindo a interface web no navegador...
timeout /t 2 /nobreak > nul
start http://127.0.0.1:5000
echo.

echo [3/3] Iniciando o servidor local Flask...
python -m backend.app
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERRO] Servidor Flask interrompido de forma inesperada.
    pause
)
