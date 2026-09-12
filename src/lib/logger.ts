import pino from "pino";

// Redact anything that could remotely be a secret, even if a caller
// accidentally passes it in a log object (belt-and-suspenders on top of
// "never log secrets" everywhere else in the codebase).
export const logger = pino({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  redact: {
    paths: [
      "*.password",
      "*.passwordHash",
      "*.token",
      "*.apiKey",
      "*.api_key",
      "*.secret",
      "*.authorization",
      "req.headers.authorization",
      "req.headers.cookie",
    ],
    censor: "[redacted]",
  },
});
