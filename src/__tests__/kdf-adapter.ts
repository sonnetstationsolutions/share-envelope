// hash-wasm adapter to the canonical Argon2idFn signature, used as the KDF in tests. The same
// adapter pattern is what a recipient web page uses. (The app side uses expo-argon2, whose signature
// already matches Argon2idFn, so it needs no adapter.)

import { argon2id as wasmArgon2id } from "hash-wasm";
import type { Argon2idFn } from "../kdf.js";

export const hashWasmArgon2id: Argon2idFn = ({ password, salt, memory, iterations, parallelism, hashLength }) =>
  wasmArgon2id({
    password,
    salt,
    memorySize: memory,
    iterations,
    parallelism,
    hashLength,
    outputType: "binary",
  });
