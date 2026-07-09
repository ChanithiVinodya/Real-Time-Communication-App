const REQUIRED_VARS = [
  "JWT_SECRET",
  "TURN_SECRET",
  "FILE_ENCRYPTION_KEY",
  "MONGO_URI",
];
const PLACEHOLDER_VALUES = [
  "sh157frve7y8g9h0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d1e2f3g4h5i6j7k8l9m0n1o2p3q4r5s6t7u8v9w0x1y2z3a4b5c6d7e8f9g0h1i2j3k4l5m6n7o8p9q0r1s2t3u4v5w6x7y8z9a0b1c2d3e4f5g6h7i8j9k0l1m2n3o4p5q6r7s8t9u0v1w2x3y4z5a6b7c8d9e0f1g2h3i4j5k6l7m8n9o0p1q2r3s4t5u6v7w8x9y0z1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d1e2f3g4h5i6j7k8l9m0n1o2p3q4r5s6t7u8v9w0x1y2z3a4b5c6d7e8f9g0h1i2j3k4l5m6n7o8p9q0r1s2t3u4v5w6x7y8z9a0b1c2d3e4f5g6h7i8j9k0l1m2n3o4p5q6r7s8t9u0v1w2x3y4z5a6b7c8d9e0f1g2h3i4j5k6l7m8n9o0p1q2r3s4t5u6",
  "bn5748hgty75_t758-ty8374g8h3g7h3g7h3g7h3g7h3g7h3g7h3g7h3g7h3g7h3g7h3g7h3g7h3g7h3g7h3g7h3g7h3g7h3g7h3g7h3g7h3g7h3g7h3g7h3g7h3g7h3g7h3g7h3g7h3g7h3g7h3g7",
  "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2g3h4i5j6k7l8m9n0o1p2q3r4s5t6u7v8w9x0y1z2a3b4c5d6e7f8g9h0i1j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6y7z8a9b0c1d2e3f4g5h6i7j8k9l0m1n2o3p4q5r6s7t8u9v0w1x2y3z4a5b6c7d8e9f0g1h2i3j4k5l6m7n8o9p0q1r2s3t4u5v6w7x8y9z0a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2g3h4i5j6k7l8m9n0o1p2q3r4s5t6u7v8w9x0y1z2a3b4c5d6e7f8g9h0i1j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6y7z8a9b0c1d2e3f4g5h6i7j8k9l0m1n2o3p4q5r6s7t8u9v0w1x2y3z4a5b6c7d8e9f0g1h2i3j4k5l6m7n8o9p0",
];

// Fail loudly at startup rather than silently running with a missing or
// copy-pasted placeholder secret — the kind of mistake that's easy to make
// once and very expensive to discover later.
export function validateEnv() {
  const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
  if (missing.length) {
    console.error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
    process.exit(1);
  }

  const placeholders = REQUIRED_VARS.filter((key) =>
    PLACEHOLDER_VALUES.includes(process.env[key]),
  );
  if (placeholders.length) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        `Refusing to start in production with placeholder secrets: ${placeholders.join(", ")}`,
      );
      process.exit(1);
    }
    console.warn(
      `Using placeholder values for: ${placeholders.join(", ")} — fine for local dev, not for anything else.`,
    );
  }

  if (
    process.env.FILE_ENCRYPTION_KEY &&
    !/^[0-9a-f]{64}$/i.test(process.env.FILE_ENCRYPTION_KEY)
  ) {
    console.error(
      "FILE_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). Generate one with: openssl rand -hex 32",
    );
    process.exit(1);
  }
}
