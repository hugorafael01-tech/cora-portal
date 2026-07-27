/**
 * Calcula a data da primeira entrega (próxima quinta) com base na
 * data de corte: terça-feira 12h.
 *
 * - Assinou seg ou ter (antes de 12h): entrega na quinta da semana corrente.
 * - Assinou ter (12h em diante), qua, qui, sex, sáb ou dom:
 *   entrega na quinta da semana seguinte.
 *
 * Não considera se o pagamento foi confirmado — Hugo gerencia
 * manualmente no MVP.
 */
import { LAUNCH_FIRST_DELIVERY } from './cutoff.js';

const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export const calcularPrimeiraEntrega = (now = new Date()) => {
  const day = now.getDay();   // 0=dom, 1=seg, 2=ter, 3=qua, 4=qui, 5=sex, 6=sáb
  const hour = now.getHours();
  const dentroDoCorte = day === 1 || (day === 2 && hour < 12);

  // Offset em dias até a quinta-feira da entrega.
  // Dentro do corte (seg ou ter<12h): quinta DESTA semana. Fora: PRÓXIMA semana.
  const OFFSET_FORA = { 0: 4, 2: 9, 3: 8, 4: 7, 5: 6, 6: 5 };
  const offset = dentroDoCorte ? (4 - day) : OFFSET_FORA[day];

  const result = new Date(now);
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() + offset);

  // Piso de lançamento (mesma regra do cutoff.js): a primeira entrega nunca é
  // anterior a LAUNCH_FIRST_DELIVERY. Aqui a comparação é entre Dates, não entre
  // strings ISO: esta função opera em horário LOCAL (getDay/getHours/setHours),
  // e `result` já está na meia-noite local. Por isso o piso é reconstruído como
  // meia-noite LOCAL a partir dos componentes — nunca `new Date(iso)`, que
  // interpretaria a string como UTC e deslocaria o dia (fuso a oeste renderiza
  // "5 de agosto"). Pós-06/08 a quinta calculada é sempre >= piso: no-op.
  const [ano, mes, dia] = LAUNCH_FIRST_DELIVERY.split('-').map(Number);
  const piso = new Date(ano, mes - 1, dia);
  return result < piso ? piso : result;
};

/**
 * Formata data no padrão "Quinta, 7 de maio" (sem ano).
 */
export const formatarPrimeiraEntrega = (date) =>
  `${DIAS_SEMANA[date.getDay()]}, ${date.getDate()} de ${MESES[date.getMonth()]}`;
