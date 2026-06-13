# Flowable Forms — Landing Page Template

A clone-and-go template for building one-off landing pages that embed a
[Flowable Forms](https://documentation.flowable.com/latest/develop/fe/forms/start-intro)
form. Built with **Vite + React + TypeScript + Tailwind CSS**.

The form definition is **fetched at runtime from a Flowable backend** and
rendered with the `@flowable/forms` React component.

---

## Quick start

```bash
# 1. Use Node 20 (this template requires Node 18+; Vite 5 needs it)
nvm install 20 && nvm use      # respects .nvmrc

# 2. Authenticate to the Flowable registry (see below) — one-time per machine

# 3. Install deps (requires network access to repo.flowable.com / VPN)
npm install

# 4. Configure the backend
cp .env.example .env           # then edit .env

# 5. Run
npm run dev                    # http://localhost:5173
```

> **Heads up:** `npm install` will fail without (a) Node 18+ and (b) network
> access to `repo.flowable.com`. Connect to the Flowable VPN first.

---

## Registry authentication

`@flowable/*` packages come from Flowable's JFrog Artifactory at
**`repo.flowable.com`** (migrated from the old `artifacts.flowable.com`),
specifically the **`flowable-npm-all`** repo. Public packages (react, vite,
tailwind, …) come from the default npmjs registry — `flowable-npm-all` does not
proxy public npm. This repo's `.npmrc` only maps the `@flowable` scope — **it
contains no credentials**. Put your token in your user-level `~/.npmrc`:

```
@flowable:registry=https://repo.flowable.com/artifactory/api/npm/flowable-npm-all/
//repo.flowable.com/artifactory/api/npm/flowable-npm-all/:_authToken=YOUR_TOKEN
//repo.flowable.com/artifactory/api/npm/flowable-npm-all/:always-auth=true
registry=https://registry.npmjs.org/
```

Generate the token from the JFrog UI: log in at <https://repo.flowable.com>, open
**Set Me Up → npm** for the `flowable-npm-all` repo, and copy the generated
`_authToken` (an identity/reference token) into `~/.npmrc`.

> Credentials from the old `artifacts.flowable.com` host do **not** work against
> `repo.flowable.com` — you must generate new ones.

---

## Two flows (use cases)

The form *renderer* is use-case agnostic; only how a form is **sourced** and what
happens on **submit** differ. Each flow is a page that wires those two seams into
the shared `<FlowableForm>`:

| Route | Page | Form source | On submit | Status |
| ----- | ---- | ----------- | --------- | ------ |
| `/` | `StartInstancePage` | form by key (`fetchFormByKey`) | start a BPMN process / CMMN case (`startInstance`) | **primary, verified** |
| `/task?taskId=…` | `TaskFormPage` | form by task (`fetchTaskForm`, platform-api) | complete the task (`completeTask`, platform-api) | **verified** |

To add a new flow, write a loader + a submit function in `src/lib/submissions/`
and a page that passes them to `<FlowableForm loadDefinition={…} onSubmit={…} />`.

## Configuration (`.env`)

| Variable                       | Purpose                                                           |
| ------------------------------ | ----------------------------------------------------------------- |
| `VITE_FLOWABLE_API_URL`        | Base URL of the Flowable backend (e.g. `http://localhost:8090`).  |
| `VITE_USE_DEV_PROXY`           | `true` to route calls through the Vite dev proxy (avoids CORS).   |
| `VITE_FLOWABLE_API_TOKEN`      | Optional bearer token for the API.                                |
| `VITE_FLOWABLE_FORM_KEY`       | Key of the form to render (start flow).                           |
| `VITE_FLOWABLE_FORM_PATH`      | REST path template to look up form definitions (`{key}`).         |
| `VITE_FLOWABLE_FORM_MODEL_PATH`| REST path template for a definition's model (`{id}`).             |
| `VITE_FLOWABLE_START_KIND`     | `process` (BPMN) or `case` (CMMN) — what submit starts.           |
| `VITE_FLOWABLE_DEFINITION_KEY` | Definition key of the process/case to start.                      |
| `VITE_FLOWABLE_START_PATH`     | Optional start-endpoint override (else derived from start kind).  |
| `VITE_FLOWABLE_TASK_FORM_PATH` | Task flow: path to a task's form model (`{taskId}`).              |
| `VITE_FLOWABLE_TASK_VALUES_PATH` | Task flow: path to a task's existing values to pre-fill (`{taskId}`). |
| `VITE_FLOWABLE_TASK_COMPLETE_PATH` | Task flow: path to complete a task (`{taskId}`).              |

### Local vs. other environments

`.env` is environment-specific and git-ignored. For local dev the backend is
typically `http://localhost:8090` with `VITE_USE_DEV_PROXY=true`. For other
environments (staging/prod), point `VITE_FLOWABLE_API_URL` at that host, set
`VITE_USE_DEV_PROXY=false`, and ensure CORS is allowed on the backend (or build
behind a reverse proxy).

---

## Customising the page & styling

Everything a clone usually needs to change lives in a few places — no need to
dig through components:

| Want to change… | Edit |
| --------------- | ---- |
| Brand colors | `tailwind.config.js` → `theme.extend.colors.brand` (`DEFAULT` / `dark` / `light`). Used by Hero, the submit button, etc. |
| Fonts / global base styles | `src/index.css` |
| Page title / meta / favicon | `index.html` |
| Hero + section copy | `src/pages/StartInstancePage.tsx` (uses `<Hero>` / `<Section>`) |
| Add/reorder content blocks | Add more `<Section>` blocks in the page; `<Section>` and `<Hero>` are in `src/components/` |
| Which form / what submit starts | `.env` (dev) or container env (prod) — `FLOWABLE_FORM_KEY`, `FLOWABLE_DEFINITION_KEY`, `FLOWABLE_START_KIND` |
| Submit button text | `submitLabel` prop on `<FlowableForm>` in the page |

The form's own look (fields, spacing) comes from Flowable's stylesheets injected
in `FlowableForm.tsx`; wrap `<FlowableForm>` in your own container to control its
surroundings (the page already wraps it in a bordered card).

## Building a new landing page

1. Clone this repo into a new folder.
2. Update `index.html` and the `brand` colors in `tailwind.config.js`.
3. Edit `src/pages/StartInstancePage.tsx` — change the hero/section copy.
4. Set `.env` for the target backend, form key, and definition key to start.
5. `npm run build` → static output in `dist/`, or build the Docker image (below).

If a clone only needs the start flow, you can drop the router in `src/App.tsx`
and render `<StartInstancePage />` directly.

---

## Docker

A multi-stage build produces a tiny nginx image. Config is injected **at
container start** (not baked in), so one image runs against any environment.

### Build

The build pulls `@flowable/forms` from the private registry, so pass your
`~/.npmrc` as a BuildKit secret (it is never written into the image):

```bash
DOCKER_BUILDKIT=1 docker build \
  --secret id=npmrc,src=$HOME/.npmrc \
  -t flowable-landing .
```

### Run

```bash
docker run --rm -p 8080:80 \
  -e USE_DEV_PROXY=true \
  -e FLOWABLE_BACKEND_URL=http://host.docker.internal:8090 \
  -e FLOWABLE_FORM_KEY=newRequestForm \
  -e FLOWABLE_START_KIND=case \
  -e FLOWABLE_DEFINITION_KEY=requestCase \
  flowable-landing
# open http://localhost:8080
```

Or use `docker compose build && docker compose up` (see `docker-compose.yml`).

### How runtime config works

- `public/config.js` defines `window.__APP_CONFIG__` with `${...}` placeholders.
- On start, the entrypoint runs `envsubst` to replace them from the container's
  env vars, writing `/usr/share/nginx/html/config.js`.
- `src/config/env.ts` reads `window.__APP_CONFIG__` first, falling back to
  `.env` (`VITE_*`) for local dev.

### Backend connectivity (CORS)

- **`USE_DEV_PROXY=true`** (recommended): the browser calls same-origin
  `/flowable-api/*` and nginx reverse-proxies to `FLOWABLE_BACKEND_URL`. No CORS.
- **`USE_DEV_PROXY=false`**: the browser calls `FLOWABLE_API_URL` directly — the
  Flowable backend must send CORS headers for the page's origin.

> The API token is exposed to the browser (it always has been — `VITE_*` values
> ship to the client). Use a token scoped appropriately for public exposure, or
> front the backend with an auth proxy.

### Recognised env vars

`USE_DEV_PROXY`, `FLOWABLE_BACKEND_URL`, `FLOWABLE_API_URL`, `FLOWABLE_API_TOKEN`,
`FLOWABLE_FORM_KEY`, `FLOWABLE_START_KIND`, `FLOWABLE_DEFINITION_KEY`,
`FLOWABLE_START_PATH`, `FLOWABLE_FORM_PATH`, `FLOWABLE_FORM_MODEL_PATH`,
`FLOWABLE_TASK_FORM_PATH`, `FLOWABLE_TASK_VALUES_PATH`,
`FLOWABLE_TASK_COMPLETE_PATH` (same names as `.env`, minus the `VITE_` prefix).

---

## Project structure

```
src/
  main.tsx                       # React entry (no StrictMode — see notes)
  App.tsx                        # router: "/" + "/task"
  index.css                      # Tailwind directives + base styles
  config/env.ts                  # typed access to VITE_* env vars
  lib/
    flowableClient.ts            # shared HTTP/auth + fetchFormByKey + helpers
    submissions/
      startInstance.ts           # PRIMARY: start a process/case from values
      completeTask.ts            # example: fetch task form + complete task
  components/
    FlowableForm.tsx             # generic renderer (loadDefinition + onSubmit)
    Hero.tsx, Section.tsx        # reusable landing-page blocks
  pages/
    StartInstancePage.tsx        # "/"      — render form by key, start instance
    TaskFormPage.tsx             # "/task"  — render task form, complete task
```

---

## Things to adapt for your deployment

Verified against `@flowable/forms@2025.2.6` on Node 20 (`npm install` +
`npm run build` both pass). What you still need to wire up:

- **Form API path + response shape.** Set `VITE_FLOWABLE_FORM_PATH` /
  `VITE_FLOWABLE_FORM_MODEL_PATH` and, if your JSON differs, adjust `findConfig()`
  in `src/lib/flowableClient.ts`.
- **Start endpoint + body.** Set `VITE_FLOWABLE_START_KIND` and
  `VITE_FLOWABLE_DEFINITION_KEY`. The defaults target the standard
  process/cmmn runtime APIs; confirm the path/body in
  `src/lib/submissions/startInstance.ts` against your deployment, and tweak
  `toVariables()` if your engine needs explicit variable types.
- **APIs used.** Task fetch/complete use **platform-api**
  (`/platform-api/tasks/{taskId}/form` and `…/complete`). Start-instance uses
  `process-api`/`cmmn-api` by **key** (platform-api start requires a definition
  *id*, an extra lookup — not worth it here). Start-form fetch uses `form-api`
  (platform-api has no form-by-key endpoint).
- **Task complete.** Verified end-to-end (`…/complete` `POST` with
  `{ variables, outcome }`). The values fetch returns some Flowable-internal keys
  alongside the form fields, which are echoed back on complete; harmless, but you
  can filter them in `src/lib/submissions/completeTask.ts` if you prefer to send
  only the form's own fields.

### Notes (already handled, but good to know)

- **Submit button vs. outcomes.** Flowable form *outcomes* are optional. A form
  with outcomes renders its own buttons (they fire `onSubmit`); a form without
  outcomes renders none. `<FlowableForm>` therefore shows a built-in submit
  button **only as a fallback when the form has no outcomes**. Override with the
  `showSubmitButton` prop (and `submitLabel` / `submitOutcome`).
- **No React.StrictMode.** `src/main.tsx` deliberately does not wrap the app in
  `StrictMode`. StrictMode double-mounts components in dev, which breaks the
  class-based internals of `@flowable/forms` — change subscriptions get torn
  down so conditional-visibility expressions (e.g. `{{root.reqType == "Data"}}`)
  stop re-evaluating, and it logs "setState on a component that is not yet
  mounted". Leave StrictMode off while this library is class-based.

- **React 19.** `@flowable/forms@2025.2.6` requires React `^19`; this template
  pins it. If you bump the forms version, re-check `npm view @flowable/forms
  peerDependencies` and keep `react`/`react-dom` aligned.
- **Flowable CSS.** The lib ships `external.min.css` + `flwforms.min.css`
  (Tailwind-v4 output using native `@layer`). They are imported with Vite's
  `?raw` suffix and injected as a `<style>` tag in `FlowableForm.tsx` to bypass
  this project's Tailwind-v3 PostCSS pipeline. If a future version renames them,
  update those imports (`node_modules/@flowable/forms/*.css`).
- **Types.** `@flowable/forms` ships no TypeScript types; an ambient
  `declare module` lives in `src/vite-env.d.ts`. Remove it if official types
  ship in a future version.
- **Bundle size.** The forms lib bundles draft-js, moment, fontawesome, etc., so
  the production JS is large (~13 MB / ~4 MB gzip). Acceptable for an internal
  landing page; if it matters, lazy-load `<FlowableForm>` with `React.lazy` so it
  is split out of the initial chunk.
