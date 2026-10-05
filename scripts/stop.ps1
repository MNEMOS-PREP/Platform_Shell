<#
    Close the whole platform at once: every module's service tabs, their
    control tabs, and the shell.

    Before this, closing meant answering Y in seven control tabs and Ctrl+C in
    HOME. Each tab is a powershell running one of three scripts - a module's
    scripts\pane.ps1 (a service), its scripts\control.ps1, or this repo's
    scripts\home.ps1 - so every tab is found by the full path of the script it
    runs, inside a module folder module.json names. Never by window title: on
    Windows 11 the title belongs to the terminal host, and a title-matched
    taskkill can close the whole terminal (see any module's control.ps1).

    A process listening on a module port that no tab started - a uvicorn run by
    hand - is named, not killed: nothing here knows what it is for.

    Dot-sourced by home.ps1 (the Q key) and platform.ps1 (start.bat stop), after
    modules.ps1. Returns how many ports were left listening. ASCII only and CRLF, like the scripts that load it.
#>

function Stop-Platform {
    param(
        [string] $Root,
        # The caller's own process, which is left for the caller to end - a
        # HOME tab stops its own dev server and then exits cleanly, so its
        # tab closes rather than showing a killed process.
        [int] $Except = 0
    )

    $modules = @(Get-PlatformModules -Root $Root)
    $homeScript = Join-Path $Root 'scripts\home.ps1'

    # Which tab is which, by the script it runs. Lower-cased, because the
    # same folder arrives as "F:\" from one launcher and "f:\" from another.
    $kinds = @()
    foreach ($m in $modules) {
        $kinds += [pscustomobject]@{ Script = (Join-Path $m.Dir 'scripts\pane.ps1').ToLower(); Module = $m; Kind = 'service' }
        $kinds += [pscustomobject]@{ Script = (Join-Path $m.Dir 'scripts\control.ps1').ToLower(); Module = $m; Kind = 'control' }
    }
    $kinds += [pscustomobject]@{ Script = $homeScript.ToLower(); Module = $null; Kind = 'home' }

    $tabs = @()
    foreach ($p in @(Get-CimInstance Win32_Process -Filter "Name='powershell.exe' OR Name='pwsh.exe'" -ErrorAction SilentlyContinue)) {
        if ($p.ProcessId -eq $Except -or -not $p.CommandLine) { continue }
        $line = $p.CommandLine.ToLower()
        foreach ($k in $kinds) {
            if ($line.Contains($k.Script)) {
                $label = if ($k.Module) { $k.Module.Id } else { 'shell' }
                # pane.ps1 -Id m06-api: name the service, not just the module.
                if ($k.Kind -eq 'service' -and $p.CommandLine -match '-Id\s+"?([\w-]+)') { $label = $Matches[1] }
                $tabs += [pscustomobject]@{ Pid = $p.ProcessId; Kind = $k.Kind; Label = $label; Module = $k.Module }
                break
            }
        }
    }

    # Services first, so a control tab never reports a service as stopped
    # under it; then the control tabs; then any other HOME tab.
    $order = @{ service = 0; control = 1; home = 2 }
    $tabs = @($tabs | Sort-Object { $order[$_.Kind] }, Label)

    if (-not $tabs) {
        Write-Host '    No module tabs are open.' -ForegroundColor DarkGray
    }
    foreach ($t in $tabs) {
        # /T for the tree: the tab is powershell -> cmd -> the real service.
        $null = & taskkill.exe /PID $t.Pid /T /F 2>&1
        $what = switch ($t.Kind) { 'service' { 'closed' } 'control' { 'control tab closed' } 'home' { 'other HOME tab closed' } }
        if ($LASTEXITCODE -eq 0) {
            Write-Host ("    {0,-9} {1}  [pid {2}]" -f $t.Label, $what, $t.Pid) -ForegroundColor Green
        }
        else {
            Write-Host ("    {0,-9} would not close  [pid {1}]" -f $t.Label, $t.Pid) -ForegroundColor Red
        }
    }

    # What the control tabs would have tidied, had they been the ones to close.
    foreach ($m in $modules) {
        $run = Join-Path $m.Dir '.run'
        Get-ChildItem -Path $run -Include '*.pid', '*.cmd', 'session.json' -File -Recurse -ErrorAction SilentlyContinue |
            Remove-Item -Force -ErrorAction SilentlyContinue
    }

    # Ports free up a moment after their process goes. The shell's too: the
    # HOME tab that calls this has stopped its own dev server first.
    $ports = @($modules | ForEach-Object { [pscustomobject]@{ Id = $_.Id; Port = $_.Port } })
    $ports += [pscustomobject]@{ Id = 'shell'; Port = 5173 }
    $deadline = (Get-Date).AddSeconds(6)
    do {
        $left = @($ports | Where-Object { Get-NetTCPConnection -LocalPort $_.Port -State Listen -ErrorAction SilentlyContinue })
        if (-not $left) { break }
        Start-Sleep -Milliseconds 400
    } while ((Get-Date) -lt $deadline)

    foreach ($p in $left) {
        $owner = @(Get-NetTCPConnection -LocalPort $p.Port -State Listen -ErrorAction SilentlyContinue)[0].OwningProcess
        Write-Host ("    {0,-9} still listening on {1} [pid {2}] - not started from a tab, left alone" -f $p.Id, $p.Port, $owner) -ForegroundColor Yellow
        Write-Host ("              to stop it:  taskkill /PID {0} /T /F" -f $owner) -ForegroundColor DarkGray
    }

    # How many were left, so a caller about to close its tab can wait for
    # the reader instead of taking those lines with it.
    return $left.Count
}
