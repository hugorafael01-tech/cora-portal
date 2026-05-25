# CORA — Logística e Operação de Entrega v1

**Criado em:** 25/mai/2026
**Status:** documento vivo. Decisões fechadas marcadas como tal. Hipóteses operacionais aguardam dados de pré-cadastro e testes pré-lançamento.

---

## 1. Modelo logístico base

Operação parte da Cora (Fonseca, Niterói) com entrega toda quinta-feira. Atende duas regiões com pontos de origem distintos:

- **Niterói:** motoboy parte da Cora. 3 zonas concêntricas (Z1 até 3km, Z2 3 a 7km, Z3 7km+)
- **Rio:** motoboy parte de hub em Botafogo. 3 zonas a partir da Conde de Irajá 439 (Conde até 2km, Sul 2 a 5km, Outras 5km+)

Carga do Rio é transferida da Cora para o hub Botafogo na manhã da quinta. **Hugo não pode ser o motorista da transferência** (quinta é dia de forno). Modelo de transferência ainda não fechado.

## 2. Números operacionais levantados

| Variável | Valor | Origem |
|---|---|---|
| Diária motoboy | R$ 300 | Cotação de mototáxi de confiança que coordena outros |
| Jornada da diária | 8h | Cotação atual |
| Cubagem do baú | 140L (50×50×50 cm) | Medida do baú padrão |
| Tamanho do pão embalado | 28×18×13 cm (~6,5L) | Medição feita por Hugo em mai/2026 |
| Capacidade prática estimada do baú | 13-15 pães por viagem | 60-70% de aproveitamento real, a validar nos testes |
| Custo logístico estimado por quinta | R$ 600-700 | 2 motoboys + transferência |
| Frete cobrado | R$ 15/mês universal | Decisão de 22/mai/2026 |
| Receita de frete por entrega | ~R$ 3,75 | R$ 15 dividido por 4 entregas |
| Gap por entrega no cenário base | ~R$ 10,75 | A fechar via adensamento |

## 3. Cenário de teto produtivo (referência)

Cálculo derivado para 47 assinantes no teto do forno atual:

- Capacidade produtiva: 81 pães por dia de forno
- Mix médio por assinante: 1,30 pães da assinatura + 0,40 especial da semana = 1,70 pães
- Distribuição estimada: 40% Niterói (19 assinantes) + 60% Rio (28 assinantes)
- Volume por região: 32 pães Niterói + 48 pães Rio

## 4. Gargalo identificado

**1 motoboy partindo da Cora não fecha o Rio em jornada de 8h.**

- 48 pães divididos por 15 de capacidade prática = 3 viagens
- Tempo estimado por round-trip via ponte (com paradas): 3h
- Total: 9h, estoura jornada
- Niterói cabe sem problema: 2 viagens × 1,5h = 3h, sobra capacidade

Solução desenhada: hub em Botafogo elimina a travessia da ponte por viagem. Motoboy de Rio parte do hub, faz 3 viagens × 1h = 3h. Cabe em 8h com folga.

Pendência: definir quem opera a transferência da carga para o hub.

## 5. Hipóteses estratégicas em aberto

### Inversão de meta de lançamento

Hipótese: substituir a meta de "50 assinantes em agosto" por "50 assinantes em até 12 pontos de entrega". A métrica que define viabilidade logística é número de pontos, não número de pessoas. 50 assinantes em 47 endereços diferentes é inviável; 50 assinantes em 10 condomínios é trivial.

Fase Alpha (julho): 30 assinantes em até 8 pontos.

### Critério de abertura de ponto

Hipótese de unidade operacional: **endereço/condomínio** como unidade primária (mesmo logradouro + mesmo número). Para casas isoladas, agrupamento por proximidade real (raio ~500m) como unidade secundária.

Threshold proposto: 3 leads confirmados no mesmo ponto para abrir.

### Camada de comunicação

A comunicação ao cliente nunca usa a granularidade operacional. O cliente nunca ouve "ponto operacional 7B". Ele ouve **"Icaraí abriu"**, **"Botafogo abriu"**. Camada operacional e camada comunicacional são distintas.

Insight: Mariane apontou que bairro é mais fácil de comunicar do que CEP ou sub-bairro. Sub-bairro confunde (Charitas é bairro, não sub-bairro de Niterói).

### Lista de espera

Operada pela Cora, não delegada ao cliente. Modelo:

1. Cliente preenche pré-cadastro em `/interesse` com CEP e endereço completo
2. Cliente vê apenas: *"Recebemos seu interesse. Estamos abrindo bairros gradualmente. Te avisamos quando sua região estiver no nosso roteiro."*
3. Cora vê painel interno com leads agrupados por ponto-rascunho
4. Quando ponto atinge massa crítica, Cora abre e convida os leads daquele ponto por e-mail/WhatsApp

Decisão consciente: **não pedir para o cliente trazer vizinhos**. A responsabilidade de adensamento é da Cora.

### Cidade de lançamento

Três opções em deliberação, decisão pós pré-cadastro:

| Opção | Vantagem | Desvantagem |
|---|---|---|
| Niterói + Rio simultâneo | Mercado total maior | Logística complexa desde dia 1 |
| Só Niterói | Sem ponte, motoboy resolve em 1 giro, Hugo mora lá | Mercado menor, demora para atingir massa |
| Só Rio | Mercado denso na Zona Sul (público-alvo Beatriz) | Travessia da ponte custa desde o dia 1 |

A leitura da distribuição geográfica do pré-cadastro vai indicar o caminho.

## 6. Plano de testes pré-lançamento

### Fase 1 — Cubagem real

**Quando:** semana de 16/jun, junto com testes do deck oven novo.

**O que medir:**
- Quantos pães cabem no baú em saco kraft, sem amassar, com manuseio real
- Peso total carregado (limite da moto: ~30 a 40 kg incluindo motoboy, baú e carga)

**Por quê:** capacidade prática de 13-15 pães é estimativa. Pode ser 11 ou pode ser 18. Todo cálculo subsequente depende desse dado.

### Fase 2 — Rota real

**Quando:** durante Alpha (julho), com poucos assinantes espalhados.

**O que cronometrar:**
- Tempo de carga na Cora
- Tempo Cora → primeira parada de cada zona
- Tempo médio por parada (descer, interfonar, esperar, entregar)
- Tempo de retorno

**Por quê:** tempos estimados de 1,5h Niterói e 3h Rio são chute educado, podem estar 30% errados em qualquer direção.

### Fase 3 — Hub Botafogo

**Quando:** julho.

**O que validar:**
- Quem recebe a carga no hub (Hugo é dia de forno)
- Janela horária funcional
- Capacidade do ponto residencial atual (50 pães em volume + refrigeração ambiente por X horas)
- Custo da transferência Niterói → Botafogo (Uber Cargo, motorista contratado, parceiro)

**Por quê:** o ponto atual em Conde de Irajá 439 é residencial e temporário. Precisa testar robustez ou migrar para hub comercial (cafeteria parceira em Botafogo, por exemplo).

### Fase 4 — Calibração real

**Quando:** primeiras 4 semanas de agosto.

**O que ajustar:** mix de motoboys, rota, modelo de hub, frete (se necessário).

## 7. Conversa pendente com o mototáxi de confiança

Antes de fechar contrato, levantar com ele:

- Pacote mensal vs diária avulsa. Garantir 4 a 5 quintas/mês pode ter desconto de 10 a 20%
- A diária de R$ 300 é jornada de 8h fixa ou aceita "até concluir entregas"
- Adicional pela ponte (pedágio + tempo) se cobrar
- Modelo de pagamento por entrega faz sentido para ele (por exemplo R$ 200 garantido + R$ 5 por entrega — alinha incentivos com volume)

## 8. Decisões fechadas (referência cruzada)

- **Frete R$ 15/mês universal.** Decisão de 22/mai/2026. Documentada em `CORA_Decisoes_v2.md` v2.2.
- **Regra "frete grátis em condomínio 5+" descartada.** Cenário B2 removido do portal em PR mergeado em 25/mai/2026.
- **Modelo de zoneamento por raio Haversine.** Documentado em `CORA_Zoneamento_Entregas_v1.md`.

## 9. Não decidido (consciente)

- **Política de frete diferenciado por zona.** Descartada como complexidade no MVP. Manter R$ 15 fixo universal.
- **Frete grátis em qualquer cenário.** Posicionamento de assinatura premium não usa gramática de varejo.
- **Auto-serviço para pausa/cancelamento de assinatura.** WhatsApp manual no MVP.

## Documentos relacionados

- `CORA_Decisoes_v2.md` — decisões estratégicas e financeiras
- `CORA_Precos_e_Planos_v1.md` — preços e modelo comercial
- `CORA_Zoneamento_Entregas_v1.md` — zoneamento por raio Haversine
- `posicionamento.md` — posicionamento de marca e personas

## Histórico de revisões

| Versão | Data | Mudanças |
|---|---|---|
| v1 | 25/mai/2026 | Documento inicial. Consolidação da discussão de logística de mai/2026 (custos de motoboy, capacidade do baú, gargalo do Rio, hipóteses de adensamento, plano de testes em 4 fases). |

---

*Source of truth para operação de entrega da Cora. Atualizar após pré-cadastro e testes pré-lançamento.*
