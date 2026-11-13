# Firestore Security Specification — ApexPredict

## 1. Data Invariants
1. Every document ID must match `^[a-zA-Z0-9_-]+$` and stay `<= 128` characters.
2. Only verified Google-authenticated users (`request.auth != null && request.auth.token.email_verified == true`) can write user-owned records, and only `isAdmin()` (bootstrapped `vgdxfgf@gmail.com` with verified email, or `/admins/{uid}`) can administer users, predictions, payouts, settings, or coin credits.
3. Users can NEVER increase their own `coins`, approve their own deposits/withdrawals, or alter prediction odds/outcomes.
4. PII (`email`, `phone`) is isolated under `/users/{userId}/private/info` and readable only by the owner (`ownerUid == request.auth.uid`) or `isAdmin()`.
5. List queries on `users`, `bets`, `transactions`, `deposits`, and `withdrawals` explicitly filter on `resource.data.ownerUid == request.auth.uid` (or `isAdmin()`), never trusting client-only queries.
6. Terminal states (`deposits.status in ['approved', 'rejected']`, `withdrawals.status in ['approved', 'rejected']`, `predictions.status == 'settled'`) cannot be modified by non-admins.
7. Account claims (`/account_claims/{usernameKey}`) require exact document `get` by a verified user (no `list` allowed to non-admins) and enforce atomic claiming via `claimedByUid == null -> request.auth.uid`.

## 2. The "Dirty Dozen" Attack Payloads (Expected: `PERMISSION_DENIED`)
1. **Unauthenticated read of `/users/usr_alex`**: `request.auth == null` -> DENIED.
2. **Unverified email write to `/bets/bet_1`**: `email_verified == false` -> DENIED.
3. **Self-credit coin inflation**: User updates `/users/usr_1` with `{ coins: 999999 }` -> DENIED (`incoming().coins < existing().coins` enforced for non-admins).
4. **Shadow/Ghost field injection on `/bets/bet_1`**: Create bet with `{ ..., isAdmin: true }` -> DENIED (`keys().hasOnly(...)`).
5. **Identity spoofing on `/deposits/dep_1`**: User A creates deposit with `ownerUid: "user_B"` -> DENIED (`ownerUid == request.auth.uid`).
6. **Self-approving deposit**: User updates `/deposits/dep_1` setting `status: "approved"` -> DENIED (only `isAdmin()` can update deposits).
7. **Email spoofing for admin**: Auth token has `email: "vgdxfgf@gmail.com"` with `email_verified: false` -> DENIED.
8. **Blanket list scraping on `/account_claims`**: Non-admin calls `list` on `/account_claims` -> DENIED.
9. **Oversized ID poisoning**: Create doc at `/bets/` + 500-char ID -> DENIED (`isValidId()`).
10. **Oversized string DoW**: Create deposit with 5000-char `notes` -> DENIED (`.size() <= 400`).
11. **Terminal state bypass**: Re-approving an already `approved` deposit -> DENIED (`existing().status == 'pending'`).
12. **Client timestamp forgery**: Create bet with backdated `createdAt != request.time` -> DENIED.
