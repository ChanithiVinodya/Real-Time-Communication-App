const REQUIRED_VARS = [
  "JWT_SECRET",
  "TURN_SECRET",
  "FILE_ENCRYPTION_KEY",
  "MONGO_URI",
];
const PLACEHOLDER_VALUES = [
  "change_this_to_a_long_random_string",
  "change_this_too",
  "change_this_hex_key",
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
