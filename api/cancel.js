// api/cancel.js
// Anuluje rezerwację: usuwa z kalendarza, aktualizuje Supabase, wysyła email do klienta

const SUPABASE_URL = "https://ghbfgqbzqeelrnqexfeu.supabase.co"
const SUPABASE_KEY = "sb_publishable_3KOGtuQ1882QfsBGgwbHPg_Es2MF7bs"
const RESEND_KEY   = "re_NRFsuHQ5_7GoTxXQvcqVErFktGXUKa6f4"
const FROM_EMAIL   = "kontakt@pogotowiedetailingu.pl"
const CALENDAR_ID  = "kiperq97@gmail.com"

const SUPABASE_HEADERS = {
  "Content-Type": "application/json",
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
}

// ─── Service Account JWT (identyczny jak w calendar.js) ───────────────────────
const SERVICE_ACCOUNT_EMAIL = "calendar-bot@valued-mission-498918-r8.iam.gserviceaccount.com"
const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQC7+rkZVA54/0Of
9TwRCVJSVCpAlvMTcRu7019cZcYwdgp8S5TQqi2rFtLDISucM2VF1iPPymbr5tFD
0e72B9zlhQKvkyy5ZUR92C/tN1te+gntDPISPhbCZga3qSWCPEbRPI/JGRhnhxOR
4NBMk+bL/XL7/CshNiyaa+OJ2+MbajqwfuM6olpCAPIgwLiP2uqU4j25YOUkxNDH
+Z3eAsuKTzT6TqsICkQNGBJMdyhfo+NBoPd8d7tJH+kafvPY1UUXrSYPuFNOKL5/
2bq/gdeUu/IJgQshxfriJDzF5JNyDxpttximXCChdXRXwS1qixhgBH6XdX5Jg/e+
HJ7A8rCNAgMBAAECggEAC/6Wzn6uULqrADsn6sdfPRkZPBdVqc0rEZxOZqko0QFL
MHyrIXhmYxcY+jH05CnkYaUlElZuJEnNWwg7eO/uAKgw0G6x6R+E1AnWHwsL9b67
IOjVTmQvVBaqAZCVr950P1gfrZuAEuUL0uBXMjeyv5vruRfxUZRxGqZdNbf14RMV
RkKIzo9eN9aMOeWZbb+hcEyhlv6QVh69r8lLl2GD0wSufoElevm0Mz9bIvcnGOFh
6ar0IMsYTOcTljzjo3N1BuK45GaMAi2fS7g+LhpkmKpGB6eJZ0dqbd3ABZn1Dq2V
QJR1yV0zYigOPbg18j4J1B0Ztk/l9JZLAlMCgMa3AQKBgQDz1CmKJKyCBLp4oF99
cXMg0U1klyJ9zgGHS+4Yxwu5vXeZL3b0XJh42lQDlEIlwH3MSLszt8tWd3aNfy/c
PuC5xL6TN9B64CRjgTXmNBn1C0voYYa68B/KS86M1cEYXO5yI5bVRtczmYF/BOzL
0Z5aONlmCPlhb5H9Q3BdCXABjQKBgQDFXN+DiPLIM+xXh1a6M8Bvq4yHfclVd5oN
kLzoXB695fjVhnP9Xpa+XFhR+piT/34Svr+L3FntSkzH7b2w1z6LFrVZF3Q9dPj8
WG3+rBeJ80bjE+LsnkL86r5wU2+kXbVsHgFTUOOKAPZl4yeooP3B1QSCJfpvjuwU
jRFelEArAQKBgQDngLkwAEIJ8JNblGkVoXG95vukVhrZd47b9qvJurLXV50GRJqc
yI27sQ+zlkB3t5u5KhUTtZ3KKwLUtb2rT8fumW6YOJYpFEd4cmXKfA1pK6CWsoJJ
W1PTrsYd0ZXUm+eJV2EOfoQ06bqZ7wMlQZEn+HHw/vRIHrZt0GoO67b8wQKBgQCi
xR/J+Y5RsxD+dy39z2SsNI1nyUPc6xDwkyhZcnAgKaR5ZbQPiI1GXh6xLb3cgWBW
0V5kWM0JuLduRBKn4D1CtO3HlmJVtT0L0VqWKRQYv7z81o/WmgehU3DQbt+qbWaM
zopFTnb6gCS2jwtMNcpSq/5V4ECU9QibQmTK3fW2AQKBgQC6rr4U/vim9hEjBFFZ
KP8cJk0IseHzEhyWWqDwiYN2OoRGD4QOvnBHkj+sGYMhMcc7Wr4y9bmIE4+RYBp8
t6xpPeuXZFIUMHWR+oZtq1XQ2QOjOGcYBW/LQipzoHYgxhw/0ZJgj6Env+9kCSiN
BB9XShuve4Jotcbeiy34q+0e1g==
-----END PRIVATE KEY-----`

function base64url(str) {
  return btoa(str).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'')
}
function base64urlFromUint8(buf) {
  let b=''; for(const x of buf) b+=String.fromCharCode(x); return base64url(b)
}
async function getAccessToken() {
  const now = Math.floor(Date.now()/1000)
  const hdr = base64url(JSON.stringify({alg:'RS256',typ:'JWT'}))
  const pay = base64url(JSON.stringify({iss:SERVICE_ACCOUNT_EMAIL,scope:'https://www.googleapis.com/auth/calendar',aud:'https://oauth2.googleapis.com/token',exp:now+3600,iat:now}))
  const inp = `${hdr}.${pay}`
  const pem = PRIVATE_KEY.replace(/-----BEGIN PRIVATE KEY-----/,'').replace(/-----END PRIVATE KEY-----/,'').replace(/\s+/g,'')
  const der = Uint8Array.from(atob(pem),c=>c.charCodeAt(0))
  const key = await crypto.subtle.importKey('pkcs8',der.buffer,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign'])
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,new TextEncoder().encode(inp))
  const jwt = `${inp}.${base64urlFromUint8(new Uint8Array(sig))}`
  const r = await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:`grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`})
  const d = await r.json()
  if(!d.access_token) throw new Error(`Token error: ${JSON.stringify(d)}`)
  return d.access_token
}

// ─── Cancel email to client ───────────────────────────────────────────────────
function cancelEmailHtml(booking) {
  return `<!DOCTYPE html><html lang="pl"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 16px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <tr><td style="background:#161616;border-top:3px solid #e50001;padding:36px 40px 28px;border-radius:4px 4px 0 0;">
    <p style="margin:0 0 6px;font-size:10px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:#e50001;">Pogotowie Detailingu</p>
    <h1 style="margin:0;font-size:28px;font-weight:900;color:#fff;text-transform:uppercase;line-height:1.1;">Rezerwacja<br/><span style="color:rgba(255,255,255,0.4);">Anulowana</span></h1>
  </td></tr>
  <tr><td style="background:#2a1515;border-top:1px solid #5a2020;border-bottom:1px solid #5a2020;padding:14px 40px;">
    <p style="margin:0;font-size:13px;font-weight:700;color:#f87171;">Twoja rezerwacja została anulowana.</p>
  </td></tr>
  <tr><td style="background:#161616;padding:28px 40px;">
    <p style="margin:0 0 20px;font-size:15px;color:rgba(255,255,255,0.75);line-height:1.8;">
      Cześć <strong style="color:#fff;">${booking.client_name}</strong>,<br/><br/>
      Informujemy, że Twoja rezerwacja na dzień <strong style="color:#fff;">${booking.date}</strong>, godz. <strong style="color:#fff;">${booking.time_slot}</strong> została anulowana.<br/><br/>
      Jeśli chcesz umówić nowy termin, skontaktuj się z nami lub wróć na stronę rezerwacji.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(229,0,1,0.07);border:1px solid rgba(229,0,1,0.18);border-radius:3px;margin-bottom:24px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 8px;font-size:10px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#e50001;">Anulowany termin</p>
        <p style="margin:0;font-size:15px;font-weight:700;color:#fff;">${booking.date}, godz. ${booking.time_slot}</p>
        <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.5);">${booking.client_address||""}</p>
      </td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding-right:8px;" width="50%">
          <a href="mailto:${FROM_EMAIL}?subject=Nowy%20termin%20rezerwacji" style="display:block;background:#e50001;color:#fff;text-decoration:none;text-align:center;padding:14px;font-size:12px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;border-radius:2px;">✉ Napisz do nas</a>
        </td>
        <td style="padding-left:8px;" width="50%">
          <a href="https://pogotowiedetailingu.pl" style="display:block;background:transparent;color:#fff;text-decoration:none;text-align:center;padding:13px;font-size:12px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;border-radius:2px;border:1px solid rgba(255,255,255,0.2);">Umów nowy termin</a>
        </td>
      </tr>
    </table>
  </td></tr>
  <tr><td style="background:#0f0f0f;padding:20px 40px;border-top:1px solid rgba(255,255,255,0.06);border-radius:0 0 4px 4px;">
    <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.2);text-align:center;">Pogotowie Detailingu · kontakt@pogotowiedetailingu.pl</p>
  </td></tr>
</table></td></tr></table></body></html>`
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin","*")
  res.setHeader("Access-Control-Allow-Methods","POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers","Content-Type")
  if(req.method==="OPTIONS") return res.status(204).end()
  if(req.method!=="POST") return res.status(405).json({error:"Method not allowed"})

  try {
    const { bookingId } = req.body
    if(!bookingId) return res.status(400).json({error:"Brak bookingId"})

    // 1. Pobierz rezerwację z Supabase
    const getRes = await fetch(
      `${SUPABASE_URL}/rest/v1/bookings?id=eq.${bookingId}&select=*`,
      { headers: SUPABASE_HEADERS }
    )
    const bookings = await getRes.json()
    if(!bookings.length) return res.status(404).json({error:"Nie znaleziono rezerwacji"})
    const booking = bookings[0]

    // 2. Usuń wydarzenie z Google Calendar (jeśli jest zapisany eventId)
    if(booking.calendar_event_id) {
      try {
        const token = await getAccessToken()
        await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events/${booking.calendar_event_id}`,
          { method: "DELETE", headers: { "Authorization": `Bearer ${token}` } }
        )
      } catch(e) {
        console.warn("Calendar delete error (non-critical):", e)
      }
    }

    // 3. Zaktualizuj status w Supabase → cancelled
    await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${bookingId}`, {
      method: "PATCH",
      headers: { ...SUPABASE_HEADERS, "Prefer": "return=representation" },
      body: JSON.stringify({ status: "cancelled" }),
    })

    // 4. Wyślij email do klienta o anulowaniu
    if(booking.client_email) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${RESEND_KEY}` },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: booking.client_email,
          subject: `Anulowanie rezerwacji — ${booking.date}, godz. ${booking.time_slot}`,
          html: cancelEmailHtml(booking),
        }),
      })
    }

    return res.status(200).json({ success: true })
  } catch(err) {
    return res.status(500).json({ error: String(err) })
  }
}
