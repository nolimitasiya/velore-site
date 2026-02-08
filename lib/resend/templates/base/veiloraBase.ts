// lib/resend/templates/base/veiloraBase.ts
// Shared Veilora Club email layout (Abril Fatface) — full-bleed (no card)

export type VeiloraCta = { label: string; href: string } | null;

export type VeiloraEmailParams = {
  preheader: string;
  heading: string;
  intro?: string;
  bodyHtml: string;
  cta?: VeiloraCta;
  footerNote?: string;
};

/* ---------------- helpers ---------------- */

function escapeHtml(input: string) {
  return String(input)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttr(input: string) {
  return escapeHtml(input).replaceAll("`", "&#96;");
}

/* ---------------- template ---------------- */

export function veiloraEmailTemplate({
  preheader,
  heading,
  intro,
  bodyHtml,
  cta = null,
  footerNote,
}: VeiloraEmailParams): string {
  const safePreheader = escapeHtml(preheader).slice(0, 140);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no" />
  <title>${escapeHtml(heading)}</title>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Abril+Fatface&display=swap" rel="stylesheet">

  <style>
    @import url('https://fonts.googleapis.com/css2?family=Abril+Fatface&display=swap');

    body { margin:0; padding:0; background:#111111; }
    .outer { width:100%; background:#111111; padding:0; }
    .inner { width:100%; max-width:100%; margin:0; padding:32px 24px; }

    .brand {
      font-family:"Abril Fatface", Georgia, "Times New Roman", serif;
      font-size:18px;
      color:#ffffff;
    }

    h1 {
      font-family:"Abril Fatface", Georgia, "Times New Roman", serif;
      font-size:34px;
      margin:10px 0 14px 0;
      color:#ffffff;
    }

    p {
      font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Inter,Arial,sans-serif;
      font-size:16px;
      line-height:1.65;
      color:#ffffff;
      margin:0 0 12px 0;
    }

    .muted { font-size:13px; color:#c9c9c9; }

    .btn {
      display:inline-block;
      margin-top:16px;
      padding:12px 18px;
      background:#ffffff;
      color:#111111 !important;
      border-radius:999px;
      font-weight:600;
      font-size:15px;
      text-decoration:none;
    }

    @media (max-width:600px) {
      .inner { padding:24px 18px !important; }
      h1 { font-size:30px !important; }
    }
  </style>
</head>

<body>
  <!-- Preheader -->
  <div style="display:none;max-height:0;overflow:hidden;">
    ${safePreheader}
  </div>

  <div class="outer">
  <div class="inner" style="text-align:center; max-width:600px; margin:0 auto;">

    <div class="brand">Veilora Club</div>

    <h1>${escapeHtml(heading)}</h1>

    ${intro ? `<p>${escapeHtml(intro)}</p>` : ""}

    ${bodyHtml}


      ${
        cta
          ? `<a class="btn" href="${escapeAttr(cta.href)}">${escapeHtml(cta.label)}</a>`
          : ""
      }

      <p class="muted">
        ${escapeHtml(
          footerNote ?? "Need help? Reply to this email or contact us at onboarding@veiloraclub.com."
        )}
      </p>

      <p class="muted">© ${new Date().getFullYear()} Veilora Club · veiloraclub.com</p>
    </div>
  </div>
</body>
</html>`;
}
