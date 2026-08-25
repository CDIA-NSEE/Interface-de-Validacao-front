import assert from "node:assert/strict";
import test from "node:test";

import { getReviewSidebarWidth } from "../src/utils/reviewLayout.js";

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

test("limits the sidebar to half of the layout on exceptionally wide screens", () => {
  assert.equal(
    getReviewSidebarWidth({
      imageAspectRatio: 1,
      layoutHeight: 600,
      layoutWidth: 1920,
      maximumSidebarRatio: 0.5,
      minimumSidebarWidth: 340,
      viewerHorizontalChrome: 30,
      viewerVerticalChrome: 72,
    }),
    960,
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
