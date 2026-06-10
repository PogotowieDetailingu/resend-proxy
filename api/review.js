// api/review.js — wysyła email z prośbą o opinię na Google

const RESEND_KEY  = "re_NRFsuHQ5_7GoTxXQvcqVErFktGXUKa6f4"
const FROM_EMAIL  = "kontakt@pogotowiedetailingu.pl"
const REVIEW_URL  = "https://g.page/r/CQEGTMr-nNWXEBM/review"
const SUPABASE_URL = "https://ghbfgqbzqeelrnqexfeu.supabase.co"
const SUPABASE_KEY = "sb_publishable_3KOGtuQ1882QfsBGgwbHPg_Es2MF7bs"

function reviewEmailHtml(name) {
  return `<!DOCTYPE html><html lang="pl"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 16px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

  <tr><td style="background:#161616;border-top:3px solid #e50001;padding:36px 40px 28px;border-radius:4px 4px 0 0;">
    <p style="margin:0 0 6px;font-size:10px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:#e50001;">Pogotowie Detailingu</p>
    <h1 style="margin:0;font-size:28px;font-weight:900;color:#fff;text-transform:uppercase;line-height:1.1;">
      Jak oceniasz<br/><span style="color:#e50001;">naszą usługę?</span>
    </h1>
  </td></tr>

  <tr><td style="background:#161616;padding:28px 40px 0;">
    <p style="margin:0 0 20px;font-size:15px;color:rgba(255,255,255,0.75);line-height:1.8;">
      Cześć <strong style="color:#fff;">${name}</strong>,<br/><br/>
      Dziękujemy za skorzystanie z naszych usług detailingowych! Mamy nadzieję, że efekt przekroczył Twoje oczekiwania.<br/><br/>
      Jeśli jesteś zadowolony/a, będziemy bardzo wdzięczni za wystawienie krótkiej opinii na Google. Zajmuje to dosłownie <strong style="color:#fff;">30 sekund</strong> i pomaga nam dotrzeć do kolejnych klientów. 🙏
    </p>

    <!-- Gwiazdki dekoracyjne -->
    <div style="text-align:center;margin-bottom:24px;">
      <span style="font-size:32px;letter-spacing:4px;">⭐⭐⭐⭐⭐</span>
    </div>

    <!-- CTA button -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr><td align="center">
        <a href="${REVIEW_URL}"
           style="display:inline-block;background:#e50001;color:#ffffff;text-decoration:none;padding:18px 40px;font-size:14px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;border-radius:2px;">
          ⭐ &nbsp;Wystaw opinię na Google
        </a>
      </td></tr>
    </table>

    <p style="margin:0 0 8px;font-size:12px;color:rgba(255,255,255,0.35);text-align:center;line-height:1.7;">
      Kliknij przycisk powyżej — zostaniesz przekierowany/a bezpośrednio<br/>
      do formularza opinii Google. Nie wymaga rejestracji.
    </p>
  </td></tr>

  <!-- Separator -->
  <tr><td style="background:#161616;padding:0 40px;">
    <div style="height:1px;background:rgba(255,255,255,0.07);margin:20px 0;"></div>
  </td></tr>

  <!-- Stopka z podziękowaniem -->
  <tr><td style="background:#161616;padding:0 40px 28px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(229,0,1,0.06);border:1px solid rgba(229,0,1,0.15);border-radius:2px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 6px;font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#e50001;">Dziękujemy za zaufanie</p>
        <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.6);line-height:1.7;">
          Każda opinia jest dla nas ważna i motywuje nas do dalszej pracy. Jeśli masz jakiekolwiek uwagi lub pytania — napisz do nas bezpośrednio.
        </p>
      </td></tr>
    </table>
  </td></tr>

  <tr><td style="background:#0f0f0f;padding:20px 40px;border-top:1px solid rgba(255,255,255,0.06);border-radius:0 0 4px 4px;">
    <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.2);text-align:center;line-height:1.8;">
      Pogotowie Detailingu &nbsp;·&nbsp; kontakt@pogotowiedetailingu.pl<br/>
      <span style="font-size:10px;">Jeśli nie korzystałeś/aś z naszych usług, zignoruj tę wiadomość.</span>
    </p>
  </td></tr>

</table></td></tr></table></body></html>`
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")
  if (req.method === "OPTIONS") return res.status(204).end()
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" })

  try {
    const { bookingId } = req.body
    if (!bookingId) return res.status(400).json({ error: "Brak bookingId" })

    // Pobierz dane klienta z Supabase
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/bookings?id=eq.${bookingId}&select=*`,
      { headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` } }
    )
    const data = await r.json()
    if (!data.length) return res.status(404).json({ error: "Nie znaleziono rezerwacji" })
    const booking = data[0]

    // Wyślij email
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${RESEND_KEY}` },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: booking.client_email,
        subject: `${booking.client_name}, jak oceniasz nasz detailing? ⭐`,
        html: reviewEmailHtml(booking.client_name),
      }),
    })

    if (!emailRes.ok) {
      const err = await emailRes.json()
      return res.status(500).json({ error: err })
    }

    // Zapisz że wysłano prośbę o opinię
    await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${bookingId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Prefer": "return=representation"
      },
      body: JSON.stringify({ review_requested: true }),
    })

    return res.status(200).json({ success: true })
  } catch (err) {
    return res.status(500).json({ error: String(err) })
  }
}
