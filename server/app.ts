import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serveStatic } from '@hono/node-server/serve-static';
import auth from './routes/auth';
import cities from './routes/cities';
import timer from './routes/timer';
import leaderboard from './routes/leaderboard';
import sync from './routes/sync';

export function createApp() {
  const app = new Hono();

  app.use('*', logger());

  app.onError((err, c) => {
    console.error('Unhandled error:', err);
    return c.json({ error: 'Internal server error' }, 500);
  });
  app.use(
    '/api/*',
    cors({
      origin: ['http://localhost:5173'],
      credentials: true,
    }),
  );

  app.route('/api/auth', auth);
  app.route('/api/cities', cities);
  app.route('/api', timer);
  app.route('/api', leaderboard);
  app.route('/api', sync);

  app.get('/api/health', (c) => c.json({ ok: true }));

  if (process.env.NODE_ENV === 'production') {
    app.use('/*', serveStatic({ root: './dist' }));
    app.get('*', serveStatic({ path: './dist/index.html' }));
  }

  return app;
}
