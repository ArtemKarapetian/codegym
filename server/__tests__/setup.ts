import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

export function createTestEnv() {
  const dir = mkdtempSync(join(tmpdir(), 'codegym-test-'));
  const dbPath = join(dir, 'test.db');

  // Set env before any imports
  process.env.DB_PATH = dbPath;
  process.env.JWT_SECRET = 'test-secret';

  return {
    dbPath,
    cleanup: () => {
      try {
        rmSync(dir, { recursive: true });
      } catch {
        // ignore
      }
    },
  };
}
