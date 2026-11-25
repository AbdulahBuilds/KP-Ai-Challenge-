const etaUpdates = new Map();

export function recordEta(externalRequestId, etaMinutes) {
  etaUpdates.set(externalRequestId, {
    etaMinutes: Number(etaMinutes) || 0,
    updatedAt: new Date().toISOString(),
  });
  return etaUpdates.get(externalRequestId);
}

export function getEta(externalRequestId) {
  return etaUpdates.get(externalRequestId) ?? null;
}
