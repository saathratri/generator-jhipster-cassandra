import BaseApplicationGenerator from "generator-jhipster/generators/base-application";

import { cassandraSpringBootUtils } from "../cassandra-spring-boot/cassandra-spring-boot-utils.js";

// Escape a string for safe literal use inside a RegExp.
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Build the composite-key URL suffix used by the REST endpoint / Angular service, e.g.
// `${blog.compositeId.entityTypeId}/${blog.compositeId.yearOfDateAdded}/...`.
// The Cypress test deletes from the raw POST response body (numeric dates already), so,
// unlike the Angular service, no dayjs/`copy` conversion is needed.
function buildCompositeKeyUrlSuffix(instanceVar, primaryKeySaathratri) {
  return primaryKeySaathratri.ids
    .map(
      (pk) => `\${${instanceVar}.${primaryKeySaathratri.name}.${pk.fieldName}}`,
    )
    .join("/");
}

// A static v4-like UUID used as the sample value for UUID/TIMEUUID-typed fields. Jackson
// requires a parseable UUID string for cassandra UUID columns — the test-samples
// template's `'sample-<fieldName>-1'` strings are fine for in-memory Angular models but
// fail the backend's `UUID.fromString()` with "Failed to read request" on the POST body.
// TIMEUUID fields are server-overwritten via `Uuids.timeBased()` so the value here is
// disposable; v4 vs v1 doesn't matter as long as it parses.
const SAMPLE_UUID = "00000000-0000-4000-8000-000000000001";

// Sample value for an entity field, used inside a TypeScript object literal — numbers stay
// numeric, UUIDs use a valid hex format, everything else is a `'sample-<fieldName>-1'`
// string. Mirrors the test-samples template's sampleValue() with the UUID exception
// needed for Cypress's real HTTP POSTs.
function sampleObjValue(field) {
  const t = field.fieldType;
  if (
    t === "Long" ||
    t === "Integer" ||
    t === "Double" ||
    t === "Float" ||
    t === "BigDecimal"
  ) {
    return "1001";
  }
  if (t === "Boolean") return "true";
  if (t === "UUID") return `'${SAMPLE_UUID}'`;
  return `'sample-${field.fieldName}-1'`;
}

// Sample value as a quoted string suitable for cy.type() (which only accepts strings).
function sampleTypeArg(field) {
  const t = field.fieldType;
  if (
    t === "Long" ||
    t === "Integer" ||
    t === "Double" ||
    t === "Float" ||
    t === "BigDecimal"
  ) {
    return "'1001'";
  }
  if (t === "Boolean") return "'true'";
  if (t === "UUID") return `'${SAMPLE_UUID}'`;
  return `'sample-${field.fieldName}-1'`;
}

export default class extends BaseApplicationGenerator {
  constructor(args, opts, features) {
    super(args, opts, { ...features, sbsBlueprint: true });
  }

  get [BaseApplicationGenerator.INITIALIZING]() {
    return this.asInitializingTaskGroup({
      async initializingTemplateTask() {},
    });
  }

  get [BaseApplicationGenerator.PROMPTING]() {
    return this.asPromptingTaskGroup({
      async promptingTemplateTask() {},
    });
  }

  get [BaseApplicationGenerator.CONFIGURING]() {
    return this.asConfiguringTaskGroup({
      async configuringTemplateTask() {},
    });
  }

  get [BaseApplicationGenerator.COMPOSING]() {
    return this.asComposingTaskGroup({
      async composingTemplateTask() {},
    });
  }

  get [BaseApplicationGenerator.LOADING]() {
    return this.asLoadingTaskGroup({
      async loadingTemplateTask() {},
    });
  }

  get [BaseApplicationGenerator.PREPARING]() {
    return this.asPreparingTaskGroup({
      async preparingTemplateTask() {},
    });
  }

  get [BaseApplicationGenerator.CONFIGURING_EACH_ENTITY]() {
    return this.asConfiguringEachEntityTaskGroup({
      async configuringEachEntityTemplateTask() {},
    });
  }

  get [BaseApplicationGenerator.LOADING_ENTITIES]() {
    return this.asLoadingEntitiesTaskGroup({
      async loadingEntitiesTemplateTask() {},
    });
  }

  get [BaseApplicationGenerator.PREPARING_EACH_ENTITY]() {
    return this.asPreparingEachEntityTaskGroup({
      async preparingEachEntityTemplateTask({ entity }) {
        // Ensure entity.primaryKeySaathratri (composite-key metadata) is populated even if
        // this generator's task runs before the cassandra-spring-boot/-angular ones.
        // Idempotent: the util no-ops when the attribute is already set.
        cassandraSpringBootUtils.setSaathratriPrimaryKeyAttributesOnEntityAndFields(
          entity,
        );
      },
    });
  }

  get [BaseApplicationGenerator.PREPARING_EACH_ENTITY_FIELD]() {
    return this.asPreparingEachEntityFieldTaskGroup({
      async preparingEachEntityFieldTemplateTask() {},
    });
  }

  get [BaseApplicationGenerator.PREPARING_EACH_ENTITY_RELATIONSHIP]() {
    return this.asPreparingEachEntityRelationshipTaskGroup({
      async preparingEachEntityRelationshipTemplateTask() {},
    });
  }

  get [BaseApplicationGenerator.POST_PREPARING_EACH_ENTITY]() {
    return this.asPostPreparingEachEntityTaskGroup({
      async postPreparingEachEntityTemplateTask() {},
    });
  }

  get [BaseApplicationGenerator.DEFAULT]() {
    return this.asDefaultTaskGroup({
      async defaultTemplateTask() {},
    });
  }

  get [BaseApplicationGenerator.WRITING]() {
    return this.asWritingTaskGroup({
      async writingTemplateTask() {},
    });
  }

  get [BaseApplicationGenerator.WRITING_ENTITIES]() {
    return this.asWritingEntitiesTaskGroup({
      async writingEntitiesTemplateTask() {},
    });
  }

  get [BaseApplicationGenerator.POST_WRITING]() {
    return this.asPostWritingTaskGroup({
      async postWritingTemplateTask({ application }) {
        // The cassandra-angular generator restructures the navbar from upstream JHipster's
        // single `[data-cy="entity"]` flat dropdown into per-microfrontend dropdowns
        // (e.g. `[data-cy="cassandrablogMenu"]`). The upstream Cypress
        // `support/commands.ts` still declares `entityItemSelector = '[data-cy="entity"]'`,
        // so `clickOnEntityMenuItem` (used by every entity spec's beforeEach) can't find
        // the dropdown and all entity tests fail with
        // "Expected to find element: `[data-cy=\"entity\"]`, but never found it."
        //
        // Patch this microservice's commands.ts to point entityItemSelector at its own
        // microfrontend dropdown. Each microservice's Cypress suite runs against the
        // gateway, so it needs to open *its own* named dropdown to see its entities.
        const cypressDir = application.cypressDir;
        if (!cypressDir) return;
        if (!application.applicationTypeMicroservice) return;

        const commandsPath = `${cypressDir}support/commands.ts`;
        if (!this.existsDestination(commandsPath)) return;

        this.editFile(commandsPath, (content) => {
          if (content.includes(`"${application.baseName}Menu"`)) return content;
          return content.replace(
            `export const entityItemSelector = '[data-cy="entity"]';`,
            `export const entityItemSelector = '[data-cy="${application.baseName}Menu"]';`,
          );
        });

        // Patch clickOnEntityMenuItem in support/navbar.ts. Two issues to fix:
        //
        // 1. Selector chain: upstream chains `.find(entityItemSelector).find('.dropdown-item[href=...]')`
        //    expecting the items to be CHILDREN of the data-cy="entity" element. The
        //    cassandra-angular blueprint's per-microfrontend navbar puts data-cy on the
        //    `<a ngbDropdownToggle>` element while the items live in a SIBLING
        //    `<ul ngbDropdownMenu>`. So `.find(entityItemSelector).find('.dropdown-item')`
        //    finds nothing — the items are outside the toggle's subtree. Drop the
        //    intermediate `.find(entityItemSelector)` and search from `navbarSelector`
        //    so the sibling `<ul>` is reachable.
        //
        // 2. Timeout: the per-microfrontend dropdowns populate async via module federation
        //    (loadMicrofrontendsEntities → loadNavbarItems → remoteEntry.js fetch → signal
        //    set → `*ngFor` render). Cypress's default 4s retry isn't enough on cold load.
        //    Extend to 30s.
        const navbarPath = `${cypressDir}support/navbar.ts`;
        if (this.existsDestination(navbarPath)) {
          this.editFile(navbarPath, (content) => {
            if (content.includes("/* SAATHRATRI mf nav */")) return content;
            return content.replace(
              /cy\s*\.get\(navbarSelector\)\s*\.find\(entityItemSelector\)\s*\.find\(`\.dropdown-item\[href="\/\$\{entityName\}"\]`(?:,\s*\/\*\s*SAATHRATRI mf timeout\s*\*\/\s*\{\s*timeout:\s*\d+\s*\})?\)\s*\.click\(\)/,
              'cy\n    .get(navbarSelector)\n    .find(`.dropdown-item[href="/${entityName}"]`, /* SAATHRATRI mf nav */ { timeout: 30000 })\n    .click()',
            );
          });
        }
      },
    });
  }

  get [BaseApplicationGenerator.POST_WRITING_ENTITIES]() {
    return this.asPostWritingEntitiesTaskGroup({
      async postWritingEntitiesTemplateTask({ application, entities }) {
        // Upstream's Cypress entity spec assumes a single primary-key path segment for the
        // DELETE cleanup and intercept. For Cassandra composite keys the REST endpoint and
        // the Angular service use one path segment per key field
        // (e.g. /{entityTypeId}/{yearOfDateAdded}/{arrivalDate}/{blogId}). Without this patch
        // the cleanup hits /.../undefined and the DELETE intercept glob never matches.
        const cypressDir = application.cypressDir;
        if (!cypressDir) return;

        // Map every composite-key entity's REST url -> its composite-key metadata, so we can
        // also fix DELETE cleanups for required *related* composite entities, not just self.
        const compositeByApiUrl = new Map();
        for (const entity of entities) {
          if (entity.primaryKeySaathratri?.composite) {
            compositeByApiUrl.set(
              entity.entityApiUrl,
              entity.primaryKeySaathratri,
            );
          }
        }
        if (compositeByApiUrl.size === 0) return;

        for (const entity of entities) {
          if (!entity.primaryKeySaathratri?.composite) continue;

          const specPath = `${cypressDir}e2e/entity/${entity.entityFileName}.cy.ts`;
          if (!this.existsDestination(specPath)) continue;

          this.editFile(specPath, (content) => {
            // 1. Fix every DELETE-cleanup template-literal URL (self + required relations):
            //    `.../<apiUrl>/${someVar.<singleKey>}` -> `.../<apiUrl>/${someVar.compositeId.k1}/...`
            for (const [apiUrl, primaryKeySaathratri] of compositeByApiUrl) {
              const cleanupRe = new RegExp(
                `(${escapeRegExp(apiUrl)}/)\\$\\{(\\w+)\\.[^\`]*?\\}\``,
                "g",
              );
              content = content.replace(
                cleanupRe,
                (match, prefix, instanceVar) =>
                  `${prefix}${buildCompositeKeyUrlSuffix(instanceVar, primaryKeySaathratri)}\``,
              );
            }

            // 2. Widen this entity's DELETE intercept glob so it matches the multi-segment
            //    URL: '/.../<apiUrl>/*' -> '/.../<apiUrl>/*/*/*/*' (one '*' per key field).
            const stars = entity.primaryKeySaathratri.ids
              .map(() => "*")
              .join("/");
            const interceptRe = new RegExp(
              `${escapeRegExp(entity.entityApiUrl)}/\\*'`,
              "g",
            );
            content = content.replace(
              interceptRe,
              `${entity.entityApiUrl}/${stars}'`,
            );

            return content;
          });
        }

        // ---------------------------------------------------------------------------
        // Additional patches for POST body + form-fill — separate iteration covers
        // BOTH composite-key entities and single-key cassandra entities (the upstream
        // template's generateTestEntity() and form-fill loop both skip JHipster id
        // fields that are auto-generated, leaving the POST body without compositeId/id
        // and the form without the required field, causing 500/400 errors and a
        // permanently-disabled Save button).
        // ---------------------------------------------------------------------------
        for (const entity of entities) {
          if (entity.builtIn || !entity.entityFileName) continue;

          const specPath = `${cypressDir}e2e/entity/${entity.entityFileName}.cy.ts`;
          if (!this.existsDestination(specPath)) continue;

          const idField = entity.fields?.find((f) => f.id);
          if (!idField) continue;

          this.editFile(specPath, (content) => {
            const sampleVar = `${entity.entityInstance}Sample`;

            // (a) Sample body: inject `compositeId: {...}` (composite) or the id field
            // (single-key). Idempotent — skip if already present.
            if (entity.primaryKeySaathratri?.composite) {
              if (!content.includes(`${sampleVar} = { compositeId:`)) {
                const compositeIdLit = entity.primaryKeySaathratri.ids
                  .map((f) => `${f.fieldName}: ${sampleObjValue(f)}`)
                  .join(", ");
                content = content.replace(
                  `const ${sampleVar} = {`,
                  `const ${sampleVar} = { compositeId: { ${compositeIdLit} },`,
                );
              }
            } else {
              const idPropRe = new RegExp(
                `${escapeRegExp(sampleVar)}\\s*=\\s*\\{\\s*${escapeRegExp(idField.fieldName)}\\b`,
              );
              if (!idPropRe.test(content)) {
                content = content.replace(
                  `const ${sampleVar} = {`,
                  `const ${sampleVar} = { ${idField.fieldName}: ${sampleObjValue(idField)},`,
                );
              }
            }

            // (b) Form fill in `should create an instance of <X>`: inject a `.type()` for
            // the @Id-marked field if it isn't already typed. Upstream's form-fill loop
            // excludes fields where `field.id && field.autoGenerate` — so UUID @Id fields
            // (Tag.id, SaathratriEntity2.entityTypeId) are missing but String/Long @Id
            // fields (Blog.category) are already there.
            const formFillStart = `it('should create an instance of ${entity.entityAngularName}', () => {`;
            const blockStart = content.indexOf(formFillStart);
            if (blockStart !== -1) {
              const saveClickIdx = content.indexOf(
                "cy.get(entityCreateSaveButtonSelector)",
                blockStart,
              );
              const block =
                saveClickIdx > -1 ? content.slice(blockStart, saveClickIdx) : "";
              const idSelectorMarker = `[data-cy="${idField.fieldName}"]`;

              if (!block.includes(idSelectorMarker)) {
                const injection =
                  `\n      cy.get(\`[data-cy="${idField.fieldName}"]\`).type(${sampleTypeArg(idField)});\n` +
                  `      cy.get(\`[data-cy="${idField.fieldName}"]\`).should('have.value', ${sampleTypeArg(idField)});\n`;
                content = content.replace(
                  formFillStart,
                  formFillStart + injection,
                );
              }
            }

            // (c) Bump `cy.wait('@entitiesRequest')` and `cy.wait('@entitiesRequestInternal')`
            // timeouts from the default 5s to 30s. The lazy-loaded cassandrablog/cassandrastore
            // microfrontend route only fires its GET after module federation registers the
            // remote — in Cypress's cold-load this can exceed 5s and the wait times out
            // "No request ever occurred." Works fine in a normal browser.
            content = content.replace(
              /cy\.wait\('@entitiesRequest'\)/g,
              "cy.wait('@entitiesRequest', { timeout: 30000 })",
            );
            content = content.replace(
              /cy\.wait\('@entitiesRequestInternal'\)/g,
              "cy.wait('@entitiesRequestInternal', { timeout: 30000 })",
            );

            // (c.5) Strip form-fill lines for MAP/SET fields. The cassandra blueprint
            // generates custom Angular widgets for MAP<TEXT, TEXT/DECIMAL/BOOLEAN/BIGINT>
            // and SET<TEXT> (key/value rows, toggles, date pickers) — these don't expose
            // a single `<input data-cy="<fieldName>">`, so the upstream template's
            // `cy.get('[data-cy="<map>"]').type(...)` times out with
            // "Expected to find element: `[data-cy=\"addOnDetailsText\"]`, but never found it."
            // MAP/SET columns aren't required in the JDL, so removing the fill lines
            // entirely leaves the form valid for submit. Detection: first element of
            // `customAnnotation` is `CassandraType.Name.MAP` or `CassandraType.Name.SET`.
            const mapSetFields = (entity.fields ?? []).filter((f) => {
              const ann = f.options?.customAnnotation?.[0];
              return (
                ann === "CassandraType.Name.MAP" ||
                ann === "CassandraType.Name.SET"
              );
            });
            for (const f of mapSetFields) {
              // Remove any whole line that does `cy.get(`[data-cy="<fieldName>"]`).<anything>;`
              // — covers .type/.should/.click/.invoke chains regardless of arguments.
              const lineRe = new RegExp(
                `^\\s*cy\\.get\\(\`\\[data-cy="${escapeRegExp(f.fieldName)}"\\]\`\\)[^;]+;\\s*\\n`,
                "gm",
              );
              content = content.replace(lineRe, "");
            }

            // (c.6) UTC_DATETIME fields use a custom `<app-date-time>` component with a
            // sibling "Generate" button (only rendered when @if (isNew)). The upstream
            // form-fill's `cy.get('[data-cy="<field>"]').type(...)` fails because the
            // datetime widget doesn't expose a single matching input. Strip those lines
            // and instead click the Generate button — for composite-key UTC_DATETIME
            // fields (e.g. Post.addedDateTime) this is REQUIRED so the form passes
            // validation; for optional UTC_DATETIME fields it's harmless. Detection:
            // `customAnnotation` array contains "UTC_DATETIME".
            const dateTimeFields = (entity.fields ?? []).filter(
              (f) =>
                Array.isArray(f.options?.customAnnotation) &&
                f.options.customAnnotation.includes("UTC_DATETIME"),
            );
            for (const f of dateTimeFields) {
              const lineRe = new RegExp(
                `^\\s*cy\\.get\\(\`\\[data-cy="${escapeRegExp(f.fieldName)}"\\]\`\\)[^;]+;\\s*\\n`,
                "gm",
              );
              content = content.replace(lineRe, "");
            }
            if (dateTimeFields.length > 0) {
              // Inject Generate-button clicks immediately before the Save button click
              // in the `should create an instance of X` test. The Generate button is a
              // sibling of <app-date-time fieldName="X">, so scope via parent().
              const formFillStart = `it('should create an instance of ${entity.entityAngularName}', () => {`;
              const blockStart = content.indexOf(formFillStart);
              if (blockStart !== -1) {
                const saveClickRe =
                  /^([ \t]+)cy\.get\(entityCreateSaveButtonSelector\)\.click\(\);/m;
                const block = content.slice(blockStart);
                const saveMatch = block.match(saveClickRe);
                if (saveMatch) {
                  const indent = saveMatch[1];
                  const generateLines = dateTimeFields
                    .map(
                      (f) =>
                        `${indent}cy.get(\`app-date-time[fieldName="${f.fieldName}"]\`).parent().contains('button', 'Generate').click();`,
                    )
                    .join("\n");
                  const saveClickIdx = blockStart + block.indexOf(saveMatch[0]);
                  content =
                    content.slice(0, saveClickIdx) +
                    generateLines +
                    "\n\n" +
                    content.slice(saveClickIdx);
                }
              }

              // (c.7) Emit a second `… date-time widget inputs work` smoke test that
              // verifies the data-cy hooks on the <app-date-time> sub-inputs are wired
              // and accept input. This complements the Generate-shortcut test in
              // (c.6): if the smoke test fails, the data-cy hooks regressed; if (c.6)
              // fails, the Generate button regressed. Together they cover both code
              // paths users actually hit. Smoke test doesn't Save — scalar field fills
              // would be duplicated noise; we only assert the widget itself behaves.
              const firstTestEnd = content.indexOf("\n    });\n", blockStart);
              if (firstTestEnd !== -1) {
                const widgetTests = dateTimeFields
                  .map((f) => {
                    const fn = f.fieldName;
                    return [
                      `    it('should accept input on the ${fn} date-time widget sub-inputs', () => {`,
                      `      cy.get(\`[data-cy="${fn}-hours"]\`).clear().type('10');`,
                      `      cy.get(\`[data-cy="${fn}-hours"]\`).should('have.value', '10');`,
                      ``,
                      `      cy.get(\`[data-cy="${fn}-minutes"]\`).clear().type('30');`,
                      `      cy.get(\`[data-cy="${fn}-minutes"]\`).should('have.value', '30');`,
                      ``,
                      `      cy.get(\`[data-cy="${fn}-ampm"]\`).click();`,
                      `      cy.get('mat-option').contains('AM').click();`,
                      `      cy.get(\`[data-cy="${fn}-ampm"]\`).should('contain', 'AM');`,
                      `    });`,
                    ].join("\n");
                  })
                  .join("\n\n");
                const insertAt = firstTestEnd + "\n    });".length;
                content =
                  content.slice(0, insertAt) +
                  "\n\n" +
                  widgetTests +
                  content.slice(insertAt);
              }
            }

            // (c.8) Emit per-widget smoke tests for SET<TEXT> and MAP<TEXT, *>
            // custom Angular widgets. The wrappers all expose data-cy hooks of the
            // form `<fieldName>-add-{key|value|toggle|button}`. Tests verify the
            // Add-row inputs accept input and the Add button responds — narrow
            // checks that catch data-cy regressions without trying to drive the
            // full add/edit/delete cycle.
            const widgetTestsForEntity = [];
            for (const f of mapSetFields) {
              const fn = f.fieldName;
              const ann = f.options?.customAnnotation || [];
              const mapInner = ann[1]; // CassandraType.Name.TEXT/DECIMAL/BOOLEAN/BIGINT
              const isSet = ann[0] === "CassandraType.Name.SET";
              const isMap = ann[0] === "CassandraType.Name.MAP";

              if (isSet) {
                widgetTestsForEntity.push(
                  [
                    `    it('should accept input on the ${fn} SET widget add row', () => {`,
                    `      cy.get(\`[data-cy="${fn}-add-value"]\`).type('sample-${fn}-1');`,
                    `      cy.get(\`[data-cy="${fn}-add-value"]\`).should('have.value', 'sample-${fn}-1');`,
                    `      cy.get(\`[data-cy="${fn}-add-button"]\`).should('not.be.disabled');`,
                    `    });`,
                  ].join("\n"),
                );
              } else if (isMap && mapInner === "CassandraType.Name.BOOLEAN") {
                widgetTestsForEntity.push(
                  [
                    `    it('should accept input on the ${fn} MAP<BOOLEAN> widget add row', () => {`,
                    `      cy.get(\`[data-cy="${fn}-add-key"]\`).type('sample-key');`,
                    `      cy.get(\`[data-cy="${fn}-add-key"]\`).should('have.value', 'sample-key');`,
                    `      cy.get(\`[data-cy="${fn}-add-toggle"]\`).click();`,
                    `      cy.get(\`[data-cy="${fn}-add-button"]\`).should('not.be.disabled');`,
                    `    });`,
                  ].join("\n"),
                );
              } else if (isMap && mapInner === "CassandraType.Name.BIGINT") {
                // MAP<TEXT, BIGINT> with UTC_DATETIME uses a nested <app-date-time>
                // for the value. We can verify the add-key + add-button hooks here;
                // the nested date-time has its own smoke test pattern (c.7) if used
                // elsewhere.
                widgetTestsForEntity.push(
                  [
                    `    it('should accept input on the ${fn} MAP<BIGINT/DATETIME> widget add row', () => {`,
                    `      cy.get(\`[data-cy="${fn}-add-key"]\`).type('sample-key');`,
                    `      cy.get(\`[data-cy="${fn}-add-key"]\`).should('have.value', 'sample-key');`,
                    `      cy.get(\`[data-cy="${fn}-add-button"]\`).should('exist');`,
                    `    });`,
                  ].join("\n"),
                );
              } else if (isMap) {
                // MAP<TEXT, TEXT> and MAP<TEXT, DECIMAL>
                const sampleValue =
                  mapInner === "CassandraType.Name.DECIMAL"
                    ? "1001"
                    : "sample-value";
                widgetTestsForEntity.push(
                  [
                    `    it('should accept input on the ${fn} MAP widget add row', () => {`,
                    `      cy.get(\`[data-cy="${fn}-add-key"]\`).type('sample-key');`,
                    `      cy.get(\`[data-cy="${fn}-add-key"]\`).should('have.value', 'sample-key');`,
                    `      cy.get(\`[data-cy="${fn}-add-value"]\`).type('${sampleValue}');`,
                    `      cy.get(\`[data-cy="${fn}-add-value"]\`).should('have.value', '${sampleValue}');`,
                    `      cy.get(\`[data-cy="${fn}-add-button"]\`).should('not.be.disabled');`,
                    `    });`,
                  ].join("\n"),
                );
              }
            }
            if (widgetTestsForEntity.length > 0) {
              const formFillStartForMap = `it('should create an instance of ${entity.entityAngularName}', () => {`;
              const blockStartForMap = content.indexOf(formFillStartForMap);
              const firstTestEndForMap = content.indexOf(
                "\n    });\n",
                blockStartForMap,
              );
              if (firstTestEndForMap !== -1) {
                const insertAt =
                  firstTestEndForMap + "\n    });".length;
                content =
                  content.slice(0, insertAt) +
                  "\n\n" +
                  widgetTestsForEntity.join("\n\n") +
                  content.slice(insertAt);
              }
            }

            // (d) Widen the `entitiesRequest` / `entitiesRequestInternal` intercept URL.
            // Upstream emits `'/services/<svc>/api/<entity>+(?*|)'` (matches the base path
            // optionally followed by `?...`). The cassandra pagination overhaul moved the
            // list GET to `/api/<entity>/slice?size=20` — the `/slice` path segment
            // breaks the upstream glob (and also `**` when attached to a non-`/` segment
            // like `<entity>**`, since minimatch's `**` only crosses path separators when
            // it's a standalone segment). Convert the string glob to a regex literal
            // anchored with `\b` (word boundary) so it matches `/<entity>`, `/<entity>?...`,
            // `/<entity>/slice`, and `/<entity>/slice?...` uniformly. Forward slashes are
            // escaped because they're the regex delimiter in the emitted source.
            content = content.replace(
              /'((?:\/services\/)?[^']*)(?:\+\(\?\*\|\)|\*\*)'/g,
              (_, urlPath) => {
                const escaped = urlPath.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
                return `/^${escaped}\\b/`;
              },
            );

            return content;
          });
        }
      },
    });
  }

  get [BaseApplicationGenerator.LOADING_TRANSLATIONS]() {
    return this.asLoadingTranslationsTaskGroup({
      async loadingTranslationsTemplateTask() {},
    });
  }

  get [BaseApplicationGenerator.INSTALL]() {
    return this.asInstallTaskGroup({
      async installTemplateTask() {},
    });
  }

  get [BaseApplicationGenerator.POST_INSTALL]() {
    return this.asPostInstallTaskGroup({
      async postInstallTemplateTask() {},
    });
  }

  get [BaseApplicationGenerator.END]() {
    return this.asEndTaskGroup({
      async endTemplateTask() {},
    });
  }
}
