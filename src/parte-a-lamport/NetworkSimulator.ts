import type { Logger } from "../common/logger.js";
import type {
  NetworkPacket,
  PacketReceiver,
} from "./types.js";

interface QueuedTransmission {
  readonly packet: NetworkPacket;
  readonly senderId: number;
  readonly destinationId: number;
  readonly latency: number;
  readonly resolve: () => void;
}

export class NetworkSimulator {
  private readonly processes = new Map<number, PacketReceiver>();
  private readonly channelQueues = new Map<string, QueuedTransmission[]>();
  private readonly activeChannels = new Set<string>();
  private pendingTransmissions = 0;
  private readonly idleResolvers: Array<() => void> = [];

  public constructor(
    private readonly latencyMatrix: readonly (readonly number[])[],
    private readonly logger: Logger,
  ) {
    this.validateLatencyMatrix();
  }

  public register(process: PacketReceiver): void {
    if (this.processes.has(process.id)) {
      throw new Error(`O processo P${process.id} já está registrado na rede.`);
    }
    if (process.id < 0 || process.id >= this.latencyMatrix.length) {
      throw new Error(`O processo P${process.id} não existe na matriz de latências.`);
    }
    this.processes.set(process.id, process);
  }

  public broadcast(packet: NetworkPacket, senderId: number): void {
    if (!this.processes.has(senderId)) {
      throw new Error(`O remetente P${senderId} não está registrado na rede.`);
    }

    for (const destinationId of this.processes.keys()) {
      if (destinationId !== senderId) {
        void this.transmit(packet, senderId, destinationId);
      }
    }
  }

  public transmit(
    packet: NetworkPacket,
    senderId: number,
    destinationId: number,
  ): Promise<void> {
    const destination = this.processes.get(destinationId);
    if (destination === undefined) {
      throw new Error(`O destinatário P${destinationId} não está registrado.`);
    }

    const row = this.latencyMatrix[senderId];
    const latency = row?.[destinationId];
    if (latency === undefined) {
      throw new Error(`Não há latência configurada para P${senderId} -> P${destinationId}.`);
    }

    this.logger.log("REDE", [
      `P${senderId} -> P${destinationId}`,
      `Tipo: ${packet.type}`,
      `Mensagem: ${packet.type === "CHAT_MESSAGE" ? packet.id : packet.messageId}`,
      `Latência: ${latency} ms`,
    ]);

    this.pendingTransmissions += 1;
    return new Promise((resolve) => {
      const channelKey = `${senderId}->${destinationId}`;
      const queue = this.channelQueues.get(channelKey) ?? [];
      queue.push({ packet, senderId, destinationId, latency, resolve });
      this.channelQueues.set(channelKey, queue);

      // Cada par remetente-destinatário possui um trabalhador sequencial.
      // Assim, nenhum pacote posterior ultrapassa o anterior no mesmo canal.
      if (!this.activeChannels.has(channelKey)) {
        this.activeChannels.add(channelKey);
        this.processNext(channelKey);
      }
    });
  }

  public waitForIdle(): Promise<void> {
    if (this.pendingTransmissions === 0) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this.idleResolvers.push(resolve);
    });
  }

  private processNext(channelKey: string): void {
    const queue = this.channelQueues.get(channelKey);
    const transmission = queue?.[0];
    if (queue === undefined || transmission === undefined) {
      this.activeChannels.delete(channelKey);
      this.channelQueues.delete(channelKey);
      return;
    }

    setTimeout(() => {
      const destination = this.processes.get(transmission.destinationId);
      if (destination === undefined) {
        throw new Error(
          `O destinatário P${transmission.destinationId} deixou de existir.`,
        );
      }

      destination.receivePacket(
        transmission.packet,
        transmission.senderId,
      );
      transmission.resolve();
      queue.shift();
      this.pendingTransmissions -= 1;

      if (this.pendingTransmissions === 0) {
        for (const resolve of this.idleResolvers.splice(0)) {
          resolve();
        }
      }

      this.processNext(channelKey);
    }, transmission.latency);
  }

  private validateLatencyMatrix(): void {
    const size = this.latencyMatrix.length;
    if (size === 0) {
      throw new Error("A matriz de latências não pode ser vazia.");
    }

    for (const [rowIndex, row] of this.latencyMatrix.entries()) {
      if (row.length !== size) {
        throw new Error("A matriz de latências deve ser quadrada.");
      }
      for (const latency of row) {
        if (!Number.isFinite(latency) || latency < 0) {
          throw new Error(
            `Latência inválida encontrada na linha ${rowIndex}.`,
          );
        }
      }
    }
  }
}
