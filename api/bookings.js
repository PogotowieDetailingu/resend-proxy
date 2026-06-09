// api/bookings.js — zwraca listę rezerwacji dla panelu admina
const SUPABASE_URL = "https://ghbfgqbzqeelrnqexfeu.supabase.co"
const SUPABASE_KEY = "sb_publishable_3KOGtuQ1882QfsBGgwbHPg_Es2MF7bs"
const ADMIN_PIN    = "2113" // ← zmień na swój PIN

const HEADERS = {
  "Content-Type": "application/json",
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin","*")
  res.setHeader("Access-Control-Allow-Methods","GET, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers","Content-Type, x-admin-pin")
  if(req.method==="OPTIONS") return res.status(204).end()

  // Prosta ochrona PINem
  const pin = req.headers["x-admin-pin"]
  if(pin !== ADMIN_PIN) return res.status(401).json({error:"Nieautoryzowany"})

  const { status, date } = req.query
  let url = `${SUPABASE_URL}/rest/v1/bookings?select=*&order=date.asc,time_slot.asc`
  if(status) url += `&status=eq.${status}`
  if(date)   url += `&date=eq.${date}`

  const r = await fetch(url, { headers: HEADERS })
  const data = await r.json()
  return res.status(200).json(data)
}
