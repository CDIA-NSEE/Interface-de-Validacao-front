import assert from "node:assert/strict";
import test from "node:test";

import { getReviewSidebarWidth } from "../src/utils/reviewLayout.js";

test("gives the sidebar only the space left after preserving the ECG ratio", () => {
  assert.equal(
    getReviewSidebarWidth({
      imageAspectRatio: 1.8,
      layoutHeight: 800,
      layoutWidth: 1920,
      maximumSidebarWidth: 510,
      minimumSidebarWidth: 340,
      viewerHorizontalChrome: 30,
      viewerVerticalChrome: 72,
    }),
    510,
  );

  assert.equal(
    getReviewSidebarWidth({
      imageAspectRatio: 1.8,
      layoutHeight: 800,
      layoutWidth: 1500,
      maximumSidebarWidth: 510,
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
      maximumSidebarWidth: 510,
      minimumSidebarWidth: 340,
      viewerHorizontalChrome: 30,
      viewerVerticalChrome: 72,
    }),
    428,
  );
});

test("keeps the sidebar functional at intermediate and narrow widths", () => {
  assert.equal(
    getReviewSidebarWidth({
      imageAspectRatio: 1.6,
      layoutHeight: 720,
      layoutWidth: 1000,
      maximumSidebarWidth: 390,
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
      maximumSidebarWidth: 300,
      minimumSidebarWidth: 250,
      viewerHorizontalChrome: 30,
      viewerVerticalChrome: 72,
    }),
    250,
  );
});
