import * as migration_20260423_213726_init from './20260423_213726_init';
import * as migration_20260424_130947 from './20260424_130947';

export const migrations = [
  {
    up: migration_20260423_213726_init.up,
    down: migration_20260423_213726_init.down,
    name: '20260423_213726_init',
  },
  {
    up: migration_20260424_130947.up,
    down: migration_20260424_130947.down,
    name: '20260424_130947'
  },
];
