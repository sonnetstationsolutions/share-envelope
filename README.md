# share-envelope

[![CI](https://img.shields.io/github/actions/workflow/status/sonnetstationsolutions/share-envelope/ci.yml?branch=main&label=CI)](https://github.com/sonnetstationsolutions/share-envelope/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@sonnetstationsolutions/share-envelope)](https://www.npmjs.com/package/@sonnetstationsolutions/share-envelope)
[![license](https://img.shields.io/github/license/sonnetstationsolutions/share-envelope)](LICENSE)

Server-blind encrypted share envelopes. Encrypt a small payload (a note, a credential, any flat
key/value bundle) into one opaque blob a host can store and hand out **without ever being able to read
it**. The recipient opens it with either a key carried in the link's `#fragment` or an out-of-band
code.

- **Server-blind.** The host stores ciphertext only. No plaintext, no keys.
- **Two modes.** *Link-only* (the content key rides in the URL fragment, never sent to the server) or
  *coded* (the content key is wrapped under an Argon2id-derived key; the recipient enters a short code
  out-of-band).
- **One format, both sides agree.** A single contract drives the sharer and the recipient. A frozen
  Argon2id vector proves any two implementations will derive the same coded-mode key.
- **KDF injected.** AES-256-GCM is built in (`@noble/ciphers`, runs in browsers, Node, and Hermes).
  Argon2id is memory-hard and platform-specific, so **you** supply it — a native module on a device, or
  WebAssembly in a browser.
- **Zero coupling to your data.** Payloads are subject-agnostic typed cards; this package never inspects
  their meaning.

```
npm install @sonnetstationsolutions/share-envelope
```

## The model

```
            buildEnvelope(payload, { code? })        decryptShare(envelope, { fragmentKey? | code? })
 sharer  ───────────────────────────────────►  host store  ───────────────────────────────────►  recipient
          AES-256-GCM payload under a random CEK   (opaque blob)        AES-256-GCM with the CEK
          link-only: CEK → URL #fragment                                link-only: CEK from #fragment
          coded:     CEK wrapped by Argon2id(code)                      coded:     CEK unwrapped by Argon2id(code)
```

The envelope is `{ v, iv, ct, wrap }`: a versioned, base64url AES-GCM payload (`iv`/`ct`) plus `wrap`,
which is `null` for link-only mode or carries the code-wrapped content key for coded mode.

## Sharer

```ts
import { buildEnvelope } from "@sonnetstationsolutions/share-envelope";

const payload = { v: 1, cards: [{ type: "note", fields: { title: "Guest Wi-Fi", body: "network + passphrase" } }] };

// Link-only: nothing extra needed.
const { ciphertextB64, fragmentKey } = await buildEnvelope(payload);
// POST ciphertextB64 to your host; build the link as https://share.example/s/<id>#<fragmentKey>

// Coded: supply an Argon2id and a code. No key ends up in the link.
const coded = await buildEnvelope(payload, { code: "ABCD-2345", argon2id });
// coded.fragmentKey === null
```

On **Expo / React Native**, pass [`@sonnetstationsolutions/expo-argon2`](https://github.com/sonnetstationsolutions/expo-argon2)
directly (its signature matches `Argon2idFn`) and inject `expo-crypto` as the CSPRNG:

```ts
import { argon2id } from "@sonnetstationsolutions/expo-argon2";
import * as Crypto from "expo-crypto";

await buildEnvelope(payload, { code, argon2id, randomBytes: Crypto.getRandomBytes });
```

## Recipient

```ts
import { decryptShare, needsCode } from "@sonnetstationsolutions/share-envelope";

const envelope = JSON.parse(atob(ciphertextB64FromHost)); // the opaque blob

const payload = needsCode(envelope)
  ? await decryptShare(envelope, { code: userEnteredCode, argon2id })
  : await decryptShare(envelope, { fragmentKey: location.hash.slice(1) });
```

In a browser, adapt [`hash-wasm`](https://github.com/Daninet/hash-wasm) to `Argon2idFn`:

```ts
import { argon2id as wasmArgon2id } from "hash-wasm";

const argon2id = ({ password, salt, memory, iterations, parallelism, hashLength }) =>
  wasmArgon2id({ password, salt, memorySize: memory, iterations, parallelism, hashLength, outputType: "binary" });
```

## Cross-implementation agreement

Coded mode only works if the sharer's Argon2id and the recipient's Argon2id derive the **same** key
from the same code. Assert it once on each side (app startup, recipient page load, or CI):

```ts
import { assertArgon2Healthy } from "@sonnetstationsolutions/share-envelope";

await assertArgon2Healthy(argon2id); // throws if the implementation drifts from the frozen vector
```

If both sides pass, they agree on every coded-mode key. The package's own test suite runs this against
`hash-wasm` and round-trips both modes end to end.

## API

| Export | |
|---|---|
| `buildEnvelope(payload, opts?)` | Sharer. `opts.code` → coded mode (needs `opts.argon2id`); else link-only. `opts.randomBytes` overrides the CSPRNG. Returns `{ ciphertextB64, fragmentKey }`. |
| `decryptShare(envelope, opts?)` | Recipient. Supply `fragmentKey` (link-only) or `code` + `argon2id` (coded). Returns the payload. |
| `needsCode(envelope)` | `true` if the envelope is coded. |
| `assertArgon2Healthy(argon2id)` | Throws if an Argon2id implementation drifts from the frozen vector. |
| `normalizeCode`, `toB64`/`fromB64`, `toB64Url`/`fromB64Url` | Format helpers (same on both sides). |
| `ENVELOPE_VERSION`, `ARGON2`, `IV_LEN`, `CEK_LEN`, `FROZEN_VECTOR` | Constants. |

## Security notes

- **Link-only mode keeps the key off the server only until your backend distributes the link.** A
  `#fragment` is never sent to the server by the browser, but whoever builds and sends the link holds the
  key. Use coded mode when the distribution channel is the same as (or as trusted as) the host.
- **Coded mode is only as strong as the code.** Argon2id (64 MiB, t=3) makes guessing expensive, not
  impossible; use codes with real entropy.
- The Argon2id parameters are **frozen** in the format. Changing them is an envelope-version change.

## License

MIT © Sonnet Station Solutions, LLC
