<#
    The HOME tab.

    This is the tab you look at. It runs the shell dev server and shows one
    card with one link, and it is opened LAST so it is the rightmost tab in the
    window - the modules have six service tabs and six control tabs between
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

$modules = @(
    @{ Id = 'M01'; Label = 'Resume';      Port = 8101 },
    @{ Id = 'M02'; Label = 'JD';          Port = 8102 },
    @{ Id = 'M04'; Label = 'Skill Graph'; Port = 8104 },
    @{ Id = 'M05'; Label = 'Questions';   Port = 8105 },
    @{ Id = 'M13'; Label = 'Evaluation';  Port = 8113 },
    @{ Id = 'M15'; Label = 'Companies';   Port = 8115 }
)

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
    if ($Watching) {
        Write-Host '     The shell was already up before this tab opened, so this tab' -ForegroundColor DarkGray
        Write-Host '     watches it rather than hosts it - Ctrl+C here leaves it up.' -ForegroundColor DarkGray
    }
    else {
        Write-Host '     This tab is the shell. Ctrl+C here stops it; the modules' -ForegroundColor DarkGray
        Write-Host '     keep running in their own tabs to the left.' -ForegroundColor DarkGray
    }
    Write-Host ''
    Write-Host $bar -ForegroundColor DarkGray
    Write-Host ''
}

# Already up? Then this is a second HOME tab - opened by running start.bat
# twice, which is the normal way to get back to the card after closing it. It
# watches rather than races: a second dev server would fail to bind (strictPort)
# and this tab would report a link it does not own.
if (Test-Port -Port 5173) {
    Clear-Host
    Write-Card -Watching
    while (Test-Port -Port 5173) { Start-Sleep -Seconds 2 }
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
    Wait-Process -Id $vite.Id
}
finally {
    # Ctrl+C leaves the detached cmd and its node child alive otherwise, and a
    # stale listener on 5173 makes the next run look like a port conflict.
    if ($vite -and -not $vite.HasExited) {
        & taskkill.exe /PID $vite.Id /T /F 2>&1 | Out-Null
    }
}
