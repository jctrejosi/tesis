import { Injectable, OnModuleInit, Inject, Logger } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { DRIZZLE } from '../db/database.module';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<any>) {}

  async onModuleInit() {
    // Dispositivo único
    await this.db.execute(sql`
    INSERT INTO devices (id, name, type, location)
    VALUES (1, 'GrowBox Principal', 'esp32', 'Invernadero 1')
    ON CONFLICT (id) DO NOTHING
  `);

    // Sensores
    const sensores = [
      {
        id: 1,
        alias: 'as7341',
        name: 'AS7341 Principal',
        model: 'AS7341',
        type: 'spectral',
      },
      {
        id: 2,
        alias: 'bme680',
        name: 'BME680 Interior',
        model: 'BME680',
        type: 'environmental',
      },
      {
        id: 3,
        alias: 'ds18b20_air',
        name: 'DS18B20 Aire',
        model: 'DS18B20',
        type: 'temperature',
      },
      {
        id: 4,
        alias: 'ds18b20_soil',
        name: 'DS18B20 Suelo',
        model: 'DS18B20',
        type: 'temperature',
      },
      {
        id: 5,
        alias: 'mhz19b',
        name: 'MH-Z19B CO2',
        model: 'MH-Z19B',
        type: 'co2',
      },
      {
        id: 6,
        alias: 'soil_ec',
        name: 'Soil EC RS485',
        model: 'SoilEC',
        type: 'soil_ec',
      },
      {
        id: 7,
        alias: 'dfrobot',
        name: 'DFRobot Humedad Suelo',
        model: 'SEN0193',
        type: 'soil_moisture',
      },
    ];

    for (const s of sensores) {
      await this.db.execute(sql`
      INSERT INTO sensors (id, device_id, name, model, alias, sensor_type)
      VALUES (${s.id}, 1, ${s.name}, ${s.model}, ${s.alias}, ${s.type})
      ON CONFLICT (device_id, alias) DO UPDATE SET name = EXCLUDED.name
    `);
    }

    // Actuadores de ejemplo
    const actuadores = [
      { name: 'relay_principal', type: 'relay' },
      { name: 'ventilacion_principal', type: 'fan' },
      { name: 'iluminacion_principal', type: 'light' },
      { name: 'riego_principal', type: 'pump' },
    ];

    for (const a of actuadores) {
      await this.db.execute(sql`
      INSERT INTO actuators (device_id, name, type, state)
      VALUES (1, ${a.name}, ${a.type}, '{}')
      ON CONFLICT (device_id, name) DO NOTHING
    `);
    }

    this.logger.log(
      'Seed ejecutado: dispositivos, sensores y actuadores iniciales',
    );
  }
}
