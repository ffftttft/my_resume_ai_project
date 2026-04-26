param(
    [string]$DestinationRoot = "$env:USERPROFILE\Desktop\my_resume_ai_project_release"
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$BundleRoot = $DestinationRoot
$ZipPath = "${BundleRoot}.zip"

function Write-Step {
    param([string]$Message)
    Write-Host "[ReleaseBundle] $Message" -ForegroundColor Cyan
}

if (Test-Path $BundleRoot) {
    Write-Step "Removing existing bundle directory"
    Remove-Item -LiteralPath $BundleRoot -Recurse -Force
}

if (Test-Path $ZipPath) {
    Write-Step "Removing existing zip archive"
    Remove-Item -LiteralPath $ZipPath -Force
}

Write-Step "Creating release bundle directory"
New-Item -ItemType Directory -Path $BundleRoot | Out-Null

$robocopyArgs = @(
    $ProjectRoot,
    $BundleRoot,
    "/E",
    "/R:1",
    "/W:1",
    "/NFL",
    "/NDL",
    "/NJH",
    "/NJS",
    "/NP",
    "/XD",
    ".git",
    ".claude",
    ".codex",
    ".codex-logs",
    ".project_notes",
    ".vscode",
    "frontend_app\\node_modules",
    "frontend_app\\dist",
    "frontend_app\\.npm-cache",
    "frontend\\node_modules",
    "frontend\\dist",
    "backend\\__pycache__",
    "backend\\app\\__pycache__",
    "backend\\tests\\__pycache__",
    "backend\\uploads",
    "ai_modules\\__pycache__",
    "/XF",
    "tmp_*.html",
    "tmp_*.js",
    "tmp_*.json",
    "*.pyc",
    "*.pyo",
    "*.pyd"
)

Write-Step "Copying project files"
& robocopy @robocopyArgs | Out-Null
$robocopyExit = $LASTEXITCODE
if ($robocopyExit -ge 8) {
    throw "Robocopy failed with exit code $robocopyExit"
}

Write-Step "Sanitizing memory files"
$memoryPayload = @{
    note = "Compact local memory for my_resume_ai_project."
    project_name = "my_resume_ai_project"
    created_at = (Get-Date).ToString("o")
    last_started_at = $null
    workspace_draft = $null
    uploaded_files = @()
    downloaded_artifacts = @()
    resume_snapshots = @()
}
$memoryPayload | ConvertTo-Json -Depth 8 | Set-Content -Encoding utf8 (Join-Path $BundleRoot "memory.json")

$profilePayload = @{
    note = "Compact persistent profile memory loaded for each fresh website session."
    username = "demo"
    updated_at = (Get-Date).ToString("o")
    max_size_bytes = 4096
    profile = @{
        target_roles = @()
        target_companies = @()
        cities = @()
        skills = @()
        education_keywords = @()
        project_keywords = @()
        experience_keywords = @()
        writing_preferences = @("中文简历", "表达精炼", "优先量化结果")
        fact_guards = @("不得编造事实", "不得夸大经历", "优先使用用户提供信息")
    }
}
$profilePayload | ConvertTo-Json -Depth 8 | Set-Content -Encoding utf8 (Join-Path $BundleRoot "profile_memory.json")

Write-Step "Writing upload note"
$uploadNote = @"
上传建议：
1. 直接上传本目录或同名 zip 压缩包。
2. 本发布包已包含运行配置文件，可双击 start_local.bat 启动。
3. 首次运行会自动安装 Python/Node 依赖，因此目标机器仍需预装 Python 与 Node.js。
4. 运行历史、草稿和个人缓存已清空。
"@
$uploadNote | Set-Content -Encoding utf8 (Join-Path $BundleRoot "UPLOAD_NOTE.txt")

Write-Step "Creating zip archive"
Compress-Archive -Path (Join-Path $BundleRoot "*") -DestinationPath $ZipPath -CompressionLevel Optimal

Write-Step "Release bundle ready"
Write-Host $BundleRoot
Write-Host $ZipPath
