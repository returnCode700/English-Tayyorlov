const crypto = require("crypto");
const U = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const K = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const h = (x) => crypto.createHash("sha256").update(String(x)).digest();
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).end();
  const P = process.env.ADMIN_PASSWORD;
  if (!P) return res.status(500).json({ error: "ADMIN_PASSWORD o'rnatilmagan" });
  if (!crypto.timingSafeEqual(h(req.headers["x-admin-password"] || ""), h(P))) {
    await new Promise((r) => setTimeout(r, 700));
    return res.status(401).json({ error: "Parol noto'g'ri" });
  }
  if (!U || !K) return res.status(500).json({ error: "Saqlash bazasi ulanmagan" });
  try {
    const r = await fetch(U, { method: "POST", headers: { Authorization: "Bearer " + K, "Content-Type": "application/json" }, body: JSON.stringify(["LRANGE", "attempts", 0, -1]) });
    const rows = ((await r.json()).result || []).map((x) => { try { return JSON.parse(x); } catch (e) { return null; } }).filter(Boolean);
    res.status(200).json({ rows });
  } catch (e) { res.status(500).json({ error: "server" }); }
};
