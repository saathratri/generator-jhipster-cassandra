/*
 * Copyright (c) 2025-2026 Saathratri, LLC.
 * SPDX-License-Identifier: MIT
 * Licensed under the MIT License; see LICENSE in the repository root.
 */

import { fileURLToPath } from 'node:url';
import { defineDefaults } from 'generator-jhipster/testing';

defineDefaults({
  blueprint: 'generator-jhipster-cassandra',
  blueprintPackagePath: fileURLToPath(new URL('./', import.meta.url)),
});
