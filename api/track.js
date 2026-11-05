const U = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const K = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const redis = async (cmd) => {
  const r = await fetch(U, { method: "POST", headers: { Authorization: "Bearer " + K, "Content-Type": "application/json" }, body: JSON.stringify(cmd) });
  if (!r.ok) throw new Error("redis " + r.status);
  return (await r.json()).result;
};
const num = (x) => Math.max(0, Math.min(100000, Number(x) || 0) | 0);
const str = (x, l) => String(x || "").slice(0, l);
module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
  if (!U || !K) return res.status(500).json({ error: "Saqlash bazasi ulanmagan" });
  try {
    const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const r = { uid: str(b.uid, 64), name: str(b.name, 30).trim(), topic: str(b.topic, 40), ok: num(b.ok), done: num(b.done), total: num(b.total), sec: num(b.sec), ts: Date.now() };
    if (!r.name || !r.done || r.ok > r.done) return res.status(400).json({ error: "bad" });
    await redis(["LPUSH", "attempts", JSON.stringify(r)]);
    await redis(["LTRIM", "attempts", 0, 19999]);
    res.status(200).json({ ok: true });
  } catch (e) { res.status(500).json({ error: "server" }); }
};
