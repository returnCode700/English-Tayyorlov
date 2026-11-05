/* English Test Tayyorlov — asosiy ilova.
 * Build talab qilinmaydi. Ma'lumotlar data/grammar.json va data/vocabulary.json dan yuklanadi.
 * Barcha matn DOM orqali yaratiladi (innerHTML faqat ishonchli, o'z JSON fayldan olinadigan qoida matni uchun). */
(function () {
  "use strict";

  const SAMPLE_SIZE = 35;                       // standart test uzunligi
  const PRESET_COUNTS = [10, 15, 20, 35, 50];   // tezkor tanlash tugmalari
  const APP = document.getElementById("app");

  const state = {
    data: null,            // { grammar, vocab, vocabWords }
    section: "grammar",    // "grammar" | "vocab"
    name: readStore("nm"),
    test: null,            // hozirgi test sessiyasi
  };

  /* ---------------- Yordamchi funksiyalar ---------------- */

  function readStore(key) {
    try { return localStorage.getItem(key) || ""; } catch (e) { return ""; }
  }

  function writeStore(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* saqlanmasa ham ilova ishlaydi */ }
  }

  function getUid() {
    let uid = readStore("uid");
    if (!uid) {
      uid = globalThis.crypto && crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now().toString(36) + Math.random().toString(36).slice(2);
      writeStore("uid", uid);
    }
    return uid;
  }

  /** Kichik DOM yaratuvchi: h("div", {class: "x"}, child1, [child2, child3]) */
  function h(tag, props, ...children) {
    const el = document.createElement(tag);
    Object.entries(props || {}).forEach(([key, value]) => {
      if (value === null || value === undefined || value === false) return;
      if (key === "class") el.className = value;
      else if (key === "html") el.innerHTML = value;
      else if (key.startsWith("on")) el.addEventListener(key.slice(2), value);
      else if (typeof value === "boolean") el[key] = value;
      else el.setAttribute(key, value);
    });
    children
      .flat()
      .filter((c) => c !== null && c !== undefined && c !== false)
      .forEach((c) => el.append(c instanceof Node ? c : document.createTextNode(String(c))));
    return el;
  }

  /** Fisher–Yates aralashtirish (nusxa qaytaradi) */
  function shuffle(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function readRadio(name) {
    const checked = APP.querySelector(`input[name="${name}"]:checked`);
    return checked ? checked.value : "";
  }

  /* ---------------- Ma'lumotlar ---------------- */

  async function loadJson(url) {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) throw new Error(`${url} yuklanmadi (${res.status})`);
    return res.json();
  }

  async function loadData() {
    const [grammar, vocabulary] = await Promise.all([
      loadJson("data/grammar.json"),
      loadJson("data/vocabulary.json"),
    ]);
    const vocab = vocabulary.units.map((u) => ({
      id: u.id,
      title: u.title,
      words: u.words.map(([en, uz, note = ""]) => ({ en, uz, note, unit: u.id })),
    }));
    return {
      grammar: grammar.topics,
      vocab,
      vocabWords: vocab.flatMap((u) => u.words),
    };
  }

  /* ---------------- Test manbalari (scope) ----------------
   * scope = { kind, title, icon, stat, raw, back }
   *   kind: "grammar" | "vocab"; raw: savollar/so'zlar ro'yxati; stat: statistikadagi nom; back: orqaga */

  function grammarScope({ title, icon, topics, stat, back }) {
    return {
      kind: "grammar", title, icon, stat, back,
      raw: topics.flatMap((topic) => topic.questions.map((q) => ({ q, topic }))),
    };
  }

  function vocabScope({ title, icon, words, stat, back }) {
    return { kind: "vocab", title, icon, stat, back, raw: words };
  }

  const grammarTopicScope = (topic) => grammarScope({
    title: topic.title, icon: topic.icon, topics: [topic], stat: topic.title,
    back: () => showTopic(topic.id),
  });

  const grammarMixedScope = () => grammarScope({
    title: "Aralash grammatika", icon: "🎯", topics: state.data.grammar,
    stat: "Aralash grammatika", back: () => showSection("grammar"),
  });

  const vocabUnitScope = (unit) => vocabScope({
    title: unit.title, icon: "🔤", words: unit.words,
    stat: `Lug'at ${unit.title}`, back: () => showUnit(unit.id),
  });

  const vocabMixedScope = () => vocabScope({
    title: "Aralash lug'at", icon: "🎯", words: state.data.vocabWords,
    stat: "Aralash lug'at", back: () => showSection("vocab"),
  });

  /* ---------------- Savollar tuzish ---------------- */

  /** Lug'at uchun 3 ta noto'g'ri variant: avval shu unitdan, kerak bo'lsa butun lug'atdan.
   *  Chalg'ituvchi variant savolning boshqa to'g'ri javobi bo'lmasligi kerak
   *  (masalan "yaxshi" ham Fine, ham Lovely bo'lishi mumkin). */
  function pickDistractors(word, field) {
    const picked = [];
    const used = new Set([word[field].toLowerCase()]);
    const same = (a, b) => a.toLowerCase() === b.toLowerCase();
    const take = (list) => {
      for (const candidate of shuffle(list)) {
        if (picked.length === 3) break;
        if (same(candidate.en, word.en) || same(candidate.uz, word.uz)) continue;
        const value = candidate[field];
        const key = value.toLowerCase();
        if (!used.has(key)) {
          used.add(key);
          picked.push(value);
        }
      }
    };
    take(state.data.vocab.find((u) => u.id === word.unit).words);
    if (picked.length < 3) take(state.data.vocabWords);
    return picked;
  }

  function buildItems(scope, picked, dir) {
    if (scope.kind === "grammar") {
      return picked.map(({ q, topic }) => ({
        prompt: q.q,
        answer: q.a,
        options: shuffle(q.options),
        note: q.explain,
        topic,
        isWord: false,
      }));
    }
    return picked.map((word) => {
      const toUzbek = dir !== "uz";
      const field = toUzbek ? "uz" : "en";
      const answer = word[field];
      return {
        prompt: toUzbek ? word.en : word.uz,
        answer,
        options: shuffle([answer, ...pickDistractors(word, field)]),
        note: word.note,
        topic: null,
        isWord: true,
      };
    });
  }

  /* ---------------- Test jarayoni ---------------- */

  /** config = { count, mode: "random" | "sequential", dir: "en" | "uz" } */
  function launch(scope, config) {
    const ordered = config.mode === "sequential" ? scope.raw : shuffle(scope.raw);
    const picked = ordered.slice(0, config.count);
    startSession(scope, buildItems(scope, picked, config.dir), config);
  }

  function startSession(scope, items, config) {
    state.test = {
      scope, items, config,
      index: 0, answered: 0, right: 0, wrong: [],
      locked: false, finished: false, saved: false,
      startedAt: Date.now(),
    };
    renderQuestion();
  }

  function choose(index) {
    const t = state.test;
    if (!t || t.locked || t.finished) return;
    const item = t.items[t.index];
    const chosen = item.options[index];
    const correct = chosen === item.answer;

    t.locked = true;
    t.answered += 1;
    if (correct) t.right += 1;
    else t.wrong.push({ item, chosen });

    const buttons = APP.querySelectorAll(".opt");
    buttons.forEach((btn, i) => {
      btn.disabled = true;
      if (item.options[i] === item.answer) btn.classList.add("ok");
    });
    if (!correct) buttons[index].classList.add("no");

    const feedback = APP.querySelector("#feedback");
    feedback.replaceChildren(feedbackBox(t, item, correct, chosen));
    feedback.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function nextQuestion() {
    const t = state.test;
    if (!t || t.finished) return;
    t.index += 1;
    t.locked = false;
    if (t.index >= t.items.length) finishTest();
    else renderQuestion();
  }

  function finishTest() {
    const t = state.test;
    if (!t || t.finished) return;
    t.finished = true;
    saveAttempt(t);
    renderResult();
  }

  function exitTest() {
    const t = state.test;
    if (t && !t.finished) {
      t.finished = true;
      saveAttempt(t);
    }
    state.test = null;
    if (t) t.scope.back();
    else showSection(state.section);
  }

  function retryMistakes() {
    const t = state.test;
    const items = t.wrong.map(({ item }) => ({ ...item, options: shuffle(item.options) }));
    startSession(t.scope, items, t.config);
  }

  /** Natijani serverga yuboradi (bir marta). Xato bo'lsa ham test ishlashda davom etadi. */
  async function saveAttempt(t) {
    if (!t || t.saved || t.answered === 0) return;
    t.saved = true;
    const payload = {
      uid: getUid(),
      name: state.name,
      topic: t.scope.stat,
      ok: t.right,
      done: t.answered,
      total: t.items.length,
      sec: Math.round((Date.now() - t.startedAt) / 1000),
    };
    try {
      await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      });
    } catch (e) { /* tarmoq xatosi: natija ekranda baribir ko'rinadi */ }
  }

  /* ---------------- Ekranlar ---------------- */

  function page(nodes, { tabs = true } = {}) {
    const header = h("header", { class: "topbar" },
      h("h1", {}, "📚 English Test Tayyorlov"),
      state.name ? h("button", { class: "btn ghost sm", onclick: askName }, `👤 ${state.name} · ✎`) : null);
    const parts = [header, tabs ? tabBar() : null, ...nodes];
    APP.replaceChildren(...parts.filter((part) => part instanceof Node));
  }

  function tabBar() {
    const tab = (kind, label) => h("button", {
      class: "tab" + (state.section === kind ? " active" : ""),
      role: "tab",
      "aria-selected": state.section === kind ? "true" : "false",
      onclick: () => showSection(kind),
    }, label);
    return h("nav", { class: "tabs", role: "tablist", "aria-label": "Bo'limlar" },
      tab("grammar", "📘 Grammatika"),
      tab("vocab", "🔤 Lug'atlar"));
  }

  function backButton(fn) {
    return h("button", { class: "btn ghost sm", onclick: fn }, "⬅ Orqaga");
  }

  function radioGroup(name, options, checkedValue) {
    return h("div", { class: "radios", role: "radiogroup" }, options.map((o) =>
      h("label", { class: "radio" },
        h("input", { type: "radio", name, value: o.value, checked: o.value === checkedValue }),
        h("span", {}, o.label),
        o.hint ? h("small", {}, o.hint) : null)));
  }

  function promptNode(item) {
    if (item.isWord) return h("div", { class: "word" }, item.prompt);
    const parts = item.prompt.split("___");
    if (parts.length === 1) return h("div", { class: "question" }, item.prompt);
    const nodes = [];
    parts.forEach((part, i) => {
      if (i > 0) nodes.push(h("span", { class: "blank" }));
      nodes.push(part);
    });
    return h("div", { class: "question" }, nodes);
  }

  function hintText(t, item) {
    const keys = `Klaviatura: 1–${item.options.length}`;
    let text;
    if (item.isWord) text = t.config.dir === "uz" ? "Inglizcha tarjimasini tanlang" : "O'zbekcha tarjimasini tanlang";
    else text = item.prompt.includes("___") ? "Bo'sh joyga mos so'zni tanlang" : "To'g'ri javobni tanlang";
    return `${text} · ${keys}`;
  }

  function renderQuestion() {
    const t = state.test;
    const item = t.items[t.index];
    const total = t.items.length;

    page([
      h("section", { class: "glass box" },
        h("div", { class: "top" },
          h("b", {}, `${t.scope.icon} ${t.scope.title}`),
          h("span", { class: "counter" }, `${t.index + 1} / ${total}`)),
        h("div", {
          class: "bar", role: "progressbar", "aria-valuemin": "0",
          "aria-valuemax": String(total), "aria-valuenow": String(t.index),
        }, h("i", { style: `width:${(t.index / total) * 100}%` })),
        promptNode(item),
        h("p", { class: "hint" }, hintText(t, item)),
        h("div", { class: "options" }, item.options.map((option, i) =>
          h("button", { class: "opt", type: "button", onclick: () => choose(i) },
            h("span", { class: "key" }, String(i + 1)),
            h("span", {}, option)))),
        h("div", { id: "feedback" }),
        h("div", { class: "actions" },
          h("button", { class: "btn ghost", onclick: exitTest }, "✖ Chiqish"),
          h("button", { class: "btn ghost", onclick: finishTest }, "🏁 Yakunlash"))),
    ], { tabs: false });
    window.scrollTo(0, 0);
  }

  function feedbackBox(t, item, correct, chosen) {
    const isLast = t.index === t.items.length - 1;
    return h("div", { class: "exp" },
      correct
        ? h("p", {}, "✅ ", h("b", {}, "To'g'ri!"))
        : h("p", {}, "❌ Xato. ", h("s", {}, chosen), " → to'g'ri javob: ", h("b", {}, item.answer)),
      item.note ? h("p", {}, "💡 ", item.note) : null,
      !correct && item.topic ? h("p", {}, "📌 Qoida: ", item.topic.pattern) : null,
      h("p", { class: "right" },
        h("button", { class: "btn", onclick: nextQuestion }, isLast ? "Natijani ko'rish 🏁" : "Keyingisi ▶")));
  }

  function renderResult() {
    const t = state.test;
    const { answered, right, wrong, items, scope } = t;
    const skipped = items.length - answered;
    const pct = answered ? Math.round((right / answered) * 100) : 0;
    const verdict = !answered ? "Hali javob berilmadi"
      : pct >= 80 ? "🏆 Ajoyib natija!"
      : pct >= 50 ? "👍 Yaxshi, lekin takrorlash kerak"
      : "💪 Qoidani qayta o'qib, yana urinib ko'ring";

    // Grammatika: xato qilingan mavzularning qoidasi, har mavzu bir marta
    const topicMap = new Map();
    wrong.forEach(({ item }) => {
      if (item.topic && !topicMap.has(item.topic.title)) topicMap.set(item.topic.title, item.topic);
    });
    const topicTips = [...topicMap.values()].map((tp) => h("div", { class: "exp" },
      h("p", {}, h("b", {}, `📌 ${tp.title}: `), tp.pattern),
      h("p", {}, h("b", {}, "🧠 Eslab qoling: "), tp.tip),
      h("p", {}, h("b", {}, "⚠️ Odatiy xato: "), tp.mistake)));

    const mistakes = wrong.map(({ item, chosen }, i) => {
      const line = item.isWord ? `${item.prompt} — ${item.answer}`
        : item.prompt.includes("___") ? item.prompt.replace("___", item.answer)
        : `${item.prompt} → ${item.answer}`;
      return h("div", { class: "exp" },
        h("p", {}, h("b", {}, `${i + 1}. `), line),
        h("p", {}, "❌ Sizning javobingiz: ", h("s", {}, chosen), " → ✅ To'g'ri: ", h("b", {}, item.answer)),
        item.note ? h("p", { class: "muted" }, "💡 ", item.note) : null);
    });

    page([
      h("section", { class: "glass box" },
        h("div", { class: "center" },
          h("h2", {}, verdict),
          h("p", { class: "score" }, `${right} / ${answered} (${pct}%)`),
          skipped > 0 ? h("p", { class: "muted" }, `Ishlanmagan savollar: ${skipped} ta`) : null),
        wrong.length
          ? h("div", { class: "exp" }, `Xatolar: ${wrong.length} ta. Quyida tahlil.`)
          : (answered ? h("div", { class: "exp" }, "Xato yo'q! Keyingi bo'limga o'tishingiz mumkin. 🎉") : null),
        topicTips,
        mistakes,
        h("div", { class: "actions center" },
          wrong.length ? h("button", { class: "btn", onclick: retryMistakes }, "🔁 Xatolarni takrorlash") : null,
          h("button", { class: "btn", onclick: () => launch(scope, t.config) }, "🔄 Qayta boshlash"),
          h("button", { class: "btn", onclick: () => renderSetup(scope) }, "⚙️ Sozlamalar"),
          h("button", { class: "btn ghost", onclick: () => scope.back() }, "⬅ Orqaga"))),
    ]);
    window.scrollTo(0, 0);
  }

  /** Test sozlamalari: savollar soni, tartib (tasodifiy / boshidan) va yo'nalish (lug'at) */
  function renderSetup(scope) {
    state.test = null;
    const pool = scope.raw.length;
    const unit = scope.kind === "vocab" ? "so'z" : "savol";
    const defaultCount = Math.min(SAMPLE_SIZE, pool);
    const values = [...PRESET_COUNTS.filter((n) => n < pool), pool];

    const countInput = h("input", {
      type: "number", class: "input num", min: "1", max: String(pool),
      value: String(defaultCount), inputmode: "numeric", "aria-label": "Savollar soni",
    });
    const error = h("p", { class: "err", role: "alert" });

    const chips = values.map((n) => h("button", {
      type: "button", class: "chip",
      onclick: () => { countInput.value = String(n); error.textContent = ""; },
    }, n === pool ? `Hammasi (${n})` : String(n)));

    const directionBlock = scope.kind === "vocab" ? [
      h("p", { class: "field-title" }, "Yo'nalish"),
      radioGroup("dir", [
        { value: "en", label: "🇬🇧 English → 🇺🇿 O'zbekcha" },
        { value: "uz", label: "🇺🇿 O'zbekcha → 🇬🇧 English" },
      ], "en"),
    ] : [];

    const start = h("button", {
      class: "btn wide",
      onclick: () => {
        const count = Number(countInput.value);
        if (!Number.isInteger(count) || count < 1 || count > pool) {
          error.textContent = `1 dan ${pool} gacha butun son kiriting.`;
          countInput.focus();
          return;
        }
        launch(scope, { count, mode: readRadio("mode") || "random", dir: readRadio("dir") || "en" });
      },
    }, "Boshlash ▶");

    page([
      h("section", { class: "glass box" },
        h("div", { class: "top" },
          h("h2", {}, `${scope.icon} ${scope.title}`),
          backButton(scope.back)),
        h("p", { class: "muted" }, `Mavjud: ${pool} ta ${unit}. Standart: ${defaultCount} ta.`),
        h("label", { class: "field" },
          h("span", { class: "field-title" }, "Savollar soni"),
          countInput),
        h("div", { class: "chips" }, chips),
        h("p", { class: "field-title" }, "Tartib"),
        radioGroup("mode", [
          { value: "random", label: "🎲 Tasodifiy", hint: "savollar aralashtirilib olinadi" },
          { value: "sequential", label: "➡️ Boshidan, ketma-ket", hint: "birinchi savoldan tartib bilan" },
        ], "random"),
        directionBlock,
        error,
        h("div", { class: "center" }, start)),
    ]);
  }

  function showSection(kind) {
    state.section = kind;
    state.test = null;
    page(kind === "grammar" ? grammarHome() : vocabHome());
    window.scrollTo(0, 0);
  }

  function sectionIntro(title, text) {
    return h("section", { class: "glass box" },
      h("h2", {}, title),
      h("p", { class: "muted" }, text));
  }

  function grammarHome() {
    const topics = state.data.grammar;
    const total = topics.reduce((n, t) => n + t.questions.length, 0);
    return [
      sectionIntro("📘 Grammatika",
        "Avval qoidani o'qing, keyin test yeching. Xato qilsangiz sababi tushuntiriladi."),
      h("div", { class: "grid" },
        h("button", { class: "glass card wide", onclick: () => renderSetup(grammarMixedScope()) },
          h("span", { class: "icon" }, "🎯"),
          h("b", {}, `${SAMPLE_SIZE} talik aralash test`),
          h("small", {}, `Barcha mavzulardan · jami ${total} ta savol`))),
      h("h2", { class: "section-title" }, "Mavzular"),
      h("div", { class: "grid" }, topics.map((t) =>
        h("button", { class: "glass card", onclick: () => showTopic(t.id) },
          h("span", { class: "icon" }, t.icon),
          h("b", {}, t.title),
          h("small", {}, `${t.questions.length} ta savol`)))),
    ];
  }

  function vocabHome() {
    const total = state.data.vocabWords.length;
    return [
      sectionIntro("🔤 Lug'atlar",
        "Unit bo'yicha so'zlarni ko'ring va tarjimasini tekshiring. Har bir testda savollar sonini o'zingiz tanlaysiz."),
      h("div", { class: "grid" },
        h("button", { class: "glass card wide", onclick: () => renderSetup(vocabMixedScope()) },
          h("span", { class: "icon" }, "🎯"),
          h("b", {}, `${SAMPLE_SIZE} talik aralash test`),
          h("small", {}, `Barcha unitlardan · jami ${total} ta so'z`))),
      h("h2", { class: "section-title" }, "Unitlar"),
      h("div", { class: "grid" }, state.data.vocab.map((u) =>
        h("button", { class: "glass card", onclick: () => showUnit(u.id) },
          h("span", { class: "icon" }, "📗"),
          h("b", {}, u.title),
          h("small", {}, `${u.words.length} ta so'z`)))),
    ];
  }

  function showTopic(id) {
    const topic = state.data.grammar.find((t) => t.id === id);
    state.section = "grammar";
    state.test = null;
    page([
      h("section", { class: "glass box rule" },
        h("div", { class: "top" },
          h("h2", {}, `${topic.icon} ${topic.title}`),
          backButton(() => showSection("grammar"))),
        h("div", { class: "rule-body", html: topic.rule }),
        h("div", { class: "exp" }, h("p", {}, h("b", {}, "🧠 Eslab qoling: "), topic.tip)),
        h("div", { class: "exp" }, h("p", {}, h("b", {}, "⚠️ Odatiy xato: "), topic.mistake)),
        h("div", { class: "center" },
          h("button", { class: "btn wide", onclick: () => renderSetup(grammarTopicScope(topic)) }, "Testni sozlash ▶"))),
    ]);
    window.scrollTo(0, 0);
  }

  function showUnit(id) {
    const unit = state.data.vocab.find((u) => u.id === id);
    state.section = "vocab";
    state.test = null;

    const list = h("div", { class: "wordlist", role: "list" });
    const counter = h("span", { class: "muted" });

    const renderList = (query) => {
      const q = query.trim().toLowerCase();
      const rows = unit.words.filter((w) =>
        !q || w.en.toLowerCase().includes(q) || w.uz.toLowerCase().includes(q));
      list.replaceChildren(...rows.map((w) =>
        h("div", { class: "wrow", role: "listitem" },
          h("span", { class: "en" }, w.en),
          h("span", { class: "uz" }, w.uz),
          w.note ? h("small", { class: "note" }, w.note) : null)));
      counter.textContent = `${rows.length} / ${unit.words.length} ta so'z`;
    };

    const search = h("input", {
      type: "search", class: "input", placeholder: "Qidirish: so'z yoki tarjima",
      "aria-label": "So'zlarni qidirish",
      oninput: (e) => renderList(e.target.value),
    });

    page([
      h("section", { class: "glass box" },
        h("div", { class: "top" },
          h("h2", {}, `🔤 ${unit.title}`),
          backButton(() => showSection("vocab"))),
        h("div", { class: "toolbar" }, search, counter),
        list,
        h("div", { class: "center" },
          h("button", { class: "btn wide", onclick: () => renderSetup(vocabUnitScope(unit)) }, "Testni sozlash ▶"))),
    ]);
    renderList("");
    window.scrollTo(0, 0);
  }

  function askName() {
    const input = h("input", {
      class: "input", maxlength: "30", placeholder: "Ism va familiya", autocomplete: "name",
      "aria-label": "Ism va familiya",
    });
    const error = h("p", { class: "err", role: "alert" });

    const submit = () => {
      const value = input.value.trim();
      if (value.length < 2) {
        error.textContent = "Ism kamida 2 ta belgidan iborat bo'lishi kerak.";
        input.focus();
        return;
      }
      state.name = value.slice(0, 30);
      writeStore("nm", state.name);
      showSection(state.section);
    };
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });

    page([
      h("section", { class: "glass box center" },
        h("h1", {}, "👋 Xush kelibsiz!"),
        h("p", { class: "muted" }, "Boshlashdan oldin ismingizni kiriting. Natijalaringiz shu ism bilan saqlanadi."),
        input,
        error,
        h("div", { class: "center" }, h("button", { class: "btn wide", onclick: submit }, "Kirish ▶"))),
    ], { tabs: false });
    input.focus();
  }

  /* ---------------- Klaviatura va ishga tushirish ---------------- */

  document.addEventListener("keydown", (e) => {
    const t = state.test;
    if (!t || t.finished || t.locked || e.ctrlKey || e.metaKey || e.altKey) return;
    const n = Number(e.key);
    if (Number.isInteger(n) && n >= 1 && n <= t.items[t.index].options.length) choose(n - 1);
  });

  // Sahifa yopilganda yarim tugagan testni ham saqlaymiz
  window.addEventListener("pagehide", () => { if (state.test) saveAttempt(state.test); });

  async function boot() {
    page([h("section", { class: "glass box center" }, h("p", {}, "Yuklanmoqda…"))], { tabs: false });
    try {
      state.data = await loadData();
    } catch (err) {
      page([
        h("section", { class: "glass box" },
          h("h2", {}, "⚠️ Ma'lumotlar yuklanmadi"),
          h("p", {}, "Sahifani yangilab qaytadan urinib ko'ring. Xato davom etsa, data/ papkasi joylashuvini tekshiring."),
          h("p", { class: "muted" }, String(err.message))),
      ], { tabs: false });
      return;
    }
    if (!state.name) askName();
    else showSection(state.section);
  }

  boot();
})();
