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
        [pscustomobject]@{
            Id     = $dep.module
            Label  = $dep.name
            Folder = $folder
            Bat    = $(if ($bat) { $bat.Name } else { 'start_<module>.bat' })
            Port   = ([Uri] $dep.base_url).Port
        }
    }
}
