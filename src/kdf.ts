// The KDF is injected, not bundled. Argon2id is memory-hard and platform-specific: a native module
// off the JS thread on a device, WebAssembly in a browser. This package owns the envelope format and
// the AEAD; the caller supplies an Argon2id that matches the canonical signature below.
//
// The signature mirrors @sonnetstationsolutions/expo-argon2 exactly, so on Expo you pass `argon2id`
// directly. For other implementations (e.g. hash-wasm) write a ~5-line adapter — see the README.

import { bytesToHex } from "@noble/ciphers/utils.js";
import { ARGON2 } from "./envelope.js";

export type Argon2idFn = (input: {
  password: Uint8Array;
  salt: Uint8Array;
  memory: number; // KiB
  iterations: number;
  parallelism: number;
  hashLength: number;
  version: number; // 0x13
}) => Promise<Uint8Array>;

// Canonical agreement vector: every conforming Argon2id must reproduce this exact output for these
// exact inputs. Salt is 16 bytes of 0x07; password is the ASCII "ABCD2345". If two implementations
// (sharer and recipient) both pass, they will agree on every coded-mode key.
export const FROZEN_VECTOR = Object.freeze({
  password: "ABCD2345",
  saltByte: 0x07,
  expectedHex: "7d0e2bc7e36bfc948fe53381065a22857b5a4612ef6770ce16719e8f04f8b53d",
});

/**
 * Run the supplied Argon2id against the frozen vector. Throws if it drifts — a silent KDF mismatch
 * would produce coded-mode envelopes the recipient can't open. Call once before trusting an
 * implementation to wrap a real key (e.g. on app startup, or in CI as a cross-impl agreement test).
 */
export async function assertArgon2Healthy(argon2id: Argon2idFn): Promise<void> {
  const out = await argon2id({
    password: new TextEncoder().encode(FROZEN_VECTOR.password),
    salt: new Uint8Array(ARGON2.saltLen).fill(FROZEN_VECTOR.saltByte),
    memory: ARGON2.m,
    iterations: ARGON2.t,
    parallelism: ARGON2.p,
    hashLength: ARGON2.dkLen,
    version: ARGON2.version,
  });
  if (bytesToHex(out) !== FROZEN_VECTOR.expectedHex) {
    throw new Error(
      "Argon2id self-test failed: implementation drifted from the frozen vector; coded-mode envelopes would not decrypt.",
    );
  }
}
