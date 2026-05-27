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
      async postWritingTemplateTask() {},
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
