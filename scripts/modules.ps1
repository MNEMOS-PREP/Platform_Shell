<#
    The modules the platform runs, read from module.json's depends_on.

    There were three copies of this list - platform.ps1's, home.ps1's and
    module.json's - and on 2026-10-03 the two script copies both lacked M06,
    the mock interview, which module.json's own entry for the shell needed.
    So `start.bat` never started it and the HOME card never checked for it.
    One list now, and both scripts dot-source this to read it.

    Derived per entry:
      Folder  the repo name, last segment of `repo`. The folder beside the
              shell must equal it (see m04-repo-locations in the project notes).
      Port    from `base_url`.
      Bat     the module's single-module launcher: its one start_*.bat that is
              not start_all.bat. Every module ships exactly one.
      Python  its virtualenv's python, Backend\.venv or the repo's .venv.
      Seed    Backend\seed.py, if the module ships demo data.
      Model   whether it calls a model: it ships a Backend\backend_*\llm.py.

    Order is module.json's, which is start order: M04 first, because every
    module that probes it at startup should find it up.

    ASCII only and CRLF, like the scripts that load it.
#>

function Get-PlatformModules {
    param([string] $Root)

    $parent   = Split-Path -Parent $Root
    $manifest = Get-Content -Raw -Encoding UTF8 -Path (Join-Path $Root 'module.json') | ConvertFrom-Json

    foreach ($dep in $manifest.depends_on) {
        $folder = ($dep.repo.TrimEnd('/') -split '/')[-1]
        $dir    = Join-Path $parent $folder
        $bat    = Get-ChildItem -Path $dir -Filter 'start_*.bat' -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -ne 'start_all.bat' } |
            Select-Object -First 1
        $backend = Join-Path $dir 'Backend'
        $python  = @(
            (Join-Path $backend '.venv\Scripts\python.exe'),
            (Join-Path $dir '.venv\Scripts\python.exe')
        ) | Where-Object { Test-Path $_ } | Select-Object -First 1
        $seed    = Join-Path $backend 'seed.py'
        $llm     = Get-ChildItem -Path $backend -Directory -Filter 'backend_*' -ErrorAction SilentlyContinue |
            Where-Object { Test-Path (Join-Path $_.FullName 'llm.py') } |
            Select-Object -First 1
        [pscustomobject]@{
            Id     = $dep.module
            Label  = $dep.name
            Folder = $folder
            Dir    = $dir
            Bat    = $(if ($bat) { $bat.Name } else { 'start_<module>.bat' })
            Port   = ([Uri] $dep.base_url).Port
            Python = $python
            Seed   = $(if (Test-Path $seed) { $seed } else { $null })
            Model  = [bool] $llm
        }
    }
}

<#
    The environment variables a model key can live in - read from
    Platform_Core's model roster (python\ai_core\models.py, each provider's
    `key_env`), so a provider added there is checked here without an edit.
#>
function Get-ModelKeyNames {
    param([string] $Root)

    $roster = Join-Path (Split-Path -Parent $Root) 'Platform_Core\python\ai_core\models.py'
    $names = @()
    if (Test-Path $roster) {
        $text = Get-Content -Raw -Encoding UTF8 -Path $roster
        foreach ($m in [regex]::Matches($text, 'key_env\s*=\s*\(([^)]*)\)')) {
            $names += [regex]::Matches($m.Groups[1].Value, '"([A-Z0-9_]+)"') | ForEach-Object { $_.Groups[1].Value }
        }
    }
    if (-not $names) { $names = @('GROQ_API_KEYS', 'GROQ_API_KEY', 'NVIDIA_API_KEYS', 'NVIDIA_API_KEY') }
    return @($names | Select-Object -Unique)
}

<#
    Where a module will find a model key, or $null. The same places, in the
    same order, its own key loader reads: the environment, AI_KEYS_FILE, then
    keys.txt / .env in Backend\, the repo root, and the folder beside the
    repos. Returns a description of the PLACE - never a value.
#>
function Find-ModelKey {
    param($Module, [string[]] $Names)

    foreach ($name in $Names) {
        if ([Environment]::GetEnvironmentVariable($name)) { return "environment ($name)" }
    }
    $places = @()
    if ($env:AI_KEYS_FILE) { $places += $env:AI_KEYS_FILE }
    $parent = Split-Path -Parent $Module.Dir
    foreach ($root in @((Join-Path $Module.Dir 'Backend'), $Module.Dir, $parent)) {
        foreach ($file in @('keys.txt', '.env')) { $places += (Join-Path $root $file) }
    }
    $pattern = '^\s*(' + (($Names | ForEach-Object { [regex]::Escape($_) }) -join '|') + ')\s*=\s*\S'
    foreach ($place in $places) {
        if ((Test-Path $place) -and (Select-String -Path $place -Pattern $pattern -Quiet)) {
            if ($place.StartsWith($Module.Dir)) { return $place.Substring($parent.Length + 1) }
            return "$(Split-Path -Leaf $place) beside the repos"
        }
    }
    return $null
}
