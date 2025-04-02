import BaseApplicationGenerator from 'generator-jhipster/generators/base-application';
import { javaMainPackageTemplatesBlock, javaTestPackageTemplatesBlock } from 'generator-jhipster/generators/java/support';
import { buildJavaGetter, buildJavaSetter, buildJavaGet, getPrimaryKeyValue } from 'generator-jhipster/generators/server/support';
import command from './command.js';
import { javaSaathratriUtils } from './cassandra-java-domain-utils.js';
import { cassandraSpringBootUtils } from '../cassandra-spring-boot/cassandra-spring-boot-utils.js';

export default class extends BaseApplicationGenerator {
  constructor(args, opts, features) {
    super(args, opts, { ...features, sbsBlueprint: true });
  }

  get [BaseApplicationGenerator.INITIALIZING]() {
    return this.asInitializingTaskGroup({
      async initializingTemplateTask() {
        this.parseJHipsterArguments(command.arguments);
        this.parseJHipsterOptions(command.options);
      },
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
      async preparingEachEntityTemplateTask() {},
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
      async writingEntitiesTemplateTask({ application, entities }) {
        
        for (const entity of entities.filter(e => !e.builtIn)) { 

          await this.writeFiles({
            sections: {
              files: [
                {
                  condition: generator => generator.databaseTypeCassandra && !entity.skipServer && entity.primaryKeySaathratri.composite,
                  ...javaMainPackageTemplatesBlock('_entityPackage_/'),
                  templates: [
                    'domain/_persistClass_Id.java',
                  ]
                },
                {
                  condition: generator => generator.databaseTypeCassandra && !entity.skipServer,
                  ...javaMainPackageTemplatesBlock('_entityPackage_/'),
                  templates: [
                    'domain/_persistClass_.java.jhi',
                  ]
                },
                {
                  condition: generator => generator.databaseTypeCassandra && !entity.skipServer,
                  ...javaTestPackageTemplatesBlock('_entityPackage_/'),
                  templates: [
                    'domain/_persistClass_Asserts.java',
                    'domain/_persistClass_Test.java',
                    'domain/_persistClass_TestSamples.java',
                  ]
                }
              ],
            },
            context: { ...application, ...entity, ...cassandraSpringBootUtils, ...javaSaathratriUtils, buildJavaGetter, buildJavaSetter, buildJavaGet, getPrimaryKeyValue },
          });
        }
      },
    });
  }

  get [BaseApplicationGenerator.POST_WRITING]() {
    return this.asPostWritingTaskGroup({
      async postWritingTemplateTask() {},
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
