/*
 * Copyright (c) 2025-2026 Saathratri, LLC.
 * SPDX-License-Identifier: MIT
 * Licensed under the MIT License; see LICENSE in the repository root.
 */

import { beforeAll, describe, expect, it } from 'vitest';

import { defaultHelpers as helpers, result } from 'generator-jhipster/testing';

// A microfrontend's bundle leaves every shared module as a bare import that the gateway resolves through its import map.
// Two kinds of bare import had no entry there, so every entity page of a Cassandra microfrontend stopped on the gateway's
// error page:
// - "Unable to resolve specifier 'app/config/navigation.constants'": the entity templates imported deep paths under
//   app/config, while only the app/config barrel is a shared mapping (JHipster's own templates import the barrel).
// - "Unable to resolve specifier '@angular/forms/signals'": Angular Material, used by the blueprint's map editors,
//   imports it, but the unused-dependency scan does not see a secondary entry point imported from inside a library.

// Every field of this blueprint carries its four @customAnnotation values (key type, Cassandra type, date format, order).
const TEXT = ['', 'CassandraType.Name.TEXT', '', ''];
const entity = (name, changelogDate, pagination) => ({
  name,
  changelogDate,
  dto: 'mapstruct',
  service: 'serviceImpl',
  pagination,
  fields: [
    {
      fieldName: 'id',
      fieldType: 'UUID',
      options: { id: true, customAnnotation: ['PrimaryKeyType.PARTITIONED', 'CassandraType.Name.UUID', '', ''] },
    },
    { fieldName: 'label', fieldType: 'String', options: { customAnnotation: TEXT } },
    { fieldName: 'arrivalDate', fieldType: 'LocalDate', options: { customAnnotation: ['', 'CassandraType.Name.DATE', '', ''] } },
    { fieldName: 'createdAt', fieldType: 'Instant', options: { customAnnotation: ['', 'CassandraType.Name.TIMESTAMP', '', ''] } },
  ],
  relationships: [],
});

const APP = 'src/main/webapp/app';
const DEEP_APP_CONFIG = /from 'app\/config\/[^']+'/;

describe('a Cassandra microfrontend imports only modules the gateway can resolve', () => {
  beforeAll(async () => {
    await helpers
      .runJHipster('jhipster:angular')
      .withJHipsterConfig(
        {
          applicationType: 'microservice',
          microfrontend: true,
          clientFramework: 'angular',
          databaseType: 'cassandra',
          prodDatabaseType: 'cassandra',
          devDatabaseType: 'cassandra',
        },
        [entity('Stay', '20200101000100', 'no'), entity('Visit', '20200101000200', 'pagination')],
      )
      .withOptions({ ignoreNeedlesError: true })
      .withJHipsterGenerators()
      .withConfiguredBlueprint()
      .withBlueprintConfig();
  });

  const entityFiles = () =>
    Object.entries(result.getSnapshot())
      .filter(([file]) => file.replaceAll('\\', '/').includes(`${APP}/entities/`) && file.endsWith('.ts'))
      .map(([file, { contents }]) => [file.replaceAll('\\', '/'), String(contents)]);

  it('writes the entity files this test reads', () => {
    expect(entityFiles().length).toBeGreaterThan(20);
  });

  it('no entity file imports a deep path under app/config - only the shared app/config barrel', () => {
    const deep = entityFiles().filter(([, contents]) => DEEP_APP_CONFIG.test(contents));
    expect(deep.map(([file]) => file)).toEqual([]);
  });

  it('the list, service, update form, delete dialog and routes take their constants from the app/config barrel', () => {
    for (const name of ['stay', 'visit']) {
      for (const file of [
        `list/${name}.ts`,
        `service/${name}.service.ts`,
        `update/${name}-update.ts`,
        `update/${name}-form.service.ts`,
        `delete/${name}-delete-dialog.ts`,
        `${name}.routes.ts`,
      ]) {
        result.assertFileContent(`${APP}/entities/${name}/${file}`, "from 'app/config';");
      }
    }
  });

  it('a list imports app/config once', () => {
    for (const name of ['stay', 'visit']) {
      result.assertNoFileContent(`${APP}/entities/${name}/list/${name}.ts`, /from 'app\/config';[\s\S]*from 'app\/config';/);
    }
  });

  it('its map editors use Angular Material, which imports @angular/forms/signals', () => {
    result.assertFileContent(`${APP}/components/map-dayjs-component/map-dayjs-component.component.ts`, "from '@angular/material/");
  });

  it('its federation config shares every @angular/forms entry point, so the gateway can resolve @angular/forms/signals', () => {
    result.assertFileContent(
      'federation.config.ts',
      "'@angular/forms': { singleton: true, strictVersion: true, requiredVersion: 'auto', includeSecondaries: { keepAll: true } }",
    );
  });

  it('@angular/forms is overridden once', () => {
    result.assertNoFileContent('federation.config.ts', /'@angular\/forms': \{[\s\S]*'@angular\/forms': \{/);
  });
});
