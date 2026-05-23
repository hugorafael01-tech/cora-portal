# Cora — Preços e Planos
## Referência de consulta rápida · v1 · Abril 2026

*Documento de referência compacta para consulta durante operação, comunicação e desenvolvimento. Para o raciocínio completo de posicionamento, ver `posicionamento.md`.*

---

## Assinatura

A Cora trabalha com **uma única Assinatura**, flexível em quantidade e composição.

### Regras

- **Preço:** R$ 99 por pão, independente do produto escolhido
- **Quantidade:** de 1 a 3 pães por semana
- **Composição:** Pão Original e Pão Integral, em qualquer combinação (só eles são elegíveis pra Assinatura)
- **Frete:** R$ 15/mês fixo, universal
- **Entrega:** toda quinta-feira
- **Corte para alterações:** terça-feira, 12h
- **5ª semana:** em meses com 5 quintas, o 5º pão é cortesia da Cora

### Valor por composição

| Pães por semana | Valor mensal | + Frete | Total |
|---|---|---|---|
| 1 pão | R$ 99 | R$ 15 | R$ 114 |
| 2 pães | R$ 198 | R$ 15 | R$ 213 |
| 3 pães | R$ 297 | R$ 15 | R$ 312 |

### Swap na Cesta da Semana

Troca 1:1 entre Original e Integral dentro da semana corrente, **sem custo adicional**. Só volta ao normal no próximo ciclo. Não altera a Assinatura.

---

## Cardápio (extras avulsos)

Produtos fora da Assinatura, adicionados pontualmente à Cesta da Semana. Cobrança por unidade, somada à fatura do mês.

### Produtos permanentes no Cardápio

| Produto | Peso | Preço avulso |
|---|---|---|
| Pão Original | 615g | R$ 27 |
| Pão Integral | 615g | R$ 29 |

Sim: o assinante pode pedir **mais** Original ou Integral como extra, além do que já está na Base da Assinatura. Nesse caso, é cobrado como avulso.

### Produtos rotativos (Novidade da Semana)

Um por semana, escolhido pela Cora. Rotação entre:

| Produto | Peso | Preço avulso |
|---|---|---|
| Multigrãos | 615g | R$ 32 |
| Focaccia Genovesa | 430g (1/6 de tabuleiro 60×40) | R$ 22 |
| Brioche | 256g (forma de 6 bolinhas) | R$ 32 |
| Ciabatta | 533g | R$ 25 |

### Regras de extras

- **Sem limite rígido de quantidade.** Alerta suave a partir do 4º item na Cesta.
- **Produção avaliada pelo Hugo.** Pedidos que extrapolam capacidade podem não ser atendidos — cliente é avisado pelo WhatsApp e não cobrado.

---

## Cobrança

**Modelo:** 1 fatura mensal agregada via Asaas (cartão recorrente).

**Composição da fatura:**

```
Assinatura         R$ 99 × número de pães
+ Frete            R$ 15
+ Extras do mês    Soma dos itens avulsos do Cardápio adicionados no mês
= Total
```

**Alterações na Assinatura:**

- **Aumento:** cobrança proporcional neste mês pelos dias restantes. Próxima fatura completa no novo valor.
- **Redução:** vale só no próximo ciclo. Até o fim do mês atual, a Assinatura e o valor cobrado seguem como estavam.
- **Troca (mesma quantidade, composição diferente):** valor mensal não muda.

---

## Pausa e cancelamento

**Não são self-service no MVP.** Cliente fala com a Cora pelo WhatsApp.

O Portal do Assinante tem um ponto de entrada claro na tela Perfil, com link que abre conversa no WhatsApp com mensagem pré-preenchida.

---

## Leitura de preço por kg (referência de posicionamento)

### Assinatura (valor efetivo por pão)

| Cenário | Cálculo | R$/pão efetivo | R$/kg |
|---|---|---|---|
| Mês de 4 semanas | R$ 99 ÷ 4 | R$ 24,75 | R$ 40,24/kg |
| Mês de 5 semanas (5º pão é cortesia) | R$ 99 ÷ 5 | R$ 19,80 | R$ 32,20/kg |

### Avulso (Cardápio)

| Produto | Peso | Preço | R$/kg |
|---|---|---|---|
| Pão Original | 615g | R$ 27 | R$ 43,90/kg |
| Pão Integral | 615g | R$ 29 | R$ 47,15/kg |
| Multigrãos | 615g | R$ 32 | R$ 52,03/kg |
| Focaccia | 430g | R$ 22 | R$ 51,16/kg |
| Ciabatta | 533g | R$ 25 | R$ 46,90/kg |
| Brioche | 256g | R$ 32 | R$ 125,00/kg |

**Leitura rápida:**
- Assinatura entrega os pães de base a R$ 32,20–40,24/kg (dependendo do mês).
- Pão Original avulso fica levemente abaixo da faixa de sourdough clássico da Slow Bakery (R$ 45–50/kg).
- Brioche avulso (R$ 125/kg) é o preço mais alto do catálogo, refletindo os custos da manteiga, ovos e mel.

---

## Pendências e pontos em aberto

- **Preço por produto na Assinatura.** Hoje a regra é R$ 99 flat por pão independente do produto. O custo real do Integral é 57% maior que o do Original. Decisão provisória do MVP, a ser reavaliada na conversa dedicada de Unit Economics (task ClickUp 86e1007cv).

---

## Histórico de decisões

- **22/mai/2026** — Frete R$ 15/mês passa a ser universal. Removida a regra de gratuidade em condomínio com 5+ assinantes. Decisão registrada em `CORA_Decisoes_v2.md` v2.2.
- **20/abr/2026** — Preços avulsos definidos (Original R$ 27, Integral R$ 29, Multigrãos R$ 32, Focaccia R$ 22, Brioche R$ 32, Ciabatta R$ 25). Assinatura R$ 99 × qtd de pães. Swap Original↔Integral neutro. Registrado em `CORA_Decisoes_e_definicoes_sessao_abril_2026.md` e na task 86e0zj8ab.
- **Substitui:** modelo anterior de 3 planos (Cora R$ 98 / Cor R$ 112 / Corado a definir) descrito em `posicionamento.md` v2 de março de 2026.

---

*Documento vivo. Última atualização: abril de 2026. v1 — primeira versão consolidando as decisões comerciais pós-refactor.*
