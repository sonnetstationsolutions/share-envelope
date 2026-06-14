// Recipient side: open an envelope back into its payload. Runs anywhere with WebCrypto-free AEAD
// (browser, Node, Hermes) — AES-GCM is @noble; only the coded-mode KDF is injected.

import { gcm } from "@noble/ciphers/aes.js";
import { fromB64Url, normalizeCode, type Envelope, type SharePayload } from "./envelope.js";
import type { Argon2idFn } from "./kdf.js";

const utf8 = new TextDecoder();

export interface DecryptOptions {
  /** base64url CEK from the link #fragment (link-only mode). */
  fragmentKey?: string;
  /** Out-of-band code (coded mode). */
  code?: string;
  /** Argon2id implementation. Required when the envelope is coded (`envelope.wrap` set). */
  argon2id?: Argon2idFn;
}

/**
 * Decrypt a share envelope to its payload bundle.
 *
 * Throws:
 * - `UNSUPPORTED_VERSION` — envelope version this build doesn't understand.
 * - `CODE_REQUIRED` — coded envelope but no `code` supplied.
 * - `MISSING_ARGON2` — coded envelope but no `argon2id` supplied.
 * - `KEY_MISSING` — link-only envelope but no `fragmentKey` supplied.
 * - an AEAD error (bad GCM tag) if the code or key is wrong.
 */
export async function decryptShare(envelope: Envelope, opts: DecryptOptions = {}): Promise<SharePayload> {
  if (envelope.v !== 1) throw new Error("UNSUPPORTED_VERSION");

  let cek: Uint8Array;
  if (envelope.wrap) {
    if (!opts.code) throw new Error("CODE_REQUIRED");
    if (!opts.argon2id) throw new Error("MISSING_ARGON2");
    const wrap = envelope.wrap;
    const kek = await opts.argon2id({
      password: new TextEncoder().encode(normalizeCode(opts.code)),
      salt: fromB64Url(wrap.salt),
      memory: wrap.m,
      iterations: wrap.t,
      parallelism: wrap.p,
      hashLength: 32,
      version: wrap.ver,
    });
    cek = gcm(kek, fromB64Url(wrap.iv)).decrypt(fromB64Url(wrap.key));
  } else {
    if (!opts.fragmentKey) throw new Error("KEY_MISSING");
    cek = fromB64Url(opts.fragmentKey);
  }

  const ptBytes = gcm(cek, fromB64Url(envelope.iv)).decrypt(fromB64Url(envelope.ct));
  return JSON.parse(utf8.decode(ptBytes));
}
