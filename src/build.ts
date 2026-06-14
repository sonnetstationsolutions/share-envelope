// Sharer side: turn a payload into an opaque envelope blob (+ a fragment key for link-only mode).

import { gcm } from "@noble/ciphers/aes.js";
import {
  ARGON2,
  CEK_LEN,
  ENVELOPE_VERSION,
  IV_LEN,
  normalizeCode,
  toB64,
  toB64Url,
  type Envelope,
  type SharePayload,
} from "./envelope.js";
import type { Argon2idFn } from "./kdf.js";

const utf8 = new TextEncoder();

// Default CSPRNG via WebCrypto (browsers, Node 18+, modern Hermes). Inject `randomBytes` to use a
// platform source instead (e.g. expo-crypto's getRandomBytes).
function webcryptoRandomBytes(n: number): Uint8Array {
  const b = new Uint8Array(n);
  globalThis.crypto.getRandomValues(b);
  return b;
}

export interface BuildOptions {
  /** Out-of-band code for coded mode. Omit for link-only mode (CEK in the URL #fragment). */
  code?: string;
  /** Argon2id implementation. Required when `code` is set; ignored otherwise. */
  argon2id?: Argon2idFn;
  /** CSPRNG override. Defaults to WebCrypto getRandomValues. */
  randomBytes?: (n: number) => Uint8Array;
}

export interface BuiltEnvelope {
  /** Standard base64 of the opaque envelope blob — what the host stores. */
  ciphertextB64: string;
  /** base64url CEK for the link #fragment (link-only mode); null for coded mode (CEK is wrapped). */
  fragmentKey: string | null;
}

/**
 * Encrypt a payload into a share envelope.
 * - No `code`: link-only mode. The CEK is returned as `fragmentKey` to place in the link #fragment;
 *   the host never sees it.
 * - With `code`: coded mode. The CEK is wrapped under an Argon2id(code) key; the recipient must
 *   enter the code out-of-band. Requires `argon2id`.
 */
export async function buildEnvelope(payload: SharePayload, opts: BuildOptions = {}): Promise<BuiltEnvelope> {
  const randomBytes = opts.randomBytes ?? webcryptoRandomBytes;

  const cek = randomBytes(CEK_LEN);
  const iv = randomBytes(IV_LEN);
  const ct = gcm(cek, iv).encrypt(utf8.encode(JSON.stringify(payload)));

  const envelope: Envelope = { v: ENVELOPE_VERSION, iv: toB64Url(iv), ct: toB64Url(ct), wrap: null };
  let fragmentKey: string | null = null;

  if (opts.code) {
    if (!opts.argon2id) {
      throw new Error("buildEnvelope: coded mode requires an `argon2id` implementation.");
    }
    const salt = randomBytes(ARGON2.saltLen);
    const kek = await opts.argon2id({
      password: utf8.encode(normalizeCode(opts.code)),
      salt,
      memory: ARGON2.m,
      iterations: ARGON2.t,
      parallelism: ARGON2.p,
      hashLength: ARGON2.dkLen,
      version: ARGON2.version,
    });
    const wiv = randomBytes(IV_LEN);
    const wrappedCek = gcm(kek, wiv).encrypt(cek);
    envelope.wrap = {
      kdf: ARGON2.kdf,
      ver: ARGON2.version,
      m: ARGON2.m,
      t: ARGON2.t,
      p: ARGON2.p,
      salt: toB64Url(salt),
      iv: toB64Url(wiv),
      key: toB64Url(wrappedCek),
    };
  } else {
    fragmentKey = toB64Url(cek);
  }

  return { ciphertextB64: toB64(utf8.encode(JSON.stringify(envelope))), fragmentKey };
}
