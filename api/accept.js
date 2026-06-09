// api/accept.js
// Przyjmuje rezerwację z panelu admina:
// 1. Pobiera dane z Supabase
// 2. Wysyła email do klienta (przyjęto)
// 3. Tworzy wydarzenie w Google Calendar
// 4. Aktualizuje status w Supabase → confirmed

const SUPABASE_URL = "https://ghbfgqbzqeelrnqexfeu.supabase.co"
const SUPABASE_KEY = "sb_publishable_3KOGtuQ1882QfsBGgwbHPg_Es2MF7bs"
const RESEND_KEY   = "re_NRFsuHQ5_7GoTxXQvcqVErFktGXUKa6f4"
const FROM_EMAIL   = "kontakt@pogotowiedetailingu.pl"
const OWNER_EMAIL  = "kontakt@pogotowiedetailingu.pl"
const CALENDAR_ID  = "kiperq97@gmail.com"

const SUPABASE_HEADERS = {
  "Content-Type": "application/json",
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
}

// ─── JWT / Google Calendar (identyczny jak w calendar.js) ─────────────────────
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

function toISO(date, time, offsetMinutes = 0) {
  const [d,m,y] = date.split('.').map(Number)
  const [h,min] = time.split(':').map(Number)
  const dt = new Date(y, m-1, d, h, min+offsetMinutes)
  const pad = n => String(n).padStart(2,'0')
  return `${y}-${pad(m)}-${pad(d)}T${pad(dt.getHours())}:${pad(dt.getMinutes())}:00+02:00`
}

// ─── Email do klienta — przyjęto ─────────────────────────────────────────────
function acceptedEmailHtml(b) {
  const rows = b.services
    ? String(b.services).split('\n').filter(Boolean).map(line => {
        const parts = line.split(' — ')
        return `<tr>
          <td style="padding:10px 16px;border-bottom:1px solid rgba(255,255,255,0.06);font-size:14px;color:#fff;">${parts[0]||line}</td>
          <td style="padding:10px 16px;border-bottom:1px solid rgba(255,255,255,0.06);font-size:14px;font-weight:700;color:#fff;text-align:right;">${parts[1]||''}</td>
        </tr>`
      }).join('')
    : ''

  return `<!DOCTYPE html><html lang="pl"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 16px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <tr><td style="background:#161616;border-top:3px solid #e50001;padding:36px 40px 28px;border-radius:4px 4px 0 0;">
    <p style="margin:0 0 6px;font-size:10px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:#e50001;">Pogotowie Detailingu</p>
    <h1 style="margin:0;font-size:30px;font-weight:900;color:#fff;text-transform:uppercase;line-height:1.1;">Rezerwacja<br/><span style="color:#22c55e;">Przyjęta ✓</span></h1>
  </td></tr>
  <tr><td style="background:#052e16;border-top:1px solid #166534;border-bottom:1px solid #166534;padding:16px 40px;">
    <p style="margin:0;font-size:13px;font-weight:700;color:#4ade80;">✓ Twoje zamówienie zostało przyjęte i potwierdzone!</p>
  </td></tr>
  <tr><td style="background:#161616;padding:28px 40px 0;">
    <p style="margin:0 0 20px;font-size:15px;color:rgba(255,255,255,0.75);line-height:1.8;">
      Cześć <strong style="color:#fff;">${b.client_name}</strong>,<br/><br/>
      Twoja rezerwacja została <strong style="color:#4ade80;">przyjęta</strong>. Nasz specjalista będzie u Ciebie punktualnie.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(229,0,1,0.06);border:1px solid rgba(229,0,1,0.2);border-radius:3px;margin-bottom:20px;">
      <tr><td style="padding:12px 20px;border-bottom:1px solid rgba(229,0,1,0.12);">
        <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#e50001;">Szczegóły wizyty</p>
      </td></tr>
      <tr><td style="padding:14px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="50%" style="padding-bottom:8px;"><p style="margin:0;font-size:11px;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:0.1em;">Data</p><p style="margin:3px 0 0;font-size:15px;font-weight:700;color:#fff;">${b.date}</p></td>
            <td width="50%" style="padding-bottom:8px;"><p style="margin:0;font-size:11px;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:0.1em;">Godzina</p><p style="margin:3px 0 0;font-size:15px;font-weight:700;color:#fff;">${b.time_slot}</p></td>
          </tr>
          <tr><td colspan="2"><p style="margin:0;font-size:11px;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:0.1em;">Adres realizacji</p><p style="margin:3px 0 0;font-size:15px;color:#fff;">${b.client_address||'—'}</p></td></tr>
        </table>
      </td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid rgba(255,255,255,0.07);border-radius:3px;margin-bottom:20px;">
      ${rows}
      <tr style="background:rgba(229,0,1,0.08);border-top:1px solid rgba(229,0,1,0.2);">
        <td style="padding:14px 16px;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:rgba(255,255,255,0.4);">Łącznie</td>
        <td style="padding:14px 16px;font-size:22px;font-weight:900;color:#fff;text-align:right;">${b.total||0} zł</td>
      </tr>
    </table>
    <p style="margin:0 0 28px;font-size:13px;color:rgba(255,255,255,0.5);line-height:1.7;">Pytania? <a href="mailto:${OWNER_EMAIL}" style="color:#e50001;font-weight:700;text-decoration:none;">${OWNER_EMAIL}</a></p>
  </td></tr>
  <tr><td style="background:#0f0f0f;padding:20px 40px;border-top:1px solid rgba(255,255,255,0.06);border-radius:0 0 4px 4px;">
    <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.2);text-align:center;">Pogotowie Detailingu · kontakt@pogotowiedetailingu.pl</p>
  </td></tr>
</table></td></tr></table></body></html>`
}

// ─── Handler ──────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin','*')
  res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers','Content-Type')
  if(req.method==='OPTIONS') return res.status(204).end()
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'})

  try {
    const { bookingId } = req.body
    if(!bookingId) return res.status(400).json({error:'Brak bookingId'})

    // 1. Pobierz rezerwację z Supabase
    const getRes = await fetch(
      `${SUPABASE_URL}/rest/v1/bookings?id=eq.${bookingId}&select=*`,
      { headers: SUPABASE_HEADERS }
    )
    const bookings = await getRes.json()
    if(!bookings.length) return res.status(404).json({error:'Nie znaleziono rezerwacji'})
    const b = bookings[0]

    if(b.status === 'confirmed') {
      return res.status(200).json({success:true, alreadyConfirmed:true})
    }

    // 2. Wyślij email do klienta
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${RESEND_KEY}` },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: b.client_email,
        subject: `✅ Rezerwacja potwierdzona — ${b.date}, godz. ${b.time_slot}`,
        html: acceptedEmailHtml(b),
      }),
    })

    // 3. Utwórz wydarzenie w Google Calendar
    let calendarEventId = null
    try {
      const token = await getAccessToken()
      const event = {
        summary: `🚗 Detailing — ${b.client_name}${b.client_car ? ` (${b.client_car})` : ''}`,
        location: b.client_address || '',
        description: [
          `Klient: ${b.client_name}`,
          `Telefon: ${b.client_phone}`,
          `Email: ${b.client_email}`,
          `Auto: ${b.client_car || '—'}`,
          `Adres: ${b.client_address || '—'}`,
          ``,
          `Usługi:`,
          b.services || '',
          ``,
          `Łącznie: ${b.total || 0} zł`,
        ].join('\n'),
        start: { dateTime: toISO(b.date, b.time_slot),     timeZone: 'Europe/Warsaw' },
        end:   { dateTime: toISO(b.date, b.time_slot, 90), timeZone: 'Europe/Warsaw' },
        colorId: '11',
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 60 },
            { method: 'popup', minutes: 1440 },
          ],
        },
      }
      const calRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events`,
        { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(event) }
      )
      const calData = await calRes.json()
      calendarEventId = calData.id || null
    } catch(e) {
      console.warn('Calendar error (non-critical):', e)
    }

    // 4. Zaktualizuj status w Supabase → confirmed
    await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${bookingId}`, {
      method: 'PATCH',
      headers: { ...SUPABASE_HEADERS, 'Prefer': 'return=representation' },
      body: JSON.stringify({ status: 'confirmed', calendar_event_id: calendarEventId }),
    })

    return res.status(200).json({ success: true, calendarEventId })
  } catch(err) {
    return res.status(500).json({ error: String(err) })
  }
}
