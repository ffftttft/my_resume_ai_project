# One-click local startup script for the AI resume generator on Windows.
# Usage:
# - Double-click `start_local.bat`
# - Or run: powershell -ExecutionPolicy Bypass -File .\start_local.ps1
# - Optional: powershell -ExecutionPolicy Bypass -File .\start_local.ps1 -PrepareOnly

param(
    [switch]$PrepareOnly,
    [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$FrontendRoot = Join-Path $ProjectRoot "frontend_app"
$BackendEnvExample = Join-Path $ProjectRoot "backend\.env.example"
$BackendEnv = Join-Path $ProjectRoot "backend\.env"
$FrontendEnvExample = Join-Path $FrontendRoot ".env.example"
$FrontendEnv = Join-Path $FrontendRoot ".env"
$FrontendNodeModules = Join-Path $FrontendRoot "node_modules"

function Write-Step {
    param([string]$Message)
    Write-Host "[ResumeAI] $Message" -ForegroundColor Cyan
}

function Ensure-Command {
    param(
        [string]$CommandName,
        [string]$InstallHint
    )

    if (-not (Get-Command $CommandName -ErrorAction SilentlyContinue)) {
        throw "Missing command: $CommandName. $InstallHint"
    }
}

function Ensure-EnvFile {
    param(
        [string]$SourcePath,
        [string]$TargetPath
    )

    if (-not (Test-Path $TargetPath)) {
        Copy-Item -LiteralPath $SourcePath -Destination $TargetPath
        Write-Step "Created $([System.IO.Path]::GetFileName($TargetPath))"
    }
}

function Test-BackendDependencies {
    # Check whether required backend packages are already available.
    python -c "import fastapi, uvicorn, openai, pydantic_settings, pypdf, pptx" *> $null
    return $LASTEXITCODE -eq 0
}

Set-Location $ProjectRoot

Write-Step "Preparing local runtime environment"
Ensure-Command -CommandName "python" -InstallHint "Please install Python 3 first."
Ensure-Command -CommandName "npm" -InstallHint "Please install Node.js first."

Ensure-EnvFile -SourcePath $BackendEnvExample -TargetPath $BackendEnv
Ensure-EnvFile -SourcePath $FrontendEnvExample -TargetPath $FrontendEnv

$backendEnvContent = Get-Content -Raw $BackendEnv
if ($backendEnvContent -match "(?m)^OPENAI_API_KEY=$") {
    Write-Step "OPENAI_API_KEY not set. Demo mode is ready and the backend will use local fallback."
    Write-Step "If judges need live AI output, put a restricted temporary key in backend/.env. Do not commit that file."
}
else {
    Write-Step "OPENAI_API_KEY detected. Backend will prefer OpenAI."
}

if (-not (Test-BackendDependencies)) {
    Write-Step "Installing backend dependencies"
    python -m pip install -r (Join-Path $ProjectRoot "backend\requirements.txt")
}
else {
    Write-Step "Backend dependencies already available"
}

if (-not (Test-Path $FrontendNodeModules)) {
    Write-Step "Installing frontend dependencies"
    npm install --prefix $FrontendRoot
}
else {
    Write-Step "Frontend dependencies already available"
}

if ($PrepareOnly) {
    Write-Step "Environment preparation complete. Use start_local.bat for one-click launch."
    exit 0
}

$backendCommand = "Set-Location `"$ProjectRoot`"; python backend\run_local.py"
$frontendCommand = "Set-Location `"$FrontendRoot`"; npm run dev"

Write-Step "Starting backend window"
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-ExecutionPolicy", "Bypass",
    "-Command", $backendCommand
)

Start-Sleep -Seconds 2

Write-Step "Starting frontend window"
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-ExecutionPolicy", "Bypass",
    "-Command", $frontendCommand
)

if (-not $NoBrowser) {
    Start-Sleep -Seconds 4
    Write-Step "Opening browser"
    Start-Process "http://localhost:5173"
}

Write-Step "Launch complete. Frontend URL: http://localhost:5173"
