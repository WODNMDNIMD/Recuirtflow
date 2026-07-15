param(
  [switch]$SkipInstall,
  [switch]$SkipDocker
)

$ErrorActionPreference = "Stop"

function Write-Step($Message) {
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

Write-Step "Checking required tools"
git --version
node --version
npm --version
if (-not $SkipDocker) {
  docker --version
}

Write-Step "Ensuring feature branch"
git checkout -B recruitflow-mvp

if (-not (Test-Path ".env")) {
  Write-Step "Creating .env from .env.example"
  Copy-Item ".env.example" ".env"
}

if (-not $SkipInstall) {
  Write-Step "Installing npm dependencies"
  npm install
}

if (-not $SkipDocker) {
  Write-Step "Starting local services"
  docker compose up -d postgres minio
}

Write-Step "Next commands"
Write-Host "npm run db:migrate"
Write-Host "npm run db:seed"
Write-Host "npm run dev"

