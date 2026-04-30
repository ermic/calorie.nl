import * as migration_20260423_213726_init from './20260423_213726_init';
import * as migration_20260424_130947 from './20260424_130947';
import * as migration_20260424_215210 from './20260424_215210';
import * as migration_20260430_002904_meal_rating from './20260430_002904_meal_rating';
import * as migration_20260430_115018_add_email_verification_and_drift_catchup from './20260430_115018_add_email_verification_and_drift_catchup';

export const migrations = [
  {
    up: migration_20260423_213726_init.up,
    down: migration_20260423_213726_init.down,
    name: '20260423_213726_init',
  },
  {
    up: migration_20260424_130947.up,
    down: migration_20260424_130947.down,
    name: '20260424_130947',
  },
  {
    up: migration_20260424_215210.up,
    down: migration_20260424_215210.down,
    name: '20260424_215210',
  },
  {
    up: migration_20260430_002904_meal_rating.up,
    down: migration_20260430_002904_meal_rating.down,
    name: '20260430_002904_meal_rating',
  },
  {
    up: migration_20260430_115018_add_email_verification_and_drift_catchup.up,
    down: migration_20260430_115018_add_email_verification_and_drift_catchup.down,
    name: '20260430_115018_add_email_verification_and_drift_catchup'
  },
];
