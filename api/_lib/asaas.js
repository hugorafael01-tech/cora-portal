/**
 * Cliente da API do Asaas. **A primeira chamada de SAIDA da casa** — ate 05/09
 * o Asaas so falava com a Cora por webhook, nunca o contrario.
 *
 * ============================================================================
 * SANDBOX NESTA FASE. PRODUCAO NUNCA.
 * ============================================================================
 * A base vem de ASAAS_API_BASE e o default e o sandbox. Nao ha caminho que
 * chegue em producao por esquecimento: pra apontar pra la alguem tem que
 * escrever a URL de producao no env, de proposito.
 */

const BASE_PADRAO = "https://api-sandbox.asaas.com/v3";

function base() {
  return (process.env.ASAAS_API_BASE || BASE_PADRAO).replace(/\/$/, "");
}

function chave() {
  const key = process.env.ASAAS_API_KEY_SANDBOX;
  if (!key) {
    throw new Error(
      "ASAAS_API_KEY_SANDBOX ausente. Na Vercel ela existe; localmente precisa estar no .env.local do portal.",
    );
  }
  return key;
}

/**
 * Uma chamada. Erro do Asaas vira Error com a mensagem que ELE deu — o corpo
 * de erro traz `errors[].description`, que e legivel, e engolir isso
 * transformaria "CPF invalido" em "falhou".
 *
 * Timeout explicito: sem ele uma function da Vercel fica pendurada ate o limite
 * da plataforma, e a geracao inteira trava por causa de um assinante.
 */
async function chamar(caminho, { method = "GET", body, timeoutMs = 20000 } = {}) {
  const controle = new AbortController();
  const timer = setTimeout(() => controle.abort(), timeoutMs);
  try {
    const resp = await fetch(`${base()}${caminho}`, {
      method,
      headers: {
        access_token: chave(),
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controle.signal,
    });

    const texto = await resp.text();
    let dados = null;
    try {
      dados = texto ? JSON.parse(texto) : null;
    } catch {
      // Resposta nao-JSON (HTML de erro de borda, por exemplo): preserva o
      // texto cru no erro em vez de mascarar com "resposta invalida".
      if (!resp.ok) throw new Error(`Asaas ${resp.status}: ${texto.slice(0, 200)}`);
      throw new Error(`Asaas devolveu resposta nao-JSON em ${caminho}`);
    }

    if (!resp.ok) {
      const descricao = dados?.errors?.map((e) => e.description).join("; ") || texto.slice(0, 200);
      throw new Error(`Asaas ${resp.status} em ${caminho}: ${descricao}`);
    }
    return dados;
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error(`Asaas nao respondeu em ${timeoutMs}ms (${caminho})`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** POST /v3/payments. Devolve o pagamento criado. */
export async function criarPagamento(corpo) {
  return chamar("/payments", { method: "POST", body: corpo });
}

/**
 * Linha digitavel e payload Pix do pagamento.
 *
 * O create nem sempre devolve os dois: dependem do registro do boleto e da
 * geracao do QR, que podem levar alguns segundos. Os dois endpoints abaixo sao
 * o caminho oficial pra buscar depois.
 *
 * BEST-EFFORT DE PROPOSITO: a cobranca JA EXISTE quando isto roda. Falhar aqui
 * nao pode derrubar a geracao nem fazer o retry recriar a cobranca — os campos
 * ficam nulos e a tela Pagamentos (pos-outubro) busca de novo. Por isso cada
 * um tem catch proprio e devolve null.
 */
export async function dadosDePagamento(paymentId, { billingType }) {
  const out = { linhaDigitavel: null, pixPayload: null };

  if (billingType === "BOLETO" || billingType === "UNDEFINED") {
    try {
      const r = await chamar(`/payments/${paymentId}/identificationField`);
      out.linhaDigitavel = r?.identificationField ?? null;
    } catch (err) {
      console.warn("[asaas] linha digitavel indisponivel", paymentId, err.message);
    }
  }

  if (billingType === "PIX" || billingType === "UNDEFINED") {
    try {
      const r = await chamar(`/payments/${paymentId}/pixQrCode`);
      out.pixPayload = r?.payload ?? null;
    } catch (err) {
      console.warn("[asaas] payload Pix indisponivel", paymentId, err.message);
    }
  }

  return out;
}

/** Exportado so pro teste conseguir afirmar contra qual base a chamada iria. */
export function baseAtual() {
  return base();
}
