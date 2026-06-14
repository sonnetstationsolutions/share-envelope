// The envelope format contract — the single source of truth both sides agree on.
//
// An envelope is server-blind: a host can store and hand out the opaque blob without being able to
// read it. The content-encryption key (CEK) either travels in the link #fragment (link-only mode,
// `wrap: null`) or is wrapped under a key derived from an out-of-band code (coded mode, `wrap` set).
//
// Wire shape (JSON, UTF-8):
//   { v, iv, ct, wrap }
//     v    : envelope version
//     iv   : base64url 12-byte AES-GCM nonce for the payload
//     ct   : base64url payload ciphertext WITH the appended 16-byte GCM tag
//     wrap : null for link-only mode; for coded mode { kdf, ver, m, t, p, salt, iv, key }
//            where `key` is the CEK encrypted with AES-GCM under an Argon2id(code) key.

export const ENVELOPE_VERSION = 1;

export const IV_LEN = 12; // AES-GCM nonce
export const CEK_LEN = 32; // AES-256 content key

// Argon2id parameters for coded mode. Frozen: both sides must derive with these exact values or a
// coded link won't open. The companion frozen vector (see kdf.ts) asserts an implementation agrees.
export const ARGON2 = Object.freeze({
  kdf: "argon2id" as const,
  version: 0x13, // 19
  m: 65536, // memory in KiB (64 MiB)
  t: 3, // iterations
  p: 1, // parallelism
  dkLen: 32, // derived key length (AES-256)
  saltLen: 16,
});

// Coded-mode wrap material: the CEK encrypted with AES-GCM under an Argon2id(code)-derived key.
export interface WrapInfo {
  kdf: string;
  ver: number;
  m: number;
  t: number;
  p: number;
  salt: string; // base64url
  iv: string; // base64url
  key: string; // base64url wrapped CEK
}

export interface Envelope {
  v: number;
  iv: string; // base64url 12-byte nonce
  ct: string; // base64url ciphertext WITH appended 16-byte GCM tag
  wrap: WrapInfo | null;
}

// The decrypted bundle. Subject-agnostic: a list of typed cards, each a flat string map. The
// consuming app gives `type` and field keys meaning; this package never inspects them.
export interface SharePayload {
  v: number;
  cards: { type: string; fields: Record<string, string> }[];
}

// Codes are normalized identically on both sides before key derivation.
export function normalizeCode(code: string): string {
  return code.toUpperCase().replace(/[\s-]/g, "");
}

// True if the envelope needs an out-of-band code to open (coded mode).
export function needsCode(envelope: Envelope): boolean {
  return !!envelope.wrap;
}

// --- base64 / base64url (binary-string bridge; works on Hermes, browsers, and Node) ---

function bytesToBinary(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return s;
}

function binaryToBytes(bin: string): Uint8Array {
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u;
}

export function toB64(bytes: Uint8Array): string {
  return btoa(bytesToBinary(bytes));
}

export function fromB64(str: string): Uint8Array {
  return binaryToBytes(atob(str));
}

export function toB64Url(bytes: Uint8Array): string {
  return toB64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromB64Url(str: string): Uint8Array {
  return fromB64(str.replace(/-/g, "+").replace(/_/g, "/"));
}
