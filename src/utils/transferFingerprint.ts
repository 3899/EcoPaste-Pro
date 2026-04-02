const TRANSFER_ECHO_TTL_MS = 10_000;

const transferEchoCache = new Map<string, number>();

const cleanupExpiredFingerprints = () => {
  const now = Date.now();

  for (const [fingerprint, expiresAt] of transferEchoCache.entries()) {
    if (expiresAt <= now) {
      transferEchoCache.delete(fingerprint);
    }
  }
};

const normalizeFingerprintValue = (type: string, value: unknown) => {
  if (Array.isArray(value)) {
    return JSON.stringify(value.map((item) => String(item)));
  }

  if (typeof value !== "string") {
    return JSON.stringify(value ?? "");
  }

  if (type === "html") {
    return value.trim();
  }

  return value;
};

const buildTransferFingerprint = (type: string, value: unknown) => {
  return `${type}::${normalizeFingerprintValue(type, value)}`;
};

export const rememberTransferEchoFingerprint = (
  type: string,
  value: unknown,
) => {
  cleanupExpiredFingerprints();
  transferEchoCache.set(
    buildTransferFingerprint(type, value),
    Date.now() + TRANSFER_ECHO_TTL_MS,
  );
};

export const consumeTransferEchoFingerprint = (
  type: string,
  value: unknown,
) => {
  cleanupExpiredFingerprints();

  const fingerprint = buildTransferFingerprint(type, value);
  const expiresAt = transferEchoCache.get(fingerprint);

  if (!expiresAt) {
    return false;
  }

  transferEchoCache.delete(fingerprint);
  return expiresAt > Date.now();
};
