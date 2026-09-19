import assert from "node:assert/strict";
import test from "node:test";

import {
  createDiagnosisReferences,
  getActiveRegionReference,
  getDiagnosisDisplayGroups,
  getDiagnosisReference,
  getRegionReference,
  normalizeDiagnosisText,
} from "../src/utils/diagnosisReferences.js";

test("normalizes diagnosis text safely for the review cards", () => {
  assert.equal(normalizeDiagnosisText("Ritmo sinusal"), "RITMO SINUSAL");
  const accentedArea = `${String.fromCharCode(0x00e1)}rea eletricamente inativa`;
  assert.equal(normalizeDiagnosisText(accentedArea), "AREA ELETRICAMENTE INATIVA");
  assert.equal(normalizeDiagnosisText(undefined), "");
});

test("creates D1.1 references in the same order shown in the diagnosis panel", () => {
  const diagnoses = [
    { id: 20, source: "original", standard_text: "Atraso final de conducao" },
    { id: 10, source: "original", standard_text: "Ritmo sinusal" },
    { id: 30, source: "doctor_added", standard_text: "Outro diagnostico" },
  ];
  const groups = getDiagnosisDisplayGroups(diagnoses, {
    dailyStandardDiagnosis: "Ritmo sinusal",
  });
  const references = createDiagnosisReferences(groups.displayOrder);

  assert.deepEqual(groups.displayOrder.map((diagnosis) => diagnosis.id), [10, 20, 30]);
  assert.equal(getDiagnosisReference(references, 10), "D1");
  assert.equal(getDiagnosisReference(references, 20), "D2");
  assert.equal(getDiagnosisReference(references, 30), "D3");
  assert.equal(getRegionReference("D1", 0), "D1.1");
  assert.equal(getRegionReference("D1", 1), "D1.2");
  assert.equal(getRegionReference("D2", 0), "D2.1");
});

test("keeps persisted references when an edited region is excluded from the visible list", () => {
  const regions = [
    { id: 1, regionReference: "D1.1" },
    { id: 2, regionReference: "D1.2" },
    { id: 3, regionReference: "D1.3" },
    { id: 4, regionReference: "D2.1" },
  ];

  const visibleReferences = regions
    .filter((region) => region.id !== 1)
    .map((region) => region.regionReference);

  assert.deepEqual(visibleReferences, ["D1.2", "D1.3", "D2.1"]);
  assert.equal(getActiveRegionReference("D1", regions, { regionId: 1 }), "D1.1");
});

test("uses the next local reference for a draft and none for an unassigned area", () => {
  assert.equal(getRegionReference("D1", 3), "D1.4");
  assert.equal(getActiveRegionReference("D1", [{ id: 1 }, { id: 2 }, { id: 3 }], {}), "D1.4");
  assert.equal(getRegionReference(null, 0), null);
  assert.equal(getRegionReference("D1", -1), null);
});

test("keeps all original diagnoses together during general review", () => {
  const groups = getDiagnosisDisplayGroups(
    [
      { id: 1, source: "original" },
      { id: 2, source: "doctor_added" },
      { id: 3, source: "original" },
    ],
    { isGeneralReviewDay: true },
  );

  assert.deepEqual(groups.displayOrder.map((diagnosis) => diagnosis.id), [1, 3, 2]);
});
