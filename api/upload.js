// api/upload.js — upload zdjęć do Supabase Storage
// Przyjmuje multipart/form-data z polami: file, realizacja_id, type (before/after)

const SUPABASE_URL = "https://ghbfgqbzqeelrnqexfeu.supabase.co"
const SUPABASE_KEY = "sb_publishable_3KOGtuQ1882QfsBGgwbHPg_Es2MF7bs"
const ADMIN_PIN    = process.env.ADMIN_PIN || ""

export const config = { api: { bodyParser: false } }

async function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on("data", c => chunks.push(c))
    req.on("end", () => resolve(Buffer.concat(chunks)))
    req.on("error", reject)
  })
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-admin-pin")
  if (req.method === "OPTIONS") return res.status(204).end()
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" })
  if (req.headers["x-admin-pin"] !== ADMIN_PIN) return res.status(401).json({ error: "Nieautoryzowany" })

  try {
    const contentType = req.headers["content-type"] || ""
    const boundary = contentType.split("boundary=")[1]
    if (!boundary) return res.status(400).json({ error: "Brak boundary" })

    const body = await parseMultipart(req)
    const parts = body.toString("binary").split(`--${boundary}`)

    let fileBuffer = null
    let fileName   = "photo.jpg"
    let mimeType   = "image/jpeg"
    let realizacjaId = ""
    let photoType    = "before" // before | after

    for (const part of parts) {
      if (part.includes('name="file"')) {
        const match = part.match(/filename="([^"]+)"/)
        if (match) fileName = match[1]
        const mimeMatch = part.match(/Content-Type: ([^\r\n]+)/)
        if (mimeMatch) mimeType = mimeMatch[1].trim()
        const headerEnd = part.indexOf("\r\n\r\n")
        if (headerEnd !== -1) {
          const raw = part.slice(headerEnd + 4, part.lastIndexOf("\r\n"))
          fileBuffer = Buffer.from(raw, "binary")
        }
      }
      if (part.includes('name="realizacja_id"')) {
        const headerEnd = part.indexOf("\r\n\r\n")
        if (headerEnd !== -1) realizacjaId = part.slice(headerEnd + 4).trim().replace(/\r\n--$/, "").trim()
      }
      if (part.includes('name="type"')) {
        const headerEnd = part.indexOf("\r\n\r\n")
        if (headerEnd !== -1) photoType = part.slice(headerEnd + 4).trim().replace(/\r\n--$/, "").trim()
      }
    }

    if (!fileBuffer) return res.status(400).json({ error: "Brak pliku" })
    if (!realizacjaId) return res.status(400).json({ error: "Brak realizacja_id" })

    const ext      = fileName.split(".").pop() || "jpg"
    const newName  = `${realizacjaId}/${photoType}/${Date.now()}.${ext}`

    const upRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/realizacje/${newName}`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type": mimeType,
        },
        body: fileBuffer,
      }
    )

    if (!upRes.ok) {
      const err = await upRes.text()
      return res.status(500).json({ error: err })
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/realizacje/${newName}`
    return res.status(200).json({ success: true, url: publicUrl, type: photoType })

  } catch (err) {
    return res.status(500).json({ error: String(err) })
  }
}
