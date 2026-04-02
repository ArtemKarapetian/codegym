import { Hono } from 'hono';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import { syncFromSheets, getSheetUrls } from '../services/sheets-sync';
import type { JwtPayload } from '../middleware/auth';

const router = new Hono<{ Variables: { user: JwtPayload } }>();

// Trigger sync from Google Sheets (admin only)
router.post(
  '/admin/sync-sheets',
  authMiddleware,
  adminMiddleware,
  async (c) => {
    try {
      const { tasks, exercises } = getSheetUrls();
      const result = await syncFromSheets(tasks, exercises);
      return c.json(result);
    } catch (err) {
      console.error('Sheets sync error:', err);
      return c.json(
        { error: err instanceof Error ? err.message : 'Sync failed' },
        500,
      );
    }
  },
);

export default router;
