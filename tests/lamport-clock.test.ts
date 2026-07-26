import assert from "node:assert/strict";
import test from "node:test";
import { LamportClock } from "../src/parte-a-lamport/LamportClock.js";

test("o relógio de Lamport inicia em zero", () => {
  const clock = new LamportClock();
  assert.equal(clock.getValue(), 0);
});

test("tick incrementa o relógio", () => {
  const clock = new LamportClock();
  assert.equal(clock.tick(), 1);
  assert.equal(clock.tick(), 2);
  assert.equal(clock.getValue(), 2);
});

test("update usa max(local, remoto) + 1", () => {
  const clock = new LamportClock();
  clock.tick();
  clock.tick();
  assert.equal(clock.update(7), 8);
  assert.equal(clock.update(3), 9);
});
