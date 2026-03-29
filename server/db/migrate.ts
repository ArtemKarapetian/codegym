import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db } from './client';

console.log('Running migrations...');
migrate(db, { migrationsFolder: './server/db/migrations' });
console.log('Migrations complete.');
