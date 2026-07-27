# Roteiro do vídeo — máximo de 5 minutos

## Integrantes

- Ygor Marangoni Sgarioni
- Gil Antony Borba
- Kensley Oliveira

Antes de gravar, deixar o terminal aberto, aumentar a fonte e ensaiar os comandos. As falas abaixo são sugestões naturais, não textos para leitura rígida.

## 00:00–00:30 — Introdução

**Responsável sugerido: Ygor**

Mostrar o título no README.

> “Este é o Trabalho 5 de GSI529, Sistemas Distribuídos, da Universidade Federal de Uberlândia. O grupo é formado por Ygor Marangoni Sgarioni, Gil Antony Borba e Kensley Oliveira. Implementamos uma simulação de ordenação com Relógios de Lamport e outra de causalidade com Relógios Vetoriais.”

## 00:30–00:55 — Estrutura do projeto

**Responsável sugerido: Kensley**

Mostrar rapidamente `src`, `tests` e `docs`.

> “A aplicação é feita em Node.js e TypeScript estrito. As duas partes estão separadas, os testes ficam neste diretório e a documentação explica algoritmos, equipe e entrega. Os processos são objetos independentes e a rede usa atrasos artificiais; não afirmamos que são processos ou rede reais.”

## 00:55–02:25 — Parte A

**Responsável sugerido: Ygor**

Abrir, nesta ordem:

1. `LamportClock.ts`;
2. comparador em `types.ts`;
3. `HoldbackQueue.ts`;
4. trecho central de `GroupChatProcess.ts`;
5. fila por canal em `NetworkSimulator.ts`.

Fala sugerida:

> “Em um envio incrementamos o contador. No recebimento usamos o máximo entre o valor local e o recebido, mais um. Como eventos concorrentes podem empatar, ordenamos por timestamp, ID do remetente e ID da mensagem.”

> “Receber não é entregar. A mensagem entra na fila e só é entregue se estiver na cabeça e tiver ACK dos três processos. O remetente registra sua própria confirmação ao criar a mensagem; os outros processos enviam ACK quando recebem a mensagem. ACKs antecipados ficam guardados.”

> “A rede usa uma matriz assimétrica e uma fila independente para cada canal dirigido. Isso preserva FIFO no mesmo canal, mas permite que processos diferentes recebam em ordens distintas.”

Executar:

```bash
npm run parte-a
```

Apontar brevemente `[RECEBIMENTO]`, `[ACK]`, `[AGUARDANDO]`, `[ENTREGA]` e o resumo:

> “A primeira sequência mostra a ordem em que cada processo passou a conhecer as mensagens, seja por criação local ou recepção pela rede. Como as latências são diferentes, essas ordens não coincidem. A segunda sequência mostra a ordem lógica de entrega, que é igual nos três processos.”

## 02:25–03:45 — Parte B

**Responsável sugerido: Gil**

Mostrar:

1. `DistributedProcess.ts`;
2. `compareVectors.ts`;
3. `scenarios.ts`.

Fala sugerida:

> “O vetor tem uma posição por processo. Eventos internos e envios incrementam a posição local. No recebimento, combinamos os máximos posição por posição e só depois incrementamos o receptor.”

> “A comparação também é componente a componente. Se A é menor ou igual em tudo e menor em pelo menos uma posição, A ocorreu antes de B. Se cada vetor é maior em uma posição diferente, os eventos são concorrentes.”

Executar:

```bash
npm run parte-b
```

Apontar:

> “No primeiro cenário, A influencia B por meio de M1, então temos A antes de B. No segundo, X e Y acontecem sem comunicação e são concorrentes. Os cenários usam processos novos.”

## 03:45–04:25 — Testes

**Responsável sugerido: Kensley**

Executar:

```bash
npm run test
npm run typecheck
```

> “Os testes cobrem incremento e atualização dos relógios, três desempates da ordem total, bloqueio sem todos os ACKs, ACK antecipado, não duplicação e FIFO. Na Parte B validamos merge, incremento do receptor, as quatro relações, imutabilidade e independência dos cenários. O typecheck confirma o modo estrito sem erros.”

## 04:25–05:00 — Conclusão

**Participação dos três**

**Ygor:**

> “Lamport forneceu uma ordem lógica consistente mesmo com latências diferentes.”

**Gil:**

> “Os vetores permitiram identificar tanto a cadeia causal quanto eventos concorrentes.”

**Kensley:**

> “A suíte automatizada validou o protocolo e as proteções contra mutação. Assim concluímos as duas partes do trabalho.”

Encerrar mostrando o resumo do terminal. Não ultrapassar cinco minutos.
