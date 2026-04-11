import { createMiddleware } from 'hono/factory';
import { jwtVerify } from 'jose';
import type { UserRole } from '@shared/types';

export interface JwtPayload {
  sub: string;
  role: UserRole;
}

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dev-secret-change-in-production',
);

export async function signToken(payload: JwtPayload): Promise<string> {
  const { SignJWT } = await import('jose');
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .sign(secret);
}

export async function verifyToken(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, secret);
  return payload as unknown as JwtPayload;
}

export const authMiddleware = createMiddleware<{
  Variables: { user: JwtPayload };
}>(async (c, next) => {
  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const token = header.slice(7);
    const { payload } = await jwtVerify(token, secret);
    c.set('user', payload as unknown as JwtPayload);
    await next();
  } catch {
    return c.json({ error: 'Invalid token' }, 401);
  }
});

export const adminMiddleware = createMiddleware<{
  Variables: { user: JwtPayload };
}>(async (c, next) => {
  const user = c.get('user');
  if (user.role !== 'admin') {
    return c.json({ error: 'Forbidden' }, 403);
  }
  await next();
});
