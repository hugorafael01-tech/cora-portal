/**
 * Cardápio por semana de entrega — solução tática pré-Evandro.
 *
 * O modelo da Cora é 2 pães fixos + 1 especial rotativo. Enquanto o catálogo
 * não tem fonte por semana (task 86e2fqk33 — decisão registrada: não fazer
 * antes de 06/08), o mapa abaixo é a ponte. Quando aquela task entrar, este
 * arquivo inteiro morre.
 *
 * A chave é a `delivery_date` ISO da entrega (uma quinta). Quem resolve a
 * semana corrente é `nextEditableThursdayISO` (src/utils/cutoff.js), a MESMA
 * data que o pedido usa — então o cardápio vira sozinho toda terça ao meio-dia,
 * junto com o corte. Sem cron, sem deploy, sem alguém lembrar.
 *
 * Os ids batem com D.pães / D.rotativos em src/App.jsx. `itens` vira a lista de
 * cards do Cardápio; `especial` vira o "Novidade Hero" (Home e Cardápio),
 * resolvido contra D.rotativos. O especial repete de propósito (Hero + card):
 * só o card menor expande com a descrição completa do produto.
 *
 * Pra mudar/estender: editar o mapa e commitar. Ciclo de agosto definido pelo
 * Hugo em 30/07/2026.
 */
const MENU_POR_SEMANA = {
  "2026-08-06": { itens: ["original", "integral", "focaccia"], especial: "focaccia" },
  // Focaccia repete de propósito (Hugo, 03/08/2026): na entrega de 06/08 cada
  // assinante recebe uma porção menor de focaccia com um cartão convidando a
  // entrar no portal e escolher o extra da semana seguinte. Se o portal
  // mostrasse outro pão aqui, a amostra viraria propaganda de indisponível.
  // Os demais deslocaram uma semana por causa disso.
  "2026-08-13": { itens: ["original", "integral", "focaccia"], especial: "focaccia" },
  "2026-08-20": { itens: ["original", "integral", "multigraos"], especial: "multigraos" },
  // Tres rotativos na mesma semana (Hugo, 21/08/2026): o backoffice cadastrou
  // Brioche, Focaccia e Multigraos na semana 35 e a campanha de conversao
  // promete os tres. So o Brioche e `especial` — e a estreia, e o hero aceita
  // um item so. Focaccia e Multigraos entram como cards normais do Cardapio.
  "2026-08-27": { itens: ["original", "integral", "multigraos", "focaccia", "brioche"], especial: "brioche" },
  "2026-09-03": { itens: ["original", "integral", "ciabatta"], especial: "ciabatta" },
};

/**
 * Semana sem entrada no mapa (10/09/2026 em diante, ou data inesperada): só os
 * dois pães fixos e nenhum especial. Nunca quebra a tela e nunca oferece
 * produto que não vai ser assado — errar pra menos é o único erro aceitável
 * aqui, porque o oposto é vender o que não sai do forno.
 */
const MENU_FALLBACK = { itens: ["original", "integral"], especial: null };

// Congelados: o retorno é compartilhado entre renders e call-sites (o fallback
// é literalmente o mesmo objeto toda vez). Mutar aqui vazaria pra outra tela.
Object.values(MENU_POR_SEMANA).forEach(Object.freeze);
Object.freeze(MENU_FALLBACK);

/**
 * Menu da semana de `deliveryDate` (ISO "YYYY-MM-DD").
 * Retorna sempre `{ itens: string[], especial: string|null }` — nunca undefined.
 */
export function menuDaSemana(deliveryDate) {
  return MENU_POR_SEMANA[deliveryDate] || MENU_FALLBACK;
}
