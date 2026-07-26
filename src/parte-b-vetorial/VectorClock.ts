export class VectorClock {
  private readonly values: number[];

  public constructor(
    size: number,
    private readonly ownerId: number,
  ) {
    if (!Number.isInteger(size) || size < 1) {
      throw new Error("O tamanho do relógio vetorial deve ser positivo.");
    }
    if (!Number.isInteger(ownerId) || ownerId < 0 || ownerId >= size) {
      throw new Error("O proprietário deve ser uma posição válida do vetor.");
    }

    this.values = Array.from({ length: size }, () => 0);
  }

  public tick(): readonly number[] {
    const current = this.values[this.ownerId];
    if (current === undefined) {
      throw new Error("Posição do proprietário ausente no relógio vetorial.");
    }
    this.values[this.ownerId] = current + 1;
    return this.snapshot();
  }

  public mergeAndTick(receivedVector: readonly number[]): readonly number[] {
    this.validateCompatibleVector(receivedVector);
    for (let index = 0; index < this.values.length; index += 1) {
      const localValue = this.values[index];
      const receivedValue = receivedVector[index];
      if (localValue === undefined || receivedValue === undefined) {
        throw new Error("Vetor incompatível durante a combinação.");
      }
      this.values[index] = Math.max(localValue, receivedValue);
    }
    return this.tick();
  }

  public snapshot(): readonly number[] {
    return Object.freeze([...this.values]);
  }

  private validateCompatibleVector(vector: readonly number[]): void {
    if (vector.length !== this.values.length) {
      throw new Error(
        `Vetores incompatíveis: esperado tamanho ${this.values.length}, recebido ${vector.length}.`,
      );
    }
    if (vector.some((value) => !Number.isInteger(value) || value < 0)) {
      throw new Error(
        "Um relógio vetorial deve conter apenas inteiros não negativos.",
      );
    }
  }
}
