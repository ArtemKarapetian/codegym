import { Hono } from 'hono';
import { eq, desc, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db/client';
import { announcements, announcementReads } from '../db/schema';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import { createAnnouncementSchema } from '@shared/validation';
import type { JwtPayload } from '../middleware/auth';
import type { Announcement } from '@shared/types';

const router = new Hono<{ Variables: { user: JwtPayload } }>();

function rowToAnnouncement(
  row: typeof announcements.$inferSelect,
  readIds: Set<string>,
): Announcement {
  const createdAt = new Date(row.createdAt);

  return {
    id: row.id,
    title: row.title,
    message: row.message,
    timestamp: createdAt.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    important: row.important,
    isNew: !readIds.has(row.id),
  };
}

// List announcements for a city
router.get('/cities/:cityId/announcements', authMiddleware, (c) => {
  const cityId = c.req.param('cityId');
  const user = c.get('user');

  const rows = db
    .select()
    .from(announcements)
    .where(eq(announcements.cityId, cityId))
    .orderBy(desc(announcements.createdAt))
    .all();

  // Get which announcements this user has read
  const reads = db
    .select({ announcementId: announcementReads.announcementId })
    .from(announcementReads)
    .where(eq(announcementReads.userId, user.sub))
    .all();

  const readIds = new Set(reads.map((r) => r.announcementId));

  return c.json(rows.map((r) => rowToAnnouncement(r, readIds)));
});

// Mark announcements as read
router.post('/cities/:cityId/announcements/read', authMiddleware, async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const ids = body.ids as string[];

  if (!Array.isArray(ids)) {
    return c.json({ error: 'ids array required' }, 400);
  }

  const now = new Date().toISOString();

  for (const announcementId of ids) {
    const existing = db
      .select()
      .from(announcementReads)
      .where(
        and(
          eq(announcementReads.userId, user.sub),
          eq(announcementReads.announcementId, announcementId),
        ),
      )
      .get();

    if (!existing) {
      db.insert(announcementReads)
        .values({
          id: nanoid(),
          userId: user.sub,
          announcementId,
          readAt: now,
        })
        .run();
    }
  }

  return c.json({ ok: true });
});

// Create announcement (admin)
router.post(
  '/cities/:cityId/announcements',
  authMiddleware,
  adminMiddleware,
  async (c) => {
    const cityId = c.req.param('cityId');
    const body = await c.req.json();
    const parsed = createAnnouncementSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten() }, 400);
    }

    const id = nanoid();
    const now = new Date().toISOString();

    db.insert(announcements)
      .values({
        id,
        cityId,
        title: parsed.data.title,
        message: parsed.data.message,
        important: parsed.data.important,
        createdAt: now,
      })
      .run();

    const row = db
      .select()
      .from(announcements)
      .where(eq(announcements.id, id))
      .get()!;
    return c.json(rowToAnnouncement(row, new Set()), 201);
  },
);

// Delete announcement (admin)
router.delete(
  '/cities/:cityId/announcements/:id',
  authMiddleware,
  adminMiddleware,
  (c) => {
    const id = c.req.param('id');
    const existing = db
      .select()
      .from(announcements)
      .where(eq(announcements.id, id))
      .get();
    if (!existing) return c.json({ error: 'Announcement not found' }, 404);

    db.delete(announcements).where(eq(announcements.id, id)).run();
    return c.json({ ok: true });
  },
);

export default router;
