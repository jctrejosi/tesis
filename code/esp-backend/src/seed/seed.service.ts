import { Injectable, OnModuleInit, Inject, Logger } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.module';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<any>) {}

  async onModuleInit() {
    await this.db.execute(sql`
    INSERT INTO devices (id, name, type, location)
    VALUES (1, 'GrowBox Principal', 'esp32', 'Invernadero 1')
    ON CONFLICT (id) DO NOTHING
  `);

    await this.db.execute(sql`
    INSERT INTO sensors (id, device_id, name, model, alias, sensor_type)
    VALUES (1, 1, 'AS7341 Principal', 'AS7341', 'as7341', 'spectral')
    ON CONFLICT (device_id, alias) DO NOTHING
  `);
  }
}
