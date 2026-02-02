@echo off
REM dev.cmd - Convenience wrapper voor development commands
REM Gebruik: dev [command]

set "PATH=%~dp0node_bin;%PATH%"

if "%1"=="" goto help
if "%1"=="test" goto test
if "%1"=="e2e" goto e2e
if "%1"=="lint" goto lint
if "%1"=="dev" goto dev
if "%1"=="validate" goto validate
if "%1"=="install" goto install
if "%1"=="help" goto help
goto unknown

:test
echo [TEST] Running unit tests...
call "%~dp0node_bin\npm.cmd" run test
goto end

:e2e
echo [E2E] Running E2E tests...
call "%~dp0node_bin\npm.cmd" run test:e2e
goto end

:lint
echo [LINT] Running linter...
call "%~dp0node_bin\npm.cmd" run lint
goto end

:dev
echo [DEV] Starting development server...
call "%~dp0node_bin\npm.cmd" run dev
goto end

:validate
echo [VALIDATE] Running full validation...
call "%~dp0node_bin\npm.cmd" run validate
goto end

:install
echo [INSTALL] Installing dependencies...
call "%~dp0node_bin\npm.cmd" install
goto end

:help
echo.
echo Groepsbezoeken App - Development Scripts
echo =========================================
echo.
echo Gebruik: dev [command]
echo.
echo Commands:
echo   test      Run unit tests
echo   e2e       Run E2E tests
echo   lint      Run ESLint
echo   dev       Start development server
echo   validate  Run lint + all tests
echo   install   Install npm dependencies
echo   help      Show this help
echo.
goto end

:unknown
echo Onbekend command: %1
echo Gebruik 'dev help' voor beschikbare commands.
goto end

:end
