# Cora — Zoneamento de Entregas
## Referência operacional · v1 · Abril 2026

*Documento que define a lógica de agrupamento de entregas e os bairros prioritários do início da operação.*

---

## Princípio

Entregas são agrupadas por **zonas concêntricas** a partir de pontos de origem distintos. Isso permite que Hugo planeje rotas, despache em ondas conforme a produção sai do forno, e que o backoffice consolide visualmente o que sai pra cada região.

**Pontos de origem:**

- **Niterói:** Cora (Trav. Ari Pinto Lima 41A, Fonseca)
- **Rio de Janeiro:** Conde de Irajá 439, Botafogo (casa da Mariane)

**Lógica operacional:**

- Niterói: Hugo despacha cada zona conforme termina a cocção do volume necessário. Não espera a produção inteira terminar.
- Rio: Hugo termina toda a expedição de Niterói, depois leva 1 lote único pro Rio. Mariane recebe em Botafogo, e a partir dali as zonas servem pra organizar a entrega final.

---

## Niterói

Origem: Cora (Trav. Ari Pinto Lima 41A, Fonseca, Niterói).

| Zona | Raio aproximado | Bairros típicos | Quando sai |
|---|---|---|---|
| **Zona 1** | até 3 km | Centro, Ingá, Icaraí, São Domingos, Fonseca | Primeira rota — assim que sai a primeira fornada |
| **Zona 2** | 3-7 km | Jardim Icaraí, São Francisco, Charitas, Boa Viagem, Santa Rosa, Vital Brazil | Segunda rota |
| **Zona 3** | 7+ km | Itaipu, Piratininga, Camboinhas, Itacoatiara, Pendotiba, Maria Paula | Última rota — pode ser logística especial |

---

## Rio de Janeiro

Origem: Conde de Irajá 439, Botafogo, RJ.

| Zona | Raio aproximado | Bairros típicos |
|---|---|---|
| **Zona Conde** | até 2 km | Botafogo, Humaitá, Urca, Flamengo |
| **Zona Sul** | 2-5 km | Copacabana, Ipanema, Leblon, Jardim Botânico, Lagoa, Gávea, Catete, Glória |
| **Outras** | 5+ km | Centro, Tijuca, Barra, Zona Norte, Jacarepaguá, etc |

---

## Como o sistema atribui zona

1. **Cálculo automático:** sistema usa fórmula de Haversine pra calcular distância em linha reta entre o endereço do assinante e o ponto de origem da cidade dele.
2. **Atribuição sugerida:** zona é proposta automaticamente conforme as faixas acima.
3. **Ajuste manual:** Hugo pode trocar a zona sugerida se a realidade de trânsito não bater com a linha reta. Exemplo típico: bairro perto em linha reta mas longe em rota de carro (Tijuca em relação ao Centro do Rio, Itacoatiara em relação ao Fonseca).
4. **Persistência:** após ajuste manual, o sistema mantém a zona registrada pro endereço, sem recalcular.

---

## Bairros prioritários no início

Sem assinantes confirmados ainda. Lista baseada na intuição inicial do Hugo sobre onde os primeiros leads devem chegar.

### Niterói

- Icaraí (Zona 1 ou 2 dependendo do trecho)
- Jardim Icaraí (Zona 2)
- Ingá (Zona 1)
- São Francisco (Zona 2)

### Rio de Janeiro

- Botafogo (Zona Conde)
- Humaitá (Zona Conde)
- Jardim Botânico (Zona Sul)
- Copacabana (Zona Sul)

---

## Pendências e pontos em aberto

- **Calibração dos raios após primeiros pedidos.** As faixas atuais são aproximação. Quando começarem a chegar pedidos reais, validar se Z1/Z2 fazem sentido pelo tempo de rota real, não só pelo raio.
- **Mapa visual com pontos plotados** ainda não foi implementado no backoffice. Decisão: deixar pra depois do MVP.
- **Critério pra fragmentar lote do Rio em mais de 1 entrega na semana** caso volume cresça muito. Hoje é entrega única. Quando virar gargalo, reavaliar.

---

## Histórico de decisões

- **25/abr/2026** — Lógica de zoneamento por raio definida durante design do módulo Semana v4 do backoffice. Endereço operacional da Cora, ponto de transferência do Rio (casa da Mariane) e bairros prioritários consolidados.

---

## Documentos relacionados

- `CORA_Backoffice_Spec_Consolidada_v2.md` — onde o zoneamento aparece como agrupamento de entregas no módulo Semana
- `Semana_v4_-_wireframes_v5.html` — wireframe que materializa a lógica
- `CORA_Precos_e_Planos_v1.md` — onde o frete (R$ 15/mês universal) é definido

---

*Documento vivo. Última atualização: abril de 2026.*
