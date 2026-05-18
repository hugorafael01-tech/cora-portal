# Briefing — Copy do Catálogo (6 produtos × 4 campos) — v2

**Para:** Claude Code
**Repo:** `cora-portal`
**Arquivo:** `src/App.jsx`
**Origem:** ClickUp task `86e1d14zr` — Revisar copy de produtos do catálogo
**Data:** 18/05/2026
**Aprovação:** Hugo

---

## O que fazer

Atualizar o catálogo mock `D` em `src/App.jsx` preenchendo 4 campos para cada um dos 6 produtos:

- `desc` — copy de venda exibido no card collapsed
- `sobre` — narrativa em terceira pessoa, exibida no accordion expanded
- `ingredientes` — string separada por vírgula, parseada em chips no accordion
- `subCopy` — frase emocional curta usada quando o produto vira Hero (NovidadeCard)

Manter `id`, `nome`, `peso`, `preco`, `img` inalterados.

---

## Modelo de exibição (contexto, não implementar agora)

- **Original** e **Integral** = sempre visíveis no Cardápio (são os pães da Assinatura também vendidos avulsos)
- **Multigrãos, Brioche, Focaccia, Ciabatta** = pool de Especiais da Semana. **Apenas um** aparece por semana
- O Especial da Semana entra **em dois lugares** simultaneamente: card no Cardápio + Hero da Home (NovidadeCard, usando o `subCopy`)
- **Modelo final = Opção A**: uma única entrada por produto no banco, com flag de Especial da Semana. A UI lê a mesma entrada nos dois lugares de exibição.

## Sobre a duplicação atual da Focaccia (artefato temporário)

O mock atual tem a Focaccia duplicada em `D.rotativos` e `D.extras` com o mesmo `id`. Isso é **artefato do mock de teste** — não reflete o modelo final.

**Decisão:** enquanto o mock existir, atualizar **as duas entradas** com copy idêntico pra evitar dessincronização visual em qualquer fluxo que ainda esteja lendo de `D.extras`. A consolidação fica como débito técnico (ver seção final).

---

## Copy aprovado

### 1. Pão Original — em `D.pães`

**desc**
```
O pão do dia a dia. Vai com manteiga no café e com azeite no jantar.
```

**sobre**
```
Foi com esse pão que tudo começou. Hugo repetiu a receita por anos até chegar num resultado que dava orgulho, e foi nesse processo que a paixão pela panificação se formou. Blend de farinha italiana com um toque de integral brasileira pra ganhar sabor. 24 horas de fermentação, 72% de hidratação.
```

**ingredientes**
```
Farinha de trigo italiana, água mineral, levain Cora, farinha integral brasileira e sal marinho
```

**subCopy**
```
O pão que começou tudo.
```

---

### 2. Pão Integral — em `D.pães`

**desc**
```
A versão integral do Original. Leve, macia, com gergelim na crosta.
```

**sobre**
```
A versão integral tinha que ser tão versátil quanto o Original. Leve, macia, longe daqueles integrais que parecem tijolo. O processo exige mais cuidado, e o resultado vale. Farinha 100% integral da Fazenda Vargem, um toque de azeite extra virgem que traz maciez, gergelim na crosta. A receita veio quase toda de um curso, com ajustes pra ficar com a cara da Cora. Fermentação com o levain Cora, 77% de hidratação.
```

**ingredientes**
```
Farinha integral Fazenda Vargem, água mineral, levain Cora, azeite extra virgem, sal marinho e gergelim
```

**subCopy**
```
Integral leve, todo dia.
```

---

### 3. Pão Multigrãos — em `D.rotativos`

**desc**
```
Seis grãos torrados e escaldados no miolo. Crosta de farelo de aveia. O pão das ocasiões.
```

**sobre**
```
Receita aprendida com Alex Duarte, do ISPA. Seis grãos diferentes no miolo, crosta de farelo de aveia. O processo de torrar e escaldar os grãos antes de incorporar traz um perfume e uma profundidade de sabor que vale cada mordida. É o pão mais indulgente da Cora, pra uma celebração que pode ser do dia a dia ou de algo especial. Com 110% de hidratação, exige mais atenção do padeiro. Qualquer deslize compromete o resultado.
```

**ingredientes**
```
Blend de farinhas, água mineral, gergelim branco sem casca, gergelim preto, quinoa, linhaça dourada, semente de girassol, semente de abóbora, farelo de aveia, levain Cora e sal marinho
```

**subCopy**
```
Quando o pão é a celebração.
```

---

### 4. Brioche — em `D.rotativos`

**desc**
```
Macio, levemente adocicado, com perfume cítrico. Cabe na lancheira da escola e no café da manhã sem pressa.
```

**sobre**
```
Brioche que junta a tradição francesa com técnica italiana. Blend de farinha italiana com um toque de semola, ovos, manteiga, leite e mel. Açúcar aromatizado com raspas de laranja, limão siciliano e baunilha. Pão leve, com leve doçura e perfume cítrico. Fermentação lenta, 100% levain Cora. Exige atenção constante na temperatura pra não perder o ponto da massa. Hugo desenhou pensando nas crianças, num lanche fácil de mastigar pra escola. Adulto também não resiste.
```

**ingredientes**
```
Blend de farinha italiana e semola, ovos, manteiga, levain Cora, leite, açúcar, mel, sal marinho, raspas de laranja, raspas de limão siciliano e baunilha
```

**subCopy**
```
O lanche fácil.
```

---

### 5. Focaccia Genovesa — em `D.rotativos` E em `D.extras` (DUAS entradas, copy idêntico)

**desc**
```
Joia da Ligúria. Macia por dentro, dourada por fora. Cobertura de azeite, alecrim e cebola roxa.
```

**sobre**
```
Joia da culinária da Ligúria, no norte da Itália. A versão autêntica genovesa tem espessura fina, cerca de 2 cm, miolo extremamente macio e crosta dourada e levemente crocante. O segredo está na generosidade do azeite extra virgem e na salmoura que preenche os buraquinhos característicos. A tradição leva alecrim e sal grosso. Na Cora entra também um pouco de cebola roxa. É um pão meio pizza, leve, com cobertura que dá vontade de comer o tabuleiro inteiro. Sai do forno no tabuleiro e vai vendida em pedaços.
```

**ingredientes**
```
Farinha de trigo italiana, água mineral, azeite extra virgem, levain Cora, sal marinho, alecrim e cebola roxa
```

**subCopy**
```
Pra um café da tarde diferente.
```

---

### 6. Ciabatta Rústica — em `D.rotativos`

**desc**
```
Miolo cheio de alvéolos, casca fina e crocante. O pão do sanduíche ou da refeição.
```

**sobre**
```
Ciabatta significa chinelo em italiano, pelo formato achatado e largo. É invenção recente: foi criada em 1982 por Arnaldo Cavallari, em Adria, perto de Veneza. Ele queria um pão italiano que competisse com a baguete francesa nos sanduíches. O segredo das bolhas grandes está na hidratação alta. A massa fica úmida e difícil de manipular, exige técnica e paciência. Blend de farinha italiana com 10% de farinha integral e um fio de azeite. Miolo leve e elástico, casca fina e crocante, com camada generosa de farinha por fora.
```

**ingredientes**
```
Blend de farinha italiana e farinha integral, água mineral, levain Cora, sal marinho e azeite extra virgem
```

**subCopy**
```
Casca crocante, miolo aerado.
```

---

## Observações de implementação

1. **Strings JSX:** todas as aspas dentro do copy são aspas retas. Editar em VS Code local (não no GitHub web editor) pra evitar curly quotes que quebram o build do Vite.

2. **Caracteres acentuados:** sem travessão em nenhum lugar. Se encontrar `—` no copy existente do mock D, remover.

3. **Encoding:** verificar que o arquivo continua em UTF-8 sem BOM.

4. **subCopy:** se hoje o catálogo só tem `subCopy` na Focaccia, adicionar o campo nos outros 5 produtos. O NovidadeCard Hero passa a poder rotacionar entre os 4 rotativos do pool quando cada um virar Especial da Semana.

---

## Critério de done

- [ ] 6 produtos com os 4 campos preenchidos no mock D
- [ ] Focaccia atualizada em **D.rotativos E D.extras** com copy idêntico (defesa temporária — ver débito técnico)
- [ ] `npm run dev` builda sem erro
- [ ] Branch criada (ex: `feature/copy-catalogo-v1`) e push pra GitHub
- [ ] Vercel Preview gerada
- [ ] **Validação visual no Preview** (o que dá pra ver agora):
  - **Cardápio:** Original e Integral mostram `desc` no collapsed; clicar na foto expande mostrando `sobre` + chips de `ingredientes`
  - **Cardápio:** o produto marcado como Especial da Semana aparece como 3º card, com mesmo comportamento collapsed/expanded
  - **Home:** NovidadeCard Hero do Especial da Semana exibe `subCopy` abaixo do nome
- [ ] **Validação visual diferida:** os outros 3 rotativos do pool (que não estão marcados como Especial agora) ficam validados visualmente conforme Hugo rotacionar nas próximas semanas. Não é blocker pro merge.
- [ ] PR pra `main` com squash merge via GitHub UI (mensagem ASCII-only, sem acento)
- [ ] Branch local deletada com `git branch -D feature/copy-catalogo-v1` após merge
- [ ] `PORTAL_STATUS.md` regenerado

---

## Não fazer

- Não alterar a estrutura do catálogo D (chaves, ordem dos produtos)
- Não alterar campos não listados (`id`, `nome`, `peso`, `preco`, `img`)
- Não consolidar agora a duplicação da Focaccia (ver débito técnico)
- Não tocar em migrations Supabase nem schema de tabelas (regra: schema é gerenciado exclusivamente pelo repo Backoffice)
- Não inferir/melhorar o copy sem consultar Hugo. O texto deste briefing é o aprovado.

---

## Débito técnico observado (não escopo desta task)

**Consolidar a entrada da Focaccia no catálogo.** O mock atual tem `D.rotativos` e `D.extras` com a Focaccia duplicada (mesmo `id`). O modelo final é Opção A: uma única entrada por produto, com flag de Especial da Semana, lida pelos dois lugares de exibição (card no Cardápio + Hero da Home).

**Quando resolver:** na migração do catálogo do mock pra leitura do banco (Supabase, via Backoffice). Aproveitar pra também eliminar essa duplicação no mock se ele ainda existir.

**Sugestão:** abrir task em `7. Digital & Portal` para registrar esse débito.
