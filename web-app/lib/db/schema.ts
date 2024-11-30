import { pgTable, serial, text, real, bigint } from 'drizzle-orm/pg-core';

export const measurements = pgTable('measurements', {
  id: serial('id').primaryKey(),
  timestamp: bigint('timestamp', { mode: 'number' }).notNull(),
  session_name: text('session_name').notNull(),

  magnetic_x: real('magnetic_x').notNull(),
  magnetic_y: real('magnetic_y').notNull(),
  magnetic_z: real('magnetic_z').notNull(),
  magnetic_magnitude: real('magnetic_magnitude').notNull(),

  pitch: real('pitch').notNull(),
  roll: real('roll').notNull(),
  acceleration_x: real('acceleration_x').notNull(),
  acceleration_y: real('acceleration_y').notNull(),
  acceleration_z: real('acceleration_z').notNull(),

  // New fields (not used in computations)
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
  accuracy: real('accuracy').notNull(),
  altitude: real('altitude').notNull(),
  altitude_accuracy: real('altitude_accuracy').notNull(),
});

