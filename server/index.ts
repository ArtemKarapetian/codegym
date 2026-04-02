import { serve } from '@hono/node-server';
import { createApp } from './app';

// Run migrations on startup
import './db/migrate';

const app = createApp();
const port = Number(process.env.PORT) || 3001;

console.log(`Server running on http://localhost:${port}`);
serve({ fetch: app.fetch, port, hostname: '0.0.0.0' });
