// api/realizacje.js — CRUD dla realizacji + upload zdjęć do Supabase Storage

const SUPABASE_URL = "https://ghbfgqbzqeelrnqexfeu.supabase.co"
const SUPABASE_KEY = "sb_publishable_3KOGtuQ1882QfsBGgwbHPg_Es2MF7bs"
const ADMIN_PIN    = process.env.ADMIN_PIN || ""

const SB = {
  "Content-Type": "application/json",
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
}

function authOk(req) {
  return req.headers["x-admin-pin"] === ADMIN_PIN
}

// Generuj numer PD-2026-XXX
async function nextNumer() {
  const year = new Date().getFullYear()
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/realizacje?select=numer&numer=like.PD-${year}*&order=numer.desc&limit=1`,
    { headers: SB }
  )
  const data = await r.json()
  let seq = 1
  if (data.length) {
    const last = data[0].numer.split("-")[2]
    seq = parseInt(last) + 1
  }
  return `PD-${year}-${String(seq).padStart(3, "0")}`
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-admin-pin")
  if (req.method === "OPTIONS") return res.status(204).end()

  // GET /api/realizacje — lista (publiczna: tylko published, admin: wszystkie)
  if (req.method === "GET") {
    const isAdmin = authOk(req)
    const { id } = req.query

    if (id) {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/realizacje?id=eq.${id}&select=*`,
        { headers: SB }
      )
      const data = await r.json()
      return res.status(200).json(data[0] || null)
    }

    const filter = isAdmin ? "" : "&published=eq.true"
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/realizacje?select=*${filter}&order=created_at.desc`,
      { headers: SB }
    )
    const data = await r.json()
    return res.status(200).json(data)
  }

  // Wszystkie poniższe wymagają autoryzacji
  if (!authOk(req)) return res.status(401).json({ error: "Nieautoryzowany" })

  // POST /api/realizacje — utwórz nową realizację z rezerwacji
  if (req.method === "POST") {
    const { booking_id } = req.body

    // Pobierz dane z bookings
    let bookingData = {}
    if (booking_id) {
      const br = await fetch(
        `${SUPABASE_URL}/rest/v1/bookings?id=eq.${booking_id}&select=*`,
        { headers: SB }
      )
      const bd = await br.json()
      if (bd.length) bookingData = bd[0]
    }

    const numer = await nextNumer()

    const r = await fetch(`${SUPABASE_URL}/rest/v1/realizacje`, {
      method: "POST",
      headers: { ...SB, "Prefer": "return=representation" },
      body: JSON.stringify({
        numer,
        booking_id: booking_id || null,
        client_name:  bookingData.client_name  || req.body.client_name  || "",
        client_phone: bookingData.client_phone || req.body.client_phone || "",
        car_make:  req.body.car_make  || "",
        car_model: req.body.car_model || "",
        car_year:  req.body.car_year  || "",
        services:  bookingData.services || req.body.services || "",
        notes:     req.body.notes     || "",
        damages:   req.body.damages   || "",
        car_condition: req.body.car_condition || "",
        status: "draft",
        published: false,
      }),
    })
    const data = await r.json()
    if (!r.ok) return res.status(r.status).json({ error: data })
    return res.status(200).json(data[0])
  }

  // PATCH /api/realizacje — edytuj lub opublikuj
  if (req.method === "PATCH") {
    const { id, ...fields } = req.body
    if (!id) return res.status(400).json({ error: "Brak id" })

    if (fields.published === true) {
      fields.completed_at = new Date().toISOString()
      fields.status = "completed"
    }

    const r = await fetch(`${SUPABASE_URL}/rest/v1/realizacje?id=eq.${id}`, {
      method: "PATCH",
      headers: { ...SB, "Prefer": "return=representation" },
      body: JSON.stringify(fields),
    })
    const data = await r.json()
    if (!r.ok) return res.status(r.status).json({ error: data })
    return res.status(200).json(data[0])
  }

  // DELETE /api/realizacje — usuń
  if (req.method === "DELETE") {
    const { id } = req.body
    if (!id) return res.status(400).json({ error: "Brak id" })
    await fetch(`${SUPABASE_URL}/rest/v1/realizacje?id=eq.${id}`, {
      method: "DELETE",
      headers: SB,
    })
    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: "Method not allowed" })
}
