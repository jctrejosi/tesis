import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  driver: 'd1-http',
  dbCredentials: {
    accountId: process.env.D1_ACCOUNT_ID!,
    databaseId: process.env.D1_DATABASE_ID!,
    token: process.env.D1_AUTH_TOKEN!,
  },
} as unknown as Config;
