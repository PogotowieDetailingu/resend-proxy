// api/calendar.js — Vercel endpoint
// Tworzy wydarzenie w Google Calendar po przyjęciu rezerwacji

const SERVICE_ACCOUNT_EMAIL = "calendar-bot@valued-mission-498918-r8.iam.gserviceaccount.com"
const CALENDAR_ID           = "kiperq97@gmail.com"

// private_key z JSON (\\n zamieniamy na prawdziwe nowe linie)
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

// ─── JWT helper (bez zewnętrznych bibliotek) ──────────────────────────────────

function base64url(str) {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function base64urlFromUint8(buf) {
  let binary = ''
  for (const b of buf) binary += String.fromCharCode(b)
  return base64url(binary)
}

async function createJWT() {
  const now = Math.floor(Date.now() / 1000)
  const header  = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const payload = base64url(JSON.stringify({
    iss: SERVICE_ACCOUNT_EMAIL,
    scope: 'https://www.googleapis.com/auth/calendar',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }))

  const signingInput = `${header}.${payload}`

  // Import private key
  const pemBody = PRIVATE_KEY
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '')

  const binaryDer = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0))

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', binaryDer.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  )

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput)
  )

  return `${signingInput}.${base64urlFromUint8(new Uint8Array(signature))}`
}

async function getAccessToken() {
  const jwt = await createJWT()
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  })
  const data = await res.json()
  if (!data.access_token) throw new Error(`Token error: ${JSON.stringify(data)}`)
  return data.access_token
}

// ─── Parsuj datę "DD.MM.YYYY" i godzinę "HH:MM" → ISO ───────────────────────

function toISO(date, time, offsetMinutes = 0) {
  const [d, m, y] = date.split('.').map(Number)
  const [h, min]  = time.split(':').map(Number)
  const dt = new Date(y, m - 1, d, h, min + offsetMinutes)
  // Zwróć jako local time string (Europe/Warsaw = UTC+2 latem)
  const pad = n => String(n).padStart(2, '0')
  return `${y}-${pad(m)}-${pad(d)}T${pad(dt.getHours())}:${pad(dt.getMinutes())}:00+02:00`
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { name, email, phone, address, car, date, time, services, total } = req.body

    if (!date || !time) return res.status(400).json({ error: 'Brak daty lub godziny' })

    const accessToken = await getAccessToken()

    const event = {
      summary: `🚗 Detailing — ${name}${car ? ` (${car})` : ''}`,
      // car model in summary for quick calendar view
      location: address,
      description: [
        `Klient: ${name}`,
        `Telefon: ${phone}`,
        `Email: ${email}`,
        `Auto: ${car || "—"}`,
        `Adres: ${address}`,
        ``,
        `Usługi:`,
        services,
        ``,
        `Łącznie: ${total} zł`,
      ].join('\n'),
      start: {
        dateTime: toISO(date, time),
        timeZone: 'Europe/Warsaw',
      },
      end: {
        dateTime: toISO(date, time, 90), // +90 minut
        timeZone: 'Europe/Warsaw',
      },
      colorId: '11', // czerwony — pasuje do brandingu
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup',  minutes: 60 },
          { method: 'popup',  minutes: 1440 }, // dzień wcześniej
        ],
      },
    }

    const calRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    )

    const calData = await calRes.json()
    if (!calRes.ok) return res.status(calRes.status).json({ error: calData })

    return res.status(200).json({ success: true, eventId: calData.id, eventLink: calData.htmlLink })
  } catch (err) {
    return res.status(500).json({ error: String(err) })
  }
}
