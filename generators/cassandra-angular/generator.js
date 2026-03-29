import BaseApplicationGenerator from 'generator-jhipster/generators/base-application';
import { generateEntityClientFields, generateEntityClientEnumImports, clientRootTemplatesBlock, clientApplicationTemplatesBlock, clientSrcTemplatesBlock, generateEntityClientImports } from 'generator-jhipster/generators/client/support';
import { cassandraSpringBootUtils } from '../cassandra-spring-boot/cassandra-spring-boot-utils.js';
import { angularSaathratriUtils } from './cassandra-angular-utils.js';

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
      async preparingEachEntityTemplateTask( { entity } ) {
        cassandraSpringBootUtils.setSaathratriPrimaryKeyAttributesOnEntityAndFields(entity);
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
      async writingTemplateTask({ application }) {
        // Override templates (package.json, navbar, app.config, global.scss, etc.)
        // are handled automatically by the SBS template path mechanism.
        // Only write NEW files that don't exist in the base angular generator.
        await this.writeFiles({
          sections: {
            files: [
              {
                ...clientApplicationTemplatesBlock(),
                templates: [
                  'shared/material.module.ts',
                  'shared/date/convert-from-date-long-to-dayjs.pipe.ts',
                  'shared/date/convert-from-dayjs-to-date-long.pipe.ts',
                  'shared/date/format-utc-date.pipe.ts',
                  'shared/date/saathratri-local-dayjs-and-utc-unix-utils.ts',
                  'shared/date/dayjs-date-adapter.ts',
                  'components/date-time/date-time.component.css',
                  'components/date-time/date-time.component.html',
                  'components/date-time/date-time.component.spec.ts',
                  'components/date-time/date-time.component.ts',
                  'components/set-string-component/set-string-component.component.css',
                  'components/set-string-component/set-string-component.component.html',
                  'components/set-string-component/set-string-component.component.spec.ts',
                  'components/set-string-component/set-string-component.component.ts',
                  'components/set-string-edit-dialog-component/set-string-edit-dialog-component.component.css',
                  'components/set-string-edit-dialog-component/set-string-edit-dialog-component.component.html',
                  'components/set-string-edit-dialog-component/set-string-edit-dialog-component.component.spec.ts',
                  'components/set-string-edit-dialog-component/set-string-edit-dialog-component.component.ts',
                  'components/map-boolean-component/map-boolean-component.component.css',
                  'components/map-boolean-component/map-boolean-component.component.html',
                  'components/map-boolean-component/map-boolean-component.component.spec.ts',
                  'components/map-boolean-component/map-boolean-component.component.ts',
                  'components/map-number-component/map-number-component.component.css',
                  'components/map-number-component/map-number-component.component.html',
                  'components/map-number-component/map-number-component.component.spec.ts',
                  'components/map-number-component/map-number-component.component.ts',
                  'components/map-dayjs-component/map-dayjs-component.component.css',
                  'components/map-dayjs-component/map-dayjs-component.component.html',
                  'components/map-dayjs-component/map-dayjs-component.component.spec.ts',
                  'components/map-dayjs-component/map-dayjs-component.component.ts',
                  'components/map-string-component/map-string-component.component.css',
                  'components/map-string-component/map-string-component.component.html',
                  'components/map-string-component/map-string-component.component.spec.ts',
                  'components/map-string-component/map-string-component.component.ts',
                  'components/map-string-edit-dialog-component/map-string-edit-dialog-component.component.css',
                  'components/map-string-edit-dialog-component/map-string-edit-dialog-component.component.html',
                  'components/map-string-edit-dialog-component/map-string-edit-dialog-component.component.spec.ts',
                  'components/map-string-edit-dialog-component/map-string-edit-dialog-component.component.ts',
                  'components/map-number-edit-dialog-component/map-number-edit-dialog-component.component.css',
                  'components/map-number-edit-dialog-component/map-number-edit-dialog-component.component.html',
                  'components/map-number-edit-dialog-component/map-number-edit-dialog-component.component.spec.ts',
                  'components/map-number-edit-dialog-component/map-number-edit-dialog-component.component.ts',
                  'components/map-dayjs-edit-dialog-component/map-dayjs-edit-dialog-component.component.css',
                  'components/map-dayjs-edit-dialog-component/map-dayjs-edit-dialog-component.component.html',
                  'components/map-dayjs-edit-dialog-component/map-dayjs-edit-dialog-component.component.spec.ts',
                  'components/map-dayjs-edit-dialog-component/map-dayjs-edit-dialog-component.component.ts',
                  'components/map-boolean-edit-dialog-component/map-boolean-edit-dialog-component.component.css',
                  'components/map-boolean-edit-dialog-component/map-boolean-edit-dialog-component.component.html',
                  'components/map-boolean-edit-dialog-component/map-boolean-edit-dialog-component.component.spec.ts',
                  'components/map-boolean-edit-dialog-component/map-boolean-edit-dialog-component.component.ts'
                ]
              },
            ],
          },
          context: application
        });
      },
    });
  }

  get [BaseApplicationGenerator.WRITING_ENTITIES]() {
    return this.asWritingEntitiesTaskGroup({
      async writingEntitiesTemplateTask({ application, entities }) {

        for (const entity of entities.filter(e => !e.builtIn)) {
          await this.writeFiles({
            rootTemplatesPath: this.templatePath('../entity-templates'),
            sections: {
              files: [
                {
                  condition: generator => !generator.embedded && generator.databaseTypeCassandra && !entity.skipClient,
                  ...clientApplicationTemplatesBlock(),
                  templates: [
                    //'entities/_entityFolder_/_entityFile_.routes.ts',
                    'entities/_entityFolder_/detail/_entityFile_-detail.html',
                    'entities/_entityFolder_/detail/_entityFile_-detail.ts',
                    //'entities/_entityFolder_/detail/_entityFile_-detail.component.spec.ts',
                    'entities/_entityFolder_/list/_entityFile_.html',
                    'entities/_entityFolder_/list/_entityFile_.ts',
                    //'entities/_entityFolder_/list/_entityFile_.component.spec.ts',
                    'entities/_entityFolder_/route/_entityFile_-routing-resolve.service.ts',
                    //'entities/_entityFolder_/route/_entityFile_-routing-resolve.service.spec.ts',
                    
                    // Entity Service Files:
                    'entities/_entityFolder_/service/_entityFile_.service.ts', 
                    //'entities/_entityFolder_/service/_entityFile_.service.spec.ts
                    
                    // Entity Model Files:
                    'entities/_entityFolder_/_entityFile_.model.ts', 
                    //'entities/_entityFolder_/_entityFile_.test-samples.ts'

                    // Entity Route File:
                    'entities/_entityFolder_/_entityFile_.routes.ts',
                  ]
                },
                {
                  condition: generator => !generator.readOnly && !generator.embedded && generator.databaseTypeCassandra && !entity.skipClient,
                  ...clientApplicationTemplatesBlock(),
                  templates: [
                    'entities/_entityFolder_/update/_entityFile_-form.service.ts',
                    //'entities/_entityFolder_/update/_entityFile_-form.service.spec.ts',
                    'entities/_entityFolder_/update/_entityFile_-update.html',
                    //'entities/_entityFolder_/update/_entityFile_-update.component.spec.ts',
                    'entities/_entityFolder_/delete/_entityFile_-delete-dialog.html',
                    'entities/_entityFolder_/update/_entityFile_-update.ts',
                    'entities/_entityFolder_/delete/_entityFile_-delete-dialog.ts',
                    //'entities/_entityFolder_/delete/_entityFile_-delete-dialog.component.spec.ts',
                  ]
                },
              ],
            },
            context: {
              ...application,
              ...entity,
              ...angularSaathratriUtils,
              generateEntityClientFields,
              generateEntityClientEnumImports,
              generateEntityClientImports,
              /* Saathratri change: provide JHipster 8 compatibility variables removed in JHipster 9 */
              entityClassHumanized: entity.entityClassHumanized || entity.entityClass,
              entityFormName: entity.entityFormName || entity.entityInstance,
              entityRestName: entity.entityRestName || entity.entityApiUrl,
              frontendAppName: entity.frontendAppName || application.frontendAppName || application.baseName,
              componentName: entity.componentName || `${entity.entityAngularName}Component`,
              enumPrefix: entity.enumPrefix || '',
            },
          });
        }
      },
    });
  }

  get [BaseApplicationGenerator.POST_WRITING]() {
    return this.asPostWritingTaskGroup({
      async postWritingTemplateTask({ application }) {
        // When this generator is renamed (e.g., cassandra-angular in the orchestrator),
        // SBS template override for package.json doesn't work because the name no longer
        // matches 'angular'. Patch package.json programmatically to add Material deps.
        const packageJsonPath = 'package.json';
        this.editFile(packageJsonPath, content => {
          if (!content.includes('@angular/material')) {
            const angularVersion = application.nodeDependencies?.['@angular/common'] || '21.0.0';
            content = content.replace(
              '"@angular/platform-browser"',
              `"@angular/material": "${angularVersion}",\n    "@angular/cdk": "${angularVersion}",\n    "@angular/platform-browser"`
            );
          }
          return content;
        });

        // Patch shared/date/index.ts to export Cassandra-specific pipes
        const srcMainWebapp = application.srcMainWebapp ?? 'src/main/webapp/';
        const dateIndexPath = `${srcMainWebapp}app/shared/date/index.ts`;
        this.editFile(dateIndexPath, content => {
          if (!content.includes('ConvertFromDayjsToDateLongPipe')) {
            content += "\nexport { ConvertFromDayjsToDateLongPipe } from './convert-from-dayjs-to-date-long.pipe';\n";
          }
          if (!content.includes('FormatUtcDatePipe')) {
            content += "export { default as FormatUtcDatePipe } from './format-utc-date.pipe';\n";
          }
          return content;
        });
      },
    });
  }

  get [BaseApplicationGenerator.POST_WRITING_ENTITIES]() {
    return this.asPostWritingEntitiesTaskGroup({
      async postWritingEntitiesTemplateTask() {},
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
