import {
  pgTable,
  bigserial,
  bigint,
  text,
  integer,
  timestamp,
  jsonb,
  uuid,
  doublePrecision,
  smallint,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const devices = pgTable('devices', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  userId: bigint('user_id', { mode: 'number' }).references(() => users.id, {
    onDelete: 'cascade',
  }),
  name: text('name').notNull(),
  type: text('type').notNull().default('esp32'),
  location: text('location'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const deviceBoots = pgTable('device_boots', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  deviceId: bigint('device_id', { mode: 'number' })
    .notNull()
    .references(() => devices.id, { onDelete: 'cascade' }),
  bootTime: bigint('boot_time', { mode: 'number' }).notNull(),
  serverTime: timestamp('server_time', { withTimezone: true })
    .notNull()
    .defaultNow(),
  version: text('version'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const sensors = pgTable(
  'sensors',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    deviceId: bigint('device_id', { mode: 'number' })
      .notNull()
      .references(() => devices.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    model: text('model').notNull(),
    alias: text('alias').notNull(),
    sensorType: text('sensor_type').notNull(),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    uniqueDeviceAlias: uniqueIndex('idx_sensors_device_alias').on(
      table.deviceId,
      table.alias,
    ),
  }),
);

export const sensorConfigs = pgTable('sensor_configs', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  sensorId: bigint('sensor_id', { mode: 'number' })
    .notNull()
    .references(() => sensors.id, { onDelete: 'cascade' }),
  config: jsonb('config').default({}),
  version: integer('version').default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const actuators = pgTable(
  'actuators',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    deviceId: bigint('device_id', { mode: 'number' })
      .notNull()
      .references(() => devices.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    type: text('type').notNull(),
    state: jsonb('state').default({}),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    uniqueDeviceName: uniqueIndex('idx_actuators_device_name').on(
      table.deviceId,
      table.name,
    ),
  }),
);

export const actuatorEvents = pgTable('actuator_events', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  actuatorId: bigint('actuator_id', { mode: 'number' })
    .notNull()
    .references(() => actuators.id, { onDelete: 'cascade' }),
  oldState: jsonb('old_state'),
  newState: jsonb('new_state'),
  reason: text('reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Telemetry: solo para referencia de tipos, las inserciones son SQL crudo
export const telemetry = pgTable('telemetry', {
  time: timestamp('time', { withTimezone: true }).notNull(),
  sampleId: uuid('sample_id').defaultRandom().notNull(),
  deviceId: bigint('device_id', { mode: 'number' })
    .notNull()
    .references(() => devices.id, { onDelete: 'cascade' }),
  sensorId: bigint('sensor_id', { mode: 'number' })
    .notNull()
    .references(() => sensors.id, { onDelete: 'cascade' }),
  metricName: text('metric_name').notNull(),
  value: doublePrecision('value').notNull(),
  unit: text('unit'),
  quality: smallint('quality').default(100),
  rawPayload: jsonb('raw_payload'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const actuatorConfigs = pgTable('actuator_configs', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  actuatorId: bigint('actuator_id', { mode: 'number' })
    .notNull()
    .references(() => actuators.id, { onDelete: 'cascade' }),
  config: jsonb('config').default({}),
  version: integer('version').default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
