import {
  type ChatMessage,
  compareChatMessages,
} from "./types.js";

export class HoldbackQueue {
  private readonly messages = new Map<string, ChatMessage>();

  public enqueue(message: ChatMessage): boolean {
    if (this.messages.has(message.id)) {
      return false;
    }

    this.messages.set(message.id, message);
    return true;
  }

  public peek(): ChatMessage | undefined {
    return this.toArray()[0];
  }

  public remove(messageId: string): ChatMessage | undefined {
    const message = this.messages.get(messageId);
    if (message !== undefined) {
      this.messages.delete(messageId);
    }
    return message;
  }

  public has(messageId: string): boolean {
    return this.messages.has(messageId);
  }

  public get size(): number {
    return this.messages.size;
  }

  public toArray(): ChatMessage[] {
    return [...this.messages.values()].sort(compareChatMessages);
  }
}
