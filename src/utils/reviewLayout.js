export const DEFAULT_ECG_ASPECT_RATIO = 1125 / 645;
export const REVIEW_MOBILE_BREAKPOINT = 768;

export function isCompactReviewWidth(width) {
  return Number.isFinite(width) && width < REVIEW_MOBILE_BREAKPOINT;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function getReviewSidebarWidth({
  imageAspectRatio,
  layoutHeight,
  layoutWidth,
  maximumSidebarRatio,
  minimumSidebarWidth,
  viewerHorizontalChrome,
  viewerVerticalChrome,
}) {
  const imageHeight = Math.max(0, layoutHeight - viewerVerticalChrome);
  const preferredViewerWidth = imageHeight * imageAspectRatio + viewerHorizontalChrome;
  const maximumSidebarWidth = Math.max(
    minimumSidebarWidth,
    layoutWidth * maximumSidebarRatio,
  );

  return Math.round(
    clamp(layoutWidth - preferredViewerWidth, minimumSidebarWidth, maximumSidebarWidth),
  );
}
