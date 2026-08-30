$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path $PSScriptRoot -Parent
$manifestPath = Join-Path $projectRoot 'public\manifest.json'
$distPath = Join-Path $projectRoot 'dist'
$releasePath = Join-Path $projectRoot 'release-artifacts'

if (-not (Test-Path -LiteralPath $manifestPath)) { throw "Missing manifest: $manifestPath" }
if (-not (Test-Path -LiteralPath $distPath)) { throw "Missing build output: $distPath" }

$version = (Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json).version
$archive = Join-Path $releasePath "telegram-custom-notifier-v$version.zip"
New-Item -ItemType Directory -Path $releasePath -Force | Out-Null
if (Test-Path -LiteralPath $archive) { Remove-Item -LiteralPath $archive -Force }
Compress-Archive -LiteralPath (Get-ChildItem -LiteralPath $distPath | Select-Object -ExpandProperty FullName) -DestinationPath $archive -CompressionLevel Optimal

$hash = [BitConverter]::ToString([Security.Cryptography.SHA256]::Create().ComputeHash([IO.File]::ReadAllBytes($archive))).Replace('-', '')
Write-Output "PACKAGE=$archive"
Write-Output "SHA256=$hash"
