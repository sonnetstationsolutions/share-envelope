import test from "node:test";
import assert from "node:assert/strict";
import { assertArgon2Healthy, FROZEN_VECTOR, type Argon2idFn } from "../index.js";
import { hashWasmArgon2id } from "./kdf-adapter.js";

test("a conforming Argon2id reproduces the frozen vector", async () => {
  await assert.doesNotReject(assertArgon2Healthy(hashWasmArgon2id));
});

test("a drifted Argon2id is rejected", async () => {
  const wrong: Argon2idFn = async () => new Uint8Array(32); // all zeros, never the vector
  await assert.rejects(assertArgon2Healthy(wrong), /frozen vector/);
});

test("the frozen vector constants are stable", () => {
  assert.equal(FROZEN_VECTOR.password, "ABCD2345");
  assert.equal(FROZEN_VECTOR.saltByte, 0x07);
  assert.equal(FROZEN_VECTOR.expectedHex.length, 64);
});
