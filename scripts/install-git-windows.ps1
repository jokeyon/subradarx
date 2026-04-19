# Install Git for Windows (user folder, no admin). For EAS CLI.
# Run:  powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\install-git-windows.ps1
$ErrorActionPreference = 'Stop'

$defaultGit = 'C:\Program Files\Git\cmd\git.exe'
$userGitRoot = Join-Path $env:LOCALAPPDATA 'Programs\Git'
$userGit = Join-Path $userGitRoot 'cmd\git.exe'

function Test-GitOk($path) {
  return (Test-Path $path)
}

if (Test-GitOk $defaultGit) {
  Write-Host "Git already installed:" -ForegroundColor Green
  & $defaultGit --version
  exit 0
}
if (Test-GitOk $userGit) {
  Write-Host "Git already installed (user):" -ForegroundColor Green
  & $userGit --version
  Write-Host "If 'git' is not found in a new terminal, add to PATH: $userGitRoot\cmd" -ForegroundColor Yellow
  exit 0
}

if (Get-Command winget -ErrorAction SilentlyContinue) {
  Write-Host "Installing Git via winget..." -ForegroundColor Cyan
  winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements 2>$null
  if (Test-GitOk $defaultGit) {
    & $defaultGit --version
    Write-Host "Done. Close and reopen the terminal." -ForegroundColor Green
    exit 0
  }
}

if (Get-Command choco -ErrorAction SilentlyContinue) {
  Write-Host "Installing Git via Chocolatey..." -ForegroundColor Cyan
  choco install git.install -y --params "/GitOnlyOnPath /NoAutoCrlf /WindowsTerminal" 2>$null
  if (Test-GitOk $defaultGit) {
    & $defaultGit --version
    Write-Host "Done. Close and reopen the terminal." -ForegroundColor Green
    exit 0
  }
}

# Same version on GitHub + npmmirror (China-friendly fallback)
$gitVersion = 'v2.45.1.windows.1'
$fileName = 'Git-2.45.1-64-bit.exe'
$urls = @(
  "https://github.com/git-for-windows/git/releases/download/$gitVersion/$fileName",
  "https://registry.npmmirror.com/-/binary/git-for-windows/$gitVersion/$fileName"
)

$installer = Join-Path $env:TEMP $fileName
$downloaded = $false

foreach ($url in $urls) {
  Write-Host "Trying download: $url" -ForegroundColor Cyan
  try {
    if (Get-Command Start-BitsTransfer -ErrorAction SilentlyContinue) {
      Start-BitsTransfer -Source $url -Destination $installer -ErrorAction Stop
    } else {
      Invoke-WebRequest -Uri $url -OutFile $installer -UseBasicParsing -TimeoutSec 600
    }
    if ((Test-Path $installer) -and (Get-Item $installer).Length -gt 1MB) {
      $downloaded = $true
      break
    }
  } catch {
    Write-Host "  failed: $($_.Exception.Message)" -ForegroundColor DarkYellow
    Remove-Item $installer -Force -ErrorAction SilentlyContinue
  }
}

if (-not $downloaded) {
  Write-Host "Automatic download failed (network or firewall)." -ForegroundColor Red
  Write-Host "Manual: https://git-scm.com/download/win" -ForegroundColor Yellow
  Write-Host "Or install Microsoft App Installer for winget: https://aka.ms/getwinget" -ForegroundColor Yellow
  exit 1
}

Write-Host "Installing Git to $userGitRoot (no admin)..." -ForegroundColor Cyan
if (Test-Path $userGitRoot) {
  Remove-Item $userGitRoot -Recurse -Force -ErrorAction SilentlyContinue
}
Start-Process -FilePath $installer -ArgumentList @(
  '/VERYSILENT', '/NORESTART', '/SUPPRESSMSGBOXES', "/DIR=$userGitRoot"
) -Wait
Remove-Item $installer -Force -ErrorAction SilentlyContinue

if (-not (Test-GitOk $userGit)) {
  Write-Host "Install finished but git.exe not found at $userGit" -ForegroundColor Red
  exit 1
}

& $userGit --version

$cmdDir = Join-Path $userGitRoot 'cmd'
$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
if ($userPath -notlike "*$cmdDir*") {
  $newPath = if ($userPath) { "$userPath;$cmdDir" } else { $cmdDir }
  [Environment]::SetEnvironmentVariable('Path', $newPath, 'User')
  Write-Host "Added to user PATH: $cmdDir" -ForegroundColor Green
}

Write-Host "Done. Close ALL terminals (including Cursor), open a new one, then: git --version" -ForegroundColor Green
exit 0
