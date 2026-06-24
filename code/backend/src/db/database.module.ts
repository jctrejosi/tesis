import { Module, Global } from '@nestjs/common';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export const DRIZZLE = Symbol('DRIZZLE');

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      useFactory: async (): Promise<NodePgDatabase<typeof schema>> => {
        const pool = new Pool({
          connectionString: process.env.DATABASE_URL,
        });
        // Prueba de conexión
        await pool.query('SELECT 1');
        console.log('Conectado a PostgreSQL/TimescaleDB');
        return drizzle(pool, { schema });
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule {}
