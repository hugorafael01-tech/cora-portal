/**
 * Prazo de corte: terça-feira às 22h (entrega na quinta).
 * Retorna true se o horário atual for depois de terça 22h
 * (ou seja, quarta, quinta, sexta, sábado, domingo ou segunda são livres,
 *  terça antes das 22h também — só bloqueia de terça 22h até domingo 23:59).
 *
 * Janela bloqueada: terça 22:00 → domingo 23:59
 * Janela aberta:    segunda 00:00 → terça 21:59
 */
export function isPastCutoff(now = new Date()) {
  const day = now.getDay(); // 0=dom, 1=seg, 2=ter, 3=qua…
  const hour = now.getHours();

  // Terça (2) após 22h
  if (day === 2 && hour >= 22) return true;

  // Quarta (3) a domingo (0) — já passou do cutoff
  if (day >= 3 || day === 0) return true;

  return false;
}
