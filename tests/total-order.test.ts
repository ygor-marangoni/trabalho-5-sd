import assert from "node:assert/strict";
import test from "node:test";
import { silentLogger } from "../src/common/logger.js";
import { GroupChatProcess } from "../src/parte-a-lamport/GroupChatProcess.js";
import { HoldbackQueue } from "../src/parte-a-lamport/HoldbackQueue.js";
import { NetworkSimulator } from "../src/parte-a-lamport/NetworkSimulator.js";
import { runLamportSimulation } from "../src/parte-a-lamport/simulation.js";
import {
  type AckMessage,
  type BroadcastTransport,
  type ChatMessage,
  type NetworkPacket,
  compareChatMessages,
} from "../src/parte-a-lamport/types.js";

class RecordingTransport implements BroadcastTransport {
  public readonly broadcasts: Array<{
    readonly packet: NetworkPacket;
    readonly senderId: number;
  }> = [];

  public broadcast(packet: NetworkPacket, senderId: number): void {
    this.broadcasts.push({ packet, senderId });
  }
}

function chat(
  id: string,
  senderId: number,
  timestamp: number,
): ChatMessage {
  return Object.freeze({
    type: "CHAT_MESSAGE",
    id,
    senderId,
    senderName: `Pessoa ${senderId}`,
    content: id,
    lamportTimestamp: timestamp,
  });
}

function ack(
  messageId: string,
  senderId: number,
  timestamp = 10,
): AckMessage {
  return Object.freeze({
    type: "ACK",
    messageId,
    senderId,
    lamportTimestamp: timestamp,
  });
}

test("mensagens são ordenadas por timestamp, remetente e ID", () => {
  const messages = [
    chat("msg-p1-002", 1, 1),
    chat("msg-p0-002", 0, 1),
    chat("msg-p0-001", 0, 1),
    chat("msg-p2-001", 2, 0),
  ];

  assert.deepEqual(messages.sort(compareChatMessages).map(({ id }) => id), [
    "msg-p2-001",
    "msg-p0-001",
    "msg-p0-002",
    "msg-p1-002",
  ]);
});

test("HoldbackQueue usa a mesma ordenação determinística", () => {
  const queue = new HoldbackQueue();
  queue.enqueue(chat("msg-p2-001", 2, 2));
  queue.enqueue(chat("msg-p1-001", 1, 1));
  queue.enqueue(chat("msg-p0-001", 0, 1));
  assert.deepEqual(queue.toArray().map(({ id }) => id), [
    "msg-p0-001",
    "msg-p1-001",
    "msg-p2-001",
  ]);
});

test("uma mensagem aguarda todos os ACKs e depois é entregue", () => {
  const transport = new RecordingTransport();
  const process = new GroupChatProcess(1, "Gil", 3, transport, silentLogger);
  const message = chat("msg-p0-001", 0, 1);

  process.receivePacket(message, 0);
  assert.equal(process.getDeliveredHistory().length, 0);
  process.receivePacket(ack(message.id, 2), 2);

  assert.deepEqual(
    process.getDeliveredHistory().map(({ id }) => id),
    [message.id],
  );
});

test("ACK antecipado é preservado até a mensagem chegar", () => {
  const transport = new RecordingTransport();
  const process = new GroupChatProcess(
    1,
    "Gil",
    3,
    transport,
    silentLogger,
  );
  const message = chat("msg-p0-001", 0, 1);

  process.receivePacket(ack(message.id, 2), 2);
  assert.deepEqual(process.getAcknowledgements(message.id), [2]);
  process.receivePacket(message, 0);

  assert.deepEqual(process.getAcknowledgements(message.id), [0, 1, 2]);
  assert.equal(process.getDeliveredHistory().length, 1);
});

test("uma mensagem duplicada não é entregue duas vezes", () => {
  const transport = new RecordingTransport();
  const process = new GroupChatProcess(1, "Gil", 3, transport, silentLogger);
  const message = chat("msg-p0-001", 0, 1);

  process.receivePacket(ack(message.id, 2), 2);
  process.receivePacket(message, 0);
  process.receivePacket(message, 0);

  assert.equal(process.getDeliveredHistory().length, 1);
});

test("a fila bloqueia uma mensagem pronta atrás do primeiro elemento", () => {
  const transport = new RecordingTransport();
  const process = new GroupChatProcess(2, "Kensley", 3, transport, silentLogger);
  const first = chat("msg-p0-001", 0, 1);
  const second = chat("msg-p1-001", 1, 1);

  process.receivePacket(second, 1);
  process.receivePacket(first, 0);
  process.receivePacket(ack(second.id, 0), 0);
  assert.equal(process.getDeliveredHistory().length, 0);

  process.receivePacket(ack(first.id, 1), 1);
  assert.deepEqual(
    process.getDeliveredHistory().map(({ id }) => id),
    [first.id, second.id],
  );
});

test("ordens físicas distintas resultam na mesma ordem lógica", () => {
  const first = chat("msg-p0-001", 0, 1);
  const second = chat("msg-p1-001", 1, 1);
  const processes = [0, 1, 2].map(
    (id) =>
      new GroupChatProcess(
        id,
        `P${id}`,
        3,
        new RecordingTransport(),
        silentLogger,
      ),
  );
  const physicalOrders = [
    [first, second],
    [second, first],
    [second, first],
  ] as const;

  processes.forEach((process, index) => {
    for (const message of physicalOrders[index] ?? []) {
      process.receivePacket(message, message.senderId);
    }
    for (const message of [first, second]) {
      for (const senderId of [0, 1, 2]) {
        process.receivePacket(ack(message.id, senderId), senderId);
      }
    }
  });

  const orders = processes.map((process) =>
    process.getDeliveredHistory().map(({ id }) => id),
  );
  assert.deepEqual(orders, [
    [first.id, second.id],
    [first.id, second.id],
    [first.id, second.id],
  ]);
});

test("a simulação completa termina com a mesma sequência", async () => {
  const result = await runLamportSimulation({
    logger: silentLogger,
    latencyMatrix: [
      [0, 2, 1],
      [1, 0, 2],
      [2, 1, 0],
    ],
    intervalMilliseconds: 0,
  });

  assert.equal(result.deliveryOrdersAreEqual, true);
  for (const process of result.processes) {
    assert.equal(process.getDeliveredHistory().length, 4);
  }
});

test("a rede preserva FIFO separadamente em cada canal", async () => {
  const network = new NetworkSimulator(
    [
      [0, 2],
      [1, 0],
    ],
    silentLogger,
  );
  const received: string[] = [];
  network.register({ id: 0, receivePacket: () => undefined });
  network.register({
    id: 1,
    receivePacket: (packet) => {
      if (packet.type === "CHAT_MESSAGE") {
        received.push(packet.id);
      }
    },
  });

  void network.transmit(chat("primeira", 0, 1), 0, 1);
  void network.transmit(chat("segunda", 0, 2), 0, 1);
  void network.transmit(chat("terceira", 0, 3), 0, 1);
  await network.waitForIdle();

  assert.deepEqual(received, ["primeira", "segunda", "terceira"]);
});
