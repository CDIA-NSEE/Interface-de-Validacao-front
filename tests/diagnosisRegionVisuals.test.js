import assert from "node:assert/strict";
import test from "node:test";

import {
  getDiagnosisRegionVisual,
  getDiagnosisReviewStatus,
  getDiagnosisVisualStatus,
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

test("previews a confirmed diagnosis as rejected without changing its persisted status", () => {
  const diagnosis = { id: 42, review_status: "confirmed" };

  assert.equal(getDiagnosisReviewStatus(diagnosis), "confirmed");
  assert.equal(getDiagnosisVisualStatus(diagnosis, "rejected"), "rejected");
  assert.equal(getDiagnosisRegionVisual(diagnosis, "rejected").status, "rejected");
  assert.equal(getDiagnosisReviewStatus(diagnosis), "confirmed");
});

test("restores the persisted visual when the disagreement preview is cancelled", () => {
  const confirmed = { id: 42, review_status: "confirmed" };
  const pending = { id: 43, review_status: "pending" };

  assert.equal(getDiagnosisVisualStatus(confirmed, "rejected"), "rejected");
  assert.equal(getDiagnosisVisualStatus(confirmed), "confirmed");
  assert.equal(getDiagnosisVisualStatus(pending, "rejected"), "rejected");
  assert.equal(getDiagnosisVisualStatus(pending), "pending");
});

test("keeps the rejected visual after the decision is persisted", () => {
  const diagnosis = { id: 42, review_status: "rejected" };

  assert.deepEqual(
    getDiagnosisRegionVisual(diagnosis, "rejected"),
    getDiagnosisRegionVisual(diagnosis),
  );
});
