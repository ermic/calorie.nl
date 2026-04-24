// Stable test-users die door global-setup geseed worden. Verschillen
// duidelijk van echte ontwikkelaarsaccounts (@test.local TLD) zodat ze
// nooit in een productie-DB belanden zonder dat opvalt.
export const TEST_USERS = {
  a: {
    email: 'e2e-user-a@test.local',
    password: 'e2e-secret-aaaa',
    name: 'E2E Tester A',
  },
  b: {
    email: 'e2e-user-b@test.local',
    password: 'e2e-secret-bbbb',
    name: 'E2E Tester B',
  },
} as const;
