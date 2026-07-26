export type LogCategory =
  | "EVENTO"
  | "ENVIO"
  | "REDE"
  | "RECEBIMENTO"
  | "RELÓGIO"
  | "FILA"
  | "ACK"
  | "AGUARDANDO"
  | "ENTREGA"
  | "VALIDAÇÃO";

export interface Logger {
  log(category: LogCategory, lines: readonly string[]): void;
  section(title: string): void;
  line(text?: string): void;
}

export class ConsoleLogger implements Logger {
  public constructor(private readonly enabled = true) {}

  public log(category: LogCategory, lines: readonly string[]): void {
    if (!this.enabled) {
      return;
    }

    console.log(`\n[${category}]`);
    for (const line of lines) {
      console.log(line);
    }
  }

  public section(title: string): void {
    if (!this.enabled) {
      return;
    }

    console.log("\n========================================");
    console.log(title);
    console.log("========================================\n");
  }

  public line(text = ""): void {
    if (this.enabled) {
      console.log(text);
    }
  }
}

export const silentLogger = new ConsoleLogger(false);
