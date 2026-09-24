import assert from "node:assert/strict";
import test from "node:test";

import { hasDisagreementNote, normalizeReviewNote } from "../src/utils/disagreementReview.js";

test("limpa a justificativa: bordas, espaços no fim das linhas e linhas em branco repetidas", () => {
  assert.equal(normalizeReviewNote("Traçado incompatível.\n\n\n"), "Traçado incompatível.");
  assert.equal(normalizeReviewNote("\n\n  Traçado incompatível."), "Traçado incompatível.");
  assert.equal(normalizeReviewNote("A   \nB\t"), "A\nB");
  assert.equal(normalizeReviewNote("A\n\n\n\n\nB"), "A\n\nB");
  assert.equal(normalizeReviewNote("A\n  \n \t\n\nB"), "A\n\nB");
  assert.equal(normalizeReviewNote("A\r\n\r\nB"), "A\n\nB");
  // Parágrafos (uma linha em branco) e o recuo no começo de uma linha interna ficam.
  assert.equal(normalizeReviewNote("A\n\n  B"), "A\n\n  B");
  assert.equal(normalizeReviewNote("   \n  "), "");
  assert.equal(normalizeReviewNote(null), "");
  assert.equal(normalizeReviewNote(undefined), "");
});

test("requires meaningful text before saving a disagreement observation", () => {
  assert.equal(hasDisagreementNote(""), false);
  assert.equal(hasDisagreementNote("   "), false);
  assert.equal(hasDisagreementNote(undefined), false);
  assert.equal(hasDisagreementNote("Revisar alteracao em V2"), true);
});
