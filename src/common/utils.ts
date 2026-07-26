export function delay(milliseconds: number): Promise<void> {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) {
    throw new Error("O atraso deve ser um número finito maior ou igual a zero.");
  }

  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

export function formatVector(vector: readonly number[]): string {
  return `[${vector.join(", ")}]`;
}

export function sequencesAreEqual(
  first: readonly string[],
  second: readonly string[],
): boolean {
  return (
    first.length === second.length &&
    first.every((value, index) => value === second[index])
  );
}
