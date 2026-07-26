import { ConsoleLogger, type Logger } from "../common/logger.js";
import { formatVector } from "../common/utils.js";
import { compareVectors } from "./compareVectors.js";
import { DistributedProcess } from "./DistributedProcess.js";
import type { DistributedEvent } from "./types.js";
import { VectorRelation } from "./types.js";

export interface CausalScenarioResult {
  readonly eventA: DistributedEvent;
  readonly eventB: DistributedEvent;
  readonly relation: VectorRelation;
}

export interface ConcurrentScenarioResult {
  readonly eventX: DistributedEvent;
  readonly eventY: DistributedEvent;
  readonly relation: VectorRelation;
}

function createProcesses(count = 3): DistributedProcess[] {
  return Array.from(
    { length: count },
    (_, id) => new DistributedProcess(id, count),
  );
}

export function runCausalScenario(
  logger: Logger = new ConsoleLogger(),
): CausalScenarioResult {
  // Cada cenário cria processos novos para não compartilhar estado vetorial.
  const processes = createProcesses();
  const process0 = processes[0];
  const process1 = processes[1];
  if (process0 === undefined || process1 === undefined) {
    throw new Error("O cenário causal exige P0 e P1.");
  }

  logger.line("CENÁRIO 1 — CADEIA CAUSAL\n");
  const eventA = process0.internalEvent("A", "Evento interno A em P0.");
  logger.line(`Evento A\nProcesso: P0\nTipo: INTERNAL\nVetor: ${formatVector(eventA.vectorClock)}\n`);

  const message = process0.sendMessage("M1-SEND", 1);
  logger.line(
    `Envio de M1\nOrigem: P0\nDestino: P1\nVetor enviado: ${formatVector(message.vectorClock)}\n`,
  );

  const receiveEvent = process1.receiveMessage("M1-RECEIVE", message);
  logger.line(
    `Recebimento de M1\nProcesso: P1\nVetor recebido: ${formatVector(message.vectorClock)}\nVetor resultante: ${formatVector(receiveEvent.vectorClock)}\n`,
  );

  const eventB = process1.internalEvent("B", "Evento interno B em P1.");
  logger.line(`Evento B\nProcesso: P1\nVetor: ${formatVector(eventB.vectorClock)}\n`);

  const relation = compareVectors(eventA.vectorClock, eventB.vectorClock);
  logger.line(
    `COMPARAÇÃO\nA: ${formatVector(eventA.vectorClock)}\nB: ${formatVector(eventB.vectorClock)}\nEvento A aconteceu antes de Evento B.\nA -> B\nRelação: ${relation}\n`,
  );
  if (relation !== VectorRelation.BEFORE) {
    throw new Error("Falha no cenário causal: A deveria acontecer antes de B.");
  }

  return { eventA, eventB, relation };
}

export function runConcurrentScenario(
  logger: Logger = new ConsoleLogger(),
): ConcurrentScenarioResult {
  const processes = createProcesses();
  const process0 = processes[0];
  const process2 = processes[2];
  if (process0 === undefined || process2 === undefined) {
    throw new Error("O cenário concorrente exige P0 e P2.");
  }

  logger.line("CENÁRIO 2 — EVENTOS CONCORRENTES\n");
  const eventX = process0.internalEvent("X", "Evento interno X em P0.");
  const eventY = process2.internalEvent("Y", "Evento interno Y em P2.");
  logger.line(`Evento X\nProcesso: P0\nVetor: ${formatVector(eventX.vectorClock)}\n`);
  logger.line(`Evento Y\nProcesso: P2\nVetor: ${formatVector(eventY.vectorClock)}\n`);

  const relation = compareVectors(eventX.vectorClock, eventY.vectorClock);
  logger.line(
    `COMPARAÇÃO\nX: ${formatVector(eventX.vectorClock)}\nY: ${formatVector(eventY.vectorClock)}\nEvento X e Evento Y são concorrentes.\nX || Y\nRelação: ${relation}\n`,
  );
  if (relation !== VectorRelation.CONCURRENT) {
    throw new Error(
      "Falha no cenário concorrente: X e Y deveriam ser concorrentes.",
    );
  }

  return { eventX, eventY, relation };
}

export function runVectorClockSimulation(
  logger: Logger = new ConsoleLogger(),
): {
  readonly causal: CausalScenarioResult;
  readonly concurrent: ConcurrentScenarioResult;
} {
  logger.section("PARTE B — RELÓGIOS VETORIAIS");
  return {
    causal: runCausalScenario(logger),
    concurrent: runConcurrentScenario(logger),
  };
}
