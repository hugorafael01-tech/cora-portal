# Briefing técnico — Remoção do Cenário B2 (frete grátis em condomínio)

**Origem da decisão:** `CORA_Decisoes_v2.md` v2.2 (22/mai/2026)
**Briefing original que implementou:** `CORA_Briefing_Frente_C_Item4_PerfilReadonly_v2.md` (cenário B2 marcado como descartado)
**Branch sugerida:** `fix/remove-frete-gratis-condominio`
**Tipo de PR:** Squash merge via GitHub UI

---

## Contexto

A regra comercial "frete grátis em condomínio com 5+ assinantes" foi descartada do modelo da Cora. **Frete R$ 15/mês passa a ser universal, sem exceção.**

O Cenário B2 — que detectava `valor_frete === 0` e renderizava microcopy "frete grátis · programa condomínio" — foi implementado no portal antes do descarte e está em produção. Precisa ser removido antes dos testes com usuários reais, para evitar que qualquer assinatura com `valor_frete = 0` (por erro manual no DB ou caso residual) exiba a microcopy de uma regra que não existe mais.

---

## Escopo da remoção

### 1. Frontend — Componente Perfil (`src/App.jsx`)

**Onde:** componente Perfil read-only (bloco de Cobrança, cenário B2).

**Remover:**
- Lógica condicional que detecta `valor_frete === 0` (ou equivalente) e ativa o caminho B2
- Aplicação de `success-text weight 600` ao valor do frete quando zerado
- Microcopy abaixo do valor: `"frete grátis · programa condomínio"`
- Qualquer estilo específico do cenário B2 (cores success-bg etc.)

**Manter (sem alteração):**
- Renderização normal de frete (B1): valor em estilo padrão, sem microcopy adicional
- Cálculo do Total na decomposição Assinatura + Extras + Frete

**Resultado esperado:** em qualquer assinatura, o frete sempre renderiza como R$ 15,00 em estilo padrão, sem microcopy abaixo.

### 2. Frontend — Modal de Recibo (se aplicável)

Conferir se o modal de Recibo também tinha tratamento especial para B2. Se sim, remover. Pelo briefing original do v2 do Perfil, o modal tinha apenas 3 variantes (C1, C2, C3) sem B2 específico, mas validar no código.

### 3. Backend — Endpoint `/api/subscriptions/[id]`

**Avaliar uso da coluna `valor_frete`:**

- Se a coluna é exposta apenas para alimentar a detecção B2 → considerar remover do SELECT
- Se a coluna é usada também para renderizar o valor do frete na decomposição (B1) → **manter exposta**, é a fonte do valor

Assumindo que `valor_frete` continua sendo a fonte do valor de frete cobrado: **deixar como está**, só consumir como número normal (não usar pra ativar caminho B2).

### 4. Banco de dados — `subscriptions.valor_frete`

**Não tocar no schema.** Regra de governança: schema vive no `cora-backoffice`.

Se houver registros com `valor_frete = 0` por SQL manual da Lógica de ativação do B2 (mencionado no briefing original), **restaurar para R$ 15,00** via SQL. Listar quais antes de aplicar.

Comando sugerido para descoberta (não executar sem revisão):

```sql
SELECT id, nome_titular, valor_frete, valor_paes 
FROM subscriptions 
WHERE valor_frete = 0 OR valor_frete IS NULL;
```

Se aparecerem registros: confirmar com Hugo o que fazer (provavelmente UPDATE para 15.00).

---

## Critérios de aceite

| | Critério |
|---|---|
| ✓ | Componente Perfil renderiza frete sempre como `R$ 15,00` em estilo padrão (sem `success-text`, sem microcopy) |
| ✓ | Nenhum trecho do código verifica `valor_frete === 0` para alterar estilo ou copy |
| ✓ | Modal de Recibo (se tinha tratamento B2) também removido |
| ✓ | Total na decomposição reflete corretamente `valor_paes + 15` em todas as assinaturas (1, 2, 3 pães) |
| ✓ | Smoke test em Preview cobre 3 assinaturas (1 pão, 2 pães, 3 pães), com e sem extras |
| ✓ | Build limpo, sem warnings novos |
| ✓ | Commit messages em ASCII (sem acento), squash merge no fim |

---

## Validação em Preview (não localhost)

Vercel Functions retornam 404 em localhost. Sempre validar em Preview deployment.

**Prints obrigatórios:**
1. Perfil — assinatura de 1 pão, sem extras, frete R$ 15
2. Perfil — assinatura de 2 pães, com extras, frete R$ 15
3. Perfil — assinatura de 3 pães, com extras, frete R$ 15
4. Modal de Recibo — semana com extras (variante C1)
5. Modal de Recibo — semana sem extras (variante C2)

Anexar os 5 prints no PR description.

---

## Plano antes de codar

Apresentar plano ao Hugo mostrando:
1. Arquivos que serão tocados (paths exatos)
2. Diff resumido por arquivo (não o diff completo — só o que muda)
3. Confirmação se haverá UPDATE no banco (e quais IDs)
4. Estimativa de tempo

**Aguardar aprovação do Hugo antes de executar.**

---

## Documentação a atualizar (no fim, antes do merge)

- `PORTAL_STATUS.md` na raiz do repo — atualizar com a remoção do B2
- `CORA_Briefing_Frente_C_Item4_PerfilReadonly_v2.md` já foi atualizado com a nota de descarte (sessão de 22/mai/2026 com Claude Chat)

---

## Higiene

- Branch: `fix/remove-frete-gratis-condominio`
- Commits ASCII, sem acentos
- Squash merge via GitHub UI no fim
- Após merge: `git branch -D fix/remove-frete-gratis-condominio` local (uppercase D)
- Atualizar ClickUp task ao concluir
