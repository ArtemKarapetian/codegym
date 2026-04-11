import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serveStatic } from '@hono/node-server/serve-static';
import auth from './routes/auth';
import cities from './routes/cities';
import zones from './routes/zones';
import teams from './routes/teams';
import announcements from './routes/announcements';
import timer from './routes/timer';
import leaderboard from './routes/leaderboard';
import sync from './routes/sync';
import funPointsRouter from './routes/fun-points';
import exercisesRouter from './routes/exercises';
import trainersRouter from './routes/trainers';
import adminTrainersRouter from './routes/admin-trainers';

export function createApp() {
  const app = new Hono();

  app.use('*', logger());

  // Global error handler
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

  // API Routes
  app.route('/api/auth', auth);
  app.route('/api/cities', cities);
  app.route('/api', zones);
  app.route('/api', teams);
  app.route('/api', announcements);
  app.route('/api', timer);
  app.route('/api', leaderboard);
  app.route('/api', sync);
  app.route('/api', funPointsRouter);
  app.route('/api', exercisesRouter);
  app.route('/api', trainersRouter);
  app.route('/api', adminTrainersRouter);

  // Health check
  app.get('/api/health', (c) => c.json({ ok: true }));

  // Serve frontend static files in production
  if (process.env.NODE_ENV === 'production') {
    app.use('/*', serveStatic({ root: './dist' }));
    // SPA fallback: all non-API routes serve index.html
    app.get('*', serveStatic({ path: './dist/index.html' }));
  }

  return app;
}
