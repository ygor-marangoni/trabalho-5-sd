import { VectorClock } from "./VectorClock.js";
import type {
  DistributedEvent,
  EventType,
  VectorMessage,
} from "./types.js";

export class DistributedProcess {
  public readonly id: number;
  private readonly vectorClock: VectorClock;
  private readonly eventHistory: DistributedEvent[] = [];
  private messageSequence = 0;

  public constructor(id: number, processCount: number) {
    if (!Number.isInteger(id) || id < 0 || id >= processCount) {
      throw new Error("O ID deve pertencer ao intervalo de processos.");
    }
    this.id = id;
    this.vectorClock = new VectorClock(processCount, id);
  }

  public internalEvent(
    label: string,
    description: string,
  ): DistributedEvent {
    const vector = this.vectorClock.tick();
    return this.recordEvent(label, "INTERNAL", vector, description);
  }

  public sendMessage(label: string, destinationId: number): VectorMessage {
    const processCount = this.vectorClock.snapshot().length;
    if (
      !Number.isInteger(destinationId) ||
      destinationId < 0 ||
      destinationId >= processCount
    ) {
      throw new Error("O destino deve ser um processo válido.");
    }

    const vector = this.vectorClock.tick();
    this.messageSequence += 1;
    const message: VectorMessage = Object.freeze({
      id: `vm-p${this.id}-${String(this.messageSequence).padStart(3, "0")}`,
      senderId: this.id,
      destinationId,
      vectorClock: Object.freeze([...vector]),
    });
    this.recordEvent(
      label,
      "SEND",
      vector,
      `Envio de ${message.id} de P${this.id} para P${destinationId}.`,
    );
    return message;
  }

  public receiveMessage(
    label: string,
    message: VectorMessage,
  ): DistributedEvent {
    if (message.destinationId !== this.id) {
      throw new Error(
        `${message.id} destina-se a P${message.destinationId}, não a P${this.id}.`,
      );
    }

    const vector = this.vectorClock.mergeAndTick(message.vectorClock);
    return this.recordEvent(
      label,
      "RECEIVE",
      vector,
      `Recebimento de ${message.id}, enviado por P${message.senderId}.`,
    );
  }

  public getVectorClock(): number[] {
    return [...this.vectorClock.snapshot()];
  }

  public getEventHistory(): DistributedEvent[] {
    return this.eventHistory.map((event) =>
      Object.freeze({
        ...event,
        vectorClock: Object.freeze([...event.vectorClock]),
      }),
    );
  }

  private recordEvent(
    label: string,
    type: EventType,
    vectorClock: readonly number[],
    description: string,
  ): DistributedEvent {
    if (label.trim().length === 0 || description.trim().length === 0) {
      throw new Error("Rótulo e descrição do evento não podem ser vazios.");
    }
    const event: DistributedEvent = Object.freeze({
      label,
      type,
      processId: this.id,
      vectorClock: Object.freeze([...vectorClock]),
      description,
    });
    this.eventHistory.push(event);
    return event;
  }
}
