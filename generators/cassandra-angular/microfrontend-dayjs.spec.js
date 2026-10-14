/*
 * Copyright (c) 2025-2026 Saathratri, LLC.
 * SPDX-License-Identifier: MIT
 * Licensed under the MIT License; see LICENSE in the repository root.
 */

import { beforeAll, describe, it } from 'vitest';

import { defaultHelpers as helpers, result } from 'generator-jhipster/testing';

const APP = 'src/main/webapp/app';

// The blueprint's date helpers (shared/date) import 'dayjs/esm/plugin/utc'. JHipster's federation config shares only the
// dayjs entry points its own app/config/dayjs uses, so a gateway loading this microfrontend found no import-map entry for
// the plugin and stopped on its error page: "Unable to resolve specifier 'dayjs/esm/plugin/utc'".
describe('a Cassandra microfrontend shares every dayjs entry point its shared code imports', () => {
  beforeAll(async () => {
    await helpers
      .runJHipster('jhipster:angular')
      .withJHipsterConfig({
        applicationType: 'microservice',
        microfrontend: true,
        clientFramework: 'angular',
        databaseType: 'cassandra',
        prodDatabaseType: 'cassandra',
        devDatabaseType: 'cassandra',
      })
      .withOptions({ ignoreNeedlesError: true })
      .withJHipsterGenerators()
      .withConfiguredBlueprint()
      .withBlueprintConfig();
  });

  it('its shared date helpers import dayjs/esm/plugin/utc', () => {
    result.assertFileContent(`${APP}/shared/date/saathratri-local-dayjs-and-utc-unix-utils.ts`, "from 'dayjs/esm/plugin/utc'");
  });

  it('its federation config shares dayjs/esm/plugin/utc, so the gateway can resolve it', () => {
    result.assertFileContent('federation.config.ts', "'dayjs/esm/plugin/utc'");
  });

  it('the plugin is shared once', () => {
    result.assertNoFileContent('federation.config.ts', /'dayjs\/esm\/plugin\/utc'[\s\S]*'dayjs\/esm\/plugin\/utc'/);
  });
});
