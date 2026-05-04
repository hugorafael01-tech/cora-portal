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
  return result;
};

/**
 * Formata data no padrão "Quinta, 7 de maio" (sem ano).
 */
export const formatarPrimeiraEntrega = (date) =>
  `${DIAS_SEMANA[date.getDay()]}, ${date.getDate()} de ${MESES[date.getMonth()]}`;
