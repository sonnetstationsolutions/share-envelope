export {
  ENVELOPE_VERSION,
  IV_LEN,
  CEK_LEN,
  ARGON2,
  normalizeCode,
  needsCode,
  toB64,
  fromB64,
  toB64Url,
  fromB64Url,
  type Envelope,
  type WrapInfo,
  type SharePayload,
} from "./envelope.js";
export { buildEnvelope, type BuildOptions, type BuiltEnvelope } from "./build.js";
export { decryptShare, type DecryptOptions } from "./decrypt.js";
export { assertArgon2Healthy, FROZEN_VECTOR, type Argon2idFn } from "./kdf.js";
