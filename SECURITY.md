# Security Policy

## Reporting a vulnerability

Please report security vulnerabilities **privately**, not as a public issue or pull request.

Use GitHub's private vulnerability reporting:
**[Report a vulnerability](https://github.com/sonnetstationsolutions/share-envelope/security/advisories/new)** (Security tab → Report a vulnerability).

Please include enough detail to reproduce: affected version, the mode involved (link-only or coded), the injected Argon2id implementation, and the observed vs. expected behavior. We will acknowledge the report and work with you on a fix and coordinated disclosure.

## Scope

This package builds and opens server-blind encrypted envelopes. The security-relevant properties are:

- **Confidentiality of the payload against the host.** The host must only ever see the opaque blob. A defect that places plaintext or the content key where the host can read it is in scope.
- **Format-level correctness of the AEAD and the coded-mode key wrap.** A defect that weakens AES-256-GCM usage (e.g. nonce reuse) or the Argon2id wrap is in scope.
- **Cross-implementation agreement.** A change that makes a conforming sharer and recipient derive different coded-mode keys (silently breaking decryption) is treated as a security-relevant correctness issue.

Out of scope:

- **The injected Argon2id and CSPRNG.** This package does not implement Argon2id or random-byte generation; the caller supplies them. Report KDF defects to that implementation. `assertArgon2Healthy` is provided so callers can detect a drifted KDF.
- **Code/parameter strength.** Coded mode is only as strong as the code's entropy. Choosing weak codes or weakening the frozen Argon2 parameters is the caller's responsibility.
- **Link distribution.** A link-only fragment key is only server-blind until the link is distributed; how links are sent is out of this package's control (see the README security notes).

## Supported versions

This project is pre-1.0. Security fixes are released against the latest published version.
