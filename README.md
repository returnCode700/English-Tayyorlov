# English Test — Vercel'ga joylash

## Fayllar

| Fayl | Vazifasi |
|---|---|
| `index.html` | Talabalar sahifasi (tuzilma) |
| `app.js` | Ilova mantig'i: testlar, sozlamalar, natijalar |
| `styles.css` | Ko'rinish (uslublar) |
| `data/grammar.json` | Grammatika mavzulari, qoidalar va savollar (10 mavzu, 210 savol) |
| `data/vocabulary.json` | Barcha lug'atlar (14 unit, 1063 so'z) |
| `admin.html` | Admin panel (havolasi asosiy sahifada YO'Q) |
| `api/track.js` | Natijalarni saqlash |
| `api/admin.js` | Admin uchun natijalarni o'qish (parol bilan) |

## Menyular

- **📘 Grammatika** — mavzular (to be, Present Simple, ...) va har bir mavzu qoidasi.
- **🔤 Lug'atlar** — 14 ta unit. Har bir unitda so'zlarni qidirish va testni boshlash mumkin.
- **🎯 35 talik aralash test** — har bir bo'limda barcha savollardan aralash test.

## Test sozlamalari

Har qanday testdan oldin:
- **Savollar soni** — o'zingiz yozasiz (masalan 15). Standart: 35 ta (agar savollar shuncha bo'lsa).
- **Tartib** — 🎲 tasodifiy yoki ➡️ boshidan, ketma-ket.
- **Yo'nalish** (faqat lug'atlar) — English → O'zbekcha yoki O'zbekcha → English.

Klaviaturada 1–4 tugmalari bilan ham javob berish mumkin.

## Ma'lumotlarni tahrirlash

Savol yoki so'z qo'shish uchun faqat JSON fayllarni tahrirlang. `app.js` ga tegish shart emas.

**`data/vocabulary.json`** — har bir so'z massiv ko'rinishida: `["english", "o'zbekcha", "izoh (ixtiyoriy)"]`

```json
{ "id": 14, "title": "Unit 14", "words": [ ["Tomorrow", "ertaga"] ] }
```

**`data/grammar.json`** — har bir savol: `q` (savol, bo'sh joy `___`), `a` (to'g'ri javob), `options` (3 ta variant, to'g'risi ham kiritilgan), `explain` (izoh).

JSON formati buzilsa sahifa "Ma'lumotlar yuklanmadi" xabarini ko'rsatadi. Tahrirdan keyin JSON tekshiruvchidan o'tkazing.

## Vercel'ga joylash

1. Papkani GitHub'ga yuklang va vercel.com da "Add New → Project" orqali import qiling.
2. Vercel loyihangizda **Storage** bo'limiga kiring → **Upstash Redis** (Marketplace) ni yarating va loyihaga ulang. Muhit o'zgaruvchilari (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` yoki `KV_REST_API_URL`, `KV_REST_API_TOKEN`) o'zi qo'shiladi.
3. **Settings → Environment Variables** ga `ADMIN_PASSWORD` qo'shing (uzun, noyob parol qo'ying).
4. **Redeploy** qiling.
5. Admin panel: `https://SIZNING-SAYT.vercel.app/admin.html`

**Muhim:** `index.html` ni faylni ikki marta bosib (`file://`) ochmang — ma'lumotlar `fetch` orqali yuklanadi, shuning uchun sayt server orqali (Vercel yoki `npx serve`) ochilishi kerak.
