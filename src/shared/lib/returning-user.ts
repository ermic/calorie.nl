// Markeert dat een bezoeker ooit succesvol heeft ingelogd. Wordt bij
// elke geslaagde login-flow gezet (e-mail, passkey, OAuth, na
// password-reset) en bij logout *niet* gewist — zodat een terugkerende
// bezoeker direct op /login landt i.p.v. de marketing-landing op '/'.
// Bewust een eigen cookie i.p.v. de Payload-token: die heeft TTL +
// wordt bij logout gewist.
export const RETURNING_USER_COOKIE = 'cc_has_logged_in';
export const RETURNING_USER_MAX_AGE = 60 * 60 * 24 * 365 * 5; // 5 jaar
