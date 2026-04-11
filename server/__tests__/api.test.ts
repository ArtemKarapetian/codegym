import { describe, it, expect, beforeAll } from 'vitest';

// DB_PATH and JWT_SECRET are set in server/__tests__/setup.ts which vitest
// loads via setupFiles before any test module is parsed. Setting them here
// would be too late — ESM hoists static imports above top-level code, so
// server/db/client.ts would open the default DB before this file runs.

import { createApp } from '../app';
import { db } from '../db/client';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';
import { cities, users } from '../db/schema';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const json = (res: Response): Promise<any> => res.json();

const app = createApp();

let adminToken: string;
let cityId: string;

describe('API Integration Tests', () => {
  beforeAll(async () => {
    migrate(db, { migrationsFolder: './server/db/migrations' });

    const { sqlite } = await import('../db/client');
    for (const t of ['users', 'cities']) {
      sqlite.exec(`DELETE FROM ${t}`);
    }

    cityId = nanoid();
    db.insert(cities)
      .values({
        id: cityId,
        name: 'Test City',
        timezone: 'Europe/Moscow',
        durationMin: 240,
        timerStatus: 'pending',
        sheetId: null,
        sheetRange: 'Таблица',
        exerciseNames: null,
        createdAt: new Date().toISOString(),
      })
      .run();

    db.insert(users)
      .values({
        id: nanoid(),
        login: 'testadmin',
        passwordHash: bcrypt.hashSync('admin-test-password', 10),
        role: 'admin',
        createdAt: new Date().toISOString(),
      })
      .run();

    const adminRes = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        login: 'testadmin',
        password: 'admin-test-password',
      }),
    });
    adminToken = (await json(adminRes)).token;
  });

  const admin = () => ({
    Authorization: `Bearer ${adminToken}`,
    'Content-Type': 'application/json',
  });

  // ── Auth ──

  describe('Auth', () => {
    it('login success', async () => {
      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          login: 'testadmin',
          password: 'admin-test-password',
        }),
      });
      expect(res.status).toBe(200);
      const body = await json(res);
      expect(body.token).toBeDefined();
      expect(body.user.login).toBe('testadmin');
      expect(body.user.role).toBe('admin');
    });

    it('login wrong password', async () => {
      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: 'testadmin', password: 'wrong' }),
      });
      expect(res.status).toBe(401);
    });

    it('me with token', async () => {
      const res = await app.request('/api/auth/me', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(res.status).toBe(200);
      const body = await json(res);
      expect(body.user.login).toBe('testadmin');
    });

    it('me without token', async () => {
      const res = await app.request('/api/auth/me');
      expect(res.status).toBe(401);
    });
  });

  // ── Cities ──

  describe('Cities', () => {
    it('public list (no auth)', async () => {
      const res = await app.request('/api/cities/public');
      expect(res.status).toBe(200);
      const body = await json(res);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(1);
      expect(body[0]).not.toHaveProperty('sheetId');
    });

    it('public single city (no auth)', async () => {
      const res = await app.request(`/api/cities/public/${cityId}`);
      expect(res.status).toBe(200);
      const body = await json(res);
      expect(body.id).toBe(cityId);
    });

    it('list cities (admin)', async () => {
      const res = await app.request('/api/cities', { headers: admin() });
      expect(res.status).toBe(200);
      const body = await json(res);
      expect(body.length).toBeGreaterThanOrEqual(1);
    });

    it('list cities without auth → 401', async () => {
      const res = await app.request('/api/cities');
      expect(res.status).toBe(401);
    });

    it('create city (admin)', async () => {
      const res = await app.request('/api/cities', {
        method: 'POST',
        headers: admin(),
        body: JSON.stringify({
          name: 'New City',
          timezone: 'UTC',
          sheetId: 'abc123',
          sheetRange: 'Таблица',
        }),
      });
      expect(res.status).toBe(201);
      const body = await json(res);
      expect(body.sheetId).toBe('abc123');
    });

    it('update city (admin) — exercise names', async () => {
      const names = [
        'Упражнение А',
        'Упражнение Б',
        'Упражнение В',
        'Упражнение Г',
        'Упражнение Д',
        'Упражнение Е',
        'Упражнение Ж',
        'Упражнение З',
        'Упражнение И',
      ];
      const res = await app.request(`/api/cities/${cityId}`, {
        method: 'PUT',
        headers: admin(),
        body: JSON.stringify({ exerciseNames: names }),
      });
      expect(res.status).toBe(200);
      const body = await json(res);
      expect(body.exerciseNames).toEqual(names);
    });
  });

  // ── Timer ──

  describe('Timer', () => {
    it('get → pending', async () => {
      const res = await app.request(`/api/cities/${cityId}/timer`, {
        headers: admin(),
      });
      expect(res.status).toBe(200);
      const body = await json(res);
      expect(body.status).toBe('pending');
      expect(body.remainingSeconds).toBe(14400);
    });

    it('public timer (no auth)', async () => {
      const res = await app.request(`/api/public/cities/${cityId}/timer`);
      expect(res.status).toBe(200);
    });

    it('start → running', async () => {
      const res = await app.request(`/api/cities/${cityId}/timer/start`, {
        method: 'POST',
        headers: admin(),
      });
      expect(res.status).toBe(200);
      const body = await json(res);
      expect(body.status).toBe('running');
    });

    it('pause → paused', async () => {
      const res = await app.request(`/api/cities/${cityId}/timer/pause`, {
        method: 'POST',
        headers: admin(),
      });
      expect(res.status).toBe(200);
      const body = await json(res);
      expect(body.status).toBe('paused');
    });

    it('resume → running', async () => {
      const res = await app.request(`/api/cities/${cityId}/timer/resume`, {
        method: 'POST',
        headers: admin(),
      });
      expect(res.status).toBe(200);
      const body = await json(res);
      expect(body.status).toBe('running');
    });

    it('stop → finished', async () => {
      const res = await app.request(`/api/cities/${cityId}/timer/stop`, {
        method: 'POST',
        headers: admin(),
      });
      expect(res.status).toBe(200);
      const body = await json(res);
      expect(body.status).toBe('finished');
    });
  });

  // ── Leaderboard ──

  describe('Leaderboard', () => {
    it('public (no auth)', async () => {
      const res = await app.request(`/api/public/cities/${cityId}/leaderboard`);
      expect(res.status).toBe(200);
      const body = await json(res);
      expect(body).toHaveProperty('teams');
      expect(body).toHaveProperty('frozen');
      expect(body).toHaveProperty('exerciseNames');
      expect(body.exerciseNames).toHaveLength(9);
      expect(body.taskCount).toBe(10);
      expect(body.exerciseCount).toBe(9);
      expect(Array.isArray(body.teams)).toBe(true);
    });

    it('manual freeze / unfreeze', async () => {
      const freezeRes = await app.request(
        `/api/cities/${cityId}/leaderboard/freeze`,
        { method: 'POST', headers: admin() },
      );
      expect(freezeRes.status).toBe(200);

      const frozen = await app.request(
        `/api/public/cities/${cityId}/leaderboard`,
      );
      expect((await json(frozen)).frozen).toBe(true);

      const unfreezeRes = await app.request(
        `/api/cities/${cityId}/leaderboard/unfreeze`,
        { method: 'POST', headers: admin() },
      );
      expect(unfreezeRes.status).toBe(200);

      const live = await app.request(
        `/api/public/cities/${cityId}/leaderboard`,
      );
      expect((await json(live)).frozen).toBe(false);
    });

    it('unfreeze requires admin', async () => {
      const res = await app.request(
        `/api/cities/${cityId}/leaderboard/unfreeze`,
        { method: 'POST' },
      );
      expect(res.status).toBe(401);
    });
  });

  // ── Health ──

  it('health check', async () => {
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
  });
});
