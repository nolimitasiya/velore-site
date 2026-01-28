import { Resend } from "resend";

export const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export const FROM_ONBOARDING =
  process.env.RESEND_FROM_ONBOARDING ?? "Veilora Club <onboarding@yourdomain.com>";

export const FROM_MARKETING =
  process.env.RESEND_FROM_MARKETING ?? "Veilora Club <marketing@yourdomain.com>";

export const FROM_INFO =
  process.env.RESEND_FROM_INFO ?? "Veilora Club <info@yourdomain.com>";

export const REPLY_TO_MARKETING =
  process.env.RESEND_REPLY_TO_MARKETING ?? "marketing@yourdomain.com";
