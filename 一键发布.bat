@echo off
setlocal

title 温馨小木屋 - 一键发布
cd /d "%~dp0"

echo.
echo ============================================
echo            温馨小木屋 · 一键发布
echo ============================================
echo.

REM 检查 git 是否可用
where git >nul 2>&1
if errorlevel 1 (
    echo [错误] 找不到 git，请先安装 Git for Windows
    echo.
    pause
    exit /b 1
)

REM 检查是否有改动
git status --porcelain >"%TEMP%\wxm_status.txt" 2>&1
for /f %%A in ("%TEMP%\wxm_status.txt") do set HAS_CHANGE=1
del "%TEMP%\wxm_status.txt" >nul 2>&1

if not defined HAS_CHANGE (
    echo [提示] 没有任何改动，不需要发布。
    echo.
    pause
    exit /b 0
)

echo [1/3] 检测到以下改动：
echo --------------------------------------------
git status --short
echo --------------------------------------------
echo.

echo [2/3] 正在提交...
set /p MSG=请输入这次更新的说明（直接回车 = 自动生成）:
if "%MSG%"=="" set MSG=更新作品内容

git add -A
git commit -m "%MSG%"
if errorlevel 1 (
    echo.
    echo [错误] 提交失败，请把上面的错误信息发给 AI
    pause
    exit /b 1
)

echo.
echo [3/3] 正在上传到 GitHub...
git push
if errorlevel 1 (
    echo.
    echo [错误] 上传失败。可能是网络问题，请再运行一次本脚本。
    echo        如果反复失败，把错误信息发给 AI。
    pause
    exit /b 1
)

echo.
echo ============================================
echo   发布成功！
echo.
echo   网站地址：https://hi3612.github.io
echo   等 1-2 分钟后刷新网页就能看到更新。
echo ============================================
echo.
pause
