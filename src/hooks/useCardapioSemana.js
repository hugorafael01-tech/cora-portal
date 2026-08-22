/**
 * Hook de leitura do cardapio da semana — a metade de I/O.
 *
 * A logica de montagem (e o fallback) mora em src/lib/cardapio-semana.js, pura
 * e testada por scripts/test-cardapio-semana.mjs. Aqui fica so a ida ao banco.
 */
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { montaCardapio, CARDAPIO_FALLBACK } from "../lib/cardapio-semana";

/**
 * Cardapio da semana de `deliveryDate` (ISO "YYYY-MM-DD").
 *
 * Devolve sempre um menu utilizavel — nunca undefined, nunca tela em branco.
 * `loading` serve pra segurar o estado "sem novidade esta semana": mostrar o
 * EmptyState antes da resposta chegar seria dizer que nao tem hero e depois
 * mudar de ideia.
 *
 * @returns {{menu: {itens: string[], especial: string|null, precos: Map<string, number>}, loading: boolean}}
 */
export function useCardapioSemana(deliveryDate) {
  // Guarda de qual data e o resultado (mesmo padrao de useSubscription): sem
  // isso, trocar de semana serviria o menu da anterior por um render.
  const [result, setResult] = useState({ menu: null, forDate: null });

  useEffect(() => {
    if (!deliveryDate) return;

    // Flag de ignore: evita setState apos unmount ou troca de data.
    let ignore = false;

    supabase
      .from("cardapio_publico")
      .select("slug,preco_avulso,destaque")
      .eq("data_entrega", deliveryDate)
      .then(({ data, error }) => {
        if (ignore) return;
        if (error) console.error("[useCardapioSemana] leitura falhou", error);
        setResult({ menu: montaCardapio(data, error), forDate: deliveryDate });
      })
      .catch((err) => {
        if (ignore) return;
        console.error("[useCardapioSemana] leitura falhou", err);
        setResult({ menu: CARDAPIO_FALLBACK, forDate: deliveryDate });
      });

    return () => {
      ignore = true;
    };
  }, [deliveryDate]);

  const current = result.forDate === deliveryDate;
  return {
    menu: current && result.menu ? result.menu : CARDAPIO_FALLBACK,
    loading: !current,
  };
}
