# Divisão da equipe

## Integrantes

- Ygor Marangoni Sgarioni
- Gil Antony Borba
- Kensley Oliveira

A divisão abaixo representa responsabilidades principais. Revisão, integração, testes e compreensão da solução completa são tarefas compartilhadas pelos três integrantes.

## Ygor Marangoni Sgarioni

### Responsabilidades principais

- arquitetura e integração;
- Parte A;
- `LamportClock`;
- fila de espera e ordenação total;
- rede, latências assimétricas e FIFO.

### Arquivos mais relacionados

- `src/parte-a-lamport/LamportClock.ts`
- `src/parte-a-lamport/HoldbackQueue.ts`
- `src/parte-a-lamport/GroupChatProcess.ts`
- `src/parte-a-lamport/NetworkSimulator.ts`
- `src/parte-a-lamport/simulation.ts`

### Pontos para explicar no vídeo

- regra de envio e recebimento de Lamport;
- diferença entre recepção física e entrega;
- critério `(timestamp, senderId, messageId)`;
- necessidade de ACKs e fila por canal.

## Gil Antony Borba

### Responsabilidades principais

- Parte B;
- relógio e classe de processos;
- eventos internos, envios e recebimentos;
- cenários causal e concorrente;
- comparação componente a componente.

### Arquivos mais relacionados

- `src/parte-b-vetorial/VectorClock.ts`
- `src/parte-b-vetorial/DistributedProcess.ts`
- `src/parte-b-vetorial/compareVectors.ts`
- `src/parte-b-vetorial/scenarios.ts`

### Pontos para explicar no vídeo

- merge por máximo e incremento do receptor;
- snapshots imutáveis;
- condição de `BEFORE`;
- motivo de `[1,0,0]` e `[0,0,1]` serem concorrentes.

## Kensley Oliveira

### Responsabilidades principais

- testes automatizados;
- README e documentação;
- revisão dos logs;
- roteiro de apresentação;
- conferência dos requisitos.

### Arquivos mais relacionados

- `tests/*.test.ts`
- `README.md`
- `docs/*.md`
- `roteiro-video.md`
- `src/common/logger.ts`

### Pontos para explicar no vídeo

- estrutura e separação dos módulos;
- testes de ACK antecipado, FIFO e imutabilidade;
- comandos de validação;
- checklist da entrega.

## Tarefas compartilhadas

- revisar imports e nomes;
- executar as duas demonstrações;
- compreender Lamport e vetores;
- revisar a legibilidade dos logs;
- conferir a ordem final;
- ensaiar o vídeo;
- conferir arquivo, link e permissão da entrega.

## Comandos que todos devem conhecer

```bash
npm install
npm run parte-a
npm run parte-b
npm run demo
npm run test
npm run typecheck
```

## Checklist de revisão da equipe

- [ ] Cada integrante executou a demonstração completa
- [ ] Cada integrante sabe localizar as classes principais
- [ ] Todos sabem explicar recepção versus entrega
- [ ] Todos sabem explicar `BEFORE` e `CONCURRENT`
- [ ] Testes e typecheck foram executados no computador da apresentação
- [ ] Os nomes foram conferidos em README, documentos e roteiro
- [ ] O roteiro foi ensaiado em até cinco minutos
- [ ] A visualização do terminal está legível na gravação
