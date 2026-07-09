export function getPreviewDayIndex(defaultIndex: number, totalDays: number) {
  if (!import.meta.env.DEV) return defaultIndex;

  const params = new URLSearchParams(window.location.search);
  const previewDay = Number(params.get("previewDay"));

  if (!Number.isFinite(previewDay) || previewDay < 1) return defaultIndex;

  return Math.min(previewDay - 1, Math.max(totalDays - 1, 0));
}
