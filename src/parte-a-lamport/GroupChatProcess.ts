import type { Logger } from "../common/logger.js";
import { HoldbackQueue } from "./HoldbackQueue.js";
import { LamportClock } from "./LamportClock.js";
import type {
  AckMessage,
  BroadcastTransport,
  ChatMessage,
  NetworkPacket,
  PacketReceiver,
} from "./types.js";

export class GroupChatProcess implements PacketReceiver {
  public readonly id: number;
  public readonly name: string;
  private readonly clock = new LamportClock();
  private readonly holdbackQueue = new HoldbackQueue();
  private readonly acknowledgements = new Map<string, Set<number>>();
  private readonly locallyAcknowledged = new Set<string>();
  private readonly deliveredMessageIds = new Set<string>();
  private readonly receivedHistory: ChatMessage[] = [];
  private readonly deliveredHistory: ChatMessage[] = [];
  private messageSequence = 0;

  public constructor(
    id: number,
    name: string,
    private readonly processCount: number,
    private readonly transport: BroadcastTransport,
    private readonly logger: Logger,
  ) {
    if (!Number.isInteger(id) || id < 0 || id >= processCount) {
      throw new Error("O ID do processo deve pertencer ao intervalo do grupo.");
    }
    if (name.trim().length === 0) {
      throw new Error("O nome do processo não pode ser vazio.");
    }
    if (!Number.isInteger(processCount) || processCount < 1) {
      throw new Error("A quantidade de processos deve ser positiva.");
    }

    this.id = id;
    this.name = name;
  }

  public sendChat(content: string): ChatMessage {
    if (content.trim().length === 0) {
      throw new Error("O conteúdo da mensagem não pode ser vazio.");
    }

    const previousClock = this.clock.getValue();
    const timestamp = this.clock.tick();
    this.messageSequence += 1;
    const message: ChatMessage = Object.freeze({
      type: "CHAT_MESSAGE",
      id: `msg-p${this.id}-${String(this.messageSequence).padStart(3, "0")}`,
      senderId: this.id,
      senderName: this.name,
      content,
      lamportTimestamp: timestamp,
    });

    this.logger.log("EVENTO", [
      `P${this.id} — ${this.name} criou ${message.id}`,
      `Conteúdo: ${content}`,
    ]);
    this.logger.log("RELÓGIO", [
      `Processo: P${this.id}`,
      `Antes do envio: ${previousClock}`,
      `Depois do tick: ${timestamp}`,
    ]);

    this.receivedHistory.push(message);
    this.holdbackQueue.enqueue(message);
    this.registerAck(message.id, this.id);
    this.locallyAcknowledged.add(message.id);
    this.logQueue();
    this.logger.log("ENVIO", [
      `P${this.id} faz broadcast de ${message.id}`,
      `Timestamp de Lamport: ${timestamp}`,
    ]);
    this.transport.broadcast(message, this.id);
    this.tryDeliver();
    return message;
  }

  public receivePacket(
    packet: NetworkPacket,
    physicalSenderId: number,
  ): void {
    if (physicalSenderId < 0 || physicalSenderId >= this.processCount) {
      throw new Error(`Remetente físico P${physicalSenderId} inválido.`);
    }

    if (packet.type === "CHAT_MESSAGE") {
      this.receiveChatMessage(packet);
    } else {
      this.receiveAck(packet);
    }
  }

  public getClockValue(): number {
    return this.clock.getValue();
  }

  public getReceivedHistory(): ChatMessage[] {
    return [...this.receivedHistory];
  }

  public getDeliveredHistory(): ChatMessage[] {
    return [...this.deliveredHistory];
  }

  public getPendingMessages(): ChatMessage[] {
    return this.holdbackQueue.toArray();
  }

  public getAcknowledgements(messageId: string): number[] {
    return [...(this.acknowledgements.get(messageId) ?? new Set<number>())].sort(
      (first, second) => first - second,
    );
  }

  private receiveChatMessage(message: ChatMessage): void {
    const previousClock = this.clock.getValue();
    const updatedClock = this.clock.update(message.lamportTimestamp);
    const isNewMessage = this.holdbackQueue.enqueue(message);

    this.logger.log("RECEBIMENTO", [
      `Processo: P${this.id} — ${this.name}`,
      `Mensagem: ${message.id}`,
      `Timestamp recebido: ${message.lamportTimestamp}`,
      `Relógio anterior: ${previousClock}`,
      `Relógio atualizado: ${updatedClock}`,
    ]);

    if (isNewMessage && !this.deliveredMessageIds.has(message.id)) {
      this.receivedHistory.push(message);
      // A própria mensagem comprova que o remetente já a conhece.
      this.registerAck(message.id, message.senderId);
    }

    if (!this.locallyAcknowledged.has(message.id)) {
      this.locallyAcknowledged.add(message.id);
      this.registerAck(message.id, this.id);
      const ackTimestamp = this.clock.tick();
      const acknowledgement: AckMessage = Object.freeze({
        type: "ACK",
        messageId: message.id,
        senderId: this.id,
        lamportTimestamp: ackTimestamp,
      });
      this.logger.log("ACK", [
        `P${this.id} confirma ${message.id}`,
        `ACK enviado em broadcast com timestamp ${ackTimestamp}`,
      ]);
      this.transport.broadcast(acknowledgement, this.id);
    }

    this.logQueue();
    this.tryDeliver();
  }

  private receiveAck(acknowledgement: AckMessage): void {
    const previousClock = this.clock.getValue();
    const updatedClock = this.clock.update(
      acknowledgement.lamportTimestamp,
    );

    // Um ACK pode chegar antes da mensagem devido às latências assimétricas.
    // Por isso, ele é armazenado mesmo quando a fila ainda não conhece a mensagem.
    this.registerAck(
      acknowledgement.messageId,
      acknowledgement.senderId,
    );
    this.logger.log("ACK", [
      `Processo: P${this.id} — ${this.name}`,
      `ACK de P${acknowledgement.senderId} para ${acknowledgement.messageId}`,
      `Relógio: ${previousClock} -> ${updatedClock}`,
    ]);
    this.tryDeliver();
  }

  private registerAck(messageId: string, processId: number): void {
    const acknowledgements =
      this.acknowledgements.get(messageId) ?? new Set<number>();
    acknowledgements.add(processId);
    this.acknowledgements.set(messageId, acknowledgements);
  }

  private tryDeliver(): void {
    while (true) {
      const firstMessage = this.holdbackQueue.peek();
      if (firstMessage === undefined) {
        return;
      }

      const acknowledgements =
        this.acknowledgements.get(firstMessage.id) ?? new Set<number>();
      if (acknowledgements.size < this.processCount) {
        const pending = Array.from(
          { length: this.processCount },
          (_, processId) => processId,
        ).filter((processId) => !acknowledgements.has(processId));
        this.logger.log("AGUARDANDO", [
          `Mensagem: ${firstMessage.id}`,
          `ACKs recebidos: ${acknowledgements.size}/${this.processCount}`,
          `ACK pendente: ${pending.map((id) => `P${id}`).join(", ")}`,
        ]);
        return;
      }

      this.holdbackQueue.remove(firstMessage.id);
      if (this.deliveredMessageIds.has(firstMessage.id)) {
        continue;
      }

      this.deliveredMessageIds.add(firstMessage.id);
      this.deliveredHistory.push(firstMessage);
      this.logger.log("ENTREGA", [
        `Processo: P${this.id} — ${this.name}`,
        `Posição: ${this.deliveredHistory.length}`,
        `${firstMessage.senderName}: ${firstMessage.content}`,
      ]);
    }
  }

  private logQueue(): void {
    const messages = this.holdbackQueue.toArray();
    this.logger.log("FILA", [
      `Processo: P${this.id}`,
      "Fila atual:",
      ...(messages.length === 0
        ? ["(vazia)"]
        : messages.map(
            (message, index) =>
              `${index + 1}. ${message.id} | timestamp ${message.lamportTimestamp} | remetente P${message.senderId}`,
          )),
    ]);
  }
}
