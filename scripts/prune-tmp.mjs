#!/usr/bin/env node
// Compatibility: only explicitly owned scratch is eligible; default is dry-run.
import { cleanMain } from './local-resource-clean.mjs';
cleanMain(['--category', 'scratch', ...process.argv.slice(2)]);
