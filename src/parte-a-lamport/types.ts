export interface ChatMessage {
  readonly type: "CHAT_MESSAGE";
  readonly id: string;
  readonly senderId: number;
  readonly senderName: string;
  readonly content: string;
  readonly lamportTimestamp: number;
}

export interface AckMessage {
  readonly type: "ACK";
  readonly messageId: string;
  readonly senderId: number;
  readonly lamportTimestamp: number;
}

export type NetworkPacket = ChatMessage | AckMessage;

export interface PacketReceiver {
  readonly id: number;
  receivePacket(packet: NetworkPacket, physicalSenderId: number): void;
}

export interface BroadcastTransport {
  broadcast(packet: NetworkPacket, senderId: number): void;
}

export function compareChatMessages(
  messageA: ChatMessage,
  messageB: ChatMessage,
): number {
  const timestampDifference =
    messageA.lamportTimestamp - messageB.lamportTimestamp;
  if (timestampDifference !== 0) {
    return timestampDifference;
  }

  const senderDifference = messageA.senderId - messageB.senderId;
  if (senderDifference !== 0) {
    return senderDifference;
  }

  return messageA.id.localeCompare(messageB.id);
}
