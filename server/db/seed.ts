import { db, sqlite } from './client';
import { cities, users } from './schema';
import { ensureAdmin, ensureCities, CITY_SEEDS } from './bootstrap';

// Run migrations first
import './migrate';

console.log('Seeding database (full reset)...');

// Full reset: wipe users + cities before bootstrap, so this script always
// leaves the DB in the canonical seed state regardless of what was there.
sqlite.exec('PRAGMA foreign_keys = OFF');
db.delete(users).run();
db.delete(cities).run();
sqlite.exec('PRAGMA foreign_keys = ON');

ensureAdmin();
ensureCities();

console.log('Seed complete!');
console.log(`  Admin login:    ${process.env.ADMIN_LOGIN ?? 'admin'}`);
if (process.env.ADMIN_PASSWORD) {
  console.log('  Admin password: [from ADMIN_PASSWORD env]');
} else {
  console.log(
    '  Admin password: generated — see ./secrets/admin-credentials.txt',
  );
}
console.log(`  Cities: ${CITY_SEEDS.length}`);
