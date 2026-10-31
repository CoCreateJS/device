param(
	[ValidateSet("Package", "Run")]
	[string]$Action = "Package",
	[ValidateSet("Debug", "Release")]
	[string]$Configuration = "Release",
	[ValidateSet("x64", "arm64", "x86")]
	[string]$Architecture = "x64"
)

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$windowsProject = Join-Path $repoRoot "src/native/windows"

if ([System.Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) {
	throw "Windows builds must run on Windows."
}
$projects = @(Get-ChildItem -Path $windowsProject -Filter "*.csproj" -File -Recurse |
    Where-Object { $_.FullName -notmatch "[\\/](bin|obj)[\\/]" })
if ($env:COCREATE_WINDOWS_PROJECT) {
    $project = Get-Item -LiteralPath $env:COCREATE_WINDOWS_PROJECT
} elseif ($projects.Count -eq 1) {
    $project = $projects[0]
} elseif ($projects.Count -gt 1) {
    throw "Multiple projects found. Set COCREATE_WINDOWS_PROJECT to the app .csproj."
} else {
    throw "Windows host project is not scaffolded yet under $windowsProject."
}
if (-not (Get-Command winapp -ErrorAction SilentlyContinue)) {
    throw "winapp is missing. Run device:windows:setup first."
}

if ($Action -eq "Run") {
	& winapp run $project.FullName -c $Configuration --arch $Architecture
} else {
	$outputDir = Join-Path $repoRoot "build/windows"
	New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
	$outputPath = Join-Path $outputDir "CoCreateDevice-$Architecture.msix"
	# Store or external-signing workflows should sign the generated package separately.
	& winapp pack $project.FullName -c $Configuration --arch $Architecture --no-sign --output $outputPath
}

if ($LASTEXITCODE -ne 0) {
	throw "Windows $Action failed (exit code $LASTEXITCODE)."
}
if ($Action -eq "Package") {
	Write-Host "Unsigned MSIX package: $outputPath"
}
