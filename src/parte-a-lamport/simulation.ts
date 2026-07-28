import { ConsoleLogger, type Logger } from "../common/logger.js";
import type { ProcessIdentity } from "../common/types.js";
import { delay, sequencesAreEqual } from "../common/utils.js";
import { GroupChatProcess } from "./GroupChatProcess.js";
import { NetworkSimulator } from "./NetworkSimulator.js";

export const DEFAULT_LATENCY_MATRIX = [
  [0, 800, 150],
  [250, 0, 700],
  [600, 200, 0],
] as const;

export interface LamportSimulationResult {
  readonly processes: readonly GroupChatProcess[];
  readonly knowledgeOrdersAreDifferent: boolean;
  readonly deliveryOrdersAreEqual: boolean;
}

export interface LamportSimulationOptions {
  readonly logger?: Logger;
  readonly latencyMatrix?: readonly (readonly number[])[];
  readonly intervalMilliseconds?: number;
}

export async function runLamportSimulation(
  options: LamportSimulationOptions = {},
): Promise<LamportSimulationResult> {
  const logger = options.logger ?? new ConsoleLogger();
  const latencyMatrix = options.latencyMatrix ?? DEFAULT_LATENCY_MATRIX;
  const interval = options.intervalMilliseconds ?? 80;
  const network = new NetworkSimulator(latencyMatrix, logger);
  const identities = [
    { id: 0, name: "Ygor" },
    { id: 1, name: "Gil" },
    { id: 2, name: "Kensley" },
  ] as const satisfies readonly ProcessIdentity[];
  const processes = identities.map(
    ({ id, name }) =>
      new GroupChatProcess(id, name, identities.length, network, logger),
  );
  for (const process of processes) {
    network.register(process);
  }

  logger.section("PARTE A — CHAT COM RELÓGIOS DE LAMPORT");
  logger.line("P0 — Ygor | P1 — Gil | P2 — Kensley");
  logger.line("As duas primeiras mensagens são enviadas no mesmo instante lógico.\n");

  processes[0]?.sendChat("Bom dia, pessoal!");
  processes[1]?.sendChat("Bom dia! Tudo certo?");
  await delay(interval);
  processes[2]?.sendChat("Vamos começar o trabalho?");
  await delay(interval);
  processes[0]?.sendChat("Sim, podemos começar.");

  await network.waitForIdle();

  const knowledgeOrders = processes.map((process) =>
    process.getReceivedHistory().map((message) => message.id),
  );
  const deliveryOrders = processes.map((process) =>
    process.getDeliveredHistory().map((message) => message.id),
  );
  const referenceDeliveryOrder = deliveryOrders[0] ?? [];
  const deliveryOrdersAreEqual = deliveryOrders.every((order) =>
    sequencesAreEqual(referenceDeliveryOrder, order),
  );
  const referenceKnowledgeOrder = knowledgeOrders[0] ?? [];
  const knowledgeOrdersAreDifferent = knowledgeOrders.some(
    (order) => !sequencesAreEqual(referenceKnowledgeOrder, order),
  );
  const allMessagesAcknowledged = processes.every((process) =>
    process
      .getDeliveredHistory()
      .every(
        (message) =>
          process.getAcknowledgements(message.id).length === identities.length,
      ),
  );
  const pendingMessageCounts = processes.map(
    (process) => process.getPendingMessages().length,
  );
  const holdbackQueuesAreEmpty = pendingMessageCounts.every(
    (count) => count === 0,
  );

  logger.section("RESULTADO DA PARTE A");
  logger.line("ORDEM LOCAL DE CONHECIMENTO DAS MENSAGENS");
  processes.forEach((process, index) => {
    logger.line(
      `P${process.id}: ${(knowledgeOrders[index] ?? []).join(" -> ")}`,
    );
  });
  logger.line("\nORDEM LÓGICA DE ENTREGA");
  processes.forEach((process, index) => {
    logger.line(
      `P${process.id}: ${(deliveryOrders[index] ?? []).join(" -> ")}`,
    );
  });

  logger.log("VALIDAÇÃO", [
    knowledgeOrdersAreDifferent
      ? "As ordens locais de conhecimento foram diferentes."
      : "Aviso: as ordens locais de conhecimento coincidiram neste cenário.",
    deliveryOrdersAreEqual
      ? "Todos os processos entregaram as mensagens na mesma ordem."
      : "Os processos entregaram sequências diferentes.",
    allMessagesAcknowledged
      ? "ACKs: cada mensagem entregue foi confirmada por P0, P1 e P2."
      : "Falha: existe mensagem entregue sem todos os ACKs.",
    `Filas pendentes: ${processes
      .map(
        (process, index) => `P${process.id}=${pendingMessageCounts[index] ?? 0}`,
      )
      .join(" | ")}.`,
  ]);

  if (!deliveryOrdersAreEqual) {
    throw new Error(
      "Falha na ordenação total: os processos entregaram sequências diferentes.",
    );
  }
  if (options.latencyMatrix === undefined && !knowledgeOrdersAreDifferent) {
    throw new Error(
      "O cenário não demonstrou ordens locais de conhecimento diferentes.",
    );
  }
  if (referenceDeliveryOrder.length !== 4) {
    throw new Error(
      `Falha na entrega: eram esperadas 4 mensagens, mas foram entregues ${referenceDeliveryOrder.length}.`,
    );
  }
  if (!allMessagesAcknowledged) {
    throw new Error(
      "Falha nos ACKs: uma mensagem foi entregue sem confirmação de todos os processos.",
    );
  }
  if (!holdbackQueuesAreEmpty) {
    throw new Error("Falha na fila: existem mensagens pendentes após a simulação.");
  }

  return {
    processes,
    knowledgeOrdersAreDifferent,
    deliveryOrdersAreEqual,
  };
}
