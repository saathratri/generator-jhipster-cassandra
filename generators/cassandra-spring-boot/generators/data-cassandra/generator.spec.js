import { beforeAll, describe, expect, it } from 'vitest';

import { defaultHelpers as helpers, result } from 'generator-jhipster/testing';

const SUB_GENERATOR = 'cassandra-spring-data-cassandra';
const BLUEPRINT_NAMESPACE = `jhipster:${SUB_GENERATOR}`;

describe('SubGenerator cassandra-spring-data-cassandra of cassandra JHipster blueprint', () => {
  describe('run', () => {
    beforeAll(async function () {
      await helpers
        .run(BLUEPRINT_NAMESPACE)
        .withJHipsterConfig()
        .withOptions({
          ignoreNeedlesError: true,
          blueprint: 'cassandra',
        })
        .withJHipsterLookup()
        .withParentBlueprintLookup();
    });

    it('should succeed', () => {
      expect(result.getStateSnapshot()).toMatchSnapshot();
    });
  });
});
