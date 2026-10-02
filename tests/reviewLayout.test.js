import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_ECG_ASPECT_RATIO,
  clampReviewSidebarWidth,
  getReviewSidebarBounds,
  getReviewSidebarWidth,
} from "../src/utils/reviewLayout.js";

test("gives the sidebar only the space left after preserving the ECG ratio", () => {
  assert.equal(
    getReviewSidebarWidth({
      imageAspectRatio: 1.8,
      layoutHeight: 800,
      layoutWidth: 1920,
      maximumSidebarRatio: 0.5,
      minimumSidebarWidth: 340,
      viewerHorizontalChrome: 30,
      viewerVerticalChrome: 72,
    }),
    580,
  );

  assert.equal(
    getReviewSidebarWidth({
      imageAspectRatio: 1.8,
      layoutHeight: 800,
      layoutWidth: 1500,
      maximumSidebarRatio: 0.5,
      minimumSidebarWidth: 340,
      viewerHorizontalChrome: 30,
      viewerVerticalChrome: 72,
    }),
    340,
  );
});

test("calculates an adaptive width between the sidebar limits", () => {
  assert.equal(
    getReviewSidebarWidth({
      imageAspectRatio: 1.5,
      layoutHeight: 700,
      layoutWidth: 1400,
      maximumSidebarRatio: 0.5,
      minimumSidebarWidth: 340,
      viewerHorizontalChrome: 30,
      viewerVerticalChrome: 72,
    }),
    428,
  );
});

test("keeps the desktop sidebar between thirty and thirty-two percent", () => {
  assert.equal(
    getReviewSidebarWidth({
      imageAspectRatio: 1.8,
      layoutHeight: 800,
      layoutWidth: 1920,
      maximumSidebarRatio: 0.32,
      minimumSidebarWidth: 576,
      viewerHorizontalChrome: 24,
      viewerVerticalChrome: 150,
    }),
    614,
  );

  assert.equal(
    getReviewSidebarWidth({
      imageAspectRatio: 1.8,
      layoutHeight: 800,
      layoutWidth: 1500,
      maximumSidebarRatio: 0.32,
      minimumSidebarWidth: 450,
      viewerHorizontalChrome: 24,
      viewerVerticalChrome: 150,
    }),
    450,
  );
});

test("keeps the sidebar functional at intermediate and narrow widths", () => {
  assert.equal(
    getReviewSidebarWidth({
      imageAspectRatio: 1.6,
      layoutHeight: 720,
      layoutWidth: 1000,
      maximumSidebarRatio: 0.46,
      minimumSidebarWidth: 300,
      viewerHorizontalChrome: 30,
      viewerVerticalChrome: 72,
    }),
    300,
  );

  assert.equal(
    getReviewSidebarWidth({
      imageAspectRatio: 1.6,
      layoutHeight: 640,
      layoutWidth: 600,
      maximumSidebarRatio: 0.5,
      minimumSidebarWidth: 250,
      viewerHorizontalChrome: 30,
      viewerVerticalChrome: 72,
    }),
    250,
  );

  assert.equal(
    getReviewSidebarWidth({
      imageAspectRatio: 1.6,
      layoutHeight: 640,
      layoutWidth: 380,
      maximumSidebarRatio: 0.5,
      minimumSidebarWidth: 250,
      viewerHorizontalChrome: 30,
      viewerVerticalChrome: 72,
    }),
    250,
  );
});

test("limits the doctor's sidebar width between 282px and the one-line title cap", () => {
  // 1920×1080: o ECG é limitado pela largura, então o painel pode ir ao mínimo absoluto.
  assert.deepEqual(
    getReviewSidebarBounds({
      automaticWidth: 414,
      imageAspectRatio: DEFAULT_ECG_ASPECT_RATIO,
      layoutHeight: 1080,
      layoutWidth: 1856,
      maximumSidebarCap: 624,
      viewerHorizontalChrome: 24,
      viewerVerticalChrome: 96,
    }),
    { maximum: 624, minimum: 282 },
  );
});

test("does not shrink the sidebar past the point where the ECG stops growing", () => {
  // 1536×730: abaixo de 342px o ECG já é limitado pela altura.
  assert.deepEqual(
    getReviewSidebarBounds({
      automaticWidth: 414,
      imageAspectRatio: DEFAULT_ECG_ASPECT_RATIO,
      layoutHeight: 730,
      layoutWidth: 1472,
      maximumSidebarCap: 624,
      viewerHorizontalChrome: 24,
      viewerVerticalChrome: 96,
    }),
    { maximum: 624, minimum: 342 },
  );
});

test("keeps the ECG at least as wide as the sidebar and the automatic width inside the limits", () => {
  // Janela de 1002px: metade da área é menor que o teto; a largura automática (281px) fica abaixo do mínimo absoluto.
  assert.deepEqual(
    getReviewSidebarBounds({
      automaticWidth: 281,
      imageAspectRatio: DEFAULT_ECG_ASPECT_RATIO,
      layoutHeight: 700,
      layoutWidth: 938,
      maximumSidebarCap: 624,
      viewerHorizontalChrome: 24,
      viewerVerticalChrome: 142,
    }),
    { maximum: 469, minimum: 281 },
  );

  assert.equal(clampReviewSidebarWidth(200, { maximum: 624, minimum: 282 }), 282);
  assert.equal(clampReviewSidebarWidth(700.4, { maximum: 624, minimum: 282 }), 624);
  assert.equal(clampReviewSidebarWidth(500.4, { maximum: 624, minimum: 282 }), 500);
});

test("raises the absolute minimum when a larger text size needs it to keep words whole", () => {
  // 1920×1080 no Muito grande: o ECG continua limitado pela largura, e o mínimo vem da palavra mais longa (324px).
  assert.deepEqual(
    getReviewSidebarBounds({
      absoluteMinimum: 324,
      automaticWidth: 443,
      imageAspectRatio: DEFAULT_ECG_ASPECT_RATIO,
      layoutHeight: 1080,
      layoutWidth: 1856,
      maximumSidebarCap: 764,
      viewerHorizontalChrome: 24,
      viewerVerticalChrome: 105,
    }),
    { maximum: 764, minimum: 324 },
  );
});
