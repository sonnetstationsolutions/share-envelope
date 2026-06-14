# Contributing to share-envelope

Thanks for your interest. This is a small, focused library: a server-blind encrypted share envelope with one format contract for both sides. Contributions that keep it small and correct are very welcome.

## The one hard rule

**The envelope format is a wire contract.** A change that alters how an envelope is produced or parsed for a given version (the AES-GCM layout, the base64url encoding, the coded-mode wrap, or the frozen Argon2 parameters) can make existing envelopes undecryptable or make two implementations disagree. Any such change is a **new envelope version**, not a patch. If you intend it, say so explicitly in the PR and bump `ENVELOPE_VERSION`.

## Setup

```sh
git clone https://github.com/sonnetstationsolutions/share-envelope.git
cd share-envelope
npm install
```

## Develop and verify

```sh
npm run build   # typecheck + compile to build/
npm test        # tsc + the node:test suite (frozen vector + round-trips + error paths)
```

Both run in CI on every pull request and must pass. The test suite injects [`hash-wasm`](https://github.com/Daninet/hash-wasm) as the Argon2id and round-trips both link-only and coded modes end to end, so a break in the format contract fails the build.

## Cross-implementation agreement

Coded mode only works if the sharer's and recipient's Argon2id derive the same key from the same code. `assertArgon2Healthy` checks an implementation against the frozen vector in `src/kdf.ts`. If you change the Argon2 parameters or the frozen vector, update both and explain why — every downstream consumer's coded links depend on them staying fixed within a version.

## Pull requests

- One concern per PR. Keep diffs focused.
- Update the README and `CHANGELOG.md` when behavior or the public API changes.
- Fill out the PR checklist.

## Reporting bugs and security issues

Functional bugs go in [GitHub issues](https://github.com/sonnetstationsolutions/share-envelope/issues). **Security vulnerabilities must not** be filed as public issues — see [SECURITY.md](SECURITY.md).

By contributing, you agree your contributions are licensed under the project's [MIT License](LICENSE).
