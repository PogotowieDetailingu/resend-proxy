export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")

  if (req.method === "OPTIONS") {
    return res.status(204).end()
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const { to, subject, html } = req.body

    if (!to || !subject || !html) {
      return res.status(400).json({ error: "Brakujące pola: to, subject, html" })
    }

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: process.env.FROM_EMAIL,
        to,
        subject,
        html,
      }),
    })

    const data = await resendRes.json()

    if (!resendRes.ok) {
      return res.status(resendRes.status).json({ error: data })
    }

    return res.status(200).json({ success: true, id: data.id })
  } catch (err) {
    return res.status(500).json({ error: String(err) })
  }
}
