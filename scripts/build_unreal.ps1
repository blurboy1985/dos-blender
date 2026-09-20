param(
    [Parameter(Mandatory=$true)][string]$EngineRoot,
    [switch]$OpenEditor
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$projectFile = Join-Path $projectRoot 'Unreal\DOSExplorer\DOSExplorer.uproject'
$buildTool = Join-Path $EngineRoot 'Engine\Build\BatchFiles\Build.bat'
$editor = Join-Path $EngineRoot 'Engine\Binaries\Win64\UnrealEditor.exe'
if (!(Test-Path -LiteralPath $buildTool) -or !(Test-Path -LiteralPath $editor)) {
    throw 'EngineRoot must point to an existing approved Unreal Engine installation, such as C:\Program Files\Epic Games\UE_5.6.'
}
& $buildTool DOSExplorerEditor Win64 Development "-Project=$projectFile" -WaitMutex
if ($LASTEXITCODE -ne 0) { throw "Unreal build failed with exit code $LASTEXITCODE" }
if ($OpenEditor) {
    & $editor $projectFile '/Engine/Maps/Entry'
}
