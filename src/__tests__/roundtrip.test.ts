import test from "node:test";
import assert from "node:assert/strict";
import { buildEnvelope, decryptShare, fromB64, needsCode, type Envelope, type SharePayload } from "../index.js";
import { hashWasmArgon2id } from "./kdf-adapter.js";

const payload: SharePayload = {
  v: 1,
  cards: [{ type: "note", fields: { title: "Guest Wi-Fi", body: "network + passphrase" } }],
};

// The host stores ciphertextB64 and hands it back as the opaque blob; the recipient parses it.
function parseBlob(ciphertextB64: string): Envelope {
  return JSON.parse(new TextDecoder().decode(fromB64(ciphertextB64)));
}

test("link-only mode round-trips via the fragment key", async () => {
  const { ciphertextB64, fragmentKey } = await buildEnvelope(payload);
  assert.ok(fragmentKey, "link-only mode returns a fragment key");

  const envelope = parseBlob(ciphertextB64);
  assert.equal(needsCode(envelope), false);

  const out = await decryptShare(envelope, { fragmentKey: fragmentKey! });
  assert.deepEqual(out, payload);
});

test("coded mode round-trips via the code", async () => {
  const { ciphertextB64, fragmentKey } = await buildEnvelope(payload, {
    code: "abcd-2345",
    argon2id: hashWasmArgon2id,
  });
  assert.equal(fragmentKey, null, "coded mode keeps no key in the link");

  const envelope = parseBlob(ciphertextB64);
  assert.equal(needsCode(envelope), true);

  // Code is normalized (case-insensitive, separators stripped) on both sides.
  const out = await decryptShare(envelope, { code: "ABCD2345", argon2id: hashWasmArgon2id });
  assert.deepEqual(out, payload);
});

test("a wrong code fails to open a coded envelope", async () => {
  const { ciphertextB64 } = await buildEnvelope(payload, { code: "ABCD2345", argon2id: hashWasmArgon2id });
  const envelope = parseBlob(ciphertextB64);
  await assert.rejects(decryptShare(envelope, { code: "WRONGONE", argon2id: hashWasmArgon2id }));
});

test("coded build without an argon2id throws", async () => {
  await assert.rejects(buildEnvelope(payload, { code: "ABCD2345" }), /requires an `argon2id`/);
});

test("coded envelope without a code throws CODE_REQUIRED", async () => {
  const { ciphertextB64 } = await buildEnvelope(payload, { code: "ABCD2345", argon2id: hashWasmArgon2id });
  const envelope = parseBlob(ciphertextB64);
  await assert.rejects(decryptShare(envelope, { argon2id: hashWasmArgon2id }), /CODE_REQUIRED/);
});

test("link-only envelope without a fragment key throws KEY_MISSING", async () => {
  const { ciphertextB64 } = await buildEnvelope(payload);
  const envelope = parseBlob(ciphertextB64);
  await assert.rejects(decryptShare(envelope, {}), /KEY_MISSING/);
});
