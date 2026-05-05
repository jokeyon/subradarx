# Composes assets/splash-screen.png: 1284x2778, #FFEDD5 background, centered assets/icon.png (~34% width).
# Run from repo root: powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/compose-splash.ps1

$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..')
$iconPath = Join-Path $root 'assets/icon.png'
$outPath = Join-Path $root 'assets/splash-screen.png'
if (-not (Test-Path $iconPath)) { throw "Missing $iconPath" }

Add-Type -AssemblyName System.Drawing
$bg = [System.Drawing.Color]::FromArgb(255, 255, 237, 213)
$W = 1284
$H = 2778
$bmp = New-Object System.Drawing.Bitmap $W, $H
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.Clear($bg)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$icon = [System.Drawing.Image]::FromFile($iconPath)
$targetW = [int]($W * 0.34)
$scale = $targetW / $icon.Width
$targetH = [int]($icon.Height * $scale)
$x = [int](($W - $targetW) / 2)
$y = [int](($H - $targetH) / 2)
$g.DrawImage($icon, $x, $y, $targetW, $targetH)
$icon.Dispose()
$g.Dispose()
$tmp = "$outPath.tmp"
$bmp.Save($tmp, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Move-Item -Force $tmp $outPath
Write-Host "Wrote $outPath (${W}x${H})"
