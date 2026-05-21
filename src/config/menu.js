/**
 * Cardápio da semana corrente — solução tática pré-Evandro.
 *
 * O modelo da Cora é 2 pães fixos + 1 especial rotativo. Enquanto o catálogo
 * inteiro não tem fonte por semana, fixamos aqui os ids visíveis no Cardápio.
 * Produtos fora desta lista (brioche, ciabatta, multigrãos…) somem do render
 * — não são desabilitados nem mostrados, só ficam de fora.
 *
 * Os ids batem com D.pães / D.rotativos / D.extras em src/App.jsx. Cada id vira
 * um card na lista; o especial da semana (D.extras[0]) também aparece em
 * destaque como "Novidade Hero" — então ele repete (Hero + card), de propósito:
 * só o card menor expande com a descrição completa do produto.
 *
 * Solução definitiva (config versionado no repo ou tabela no Backoffice) entra
 * depois. Pra mudar a semana agora: editar a lista abaixo e commitar.
 */
export const MENU_SEMANA = ['original', 'integral', 'focaccia'];
