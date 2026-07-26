export class LamportClock {
  private value = 0;

  public tick(): number {
    this.value += 1;
    return this.value;
  }

  public update(receivedTimestamp: number): number {
    if (!Number.isInteger(receivedTimestamp) || receivedTimestamp < 0) {
      throw new Error(
        "O timestamp de Lamport recebido deve ser um inteiro não negativo.",
      );
    }

    this.value = Math.max(this.value, receivedTimestamp) + 1;
    return this.value;
  }

  public getValue(): number {
    return this.value;
  }
}
