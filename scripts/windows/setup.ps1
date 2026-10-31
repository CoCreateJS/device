param()

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$windowsProject = Join-Path $repoRoot "src/native/windows"

if ([System.Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) {
	throw "Windows setup must run on Windows. Use the Windows host to install Windows SDK tools and prepare this app."
}

if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
	throw "WinGet is required. Install or update App Installer from Microsoft Store, then rerun device:windows:setup."
}

function Install-WingetPackageIfMissing {
	param(
		[Parameter(Mandatory = $true)][string]$CommandName,
		[Parameter(Mandatory = $true)][string]$PackageId
	)
	if (Get-Command $CommandName -ErrorAction SilentlyContinue) {
		Write-Host "$CommandName is already available."
		return
	}
	Write-Host "Installing $PackageId with WinGet."
	& winget install --id $PackageId --exact --source winget --accept-source-agreements --accept-package-agreements
	if ($LASTEXITCODE -ne 0) {
		throw "WinGet could not install $PackageId (exit code $LASTEXITCODE)."
	}
}

if (-not (Get-Command dotnet -ErrorAction SilentlyContinue) -or -not ((& dotnet --list-sdks 2>$null) -match "^10\.")) {
	Write-Host "Installing the .NET 10 SDK with WinGet."
	& winget install --id Microsoft.DotNet.SDK.10 --exact --source winget --accept-source-agreements --accept-package-agreements
	if ($LASTEXITCODE -ne 0) {
		throw "WinGet could not install Microsoft.DotNet.SDK.10 (exit code $LASTEXITCODE)."
	}
} else {
	Write-Host ".NET 10 SDK is already available."
}
Install-WingetPackageIfMissing -CommandName "winapp" -PackageId "Microsoft.WinAppCli"

# Refresh this PowerShell process PATH after WinGet installs tools.
$machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
$env:Path = "$machinePath;$userPath;$env:Path"
if (-not (Get-Command dotnet -ErrorAction SilentlyContinue) -or -not (Get-Command winapp -ErrorAction SilentlyContinue)) {
	throw "Tool installation completed, but this terminal cannot see dotnet or winapp yet. Open a new PowerShell terminal and rerun device:windows:setup."
}

$versionText = (& winapp --version | Out-String).Trim()
$versionMatch = [regex]::Match($versionText, '\d+\.\d+\.\d+')
if ($LASTEXITCODE -ne 0 -or -not $versionMatch.Success) {
    throw "Cannot determine winapp version. Update Microsoft.WinAppCli and rerun setup."
}
$version = [Version]$versionMatch.Value
if ($version -lt [Version]"0.6.0") {
    throw "winapp 0.6.0 or newer is required. Run: winget upgrade --id Microsoft.WinAppCli --exact --source winget"
}
Write-Host "Windows tools are ready. SDK references will be restored from the app project when it is added."
Write-Host "Confirm Developer Mode is enabled before running local packages. Setup has not initialized or modified app sources."
