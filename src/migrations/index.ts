import * as migration_20260423_213726_init from './20260423_213726_init';
import * as migration_20260424_130947 from './20260424_130947';
import * as migration_20260424_215210 from './20260424_215210';
import * as migration_20260430_002904_meal_rating from './20260430_002904_meal_rating';
import * as migration_20260430_115018_add_email_verification_and_drift_catchup from './20260430_115018_add_email_verification_and_drift_catchup';
import * as migration_20260430_122100_add_email_verifications_collection from './20260430_122100_add_email_verifications_collection';
import * as migration_20260430_131542_add_email_verification_kind from './20260430_131542_add_email_verification_kind';
import * as migration_20260430_134708_add_providers_and_login_challenges from './20260430_134708_add_providers_and_login_challenges';
import * as migration_20260430_143618_add_users_sessions_expires_at_idx from './20260430_143618_add_users_sessions_expires_at_idx';
import * as migration_20260430_144148_normalize_user_emails_lowercase from './20260430_144148_normalize_user_emails_lowercase';

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
    name: '20260430_115018_add_email_verification_and_drift_catchup',
  },
  {
    up: migration_20260430_122100_add_email_verifications_collection.up,
    down: migration_20260430_122100_add_email_verifications_collection.down,
    name: '20260430_122100_add_email_verifications_collection',
  },
  {
    up: migration_20260430_131542_add_email_verification_kind.up,
    down: migration_20260430_131542_add_email_verification_kind.down,
    name: '20260430_131542_add_email_verification_kind',
  },
  {
    up: migration_20260430_134708_add_providers_and_login_challenges.up,
    down: migration_20260430_134708_add_providers_and_login_challenges.down,
    name: '20260430_134708_add_providers_and_login_challenges',
  },
  {
    up: migration_20260430_143618_add_users_sessions_expires_at_idx.up,
    down: migration_20260430_143618_add_users_sessions_expires_at_idx.down,
    name: '20260430_143618_add_users_sessions_expires_at_idx',
  },
  {
    up: migration_20260430_144148_normalize_user_emails_lowercase.up,
    down: migration_20260430_144148_normalize_user_emails_lowercase.down,
    name: '20260430_144148_normalize_user_emails_lowercase'
  },
];
