type ScrollMetrics = {
  layoutHeight: number;
  offsetY: number;
  contentHeight: number;
};

export function isNearFeedBottom(
  metrics: ScrollMetrics,
  threshold = 220,
) {
  return metrics.layoutHeight + metrics.offsetY >= metrics.contentHeight - threshold;
}
