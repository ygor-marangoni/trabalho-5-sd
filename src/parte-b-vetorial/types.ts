export type EventType = "INTERNAL" | "SEND" | "RECEIVE";

export interface DistributedEvent {
  readonly label: string;
  readonly type: EventType;
  readonly processId: number;
  readonly vectorClock: readonly number[];
  readonly description: string;
}

export interface VectorMessage {
  readonly id: string;
  readonly senderId: number;
  readonly destinationId: number;
  readonly vectorClock: readonly number[];
}

export enum VectorRelation {
  BEFORE = "BEFORE",
  AFTER = "AFTER",
  CONCURRENT = "CONCURRENT",
  EQUAL = "EQUAL",
}
