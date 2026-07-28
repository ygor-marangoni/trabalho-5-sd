# Trabalho 5 — Relógios Lógicos em Sistemas Distribuídos

**Universidade Federal de Uberlândia**  
**Disciplina:** GSI529 — Sistemas Distribuídos  
**Atividade:** Trabalho 5

## Integrantes

- Ygor Marangoni Sgarioni
- Gil Antony Borba
- Kensley Oliveira

## Descrição geral

Este projeto é uma aplicação de terminal em Node.js e TypeScript que demonstra dois mecanismos clássicos de sistemas distribuídos:

- **Parte A:** um chat em grupo que utiliza Relógios de Lamport, fila de espera e ACKs para obter uma ordem total de entrega;
- **Parte B:** processos com Relógios Vetoriais capazes de distinguir causalidade, ordem inversa, igualdade e concorrência.

Os processos são **objetos independentes dentro da aplicação**. A rede também é uma simulação: `setTimeout` aplica atrasos artificiais, sem criar processos reais do sistema operacional ou utilizar uma rede distribuída real.

## Objetivos

- visualizar múltiplos participantes com estado lógico independente;
- simular broadcast, comunicação assíncrona e latências assimétricas;
- distinguir chegada física de entrega lógica;
- obter ordem total determinística com Lamport;
- identificar `happened-before` e concorrência com vetores;
- validar os algoritmos automaticamente.

## Tecnologias

- Node.js 20 ou superior;
- TypeScript com `strict: true`;
- `tsx` para execução direta;
- `node:test` e `node:assert` para testes;
- terminal como interface;
- `setTimeout` para a rede simulada.

Não há interface web, banco de dados, servidor externo ou relógio físico usado como relógio lógico.

## Estrutura de pastas

```text
.
├── src/
│   ├── common/                  # Logger, tipos e funções compartilhadas
│   ├── parte-a-lamport/         # Chat, relógio, fila e rede simulada
│   ├── parte-b-vetorial/        # Vetores, processos, comparação e cenários
│   └── index.ts                 # Executa as duas partes
├── tests/                       # Testes unitários e de integração
├── docs/
│   ├── divisao-equipe.md
│   ├── explicacao-algoritmos.md
│   └── checklist-entrega.md
├── roteiro-video.md
├── package.json
└── tsconfig.json
```

Arquivos centrais da Parte A:

- `LamportClock.ts`: regras `tick()` e `max(local, recebido) + 1`;
- `HoldbackQueue.ts`: fila ordenada continuamente;
- `GroupChatProcess.ts`: estado, ACKs e protocolo de entrega;
- `NetworkSimulator.ts`: broadcast, latência e FIFO por canal;
- `simulation.ts`: cenário e validação final.

Arquivos centrais da Parte B:

- `VectorClock.ts`: incremento, merge e snapshots;
- `DistributedProcess.ts`: eventos internos, envios e recebimentos;
- `compareVectors.ts`: relação componente a componente;
- `scenarios.ts`: cadeia causal e eventos concorrentes.

## Instalação

Pré-requisito: Node.js 20 ou superior.

```bash
npm install
```

## Comandos

```bash
npm run parte-a    # somente chat com Lamport
npm run parte-a:verbose # Parte A com detalhes de rede, ACKs, filas e relÃ³gios
npm run parte-b    # somente relógios vetoriais
npm run demo       # Parte A e Parte B em sequência
npm run test       # todos os testes
npm run typecheck  # valida TypeScript sem emitir arquivos
```

Nenhum comando exige alteração manual do código.

## Parte A — Chat com Relógios de Lamport

O grupo contém:

```text
P0 — Ygor
P1 — Gil
P2 — Kensley
```

Cada `GroupChatProcess` possui ID, nome, relógio próprio, fila pendente, histórico de recepção, histórico de entrega, mapa de ACKs e conjunto de mensagens já entregues.

### Relógio de Lamport

Antes de enviar, o processo executa:

```text
L := L + 1
```

Ao receber um pacote com timestamp `T`:

```text
L := max(L, T) + 1
```

O horário do sistema não participa da ordenação. Os milissegundos existem somente para atrasar a transmissão simulada.

### Ordenação total

Toda fila usa exatamente a comparação:

```text
(lamportTimestamp, senderId, messageId)
```

Primeiro vence o menor timestamp; no empate, o menor ID de remetente; persistindo o empate, o menor ID lexicográfico de mensagem. IDs como `msg-p0-001` são determinísticos e legíveis.

### Fila de espera

A `HoldbackQueue` é reordenada sempre que uma mensagem é inserida. A aplicação **não espera o final para ordenar**. O processo só examina a cabeça da fila: se ela não estiver confirmada por todos, nenhuma mensagem posterior pode ultrapassá-la.

### ACKs e ACK antecipado

O remetente registra sua própria confirmação localmente quando cria a mensagem e não envia um ACK separado para si mesmo. Cada processo que recebe a mensagem registra sua confirmação e envia um ACK em broadcast. Como todos os pacotes de um mesmo canal preservam FIFO, os ACKs permitem determinar quando todos os participantes já conhecem a mensagem. O mapa `messageId -> Set<processId>` existe independentemente da fila; por isso, ACKs que chegam antes da mensagem original são preservados.

Uma mensagem é entregue somente se:

1. estiver na cabeça da fila;
2. tiver ACK dos três processos;
3. ainda não tiver sido entregue.

### Matriz de latências

```ts
[
  [0,   800, 150],
  [250, 0,   700],
  [600, 200, 0]
]
```

A linha é o remetente e a coluna é o destinatário. Por exemplo, P0→P1 demora 800 ms, mas P1→P0 demora 250 ms. Essa assimetria é intencional e reproduzível.

### FIFO por canal

Cada canal dirigido — P0→P1, P0→P2 etc. — possui sua própria fila. Um trabalhador retira apenas o primeiro pacote, agenda sua entrega com `setTimeout` e só então agenda o próximo. Assim, pacotes do mesmo remetente para o mesmo destinatário não se ultrapassam, enquanto canais diferentes avançam independentemente.

### Ordem local de conhecimento versus entrega lógica

**Receber** significa que um pacote chegou pela rede e entrou na fila. A ordem local de conhecimento registra tanto mensagens criadas pelo próprio processo quanto mensagens recebidas pela rede. **Entregar** significa liberar a mensagem ao usuário depois de satisfazer a ordenação e os ACKs; a fila transforma as observações locais em uma única ordem lógica.

### Cenário executado

As mensagens são:

1. Ygor: “Bom dia, pessoal!”
2. Gil: “Bom dia! Tudo certo?”
3. Kensley: “Vamos começar o trabalho?”
4. Ygor: “Sim, podemos começar.”

As duas primeiras partem praticamente juntas e recebem timestamp 1. O desempate por `senderId` coloca a mensagem de P0 antes da mensagem de P1. Ao final, o programa compara as três sequências e lança erro se houver divergência.

Exemplo resumido:

```text
ORDEM LOCAL DE CONHECIMENTO DAS MENSAGENS
P0: msg-p0-001 -> msg-p0-002 -> msg-p1-001 -> msg-p2-001
P1: msg-p1-001 -> msg-p2-001 -> msg-p0-001 -> msg-p0-002

ORDEM LÓGICA DE ENTREGA
P0: msg-p0-001 -> msg-p1-001 -> msg-p2-001 -> msg-p0-002
P1: msg-p0-001 -> msg-p1-001 -> msg-p2-001 -> msg-p0-002
P2: msg-p0-001 -> msg-p1-001 -> msg-p2-001 -> msg-p0-002
```

A ordem local inclui criação e recepção; a validação usa os timestamps efetivamente gerados.

## Parte B — Relógios Vetoriais

Três novos objetos `DistributedProcess` são criados por cenário. Cada um possui vetor de tamanho `N`, histórico e operações de evento interno, envio e recebimento.

### Regras do relógio vetorial

Em evento interno ou envio de `Pi`:

```text
VC[i] := VC[i] + 1
```

No recebimento:

```text
VC[k] := max(VC[k], mensagem[k]) para todo k
VC[i] := VC[i] + 1
```

Mensagens e eventos armazenam cópias congeladas. Getters também retornam cópias, impedindo que código externo altere o estado ou eventos antigos.

### Causalidade

`A BEFORE B` quando todos os componentes de A são menores ou iguais aos de B, e pelo menos um é estritamente menor. O cenário causal produz:

```text
A em P0:          [1, 0, 0]
M1 enviada:       [2, 0, 0]
M1 recebida P1:   [2, 1, 0]
B em P1:          [2, 2, 0]
A -> B            BEFORE
```

### Eventos concorrentes

Dois eventos são concorrentes quando um vetor é maior em alguma posição e o outro é maior em outra. Sem comunicação prévia:

```text
X em P0: [1, 0, 0]
Y em P2: [0, 0, 1]
X || Y   CONCURRENT
```

A comparação nunca usa soma, média ou máximo global.

### Relações suportadas

- `BEFORE`: A aconteceu antes de B;
- `AFTER`: A aconteceu depois de B;
- `EQUAL`: os vetores são idênticos;
- `CONCURRENT`: não existe ordem causal entre os eventos.

## Testes

Execute:

```bash
npm run test
npm run typecheck
```

A suíte verifica relógios, desempates, fila, bloqueio sem ACK, ACK antecipado, não duplicação, FIFO, ordens locais distintas, remetentes físicos e lógicos consistentes, convergência final, incremento e merge vetorial, as quatro relações, tamanhos incompatíveis, cópias defensivas e independência dos cenários.

Os testes de protocolo usam transporte controlado; os testes de rede usam latências pequenas e verificam a sequência, não instantes exatos do sistema.

## Organização da equipe

### Ygor Marangoni Sgarioni

Responsável principal pela arquitetura geral, integração, Parte A, Relógios de Lamport, fila de espera, ordenação total e simulação das latências.

### Gil Antony Borba

Responsável principal pela Parte B, Relógios Vetoriais, classe de processos, cenários causais, comparação de vetores e validação de concorrência.

### Kensley Oliveira

Responsável principal pelos testes automatizados, documentação, README, revisão dos logs, roteiro do vídeo e validação dos requisitos.

Essa divisão indica focos principais. **Todos os integrantes participaram da revisão, integração e compreensão do projeto completo**, e todos devem conseguir executar os comandos e explicar as duas partes. O detalhamento está em [docs/divisao-equipe.md](docs/divisao-equipe.md).

## Limitações da simulação

- os processos são objetos no mesmo runtime, não processos reais;
- a rede é formada por timers, não sockets;
- não são simuladas falhas, perda de pacotes ou reinício de processos;
- a associação de todos os membros é conhecida e fixa;
- ACK de todos é adequado à demonstração, mas tem custo crescente em grupos grandes;
- Relógios de Lamport dão ordem consistente, mas não detectam concorrência;
- Relógios Vetoriais detectam causalidade, porém o vetor cresce com `N`.

## Checklist da entrega

- [x] Integrantes identificados
- [x] Parte A e Parte B implementadas
- [x] Broadcast, FIFO, fila e ACKs implementados
- [x] Cenários causal e concorrente implementados
- [x] Testes e validação TypeScript configurados
- [x] Documentação e roteiro criados
- [ ] Gravar vídeo com no máximo cinco minutos
- [ ] Enviar vídeo para a nuvem e conferir permissão
- [ ] Adicionar link da entrega no Teams

O checklist operacional completo está em [docs/checklist-entrega.md](docs/checklist-entrega.md).
