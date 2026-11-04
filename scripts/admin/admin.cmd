@echo off
rem Ejecuta admin.js. Usa el Node portatil de node\ si existe; si no, el Node instalado.
rem Uso:  admin listar   /   admin resetear USUARIO CONTRASENA   /   admin borrar USUARIO
rem        admin admin USUARIO   /   admin quitar-admin USUARIO   /   admin admins
if exist "%~dp0node\node.exe" (
  "%~dp0node\node.exe" "%~dp0admin.js" %*
) else (
  node "%~dp0admin.js" %*
)
