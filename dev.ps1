# dev.ps1 - Convenience wrapper voor development commands
# Gebruik: .\dev.ps1 [command]
#
# Commands:
#   test       - Run unit tests
#   test:watch - Run unit tests in watch mode
#   e2e        - Run E2E tests
#   lint       - Run linter
#   lint:fix   - Run linter met auto-fix
#   dev        - Start development server
#   validate   - Run lint + alle tests
#   help       - Toon dit help bericht

param(
    [Parameter(Position = 0)]
    [string]$Command = "help"
)

# Zet node_bin in PATH
$env:PATH = "$PSScriptRoot\node_bin;$env:PATH"

# Check of node_bin bestaat
if (-not (Test-Path "$PSScriptRoot\node_bin\node.exe")) {
    Write-Host "❌ node_bin/node.exe niet gevonden!" -ForegroundColor Red
    Write-Host "Zorg dat Node.js standalone is geïnstalleerd in de node_bin folder."
    exit 1
}

switch ($Command) {
    "test" {
        Write-Host "🧪 Running unit tests..." -ForegroundColor Cyan
        & "$PSScriptRoot\node_bin\npm.cmd" run test
    }
    "test:watch" {
        Write-Host "🧪 Running unit tests (watch mode)..." -ForegroundColor Cyan
        & "$PSScriptRoot\node_bin\npm.cmd" run test:watch
    }
    "e2e" {
        Write-Host "🎭 Running E2E tests..." -ForegroundColor Cyan
        & "$PSScriptRoot\node_bin\npm.cmd" run test:e2e
    }
    "lint" {
        Write-Host "🔍 Running linter..." -ForegroundColor Cyan
        & "$PSScriptRoot\node_bin\npm.cmd" run lint
    }
    "lint:fix" {
        Write-Host "🔧 Running linter with auto-fix..." -ForegroundColor Cyan
        & "$PSScriptRoot\node_bin\npm.cmd" run lint:fix
    }
    "dev" {
        Write-Host "🚀 Starting development server..." -ForegroundColor Cyan
        & "$PSScriptRoot\node_bin\npm.cmd" run dev
    }
    "validate" {
        Write-Host "✅ Running full validation (lint + tests)..." -ForegroundColor Cyan
        & "$PSScriptRoot\node_bin\npm.cmd" run validate
    }
    "install" {
        Write-Host "📦 Installing dependencies..." -ForegroundColor Cyan
        & "$PSScriptRoot\node_bin\npm.cmd" install
    }
    "install:playwright" {
        Write-Host "🎭 Installing Playwright browsers..." -ForegroundColor Cyan
        & "$PSScriptRoot\node_bin\npx.cmd" playwright install chromium
    }
    "help" {
        Write-Host ""
        Write-Host "📦 Groepsbezoeken App - Development Scripts" -ForegroundColor Green
        Write-Host "============================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Gebruik: .\dev.ps1 [command]" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Commands:" -ForegroundColor Cyan
        Write-Host "  test              Run unit tests"
        Write-Host "  test:watch        Run unit tests in watch mode"
        Write-Host "  e2e               Run E2E tests (Playwright)"
        Write-Host "  lint              Run ESLint"
        Write-Host "  lint:fix          Run ESLint with auto-fix"
        Write-Host "  dev               Start development server"
        Write-Host "  validate          Run lint + all tests"
        Write-Host "  install           Install npm dependencies"
        Write-Host "  install:playwright Install Playwright browsers"
        Write-Host "  help              Show this help"
        Write-Host ""
    }
    default {
        Write-Host "❌ Onbekend command: $Command" -ForegroundColor Red
        Write-Host "Gebruik '.\dev.ps1 help' voor beschikbare commands."
    }
}
