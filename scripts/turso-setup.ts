// Run with: TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... npx tsx scripts/turso-setup.ts
// @ts-nocheck
import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const statements = [
  `CREATE TABLE IF NOT EXISTS "Source" ("id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "url" TEXT NOT NULL, "isActive" BOOLEAN NOT NULL DEFAULT true, "selectors" TEXT NOT NULL, "rateLimit" INTEGER NOT NULL DEFAULT 2000, "lastScrapedAt" DATETIME, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS "Article" ("id" TEXT NOT NULL PRIMARY KEY, "title" TEXT NOT NULL, "summary" TEXT, "content" TEXT, "sourceUrl" TEXT NOT NULL, "imageUrl" TEXT, "author" TEXT, "publishedAt" DATETIME, "sourceId" TEXT NOT NULL, "scrapedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL, CONSTRAINT "Article_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS "Settings" ("id" TEXT NOT NULL PRIMARY KEY DEFAULT 'global', "scrapeInterval" INTEGER NOT NULL DEFAULT 30, "enableAutoScrape" BOOLEAN NOT NULL DEFAULT true, "updatedAt" DATETIME NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS "User" ("id" TEXT NOT NULL PRIMARY KEY, "email" TEXT NOT NULL, "username" TEXT NOT NULL, "passwordHash" TEXT NOT NULL, "role" TEXT NOT NULL DEFAULT 'user', "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Source_name_key" ON "Source"("name")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Article_sourceUrl_key" ON "Article"("sourceUrl")`,
  `CREATE INDEX IF NOT EXISTS "Article_sourceId_idx" ON "Article"("sourceId")`,
  `CREATE INDEX IF NOT EXISTS "Article_publishedAt_idx" ON "Article"("publishedAt")`,
  `CREATE INDEX IF NOT EXISTS "Article_scrapedAt_idx" ON "Article"("scrapedAt")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username")`,
];

async function main() {
  console.log('Creating tables on Turso...');
  for (const sql of statements) {
    const preview = sql.substring(0, 70);
    console.log(`  ${preview}...`);
    await client.execute(sql);
  }
  console.log('All tables and indexes created!');
  client.close();
}

main().catch(e => { console.error(e); process.exit(1); });
