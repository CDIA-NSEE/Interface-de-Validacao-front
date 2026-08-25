export const DEFAULT_ECG_ASPECT_RATIO = 1125 / 645;

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function getReviewSidebarWidth({
  imageAspectRatio,
  layoutHeight,
  layoutWidth,
  maximumSidebarWidth,
  minimumSidebarWidth,
  viewerHorizontalChrome,
  viewerVerticalChrome,
}) {
  const imageHeight = Math.max(0, layoutHeight - viewerVerticalChrome);
  const preferredViewerWidth = imageHeight * imageAspectRatio + viewerHorizontalChrome;

  return Math.round(
    clamp(layoutWidth - preferredViewerWidth, minimumSidebarWidth, maximumSidebarWidth),
  );
}
