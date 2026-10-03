<#
    Bring the whole platform up: every module beside this repo, then the shell.

    Each module already knows how to start itself, and each of those launchers
    attaches its tabs to the same named Windows Terminal window. So this file
    calls them rather than re-implementing "bring services up" a second time -
    the duplicated-launcher problem is already tracked as platform debt and
    this is not the place to add a seventh copy.

    Order matters twice.

      1. M04 is the root of the dependency graph, so it goes first and every
         module that probes it on startup finds it healthy.

      2. The shell tab is opened LAST, deliberately. Seven modules contribute
         fourteen tabs between service panes and control panes, and Windows
         Terminal truncates their titles to about four characters - so the
         window fills with "cont", "m15", "C:\W" and nothing says where the
         product actually is. Opening HOME last makes it the rightmost tab,
         and it is the only tab you need.

    The shell runs in its own tab rather than in this window because this
    window is where seven launchers just printed eighty lines. See home.ps1.

    ASCII only and CRLF, deliberately: cmd.exe seeks batch files by byte
    offset, and an LF-only file carrying one multi-byte character desyncs the
    parser mid-file. That is not hypothetical - it is the bug this repo's
    sibling shipped.

    Usage (normally through start.bat):

        platform.ps1              modules, then the HOME tab
        platform.ps1 -Check       report what is on disk and reachable
        platform.ps1 -ShellOnly   assume the modules are already up
#>

[CmdletBinding()]
param(
    [switch] $Check,
    [switch] $ShellOnly
)

$ErrorActionPreference = 'Stop'

$root     = Split-Path -Parent $PSScriptRoot
$parent   = Split-Path -Parent $root
$shellUrl = 'http://localhost:5173'

# The window the module launchers attach to. Their launch.ps1 defaults to this
# name; the HOME tab has to join the same window or it opens somewhere else and
# "last tab" stops meaning anything.
$windowName = 'ai-interviewer'

# Every module, its folder beside this one, its port and its launcher -
# from module.json, through modules.ps1. Two hand-kept copies of this list
# both missed M06 until 2026-10-03.
. (Join-Path $PSScriptRoot 'modules.ps1')
$modules = @(Get-PlatformModules -Root $root)

function Test-Port {
    param([int] $Port)
    return [bool] (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}

Write-Host ''
Write-Host '  Starting the platform...' -ForegroundColor DarkGray
Write-Host ''

# -- modules ----------------------------------------------------------------

foreach ($m in $modules) {
    $dir = Join-Path $parent $m.Folder
    $bat = Join-Path $dir $m.Bat

    if (-not (Test-Path $bat)) {
        Write-Host ("  [MISSING] {0}  no ..\{1}\{2}" -f $m.Id, $m.Folder, $m.Bat) -ForegroundColor Red
        continue
    }

    if (Test-Port -Port $m.Port) {
        Write-Host ("  [up]      {0}  already listening on {1}" -f $m.Id, $m.Port) -ForegroundColor DarkGray
        continue
    }

    if ($ShellOnly -or $Check) {
        Write-Host ("  [down]    {0}  nothing on {1}" -f $m.Id, $m.Port) -ForegroundColor Yellow
        continue
    }

    Write-Host ("  starting  {0}..." -f $m.Id) -ForegroundColor DarkGray
    & $bat | Out-Null

    # The module launchers return as soon as their tabs exist, so confirm the
    # port rather than trusting the exit code. The HOME card re-probes these
    # anyway; this wait is what keeps the tabs in a predictable order.
    $deadline = (Get-Date).AddSeconds(25)
    while ((Get-Date) -lt $deadline) {
        if (Test-Port -Port $m.Port) { break }
        Start-Sleep -Milliseconds 400
    }
}

if (-not (Test-Path (Join-Path $root 'node_modules'))) {
    Write-Host ''
    Write-Host '  The shell has no node_modules. Run:  npm install' -ForegroundColor Red
    Write-Host ''
    exit 1
}

if ($Check) {
    Write-Host ''
    Write-Host '  Check mode - the shell was not started.' -ForegroundColor DarkGray
    Write-Host ''
    exit 0
}

# -- the HOME tab -----------------------------------------------------------

$homeScript = Join-Path $PSScriptRoot 'home.ps1'
$homeArgs = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $homeScript)
$haveWt = [bool] (Get-Command 'wt.exe' -ErrorAction SilentlyContinue)

if (-not $haveWt) {
    # No Windows Terminal: this window becomes the HOME tab, which is the same
    # thing without the tab.
    Write-Host ''
    Write-Host '  [note]    Windows Terminal not found - the shell runs here.' -ForegroundColor Yellow
    & powershell @homeArgs
    exit $LASTEXITCODE
}

Write-Host ''
Write-Host '  opening   the HOME tab...' -ForegroundColor DarkGray

# --suppressApplicationTitle: without it the shell inside the tab is free
# to overwrite the title with its working directory, and the tab you are
# meant to find shows up as "C:\W" beside eleven others.
& wt.exe -w $windowName new-tab --title 'HOME' --suppressApplicationTitle -d $root powershell @homeArgs

# Wait for it, so the pointer below is true rather than hopeful. home.ps1 draws
# its own card in its own tab; this window only says where to look.
$ready = $false
$deadline = (Get-Date).AddSeconds(120)
while ((Get-Date) -lt $deadline) {
    try {
        $null = Invoke-WebRequest -Uri $shellUrl -TimeoutSec 3 -UseBasicParsing
        $ready = $true
        break
    }
    catch { Start-Sleep -Milliseconds 500 }
}

Write-Host ''
Write-Host ('  ' + ('=' * 68)) -ForegroundColor DarkGray
Write-Host ''
if ($ready) {
    Write-Host '     Open the LAST tab, titled HOME.' -ForegroundColor Cyan
}
else {
    Write-Host '     The HOME tab is still starting - open it and watch there.' -ForegroundColor Yellow
}
Write-Host ''
Write-Host '       ->  ' -NoNewline -ForegroundColor DarkGray
Write-Host $shellUrl -ForegroundColor White
Write-Host ''
Write-Host ('  ' + ('=' * 68)) -ForegroundColor DarkGray
Write-Host ''
