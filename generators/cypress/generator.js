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

        // Bump the dropdown-item find timeout in clickOnEntityMenuItem.
        // The per-microfrontend dropdowns are populated async via module federation —
        // `loadMicrofrontendsEntities()` fires after login as an effect, fetches the
        // remoteEntry.js, and only THEN does `cassandrablogEntityNavbarItems()` populate
        // and `*ngFor` render the .dropdown-item links. In a real browser there's enough
        // human-time elapsed for that to finish; in Cypress the click fires immediately
        // and the default 4-second `.find` retry isn't enough on cold load, so every
        // entity spec's first test fails with
        // "Expected to find element: `.dropdown-item[href=\"/.../...\"]`, but never found it."
        // Extend the timeout to 30s.
        const navbarPath = `${cypressDir}support/navbar.ts`;
        if (this.existsDestination(navbarPath)) {
          this.editFile(navbarPath, (content) => {
            if (content.includes("/* SAATHRATRI mf timeout */")) return content;
            return content.replace(
              "return cy.get(navbarSelector).find(entityItemSelector).find(`.dropdown-item[href=\"/${entityName}\"]`).click();",
              "return cy.get(navbarSelector).find(entityItemSelector).find(`.dropdown-item[href=\"/${entityName}\"]`, /* SAATHRATRI mf timeout */ { timeout: 30000 }).click();",
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
