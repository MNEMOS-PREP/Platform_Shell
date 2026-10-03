# Platform Shell

**One web app, on one origin, with every built module UI mounted.**
`PORTS.txt` has reserved `:5173` for this since the first day of the project —
*"the shell: every built module UI mounted ... a student never hops between ports."*

```
start.bat            every module beside this repo, then the HOME tab
start.bat shell      the HOME tab only (modules already running)
start.bat check      report what is on disk and listening, launch nothing
```

Then open the **last tab, titled HOME**, and click the one link on it:
**http://localhost:5173**

Seven modules contribute fourteen tabs between service panes and control panes, and
Windows Terminal truncates their titles to about four characters — the window
fills with `cont`, `m15`, `C:\W` and nothing says where the product is. So the
shell gets its own tab, opened last so it is rightmost, and that tab shows one
card with one link and nothing else. Vite's output goes to `.shell.log` instead
of underneath it.

Run `start.bat` again any time to get the card back: a second HOME tab detects
the running shell and watches it rather than starting a second one.

---

## What it is not

It is not a re-implementation, and it is not a portal of iframes. Each module
exports a route tree from its own `src/routes.tsx`, and that exact tree is
mounted here. The modules' own vite configs already stated the contract:

> *When the platform shell exists it mounts the same `src/routes.tsx` — the
> components are identical either way, so what you fix here is what students
> get.*

Modules are aliased as **source**, the way `@ai/core` already ships. A module
edited in its own repository is live here on the next save, with no build,
publish or reinstall in between.

---

## The three things that make one origin work

**1 · The `/v1` nouns are disjoint.** Verified against all seven running
`openapi.json` documents. `/v1/companies` can only be M15 and `/v1/rubrics` can
only be M13, so a proxy table routed by noun stands in for the `:8000` gateway
until it exists. The table lives in `vite.config.ts`; a new top-level noun goes
there or the shell 404s loudly rather than proxying to the wrong service.

**2 · One React.** Every module repository has its own `node_modules` with its
own copy. `resolve.dedupe` forces one instance — without it every hook throws
`Invalid hook call`, which reads like a bug in the module.

**3 · One token set.** Each module ships a `ui/theme.css` that redefines the
same core tokens with different values and redeclares `.panel`, `.provenance`
and `.skeleton`. Four of those in one document do not merge — the last one
loaded wins, globally. So the shell imports **none** of them and owns
`src/theme.css` instead: core's tokens, one neutral family for the shared
roles, and only the tokens a single module invented and genuinely needs
(M13's evidence marks, M15's rail). A module looks slightly different here than
it does standalone, and identical to its siblings.

---

## Two collisions, and how they are resolved

The module route trees are flat and absolute — authored before a shell existed
to nest under, and React Router will not mount an absolute child path beneath a
prefix. Every path is disjoint except two cases, so they mount flat and the two
are handled:

| Collision | Resolution |
|---|---|
| M01 and M02 both claim the index route | The shell owns `/`. Their entry screens mount by name at `/resume` and `/jd`; both modules export the components for exactly this, and their standalone builds still route through `m01Routes` / `m02Routes`. |
| All four claim `/deps` | Only M13's mounts. The shell's `/system` page reads all seven modules at once through `/sys/<mod>/v1/deps` — the view no single module can render. |

---

## Routes

| Path | Module | |
|---|---|---|
| `/` | shell | The journey: eight stages, four openable |
| `/resume`, `/resumes/:id` | M01 | |
| `/jd`, `/jds/:id` | M02 | |
| `/score`, `/turns/:id`, `/rubrics`, `/calibration`, `/disputes`, `/raters`, `/outbox` | M13 | mounted whole |
| `/companies`, `/companies/:id/*` | M15 | mounted whole |
| `/system` | shell | Every module's dependencies, live |
| `/m03`, `/m06`, `/m07` … | — | Named placeholders, not dead links |

M04 and M05 have no UI. They are real services and the shell reaches them, but
a stage with no screen says so rather than linking nowhere.

---

## Prerequisites

The five module repositories and `Platform_Core` must be checked out **beside**
this one, and the on-disk folder name must equal the repository name in
`module.json` — a mismatch is why a running module has been silently skipped
before.

```
projects/
  Platform_Shell/          <- this
  Platform_Core/
  Memory/                  M04
  Question_Intelligence/   M05
  Evaluation_Engine/       M13
  resume-ingestion/        M01
  jd-parser-coverage/      M02
  Company_Guider/          M15
```

`npm install` once, here. The modules keep their own dependencies.
