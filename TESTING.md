# Testing & Debugging Guide — generator-jhipster-cassandra

How to test and debug this blueprint at every layer: the generator's own unit tests, and the
**generated application's** backend (unit + Cassandra-Testcontainer integration tests) and
frontend (ESLint + Vitest). Written from the real debugging sessions that took the generated
Cassandra app from ~250 backend-IT failures and ~334 frontend-lint errors to **green**.

> **Companion doc:** `generator-jhipster-ai-postgresql/TESTING.md` (the SQL/pgvector blueprint).
> Same workflow; that one has no composite keys and a simpler client.

---

## 0. The one rule that governs everything: **fix templates, not generated code**

The generated sample app is **disposable**. Every regeneration overwrites it. So:

- ✅ Find the bug by running the **generated app's** tests.
- ✅ Fix the **`.ejs` template** (or `generator.js`) that produced the bad code.
- ✅ Regenerate, re-run, repeat.
- ❌ Never "fix" the generated `*.ts`/`*.java` — `eslint --fix` / hand-edits there evaporate on
  the next regen. (We _do_ run `eslint --fix` on the generated app — but only as a **diagnostic**
  to discover what the fix should be, then port it to the template. See §6.4.)

Templates live under:

| Generated path                                   | Template source                                                                                          |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `src/main/java/**` (entities)                    | `generators/cassandra-spring-boot/templates/**` and `.../generators/data-cassandra/templates/**`         |
| `src/test/java/**ResourceIT.java`                | `generators/cassandra-spring-boot/templates/src/test/java/.../web/rest/_entityClass_ResourceIT.java.ejs` |
| `src/main/webapp/app/entities/**` (Angular)      | `generators/cassandra-angular/entity-templates/**`                                                       |
| `src/main/webapp/app/components/**`, `shared/**` | `generators/cassandra-angular/templates/**` (mostly literal — see §6.5)                                  |
| which files get written                          | `generators/cassandra-angular/generator.js` (the `writeFiles({ templates: [...] })` blocks)              |

---

## 1. Environment (do this once)

This repo is usually built behind a TLS-intercepting corporate proxy, so the toolchains must
trust the OS store. Prefix commands accordingly (Node 22+ required):

```bash
export NODE_OPTIONS=--use-system-ca                              # npm / ng / eslint / vitest
export MAVEN_OPTS="-Djavax.net.ssl.trustStoreType=Windows-ROOT"  # Windows; macOS: KeychainStore
```

Integration tests need a **running Docker daemon** (Testcontainers starts a real Cassandra 5).

---

## 2. Generate a throwaway sample app (the thing you actually test)

```bash
mkdir -p /tmp/cass-sample && cd /tmp/cass-sample
NODE_OPTIONS=--use-system-ca node "$REPO/cli/cli.cjs" \
  generate-sample sample --skip-jhipster-dependencies --skip-install --force
```

`$REPO` = this repo's path. The bundled sample (`.blueprint/generate-sample/templates/samples/sample.jdl`)
exercises the full surface: single-key (`Product`) **and** composite-key entities (`Post`,
`SaathratriEntity2/3/4`, `AddOnsAvailable/SelectedByOrganization`), `TIMEUUID`, `dayjs`-backed
`Long` date columns, `Set` and `Map` columns. It is `clientFramework angularX`, `dto * with
mapstruct`, `service * with serviceImpl`.

**The tight loop** (memorize this):

```bash
# from /tmp/cass-sample, after editing a template:
git checkout -- . && git clean -fdq src     # discard the old generated output
node "$REPO/cli/cli.cjs" generate-sample sample --skip-jhipster-dependencies --skip-install --force
# ...then run whichever test layer you're debugging (below) and grep the output.
```

---

## 3. Layer 1 — the generator's own unit tests

Run **in the repo** (`$REPO`), not the sample:

```bash
NODE_OPTIONS=--use-system-ca npm test     # = prettier-check + eslint + vitest
```

Expected: `All matched files use Prettier code style!`, `0 problems`, **12 test files / 12 tests passed**.

- These are Vitest **snapshot** specs (`generators/*/generator.spec.js` + `__snapshots__/`). They run
  each sub-generator and assert its `getStateSnapshot()`.
- If you add/remove a generated file, the snapshot changes → update with `npx vitest run -u`, then
  **inspect the diff** (`git diff generators/*/__snapshots__/`) to confirm it's only your intended change.
- Prettier checks `.js/.md/.json/.yml` (NOT `.ejs`). If `npm test` fails on prettier, run
  `npx prettier --write <file>` on the offending `generator.js` (templates are exempt).

---

## 4. Layer 2 — generated **backend** (Java) tests

From the sample dir:

```bash
# Compile only (no DB/Docker) — fast sanity check; this is what samples.yml runs at minimum
./mvnw -ntp -DskipTests -Dskip.npm package

# Full unit + integration tests (needs Docker; starts a Cassandra Testcontainer)
./mvnw -ntp -Dskip.npm verify
```

Run a **single** integration test class while iterating (much faster; one container spin-up):

```bash
MAVEN_OPTS="-Djavax.net.ssl.trustStoreType=Windows-ROOT" \
  ./mvnw -ntp -Dskip.npm -Dsurefire.skip=true \
  -Dit.test=SaathratriEntity4ResourceIT,ProductResourceIT verify -DfailIfNoTests=false
```

> **Reading the output:** the Cassandra container dumps an _enormous_ config block to the log. **Never
> cat the whole log** — always grep:
>
> ```bash
> grep -iE "Tests run:.*Failures|<<< (FAILURE|ERROR)|expected:|but was:|BUILD (SUCCESS|FAILURE)" target/... /tmp/it.log
> ```
>
> Pick `SaathratriEntity4` (2-field composite) + `Product` (single-key) as representative; add
> `AddOnsAvailableByOrganization` (multi-partition + `Map`) and `Post` (3-key, `dayjs`) to catch shape-specific bugs.

### 4.1 Backend bug patterns we hit (and the template fix)

| Symptom in `*ResourceIT`                                     | Root cause                                                                                    | Fix (in templates)                                                                                                                                   |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET-one → **405/404**, PUT/PATCH/DELETE → **404**            | composite key sent as one path var / `org/key` URL-encoded to `%2F`                           | GET-one calls `/get?<key>=…` (query params); PUT/PATCH/DELETE use multi-segment `/{f1}/{f2}` with one MockMvc URI var per key field                  |
| `checkXIsRequired` expects 400, gets **201**                 | DTO had no bean-validation annotations                                                        | emit `@NotNull/@Size/@DecimalMin…` on DTO fields (mirror the domain entity) — `_dtoClass_.java.ejs`                                                  |
| `createXWithExistingId` expects 400, gets **201**            | Cassandra upserts client-supplied PKs (no SQL "duplicate id")                                 | make it a valid create test: assert **201 + incremented count**                                                                                      |
| `putExisting` → **400 (idnotfound)** even though saved       | the test's update loop reset the **PK** (`.id(UPDATED_ID)`), so `existsById(newId)` was false | exclude the PK field from the update loop                                                                                                            |
| get-one JSON assertions fail                                 | used array-style `$.[*].field` + `hasItem` on a single object                                 | singular `$.field` + `.value(...)`                                                                                                                   |
| `deleteX` INSERT fails: "Invalid null value for `<datecol>`" | test did `new XId()` then set only non-generated keys → null partition key                    | override key fields on the **existing** `compositeId` from `createEntity()`, don't replace it                                                        |
| `Map`/`Set` value assertions: `expected:<1> but was:<1>`     | jsonPath number/BigDecimal type mismatch                                                      | assert **presence** (`$.field` exists) in get/get-all — exact contents are already checked by the Java-`equals` `assertPersistedX…` in create/update |

Key idea: **the live `cassandrablog`/`cassandrastore` depend on the Resource's public API, so we fixed
the _tests_ to match the Resource — not vice-versa.**

---

## 5. Layer 3 — generated **frontend** (Angular) tests

One-time per sample (slow, downloads deps; needs the proxy CA):

```bash
NODE_OPTIONS=--use-system-ca npm install
```

Then:

```bash
NODE_OPTIONS=--use-system-ca npm test          # = pretest (eslint) THEN ng test (Vitest)
```

Two important facts about this command:

1. **`npm test` runs `pretest` = `eslint .` first.** If lint fails, **Vitest never runs**. So a green
   suite needs lint to pass too.
2. **The lint gate fails only on _errors_, not warnings.** `lint` is `eslint .` with no
   `--max-warnings`, so warnings (e.g. unused-disable directives) don't block `npm test`. Confirm with
   `npx eslint <file-with-only-warnings>; echo $?` → `0`.

Useful sub-commands while debugging:

```bash
NODE_OPTIONS=--use-system-ca npx ng test --coverage   # Vitest only (bypasses the lint pretest)
NODE_OPTIONS=--use-system-ca npx eslint .             # lint only
NODE_OPTIONS=--use-system-ca npx eslint . --fix       # see §6.4
```

Expected when green: `eslint` → 0 problems; Vitest → **82 files / 407 tests passed**.

### 5.1 Frontend compile/test/lint bug patterns we hit

The cassandra client model **nests composite keys under `compositeId`** (`{ compositeId: {...}, … }`);
single-key entities are flat. Base-JHipster-generated specs assume flat keys + different conventions, so
they had to be overridden. Categories, in the order they surface:

**Compile (TS) errors** — found via `npx ng test` (look for `✘ [ERROR] TSxxxx`):

- `entity-navbar-items.ts` missing (`TS2307`) → the blueprint replaces base entity-client writing; emit
  the aggregate file (`sql-angular`/`cassandra-angular` `generator.js`).
- `test-samples.ts` flat vs nested model → composite-aware `test-samples` override (nested `compositeId`;
  `dayjs` for date-Long; `Set`/`Map` values).
- service/update/detail/list/route/delete-dialog **spec** mismatches: wrong class names
  (`XComponent` vs `X`), `find(id)` vs `find(...keys)`, `delete(id)` vs `delete(entity)`, body-returning vs
  `Observable<HttpResponse>` (use `resp.body`), `isSaving` signal vs boolean → composite-aware spec overrides
  written for all entities (branch on `primaryKeySaathratri.composite`).

**Runtime test failures** — Vitest runs but tests fail:

- `Cannot read properties of undefined (reading 'routeConfig')` → ActivatedRoute mock needs
  `snapshot.routeConfig` (component derives `isNew` from it).
- `object is not extensible` → don't pass the `Object.freeze`d `sampleWithRequiredData` to a component that
  mutates it; pass `{ ...sampleWithRequiredData }`.
- list spec "query not called" → Cassandra list pages via **`querySlice`**, not `query`.
- `No provider for MatDialogRef` → edit-dialog specs must provide `MatDialogRef` + `MAT_DIALOG_DATA`.
- route-resolve "no elements in sequence" assertion → this resolver has **no `catchError`**; it only
  navigates to 404 on an **empty body**, so test that, not a thrown error.

**Lint (Angular-21 modernization)** — the bulk of effort B:

- `prefer-inject`: constructor DI → `inject()` field initializers. Watch **member-ordering**: public
  fields must precede private inject fields, and a field initializer can't use an injected dep declared
  after it — so declare `form!: FormGroup;` (public) first and build it in a parameterless `constructor()`.
- `prefer-control-flow`: `*ngIf`/`*ngFor` → `@if`/`@for` (wrap element in the block + closing `}`; `@for`
  needs a `track`).
- `no-unnecessary-condition`: redundant `X !== undefined` where the type is `X | null`.
- `no-unnecessary-type-assertion`/`-conversion`: stray `x!` after a guard, `String(x)` on a string.
- `prefer-nullish-coalescing`: `||` → `??`.

### 5.2 Generated E2E (Cypress)

Generated apps ship the upstream JHipster Cypress suite (account / admin / per-entity specs) under
`src/test/javascript/cypress/`. This blueprint does **not** fork those templates —
`generators/cypress/generator.js` only **post-processes** the generated entity specs in
`POST_WRITING_ENTITIES` (via `editFile`), fixing the one place upstream assumes a single-segment primary
key:

- **Composite-key DELETE cleanup URL.** Composite keys nest under `compositeId` and the REST endpoint takes
  one path segment per key field. Upstream's `afterEach` cleanup deletes via `/${entity.<oneField>}` → it
  hits `/.../undefined`. The patch rewrites it (and any required-related composite entity's cleanup) to
  `/${entity.compositeId.k1}/${entity.compositeId.k2}/…`, matching the Angular service. Single-key
  (non-composite) entities are left untouched.
- **DELETE intercept glob.** Widened from `'…/<apiUrl>/*'` to one `*` per key field (`'…/<apiUrl>/*/*/*/*'`)
  so `cy.wait('@deleteEntityRequest')` matches the multi-segment URL.

The patch keys off `entity.primaryKeySaathratri` (set by
`cassandra-spring-boot-utils.setSaathratriPrimaryKeyAttributesOnEntityAndFields`); the no-op
`template-file-cypress` stub the scaffold used to emit was removed.

**Run the generated Cypress tests** from a generated app dir (e.g. `cassandragateway` / `cassandrablog`).
Cypress drives a **running** app, so the datastore + Keycloak must be up first (e.g. `docker compose` the
app's `src/main/docker` services):

```bash
NODE_OPTIONS=--use-system-ca npm install        # once
npm run e2e:devserver   # self-contained: starts backend + frontend, waits, runs cypress
npm run e2e             # cypress run (headed) against an already-running app
npm run cypress         # interactive runner (cypress open)
```

> **Microfrontend note:** each app (gateway + every `microfrontend` remote) generates its **own** entity
> specs but points `baseUrl` at the **gateway** port, so they execute against the assembled shell. Bring
> the whole federated stack (gateway + all remotes) up before running a remote's specs.

**Verify after a regen:** in a composite-key spec (e.g. `saathratri-entity-2.cy.ts`) the `afterEach` URL
lists every `compositeId.<field>` and the DELETE intercept has one `*` per key field; a single-key entity
(e.g. `set-entity-by-organization.cy.ts`) stays flat and unchanged.

---

## 6. Cross-cutting debugging techniques

### 6.1 Categorize before you fix

Always reduce the noise to "which rule/error × how many × which files":

```bash
# backend: which IT methods + expected/actual
grep -iE "<<< (FAILURE|ERROR)|expected:|but was:" /tmp/it.log
# frontend lint: count by rule
NODE_OPTIONS=--use-system-ca npx eslint . 2>&1 | grep -oE "@?[a-z-]+/[a-z-]+$" | sort | uniq -c | sort -rn
```

Then fix the **highest-count rule** first — one template spot usually fixes it across all entities.

### 6.2 Strip ANSI from Vitest/eslint logs before grepping

```bash
sed -E 's/\x1b\[[0-9;]*m//g' /tmp/vitest.log > /tmp/vitest.clean.log
```

### 6.3 Map a generated error back to its template

The error reports a **generated** line (e.g. `list/post.ts:191`). Open the generated file to see the real
code, grep the offending snippet in the **template** (`grep -n "predicate && order" .../list/_entityFile_.ts.ejs`),
fix there. Errors repeat per-entity → ~N generated errors usually map to **1** template line.

### 6.4 Use `eslint --fix` as a discovery tool (not a fix)

On the generated app, `eslint . --fix` auto-removes unused-disable directives and applies mechanical fixes.
It's a git repo, so `git diff` then shows you _exactly_ which lines to change — port those to the templates,
then `git reset --hard` the sample. This is how we cleared the 17 stale `eslint-disable` comments precisely
(removing a _used_ one would re-introduce an error).

### 6.5 Literal vs EJS templates

`components/**` and `shared/**` are near-**literal** TS/HTML (little/no `<%= %>`), so you can read the
generated file to understand them 1:1. `entities/**` are **EJS** with composite/single branches — edit the
`.ejs` and mind the `primaryKeySaathratri.composite` conditionals.

### 6.6 Windows/Git-Bash gotchas

- `node` resolves `/tmp/x` as `C:\tmp\x`; pipe files via stdin (`node script.cjs < /tmp/x.log`) or use full
  Windows paths.
- `awk`/`sed`/`tr` choke on backslash paths; prefer a small Node script (`*.cjs`) for parsing logs.
- After editing `generator.js`, run `npx prettier --write` on it before `npm test` (prettier-check gate).

---

## 7. Quick reference

```bash
# ----- in the generator repo ($REPO) -----
NODE_OPTIONS=--use-system-ca npm test                      # generator unit tests (vitest)
NODE_OPTIONS=--use-system-ca npx vitest run -u             # update snapshots after intended changes

# ----- generate the sample (loop after each template edit) -----
cd /tmp/cass-sample && git checkout -- . && git clean -fdq src
NODE_OPTIONS=--use-system-ca node "$REPO/cli/cli.cjs" generate-sample sample --skip-jhipster-dependencies --skip-install --force

# ----- generated backend (from /tmp/cass-sample) -----
MAVEN_OPTS="-Djavax.net.ssl.trustStoreType=Windows-ROOT" ./mvnw -ntp -DskipTests -Dskip.npm package   # compile
MAVEN_OPTS="-Djavax.net.ssl.trustStoreType=Windows-ROOT" ./mvnw -ntp -Dskip.npm verify                # +Testcontainers ITs
#   one class: add -Dsurefire.skip=true -Dit.test=FooResourceIT -DfailIfNoTests=false

# ----- generated frontend (from /tmp/cass-sample) -----
NODE_OPTIONS=--use-system-ca npm install                   # once
NODE_OPTIONS=--use-system-ca npm test                      # eslint pretest + vitest (the real gate)
NODE_OPTIONS=--use-system-ca npx ng test --coverage        # vitest only
NODE_OPTIONS=--use-system-ca npx eslint . --fix            # discovery for lint fixes (then port to templates)

# ----- generated E2E (Cypress; from a generated app — needs the full stack running) -----
NODE_OPTIONS=--use-system-ca npm run e2e:devserver         # starts backend + frontend, waits, runs cypress
NODE_OPTIONS=--use-system-ca npm run e2e                   # cypress run against an already-running app
```

CI mirrors this: `.github/workflows/generator.yml` runs Layer 1; `.github/workflows/samples.yml`
generates a sample and runs `./mvnw -Dskip.npm verify` (Layer 2) on a Docker-enabled runner.
