# Security Specification for WAForge Agent Config

## Data Invariants
- An agent configuration belongs to exactly one user in their respective user directory path `users/{userId}/config/default`.
- Only the authenticated owner user has access to read, create, update, or delete their corresponding `config/default` document.
- Custom settings elements like name and systemPrompt have strict size limits.

## The "Dirty Dozen" Payloads (Vulnerable Vectors to block)
1. **Unauthenticated Read**: Attempting to read `/users/alice_uid/config/default` without an auth token. (Must be Denied)
2. **Identity Hijacking Read**: Logged in as `bob_uid`, attempting to read `/users/alice_uid/config/default`. (Must be Denied)
3. **Unauthenticated Write**: Attempting to write `/users/alice_uid/config/default` without an auth token. (Must be Denied)
4. **Identity Hijacking Write**: Logged in as `bob_uid`, attempting to write to `/users/alice_uid/config/default`. (Must be Denied)
5. **Malicious System Field Injection**: Injecting extra unrequested root fields like `isAdmin` or `role` to elevate permissions. (Must be Denied)
6. **Value Poisoning - Payload size**: Setting `name` to a large string (e.g., > 128 characters) to trigger denial of wallet or resource depletion. (Must be Denied via size check)
7. **Type Mismatch Tone**: Setting `toneStyle` to an invalid value outside the enum list (e.g., `silly`). (Must be Denied)
8. **Invalid FAQ ID**: Creating FAQ items with invalid ids that don't match the standard alphanumeric regex. (Must be Denied)
9. **Malicious Type systemPrompt**: Passing an array or number inside the `systemPrompt` field instead of a string. (Must be Denied)
10. **Self-Elevated Privilege Sweep**: Trying to write a new document in `/users/{userId}/config/default` when the email verification status is not met (if strictly enforced).
11. **Malicious ID Poisoning**: Specifying an extremely long document ID or nested subcollection path for scanning. (Must be Denied via path variable constraints)
12. **Tampering with audit fields**: Editing `createdAt` after initial creation. (Must be Denied)

## Security Rules Design
Rules will be drafted in `/firestore.rules` enforcing:
1. Ownership validation: `isOwner(userId)`
2. Type, structure, and enum validation: `isValidAgentConfig(data)`
3. String length guards.
