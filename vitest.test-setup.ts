import { fileURLToPath } from 'node:url';
import { defineDefaults } from 'generator-jhipster/testing';

defineDefaults({
  blueprint: 'generator-jhipster-cassandra',
  blueprintPackagePath: fileURLToPath(new URL('./', import.meta.url)),
});
