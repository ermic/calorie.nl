import * as migration_20260423_213726_init from './20260423_213726_init';

export const migrations = [
  {
    up: migration_20260423_213726_init.up,
    down: migration_20260423_213726_init.down,
    name: '20260423_213726_init'
  },
];
