# Changelog

All notable changes to this project are documented here. This project adheres to [Semantic Versioning](https://semver.org/). Any change to the on-the-wire envelope format for a fixed `ENVELOPE_VERSION` is treated as a breaking change.

## [0.1.1] - 2026-06-14

First CI-driven release. No changes to the library API or envelope format.

### Added

- ESLint (flat config, `typescript-eslint`) with a `lint` script, wired into CI as a gate alongside typecheck, test, and build.
- README status badges (CI, npm version, license).

## [0.1.0] - 2026-06-14

Initial release.

### Added

- `buildEnvelope(payload, opts?)` — sharer side. Link-only mode (content key returned for the URL `#fragment`) or coded mode (content key wrapped under an injected Argon2id(code) key). AES-256-GCM via `@noble/ciphers`; CSPRNG injectable, defaults to WebCrypto.
- `decryptShare(envelope, opts?)` — recipient side. Opens an envelope from a fragment key or a code; typed error codes (`UNSUPPORTED_VERSION`, `CODE_REQUIRED`, `MISSING_ARGON2`, `KEY_MISSING`).
- `assertArgon2Healthy(argon2id)` and the exported `FROZEN_VECTOR` — cross-implementation agreement check for any injected Argon2id.
- `needsCode`, `normalizeCode`, base64/base64url helpers, and format constants (`ENVELOPE_VERSION`, `ARGON2`, `IV_LEN`, `CEK_LEN`).
- `node:test` suite covering the frozen vector and both round-trip modes.

[Unreleased]: https://github.com/sonnetstationsolutions/share-envelope/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/sonnetstationsolutions/share-envelope/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/sonnetstationsolutions/share-envelope/releases/tag/v0.1.0
