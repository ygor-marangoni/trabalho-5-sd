import { VectorRelation } from "./types.js";

export function compareVectors(
  vectorA: readonly number[],
  vectorB: readonly number[],
): VectorRelation {
  if (vectorA.length !== vectorB.length) {
    throw new Error(
      `Não é possível comparar vetores de tamanhos diferentes: ${vectorA.length} e ${vectorB.length}.`,
    );
  }

  let hasSmallerComponent = false;
  let hasGreaterComponent = false;

  for (let index = 0; index < vectorA.length; index += 1) {
    const componentA = vectorA[index];
    const componentB = vectorB[index];
    if (componentA === undefined || componentB === undefined) {
      throw new Error("Componente ausente durante a comparação vetorial.");
    }
    if (componentA < componentB) {
      hasSmallerComponent = true;
    } else if (componentA > componentB) {
      hasGreaterComponent = true;
    }
  }

  if (!hasSmallerComponent && !hasGreaterComponent) {
    return VectorRelation.EQUAL;
  }
  if (hasSmallerComponent && !hasGreaterComponent) {
    return VectorRelation.BEFORE;
  }
  if (!hasSmallerComponent && hasGreaterComponent) {
    return VectorRelation.AFTER;
  }
  return VectorRelation.CONCURRENT;
}
