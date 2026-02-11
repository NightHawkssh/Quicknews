import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const info: Record<string, unknown> = {
    turso_url_set: !!process.env.TURSO_DATABASE_URL,
    turso_url_prefix: process.env.TURSO_DATABASE_URL?.substring(0, 30),
    turso_token_set: !!process.env.TURSO_AUTH_TOKEN,
    turso_token_length: process.env.TURSO_AUTH_TOKEN?.length,
    jwt_secret_set: !!process.env.JWT_SECRET,
    node_env: process.env.NODE_ENV,
  };

  try {
    const userCount = await prisma.user.count();
    info.db_connected = true;
    info.user_count = userCount;
  } catch (error) {
    info.db_connected = false;
    info.db_error = error instanceof Error ? error.message : String(error);
    info.db_error_name = error instanceof Error ? error.constructor.name : 'unknown';
  }

  return NextResponse.json(info);
}
