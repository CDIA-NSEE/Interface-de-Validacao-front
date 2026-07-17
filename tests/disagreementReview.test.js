import assert from "node:assert/strict";
import test from "node:test";

import { hasDisagreementNote } from "../src/utils/disagreementReview.js";

test("requires meaningful text before saving a disagreement observation", () => {
  assert.equal(hasDisagreementNote(""), false);
  assert.equal(hasDisagreementNote("   "), false);
  assert.equal(hasDisagreementNote(undefined), false);
  assert.equal(hasDisagreementNote("Revisar alteracao em V2"), true);
});
