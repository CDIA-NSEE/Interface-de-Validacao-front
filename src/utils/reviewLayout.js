export const DEFAULT_ECG_ASPECT_RATIO = 1125 / 645;
export const REVIEW_MOBILE_BREAKPOINT = 768;

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

// Largura escolhida pelo médico na divisória entre o painel e o ECG. Mínimo de 282px, o painel mais estreito que a tela
// já tinha (janelas de 921 a 1002px), com as adaptações do painel estreito; e nunca abaixo do ponto em que o ECG passa a
// ser limitado pela altura — dali para baixo encolher o painel só abriria faixas vazias ao lado do traçado (342px a
// 1536×730). Máximo onde o título mais longo do banco cabe numa linha (`maximumSidebarCap`; mais largo, o painel só
// ganha vazio), e nunca mais que metade da área: o ECG não fica menor que o painel. A largura automática fica sempre
// dentro dos limites (numa tela ultralarga ela passa do teto).
export const REVIEW_SIDEBAR_USER_MIN = 282;
const REVIEW_SIDEBAR_USER_MAX_RATIO = 0.5;

export function getReviewSidebarBounds({
  automaticWidth,
  imageAspectRatio,
  layoutHeight,
  layoutWidth,
  maximumSidebarCap,
  viewerHorizontalChrome,
  viewerVerticalChrome,
}) {
  const imageHeight = Math.max(0, layoutHeight - viewerVerticalChrome);
  const heightLimitedSidebarWidth = layoutWidth - (imageHeight * imageAspectRatio + viewerHorizontalChrome);
  const minimum = Math.min(
    automaticWidth,
    Math.round(Math.max(REVIEW_SIDEBAR_USER_MIN, heightLimitedSidebarWidth)),
  );
  const maximum = Math.max(
    automaticWidth,
    Math.round(Math.min(maximumSidebarCap, layoutWidth * REVIEW_SIDEBAR_USER_MAX_RATIO)),
  );

  return { maximum, minimum };
}

export function clampReviewSidebarWidth(width, { maximum, minimum }) {
  return Math.round(clamp(width, minimum, maximum));
}
