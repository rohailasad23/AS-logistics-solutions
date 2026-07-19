export function parseMcValue(value, fallback = 1) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(1, Math.round(value));
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return fallback;
    }

    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      return fallback;
    }

    return Math.max(1, Math.round(parsed));
  }

  return fallback;
}

export function normalizeMcRange(start, end) {
  const nextStart = parseMcValue(start, 1);
  const nextEnd = parseMcValue(end, nextStart);

  if (nextStart <= nextEnd) {
    return { start: nextStart, end: nextEnd };
  }

  return { start: nextEnd, end: nextStart };
}
