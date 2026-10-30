@echo off
title PharmaScreen AI - Drug Discovery Lab
echo =======================================================
echo  PharmaScreen AI - Drug Discovery Lab
echo  Starting server at http://localhost:3000 ...
echo =======================================================
start http://localhost:3000
node backend/server.js
pause
