// api/photos.js — lista zdjęć dla danej realizacji + usuwanie

const SUPABASE_URL = "https://ghbfgqbzqeelrnqexfeu.supabase.co"
const SUPABASE_KEY = "sb_publishable_3KOGtuQ1882QfsBGgwbHPg_Es2MF7bs"
const ADMIN_PIN    = process.env.ADMIN_PIN || ""

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, DELETE, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-admin-pin")
  if (req.method === "OPTIONS") return res.status(204).end()

  // GET — lista zdjęć z folderu realizacji
  if (req.method === "GET") {
    const { realizacja_id, type } = req.query
    if (!realizacja_id) return res.status(400).json({ error: "Brak realizacja_id" })

    const folder = type ? `${realizacja_id}/${type}` : realizacja_id
    const r = await fetch(
      `${SUPABASE_URL}/storage/v1/object/list/realizacje`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_KEY}`, "apikey": SUPABASE_KEY },
        body: JSON.stringify({ prefix: folder, limit: 100, offset: 0 }),
      }
    )
    const files = await r.json()
    const urls = (Array.isArray(files) ? files : []).map(f => ({
      name: f.name,
      url: `${SUPABASE_URL}/storage/v1/object/public/realizacje/${folder}/${f.name}`,
      type: folder.includes("after") ? "after" : folder.includes("before") ? "before" : "unknown",
    }))
    return res.status(200).json(urls)
  }

  // DELETE — usuń zdjęcie
  if (req.method === "DELETE") {
    if (req.headers["x-admin-pin"] !== ADMIN_PIN) return res.status(401).json({ error: "Nieautoryzowany" })
    const { path } = req.body
    if (!path) return res.status(400).json({ error: "Brak path" })
    const r = await fetch(`${SUPABASE_URL}/storage/v1/object/realizacje/${path}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${SUPABASE_KEY}`, "apikey": SUPABASE_KEY },
    })
    return res.status(200).json({ success: r.ok })
  }

  return res.status(405).json({ error: "Method not allowed" })
}
