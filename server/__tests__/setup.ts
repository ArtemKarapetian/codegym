import { mkdtempSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Vitest loads this file before any test file is parsed, so we get a chance
// to point DB_PATH at an isolated tempdir BEFORE server/db/client.ts reads
// the env var (ESM static imports are hoisted, so setting env vars inside a
// test file is too late).
const dir = mkdtempSync(join(tmpdir(), 'codegym-test-'));
process.env.DB_PATH = join(dir, 'test.db');
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
