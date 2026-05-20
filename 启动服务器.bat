@echo off
chcp 65001 >nul
echo ========================================
echo   TaskSync 实时任务协作系统
echo ========================================
echo.

:: 检查 Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
  echo [错误] 未检测到 Node.js！
  echo 请先安装 Node.js：https://nodejs.org/zh-cn/
  echo 下载 LTS 版本，安装完成后重新运行此脚本。
  pause
  exit /b 1
)

echo [OK] Node.js 已安装

:: 安装依赖
if not exist node_modules (
  echo.
  echo 正在安装依赖包（首次运行需要联网）...
  npm install
  if %errorlevel% neq 0 (
    echo [错误] 依赖安装失败，请检查网络连接
    pause
    exit /b 1
  )
)

echo.
echo 正在启动服务器...
echo.
node server.js
pause
