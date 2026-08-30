@echo off
title Student Dashboard - Remote Access (Cloudflare Tunnel)
color 0A
echo.
echo ============================================================
echo   Student Dashboard - Remote Access via Cloudflare Tunnel
echo ============================================================
echo.

:: Check if cloudflared exists
where cloudflared >nul 2>&1
if %errorlevel% equ 0 (
    goto :run_tunnel
)

:: Check if it's already downloaded in this folder
if exist "cloudflared.exe" (
    goto :run_tunnel
)

echo [INFO] جاري تحميل Cloudflare Tunnel (cloudflared)...
echo [INFO] Downloading cloudflared...
echo.

:: Download cloudflared for Windows x64 using PowerShell
powershell -Command "& { Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile 'cloudflared.exe' -UseBasicParsing }"

if not exist "cloudflared.exe" (
    echo [ERROR] فشل التحميل. تحقق من اتصال الإنترنت.
    pause
    exit /b 1
)

echo [OK] تم تحميل cloudflared بنجاح!
echo.

:run_tunnel
echo [INFO] جاري تشغيل النفق الآمن...
echo [INFO] Starting secure tunnel to http://localhost:5173
echo.
echo [IMPORTANT] انسخ الرابط الذي سيظهر بعد قليل (على شكل https://xxxx.trycloudflare.com)
echo [IMPORTANT] Copy the https link shown below and open it on any device!
echo.
echo ============================================================

cloudflared.exe tunnel --url http://localhost:5173

pause
