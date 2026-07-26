import assert from "node:assert/strict";
import test from "node:test";
import { silentLogger } from "../src/common/logger.js";
import { DistributedProcess } from "../src/parte-b-vetorial/DistributedProcess.js";
import {
  runCausalScenario,
  runConcurrentScenario,
} from "../src/parte-b-vetorial/scenarios.js";
import { VectorRelation } from "../src/parte-b-vetorial/types.js";

test("vetor inicia com N zeros e evento interno incrementa a posição local", () => {
  const process = new DistributedProcess(1, 3);
  assert.deepEqual(process.getVectorClock(), [0, 0, 0]);
  const event = process.internalEvent("A", "Evento de teste.");
  assert.deepEqual(event.vectorClock, [0, 1, 0]);
});

test("envio incrementa o remetente e transporta uma cópia do vetor", () => {
  const process = new DistributedProcess(0, 3);
  const message = process.sendMessage("M1", 2);
  assert.deepEqual(process.getVectorClock(), [1, 0, 0]);
  assert.deepEqual(message.vectorClock, [1, 0, 0]);

  process.internalEvent("A", "Novo evento.");
  assert.deepEqual(message.vectorClock, [1, 0, 0]);
});

test("recebimento combina máximos e depois incrementa o receptor", () => {
  const sender = new DistributedProcess(0, 3);
  sender.internalEvent("A", "Primeiro evento.");
  const message = sender.sendMessage("M1", 1);
  const receiver = new DistributedProcess(1, 3);
  receiver.internalEvent("LOCAL", "Evento local.");

  const received = receiver.receiveMessage("R1", message);
  assert.deepEqual(received.vectorClock, [2, 2, 0]);
});

test("retornos não permitem mutar o estado interno", () => {
  const process = new DistributedProcess(0, 3);
  const externalVector = process.getVectorClock();
  externalVector[0] = 99;
  assert.deepEqual(process.getVectorClock(), [0, 0, 0]);

  process.internalEvent("A", "Evento original.");
  const history = process.getEventHistory();
  history.splice(0);
  assert.equal(process.getEventHistory().length, 1);
});

test("eventos antigos preservam o snapshot original", () => {
  const process = new DistributedProcess(2, 3);
  const first = process.internalEvent("A", "Primeiro.");
  process.internalEvent("B", "Segundo.");
  assert.deepEqual(first.vectorClock, [0, 0, 1]);
});

test("cenários causal e concorrente são independentes", () => {
  const causal = runCausalScenario(silentLogger);
  const concurrent = runConcurrentScenario(silentLogger);

  assert.equal(causal.relation, VectorRelation.BEFORE);
  assert.equal(concurrent.relation, VectorRelation.CONCURRENT);
  assert.deepEqual(concurrent.eventX.vectorClock, [1, 0, 0]);
  assert.deepEqual(concurrent.eventY.vectorClock, [0, 0, 1]);
});
