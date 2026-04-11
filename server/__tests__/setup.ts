import { rmSync } from 'fs';
import { join } from 'path';

// Vitest loads this file before any test module is parsed, which is the only
// point where we can set DB_PATH and JWT_SECRET before server/db/client.ts
// opens its SQLite connection. Setting these from the test file itself is too
// late — ESM hoists static imports above any top-level code.
const testDbPath = join(process.cwd(), 'data', 'test.db');
rmSync(testDbPath, { force: true });
rmSync(testDbPath + '-wal', { force: true });
rmSync(testDbPath + '-shm', { force: true });

process.env.DB_PATH = testDbPath;
process.env.JWT_SECRET = 'test-secret';
