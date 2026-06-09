const SUPABASE_URL = "https://ghbfgqbzqeelrnqexfeu.supabase.co"
const SUPABASE_KEY = "sb_publishable_3KOGtuQ1882QfsBGgwbHPg_Es2MF7bs"

const headers = {
  "Content-Type": "application/json",
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")

  if (req.method === "OPTIONS") return res.status(204).end()

  // GET /api/slots?date=08.06.2025 → zwraca zajęte sloty na dany dzień
  if (req.method === "GET") {
    const { date } = req.query
    if (!date) return res.status(400).json({ error: "Brak daty" })

    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/bookings?date=eq.${encodeURIComponent(date)}&status=in.(pending,confirmed)&select=time_slot`,
      { headers }
    )
    const data = await r.json()
    const takenSlots = data.map(b => b.time_slot)
    return res.status(200).json({ takenSlots })
  }

  // POST /api/slots → zapisz nową rezerwację, zwróć id
  if (req.method === "POST") {
    const body = req.body
    const r = await fetch(`${SUPABASE_URL}/rest/v1/bookings`, {
      method: "POST",
      headers: { ...headers, "Prefer": "return=representation" },
      body: JSON.stringify({
        date: body.date,
        time_slot: body.time,
        status: "pending",
        client_name: body.name,
        client_email: body.email,
        client_phone: body.phone,
        client_address: body.address,
        client_car: body.car || "",
        services: body.services,
        total: body.total,
        notes: body.notes || "",
      }),
    })
    const data = await r.json()
    if (!r.ok) return res.status(r.status).json({ error: data })
    return res.status(200).json({ id: data[0].id })
  }

  // PATCH /api/slots → zmień status (confirmed / cancelled)
  if (req.method === "PATCH") {
    const { id, status } = req.body
    if (!id || !status) return res.status(400).json({ error: "Brak id lub status" })

    const r = await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${id}`, {
      method: "PATCH",
      headers: { ...headers, "Prefer": "return=representation" },
      body: JSON.stringify({ status }),
    })
    const data = await r.json()
    if (!r.ok) return res.status(r.status).json({ error: data })
    return res.status(200).json({ success: true, booking: data[0] })
  }

  return res.status(405).json({ error: "Method not allowed" })
}
