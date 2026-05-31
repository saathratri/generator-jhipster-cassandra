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

### 4.2 Composite-key search-endpoint coverage

The blueprint emits a ladder of composite-key search endpoints per entity (built by
`generatePrimaryKeyMethods` in `cassandra-spring-data-cassandra-utils.js`): partial-key
`findAllBy<prefix>` + cursor-paged `…Pageable`, clustering-column comparison operators
(`…LessThan/LessThanEqual/GreaterThan/GreaterThanEqual` for Long/TimeUUID, plain + `…Pageable`),
the full-key `findBy<…>`, `findLatestBy<…>` (TimeUUID keys), and `/slice`. These are exercised by a
single generated `getAll<Entity>sByCompositeKeySearches` IT method, emitted by
`generateCompositeKeySearchResourceITTests(...)` in that same utils file and wired into
`_entityClass_ResourceIT.java.ejs` (gated on `primaryKeySaathratri.composite`). It persists one row,
hits every endpoint, and asserts **HTTP 200** — which verifies the derived CQL + parameter binding
runs against the real Cassandra Testcontainer (body shape is already covered by `get`/`getAll`). The
generator mirrors `generatePrimaryKeyMethods`' own iteration so the test set stays in lockstep with
the endpoints as the key shape changes.

> **The partition-key rule (and why partial-partition methods carry `@AllowFiltering`).** Cassandra
> rejects any query that restricts only **part of the partition key** — `Cannot execute this query as
it might involve data filtering … use ALLOW FILTERING` → **500**. But the generated list search-form
> drives _progressive prefix search_ (it calls `findAllByCompositeIdOrganizationIdPageable`,
> `…AndEntityTypePageable`, … as the user fills fewer/more fields), so those partial-partition methods
> are a real feature, not dead code. The fix: `generatePrimaryKeyMethods` computes
> `partitionCount = ids.filter(id => !id.isClusteredKeySaathratri).length` and annotates **only** the
> partial-partition `findAllBy` repository methods (param prefix shorter than `partitionCount`, both
> the `List` and `Slice` overloads) with `@org.springframework.data.cassandra.repository.AllowFiltering`
> (FQN, so no template import). Full-partition / clustering / `findBy` queries are valid without it and
> stay unannotated. ⚠️ ALLOW FILTERING scans across partitions — fine for admin/search UIs and small
> tables, a performance footgun on large ones. With this in place, the IT asserts **200 for every
> endpoint**, partial-partition included.

**⚠️ Production guidance — `ALLOW FILTERING` is a scale footgun, not a free feature.** The annotation
makes the partial-partition search _work_, but the query it enables is a **cross-partition scan**:
the coordinator contacts (potentially) every node, reads, and filters in memory. Cost grows with the
**whole table**, not the result set — the opposite of how Cassandra is supposed to be queried. It is
acceptable for:

- low-cardinality / bounded tables (lookup/config data),
- admin or back-office search screens with low QPS and an operator who tolerates latency,
- dev/test and demos.

It is **not** acceptable as a hot read path on a table that grows unbounded (messages, events,
reservations, …): expect rising p99s, tombstone/timeout errors, and coordinator pressure under load.

**The Cassandra-idiomatic fix when one of these searches becomes a real access pattern:** don't filter
— **model for it**. Add a purpose-built denormalized table whose _partition key is what you actually
query by_ (e.g. `..._by_organization` keyed on `organization_id`), written alongside the primary table,
and point that progressive-search branch at the new table's full-partition query instead of the
`@AllowFiltering` one. A secondary index (or SAI) is a lighter middle ground for low-cardinality, but a
denormalized query table is the durable answer. Treat the generated `@AllowFiltering` endpoints as a
**working default + a TODO marker**, not a finished design, for any table expected to grow.

The matching **frontend** coverage lives in `_entityFile_.service.spec.ts.ejs`: a
`composite-key search methods` describe block tests every generated `findAllBy…Pageable` /
comparison / `findBy…` service method issues the expected GET (mocked `HttpTestingController`).

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
- `member-ordering` on `navbar.ts` (gateway with microfrontends): we inject a
  `sortNavbarItemsAlphabetically` helper into the navbar via `cassandra-angular/generator.js`'s `editFile`.
  Insert it **AFTER** `loadMicrofrontendsEntities` (anchor on the class's trailing `\n}` and prepend the
  helper there), not before — otherwise a private method sits between two public ones and ESLint fails the
  `pretest` gate. TypeScript method lookup is `this`-relative so order doesn't matter at runtime; the lint
  rule is the only thing that cares. The same fix lives in `sql-angular/generator.js` of the ai-postgresql
  blueprint.
- `prefer-control-flow`: `*ngIf`/`*ngFor` → `@if`/`@for` (wrap element in the block + closing `}`; `@for`
  needs a `track`).
- `no-unnecessary-condition`: redundant `X !== undefined` where the type is `X | null`.
- `no-unnecessary-type-assertion`/`-conversion`: stray `x!` after a guard, `String(x)` on a string.
- `prefer-nullish-coalescing`: `||` → `??`.

### 5.2 Generated E2E (Cypress)

Generated apps ship the upstream JHipster Cypress suite (account / admin / per-entity specs) under
`src/test/javascript/cypress/`. This blueprint does **not** fork those templates —
`generators/cypress/generator.js` only **post-processes** the generated entity specs in
`POST_WRITING_ENTITIES` (via `editFile`). Passes are labelled (a) – (d); each addresses a real
failure mode observed against the example apps.

| Pass   | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| (a)    | Inject `compositeId: {…}` into the sample body so composite-key POSTs return 201 instead of 500 (`getCompositeId() is null`).                                                                                                                                                                                                                                                                                                                                      |
| (b)    | Inject the single `id` UUID field into single-key sample bodies (avoids 400 `error.idinvalid`).                                                                                                                                                                                                                                                                                                                                                                    |
| (c)    | Inject `cy.get(\`[data-cy="<id>"]\`).type(…)`into`should create an instance of X`for UUID`@Id` fields so the Save button isn't disabled.                                                                                                                                                                                                                                                                                                                           |
| (c.5)  | **Strip** upstream `cy.get(\`[data-cy="<mapOrSetField>"]\`)…` form-fills for MAP/SET columns — they target a non-existent input. MAP/SET aren't required, so removing them leaves the form valid.                                                                                                                                                                                                                                                                  |
| (c.6)  | **Replace** upstream form-fill for UTC_DATETIME with a click on the entity-update's "Generate" button (`cy.get(\`app-date-time[fieldName="X"]\`).parent().contains('button','Generate').click()`). For composite-key UTC_DATETIME (e.g. `Post.addedDateTime`) this is required for form validity.                                                                                                                                                                  |
| (c.7)  | Emit `should accept input on the <field> date-time widget sub-inputs` smoke test — covers the data-cy hooks on `<app-date-time>` (`-date`, `-hours`, `-minutes`, `-ampm`). Complements (c.6): if (c.6) fails, the Generate button regressed; if this fails, the data-cy hooks regressed.                                                                                                                                                                           |
| (c.8)  | Per-widget smoke tests for SET<TEXT> / MAP<TEXT, \*> / MAP<TEXT, BOOLEAN> / MAP<TEXT, BIGINT> Add-row hooks (`<field>-add-{key,value,toggle,button}`).                                                                                                                                                                                                                                                                                                             |
| (c.9)  | **Round-trip test** — copy the scalar form fills from `should create an instance of X`, drive every MAP/SET widget via its Add-row hooks, click Save, then `expect(response.body.<field>).to.…` for each widget. Covers the full Angular → DTO → backend → DTO → JSON pipeline. **MAP<DAYJS> is included** via the nested `<app-date-time>` sub-inputs (the Add row binds `[fieldName]="fieldName + '-add-datetime'"` so date/hours/minutes/ampm are addressable). |
| (c.10) | **Per-widget Edit-dialog test** — add a row, click its `<field>-row-<key\|i>-edit` hook, assert `mat-dialog-container` is visible, modify the dialog's `dialog-edit-value` (or `dialog-edit-toggle`), click `dialog-save-button`, assert the dialog dismissed. MAP<DAYJS> dialog is skipped (no scalar value input).                                                                                                                                               |
| (c.11) | **Per-widget Delete-row test** — add a row, click `<field>-row-<key\|i>-delete`, assert the row's edit hook no longer exists. Index-based for SET / MAP<BOOLEAN>, key-based for MAP<TEXT> / MAP<DECIMAL> / MAP<DAYJS>.                                                                                                                                                                                                                                             |
| (d)    | **Composite-key DELETE cleanup URL.** Composite keys nest under `compositeId` and the REST endpoint takes one path segment per key field. Upstream's `afterEach` cleanup deletes via `/${entity.<oneField>}` → it hits `/.../undefined`. The patch rewrites it to `/${entity.compositeId.k1}/${entity.compositeId.k2}/…`. Single-key (non-composite) entities are left untouched.                                                                                  |
| (d)    | **DELETE intercept glob.** Widened from `'…/<apiUrl>/*'` to one `*` per key field, and the `entitiesRequest` / `entitiesRequestInternal` intercepts are converted from a minimatch glob to a regex literal (`/^\/services\/<svc>\/api\/<entity>\b/`) so the pagination overhaul's `/slice` segment doesn't break the wildcard.                                                                                                                                     |

The composite-key patches key off `entity.primaryKeySaathratri` (set by
`cassandra-spring-boot-utils.setSaathratriPrimaryKeyAttributesOnEntityAndFields`); the no-op
`template-file-cypress` stub the scaffold used to emit was removed.

#### Lint-clean codegen

ESLint runs as part of `npm test` in generated apps; the cypress generator emits code that satisfies:

- `@typescript-eslint/no-inferrable-types`: the widget templates declare `@Input() fieldName = '';`
  (the `: string` annotation is redundant and was dropped).
- `cypress/unsafe-to-chain-command`: the generator splits `.clear().type(X)` and `.type(X).blur()`
  into two statements (a `cy.get(…).clear()` and a `cy.get(…).type(X)`).

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

## 5.3 Vector / AI-search test coverage (Saathratri)

The blueprint generates a vector stack on Cassandra (`vector<float, N>` columns + SAI indexes, a
`CqlVector<Float>` field, `EmbeddingService`, `findSimilarBy*` ANN repository queries, an `aiSearch`
service method, and a `GET /api/<entities>/ai-search` endpoint). That code is now exercised by generated
tests, so the bundled `sample.jdl` gives `Product` a vector field (`@customAnnotation("VECTOR")
@customAnnotation("1536") titleEmbedding Blob`).

| Layer             | What's covered                                                                                                                                                                                                                                                                                                                             | Where (template)                                                                                                               |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Backend unit      | `EmbeddingService`: generate / null-blank guard / disabled-model (NPE swallowed) / model-throws. `EmbeddingModel.embed()` is **mocked** so it runs with no `OPENAI_API_KEY`.                                                                                                                                                               | `cassandra-spring-boot/.../service/embedding/EmbeddingServiceTest.java.ejs` (written in the `hasVectorFieldsSaathratri` block) |
| Backend IT        | `/ai-search` end-to-end: stores a row whose vector equals the (mocked) query embedding and asserts the **ANN** query returns it (runs against the real Cassandra 5 Testcontainer); blank query → empty. Gated on `!reactive && !serviceNo` (the endpoint needs the service layer). Vector fields are already excluded from `fieldsToTest`. | `cassandra-spring-boot/.../web/rest/_entityClass_ResourceIT.java.ejs`                                                          |
| Frontend (Vitest) | Composite-key entities render a partition/clustering-key search form: `toggleSearchForm` flips the collapsed state, `performSearch` is a no-op while the form is invalid, `clearSearch` reloads. Gated on `primaryKeySaathratri.composite`.                                                                                                | `cassandra-angular/entity-templates/.../list/_entityFile_.spec.ts.ejs`                                                         |
| E2E (Cypress)     | `should toggle the Cassandra search form` — opens the form via `[data-cy="searchFormToggle"]` and asserts `[data-cy="searchButton"]` surfaces. Emitted only when the app enables Cypress (`testFrameworks cypress`); the bundled sample keeps it off, so this is verified against gateway runs, not the sample.                            | `cypress/generator.js` `POST_WRITING_ENTITIES` (composite-gated)                                                               |

Fast inner loop for the backend additions:
`./mvnw -ntp -Dskip.npm -Dtest=EmbeddingServiceTest -Dit.test=ProductResourceIT verify -DfailIfNoTests=false`.

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

## 7. Blueprint-applied workarounds for upstream issues

Some bugs originate in **upstream `generator-jhipster`** templates that this blueprint doesn't
fork (we don't want to copy entire files just to change two lines). For those, the blueprint
patches the generated file in `POST_WRITING` via `editFile(...)`, parallel to how `pom.xml`
mods are layered on for vector-field apps. Each patch is keyed to a stable string so it's
idempotent (re-running on already-patched content is a no-op).

Current list:

### 7.1 `CassandraTestContainersSpringContextCustomizerFactory` — Driver 3 vector-type crash

**Symptom (in a generated app's `mvnw verify`):**

```
ERROR ... com.datastax.driver.core.SchemaParser : Error parsing schema for table
cassandratestkeyspace.tag: Cluster.getMetadata().getKeyspace("cassandratestkeyspace")
.getTable("tag") will be missing or incomplete
java.lang.IllegalArgumentException: Could not parse type name vector<float, 1536>
```

Tests still pass (Driver 4.x is the actual runtime driver), but the warning is noisy and
will silently _mask_ metadata problems for any future vector-dependent IT.

**Root cause:** upstream JHipster's customizer factory pulls the local DC and cluster name via
the legacy `CassandraContainer.getCluster().getMetadata()...` chain. `getCluster()` returns a
Driver 3.x `Cluster`, which on first connect tries to parse the **full schema** of every
keyspace. Driver 3.x predates the CQL `vector` type and trips on any `vector<float, N>` column
(e.g. the `tag` table when the blueprint's vector-embedding support is in use).

**Fix:** `generators/cassandra-spring-boot/generator.js` POST_WRITING task replaces the two
`getCluster().getMetadata()` chains with Testcontainers' direct accessors:

```js
// in POST_WRITING, gated on application.databaseTypeCassandra
editFile(
  `src/test/java/${application.packageFolder}/config/CassandraTestContainersSpringContextCustomizerFactory.java`,
  (content) =>
    content
      .replace(
        /cassandraBean\.getCassandraContainer\(\)\.getCluster\(\)[\s\S]*?\.getDatacenter\(\)/g,
        "cassandraBean.getCassandraContainer().getLocalDatacenter()",
      )
      .replace(
        /cassandraBean\.getCassandraContainer\(\)\.getCluster\(\)[\s\S]*?\.getClusterName\(\)/g,
        '"Test Cluster"',
      ),
);
```

Driver 3.x stays on the test classpath (Testcontainers transitively depends on it) but is
no longer invoked, so no schema parse happens.

**If upstream JHipster ever fixes this:** the regex will silently no-op (no harm), and you can
delete the editFile block on the next blueprint cleanup pass.

---

## 8. Quick reference

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
