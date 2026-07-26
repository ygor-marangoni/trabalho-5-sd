import assert from "node:assert/strict";
import test from "node:test";
import { compareVectors } from "../src/parte-b-vetorial/compareVectors.js";
import { VectorRelation } from "../src/parte-b-vetorial/types.js";

test("identifica BEFORE", () => {
  assert.equal(compareVectors([1, 0, 0], [2, 1, 0]), VectorRelation.BEFORE);
});

test("identifica AFTER", () => {
  assert.equal(compareVectors([3, 2, 0], [2, 1, 0]), VectorRelation.AFTER);
});

test("identifica EQUAL", () => {
  assert.equal(compareVectors([1, 2, 3], [1, 2, 3]), VectorRelation.EQUAL);
});

test("identifica CONCURRENT por componentes opostos", () => {
  assert.equal(
    compareVectors([1, 0, 0], [0, 0, 1]),
    VectorRelation.CONCURRENT,
  );
});

test("rejeita vetores de tamanhos diferentes", () => {
  assert.throws(
    () => compareVectors([1, 0], [1, 0, 0]),
    /tamanhos diferentes/,
  );
});
