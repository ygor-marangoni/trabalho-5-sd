# Explicação dos algoritmos

## O problema da ordenação distribuída

Em um sistema distribuído, mensagens trafegam por caminhos com atrasos diferentes. A mensagem enviada primeiro não precisa chegar primeiro a todos os destinatários. No chat deste trabalho, P0→P2 demora 150 ms, enquanto P0→P1 demora 800 ms; outros remetentes possuem atrasos diferentes. Portanto, cada processo pode observar uma ordem local de conhecimento distinta.

O horário físico não resolve sozinho esse problema: relógios de máquinas podem estar dessincronizados, a precisão é limitada e a latência é variável. Além disso, esta simulação precisa representar relações lógicas, e não horários de calendário.

## Relógio de Lamport

Cada processo mantém um contador inteiro independente.

### Evento local e envio

Antes de enviar:

```text
L := L + 1
```

As primeiras mensagens de Ygor e Gil são criadas antes de qualquer recepção; por isso, ambas podem carregar timestamp 1.

### Recebimento

Para um pacote com timestamp `T`:

```text
L := max(L, T) + 1
```

Essa regra garante que o evento de recebimento seja logicamente posterior ao envio.

### Desempate determinístico

Lamport pode atribuir o mesmo timestamp a eventos concorrentes. A aplicação transforma a ordem parcial em total com:

```text
(lamportTimestamp, senderId, messageId)
```

Se `msg-p0-001` e `msg-p1-001` têm timestamp 1, P0 vem antes de P1. O ID lexicográfico é o último desempate. Todos os processos usam a mesma função `compareChatMessages`.

## Fila de espera e ACKs

Cada mensagem conhecida entra imediatamente na `HoldbackQueue`, que permanece ordenada. Não há um `sort()` isolado somente ao final.

Uma entrega exige:

- a mensagem estar na cabeça;
- ACK de P0, P1 e P2;
- o ID não ter sido entregue.

O remetente registra sua própria confirmação localmente quando cria a mensagem. Cada processo que recebe a mensagem registra sua confirmação e envia um ACK em broadcast. Como os canais são FIFO, um ACK enviado por um processo não ultrapassa mensagens anteriores do mesmo canal. Essa combinação demonstra que todos os participantes já conhecem a mensagem e impede liberar a cabeça enquanto ainda pode existir, naquele canal, uma mensagem anterior desconhecida.

O mapa de ACKs é independente da fila. Assim, um ACK de `msg-p0-001` pode ser armazenado antes de `msg-p0-001` chegar. Quando a mensagem chega, as confirmações antigas permanecem associadas.

## FIFO na rede simulada

Há uma fila para cada direção: P0→P1 é diferente de P1→P0 e de P0→P2. Apenas um timer por canal fica ativo. Depois que o primeiro pacote é entregue, o trabalhador agenda o seguinte. Canais diferentes executam em paralelo e, por isso, destinatários distintos ainda podem observar ordens diferentes.

## Conhecimento local e entrega

Recepção é um fato da rede: o pacote chegou. O histórico local combina mensagens criadas pelo próprio processo e mensagens recebidas pela rede. Entrega é uma decisão do protocolo: a mensagem pode ser exibida na posição correta. Uma mensagem recebida cedo pode esperar por ACKs ou por uma mensagem menor que esteja na cabeça.

No resumo, as ordens locais de conhecimento diferem, mas as ordens lógicas convergem para a mesma sequência. A simulação lança erro se isso não ocorrer.

## Relógio Vetorial

Um Relógio Vetorial possui uma posição por processo. Em um evento interno ou envio, `Pi` incrementa `VC[i]`. Uma mensagem transporta uma cópia completa.

No recebimento, `Pi` primeiro calcula:

```text
VC[k] := max(VC[k], M[k])
```

para cada componente; depois executa:

```text
VC[i] := VC[i] + 1
```

No cenário causal:

```text
A             [1, 0, 0]
envio M1      [2, 0, 0]
recepção P1   [2, 1, 0]
B             [2, 2, 0]
```

## Relação happened-before

A aconteceu antes de B quando:

- `A[i] <= B[i]` para toda posição;
- existe ao menos uma posição com `A[i] < B[i]`.

Assim, `[1,0,0] BEFORE [2,2,0]`. Invertendo os argumentos, a relação é `AFTER`. Vetores idênticos são `EQUAL`.

## Eventos concorrentes

Se A é maior em alguma posição e B é maior em outra, nenhum vetor domina o outro. Os eventos são concorrentes:

```text
X = [1, 0, 0]
Y = [0, 0, 1]
X || Y
```

Essa comparação é feita posição por posição. Soma, média ou valor máximo perderiam informação causal: os dois vetores do exemplo têm a mesma soma, mas isso não é a razão de serem concorrentes.

## Imutabilidade

Eventos e mensagens vetoriais recebem cópias congeladas. Métodos de consulta também retornam cópias. Portanto, incrementar o relógio depois não modifica eventos anteriores e alterar um array recebido externamente não altera o processo.

## Limitações

- Lamport preserva `happened-before`, mas o timestamp sozinho não prova causalidade nem concorrência;
- o protocolo usa grupo fixo e exige confirmação de todos;
- não são tratados perda, duplicação real da rede, partição ou falha de processo;
- canais FIFO são uma propriedade da simulação, não uma garantia de toda rede real;
- vetores crescem linearmente com o número de processos;
- objetos e timers representam processos e rede apenas para fins didáticos.
