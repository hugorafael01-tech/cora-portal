/**
 * Resend client (email transacional).
 *
 * Server-side only. Nao importar do front.
 */
import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  throw new Error("Missing Resend API key (RESEND_API_KEY)");
}

export const resend = new Resend(process.env.RESEND_API_KEY);
