@echo off
setlocal

title 温馨小木屋 - 本地预览
cd /d "%~dp0"

echo.
echo ============================================
echo         温馨小木屋 · 本地预览
echo ============================================
echo.
echo 正在本机启动一个临时服务器...
echo 浏览器会自动打开，看完直接关掉这个黑窗口就行。
echo.

REM 优先用 Node.js（快、无依赖）
where node >nul 2>&1
if not errorlevel 1 (
    echo [方式] 使用 Node.js 启动
    start "" http://localhost:8080
    node -e "const http=require('http'),fs=require('fs'),path=require('path');const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.mp4':'video/mp4','.json':'application/json'};http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);if(p==='/')p='/index.html';const f=path.join(process.cwd(),p);fs.readFile(f,(e,d)=>{if(e){res.writeHead(404);res.end('404');return}const ext=path.extname(f).toLowerCase();res.writeHead(200,{'Content-Type':types[ext]||'application/octet-stream','Accept-Ranges':'bytes'});res.end(d)})}).listen(8080,()=>console.log('服务器已启动: http://localhost:8080'));"
    goto :end
)

REM 退而用 Python
where python >nul 2>&1
if not errorlevel 1 (
    echo [方式] 使用 Python 启动
    start "" http://localhost:8080
    python -m http.server 8080
    goto :end
)

echo [错误] 没找到 Node.js 或 Python，无法启动本地服务器。
echo.
echo 不过没关系，你可以直接双击 index.html 用浏览器打开看
echo （只是视频可能因为浏览器安全策略无法播放）。
echo.
pause

:end
