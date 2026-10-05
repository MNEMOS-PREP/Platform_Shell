<#
    The HOME tab.

    This is the tab you look at. It runs the shell dev server and shows one
    card with one link, and it is opened LAST so it is the rightmost tab in the
    window - the modules have seven service tabs and seven control tabs between
    them, all titled things like "cont" and "m15" once Windows Terminal has
    truncated them, and none of that tells you where the product is.

    The dev server is started DETACHED with its output on a file rather than
    run in the foreground here. Vite prints a banner on boot and a line per HMR
    update afterwards, and every one of those would land underneath the card
    and push the link out of view - which is the entire problem this tab exists
    to solve.

    Module state is probed here rather than passed in, so the card describes the
    platform at the moment it is drawn instead of the moment the launcher
    started.

    Q closes everything - every module's service and control tabs, the shell,
    and this tab - after a Y (stop.ps1). It used to take a Y in seven control
    tabs and a Ctrl+C here.

    ASCII only and CRLF. See platform.ps1 for why.
#>

[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

# Also set from inside, for a terminal that ignores --suppressApplicationTitle.
# This tab is the one the user has to find; it does not get to be called
# after whatever directory it happens to be sitting in.
try { $Host.UI.RawUI.WindowTitle = 'HOME' } catch { }

$root     = Split-Path -Parent $PSScriptRoot
$shellUrl = 'http://localhost:5173'

# From module.json, through modules.ps1 - the same list start.bat uses.
. (Join-Path $PSScriptRoot 'modules.ps1')
. (Join-Path $PSScriptRoot 'stop.ps1')
$modules = @(Get-PlatformModules -Root $root)

function Test-Port {
    param([int] $Port)
    return [bool] (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}

function Write-Card {
    param(
        # A second HOME tab watches a shell it did not start, so the two lines
        # about Ctrl+C have to mean opposite things. Better one parameter than
        # a card that contradicts itself two lines later.
        [switch] $Watching
    )

    $status = @()
    foreach ($m in $modules) {
        $status += [pscustomobject]@{ Id = $m.Id; Label = $m.Label; Up = (Test-Port -Port $m.Port) }
    }

    $up   = @($status | Where-Object { $_.Up }).Count
    $all  = $status.Count
    $bar  = '  ' + ('=' * 68)
    $rule = '  ' + ('-' * 68)

    Write-Host ''
    Write-Host $bar -ForegroundColor DarkGray
    Write-Host ''
    Write-Host '     AI INTERVIEWER' -ForegroundColor Cyan
    Write-Host '     One app. Every built module is inside it.' -ForegroundColor DarkGray
    Write-Host ''
    Write-Host '       ->  ' -NoNewline -ForegroundColor DarkGray
    Write-Host $shellUrl -ForegroundColor White
    Write-Host ''
    Write-Host $rule -ForegroundColor DarkGray
    Write-Host ''

    # Colour carries the state and the count repeats it, because colour alone
    # is not a signal anyone should have to rely on.
    Write-Host '     Modules   ' -NoNewline -ForegroundColor DarkGray
    foreach ($s in $status) {
        $colour = 'Red'
        if ($s.Up) { $colour = 'Green' }
        Write-Host ("{0} " -f $s.Id) -NoNewline -ForegroundColor $colour
    }
    Write-Host ("  {0}/{1} up" -f $up, $all) -ForegroundColor DarkGray

    foreach ($s in $status) {
        if (-not $s.Up) {
            Write-Host ("     {0,-9} not running - the {1} stage will not open" -f $s.Id, $s.Label) -ForegroundColor Red
        }
    }

    Write-Host ''
    Write-Host '     Start here      the overview, then Resume, JD, Evaluation' -ForegroundColor DarkGray
    Write-Host '     Worth a look    /system - what every module is missing, live' -ForegroundColor DarkGray
    Write-Host ''
    Write-Host $rule -ForegroundColor DarkGray
    Write-Host ''
    Write-Host '     Q         ' -NoNewline -ForegroundColor White
    Write-Host 'close everything - every module tab, the shell, this tab' -ForegroundColor DarkGray
    if ($Watching) {
        Write-Host '     Ctrl+C    close this tab only. The shell was already up' -ForegroundColor DarkGray
        Write-Host '               before it opened, so it stays up.' -ForegroundColor DarkGray
    }
    else {
        Write-Host '     Ctrl+C    stop the shell only; the modules keep running' -ForegroundColor DarkGray
        Write-Host '               in their own tabs to the left.' -ForegroundColor DarkGray
    }
    Write-Host ''
    Write-Host $bar -ForegroundColor DarkGray
    Write-Host ''
}

# Q, from either wait below. Keys typed since the last look are read and
# dropped, so a stray letter never piles up behind the prompt.
function Read-CloseKey {
    $pressed = $false
    try {
        while ([Console]::KeyAvailable) {
            if ([Console]::ReadKey($true).Key -eq [ConsoleKey]::Q) { $pressed = $true }
        }
    }
    catch { }
    return $pressed
}

function Confirm-CloseAll {
    Write-Host ''
    $answer = (Read-Host '  Close every module tab, the shell and this tab? (Y/N)').Trim()
    if ($answer -match '^(?i)y(es)?$') { return $true }
    Write-Host '  Left running. Q asks again.' -ForegroundColor DarkGray
    return $false
}

function Close-Everything {
    param($Vite)
    Write-Host ''
    Write-Host '  Closing everything...' -ForegroundColor DarkGray
    # Our own dev server first, so stop.ps1 can tell whether anything else
    # still holds the shell's port.
    if ($Vite -and -not $Vite.HasExited) {
        & taskkill.exe /PID $Vite.Id /T /F 2>&1 | Out-Null
        Write-Host ("    {0,-9} closed  [pid {1}]" -f 'shell', $Vite.Id) -ForegroundColor Green
    }
    $left = Stop-Platform -Root $root -Except $PID
    Write-Host ''
    if ($left) {
        # This tab is about to close; the lines above are the only record.
        $null = Read-Host '  Done, with the above still running. Press Enter to close'
    }
    else {
        Write-Host '  Done.' -ForegroundColor Green
        Start-Sleep -Seconds 2
    }
    # 0, so Windows Terminal closes the tab rather than holding it open.
    exit 0
}

# Already up? Then this is a second HOME tab - opened by running start.bat
# twice, which is the normal way to get back to the card after closing it. It
# watches rather than races: a second dev server would fail to bind (strictPort)
# and this tab would report a link it does not own.
if (Test-Port -Port 5173) {
    Clear-Host
    Write-Card -Watching
    $nextProbe = Get-Date
    while ($true) {
        if ((Read-CloseKey) -and (Confirm-CloseAll)) { Close-Everything }
        # The port every two seconds, the key every quarter.
        if ((Get-Date) -ge $nextProbe) {
            if (-not (Test-Port -Port 5173)) { break }
            $nextProbe = (Get-Date).AddSeconds(2)
        }
        Start-Sleep -Milliseconds 250
    }
    Write-Host '  The shell stopped.' -ForegroundColor Yellow
    exit 0
}

$outLog = Join-Path $root '.shell.log'
$errLog = Join-Path $root '.shell.err.log'
Remove-Item $outLog, $errLog -ErrorAction SilentlyContinue

Write-Host ''
Write-Host '  Starting the shell...' -ForegroundColor DarkGray

$vite = Start-Process -FilePath 'cmd.exe' `
    -ArgumentList '/c', 'npm run dev' `
    -WorkingDirectory $root `
    -NoNewWindow -PassThru `
    -RedirectStandardOutput $outLog `
    -RedirectStandardError $errLog

# Wait until it genuinely answers. A card printed before the server is up sends
# you to a connection error, which is worse than no card at all.
$ready = $false
$deadline = (Get-Date).AddSeconds(120)
while ((Get-Date) -lt $deadline) {
    if ($vite.HasExited) { break }
    try {
        $null = Invoke-WebRequest -Uri $shellUrl -TimeoutSec 3 -UseBasicParsing
        $ready = $true
        break
    }
    catch { Start-Sleep -Milliseconds 500 }
}

if (-not $ready) {
    Write-Host ''
    Write-Host '  The shell did not come up. The end of its log:' -ForegroundColor Red
    Write-Host ''
    Get-Content $outLog -Tail 25 -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "    $_" }
    Get-Content $errLog -Tail 25 -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "    $_" -ForegroundColor Red }
    Write-Host ''
    Write-Host '  This tab stays open so you can read that. Press Enter to close.' -ForegroundColor DarkGray
    $null = Read-Host
    exit 1
}

try {
    Clear-Host
    Write-Card
    while (-not $vite.HasExited) {
        if ((Read-CloseKey) -and (Confirm-CloseAll)) { Close-Everything -Vite $vite }
        Start-Sleep -Milliseconds 250
    }
}
finally {
    # Ctrl+C leaves the detached cmd and its node child alive otherwise, and a
    # stale listener on 5173 makes the next run look like a port conflict.
    if ($vite -and -not $vite.HasExited) {
        & taskkill.exe /PID $vite.Id /T /F 2>&1 | Out-Null
    }
}
