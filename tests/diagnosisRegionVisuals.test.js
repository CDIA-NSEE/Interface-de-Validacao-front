import assert from "node:assert/strict";
import test from "node:test";

import {
  getDiagnosisRegionVisual,
  getDiagnosisReviewStatus,
} from "../src/utils/diagnosisRegionVisuals.js";

test("keeps the same visual for every region of a diagnosis", () => {
  const diagnosis = { id: 42, review_status: "confirmed" };

  assert.deepEqual(getDiagnosisRegionVisual(diagnosis), getDiagnosisRegionVisual(diagnosis));
});

test("uses distinct status palettes for confirmed and rejected diagnoses", () => {
  const confirmed = getDiagnosisRegionVisual({ id: 42, review_status: "confirmed" });
  const rejected = getDiagnosisRegionVisual({ id: 42, review_status: "rejected" });

  assert.equal(confirmed.status, "confirmed");
  assert.equal(rejected.status, "rejected");
  assert.notEqual(confirmed.color, rejected.color);
  assert.notEqual(confirmed.fill, rejected.fill);
});

test("uses one neutral visual for pending diagnoses", () => {
  const firstPending = getDiagnosisRegionVisual({ id: 1, review_status: "pending" });
  const secondPending = getDiagnosisRegionVisual({ id: 999, validation_status: "pending" });

  assert.deepEqual(firstPending, secondPending);
  assert.equal(firstPending.status, "pending");
});

test("uses validation status before review status", () => {
  assert.equal(
    getDiagnosisReviewStatus({ validation_status: "rejected", review_status: "confirmed" }),
    "rejected",
  );
});
