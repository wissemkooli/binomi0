import { useEffect, useRef, useState } from "react";
import { api } from "./lib/api";

type Option = string | { value: string; label: string };
type Field  = { key: string; type: string; label: string; options?: Option[]; min?: number; max?: number };
type View   = "home" | "questionnaire" | "candidates" | "result" | "matches" | "clone";
type AuthTab = "new" | "returning";

/* ─── i18n ─────────────────────────────────────────────────────────── */
const COPY: Record<string, Record<string, string>> = {
  en: {
    tag: "AI roommate matching for Tunisia",
    headline: "Find someone who ", headlineAccent: "fits.",
    sub: "Binomi uses AI clones to negotiate compatibility — budget, routines, lifestyle, and deal-breakers.",
    feat1: "🏠 Smart filtering", feat2: "🤖 AI clone negotiation", feat3: "💬 Compatibility verdict",
    tabNew: "New here", tabReturn: "Returning user",
    namePlaceholder: "Your name (e.g. Rayen)",
    uuidPlaceholder: "Paste your session ID…",
    getStarted: "Get Started →", restore: "Restore session",
    privacyNote: "No password. No email. Your session ID is your key.",
    uuidLabel: "Your session ID", uuidCopy: "Copy", uuidCopied: "Copied!",
    uuidNote: "Save this — it restores your profile on any device.",
    loading: "Loading…", aiRunning: "AI clones are negotiating…",
    profile: "Your profile", save: "Save profile", editProfile: "Edit profile",
    candidates: "Find roommates", matches: "My matches", clone: "My clone",
    back: "Back", match: "Run AI match",
    strong: "Strong", conditional: "Conditional", incompatible: "Incompatible",
    why: "Match result —", negotiation: "Clone negotiation log",
    send: "Send", placeholder: "Ask your clone anything…",
    no: "No other profiles yet. Share Binomi with a potential roommate!",
    select: "Select…",
    filtered: "Profiles are hard-filtered, then two AI clones negotiate compatibility.",
    cloneNote: "Your clone speaks from your saved questionnaire.",
    sharedGround: "✓ Shared ground", friction: "⚠ Friction points", compromise: "🤝 Possible compromise",
    aiBanner: "Clicking \"Run AI match\" sends both profiles to Groq AI. Two AI clones negotiate over 8 turns, then the AI produces a compatibility verdict — score, shared ground, friction points, and a possible compromise.",
    errorNoId: "Session ID not found. Please create a new profile.",
  },
  fr: {
    tag: "Matching IA de colocataires en Tunisie",
    headline: "Trouvez quelqu'un qui ", headlineAccent: "vous correspond.",
    sub: "Binomi utilise des clones IA pour négocier la compatibilité — budget, habitudes, style de vie et points non négociables.",
    feat1: "🏠 Filtrage intelligent", feat2: "🤖 Négociation par clones IA", feat3: "💬 Verdict de compatibilité",
    tabNew: "Nouveau", tabReturn: "Déjà inscrit",
    namePlaceholder: "Votre nom (ex. Rayen)",
    uuidPlaceholder: "Collez votre identifiant de session…",
    getStarted: "Commencer →", restore: "Restaurer la session",
    privacyNote: "Pas de mot de passe. Pas d'email. Votre identifiant est votre clé.",
    uuidLabel: "Votre identifiant de session", uuidCopy: "Copier", uuidCopied: "Copié !",
    uuidNote: "Conservez-le — il restaure votre profil sur n'importe quel appareil.",
    loading: "Chargement…", aiRunning: "Les clones IA négocient…",
    profile: "Votre profil", save: "Enregistrer", editProfile: "Modifier le profil",
    candidates: "Trouver des colocataires", matches: "Mes matchs", clone: "Mon clone",
    back: "Retour", match: "Lancer le match IA",
    strong: "Fort", conditional: "Conditionnel", incompatible: "Incompatible",
    why: "Résultat —", negotiation: "Journal de négociation",
    send: "Envoyer", placeholder: "Posez une question à votre clone…",
    no: "Aucun autre profil pour le moment.",
    select: "Sélectionner…",
    filtered: "Les profils sont filtrés, puis deux clones IA négocient la compatibilité.",
    cloneNote: "Votre clone parle depuis votre questionnaire enregistré.",
    sharedGround: "✓ Points communs", friction: "⚠ Frictions", compromise: "🤝 Compromis possible",
    aiBanner: "Cliquer sur \"Lancer le match IA\" envoie les deux profils à Groq AI. Deux clones négocient sur 8 tours, puis l'IA produit un verdict de compatibilité.",
    errorNoId: "Identifiant introuvable. Veuillez créer un nouveau profil.",
  },
  ar: {
    tag: "مطابقة السكن بالذكاء الاصطناعي في تونس",
    headline: "اعثر على شخص ", headlineAccent: "يناسبك.",
    sub: "يستخدم Binomi نسخاً ذكية للتفاوض على التوافق — الميزانية والعادات وأسلوب الحياة والأمور غير القابلة للتفاوض.",
    feat1: "🏠 تصفية ذكية", feat2: "🤖 تفاوض نسخ الذكاء الاصطناعي", feat3: "💬 حكم التوافق",
    tabNew: "جديد هنا", tabReturn: "مستخدم عائد",
    namePlaceholder: "اسمك (مثال: ريان)",
    uuidPlaceholder: "الصق معرف جلستك…",
    getStarted: "ابدأ →", restore: "استعادة الجلسة",
    privacyNote: "لا كلمة مرور. لا بريد إلكتروني. معرف جلستك هو مفتاحك.",
    uuidLabel: "معرف جلستك", uuidCopy: "نسخ", uuidCopied: "تم النسخ!",
    uuidNote: "احفظه — يستعيد ملفك على أي جهاز.",
    loading: "جاري التحميل…", aiRunning: "نسختا الذكاء الاصطناعي تتفاوضان…",
    profile: "ملفك", save: "حفظ الملف", editProfile: "تعديل الملف",
    candidates: "ابحث عن شريك سكن", matches: "مطابقاتي", clone: "نسختي",
    back: "رجوع", match: "ابدأ المطابقة بالذكاء الاصطناعي",
    strong: "قوي", conditional: "مشروط", incompatible: "غير متوافق",
    why: "نتيجة المطابقة —", negotiation: "سجل تفاوض النسخ",
    send: "إرسال", placeholder: "اسأل نسختك أي شيء…",
    no: "لا توجد ملفات أخرى بعد.",
    select: "اختر…",
    filtered: "يتم تصفية الملفات ثم تتفاوض نسختان من الذكاء الاصطناعي على التوافق.",
    cloneNote: "تستخدم نسختك استبيانك المحفوظ فقط.",
    sharedGround: "✓ نقاط مشتركة", friction: "⚠ نقاط توتر", compromise: "🤝 تسوية ممكنة",
    aiBanner: "عند الضغط على ابدأ المطابقة، يتم إرسال كلا الملفين إلى الذكاء الاصطناعي Groq. تتفاوض نسختان على مدى 8 جولات ثم ينتج الذكاء الاصطناعي تقييم التوافق.",
    errorNoId: "لم يتم العثور على معرف الجلسة. يرجى إنشاء ملف جديد.",
  },
};

function sl(s: string, l: string) { return COPY[l]?.[s] ?? s; }

/* ─── App ─────────────────────────────────────────────────────────── */
export default function App() {
  const [lang, setLang]           = useState(localStorage.getItem("binomi_lang") || "en");
  const t = COPY[lang] ?? COPY.en;
  const [user, setUser]           = useState<any>(null);
  const [view, setView]           = useState<View>("home");
  const [fields, setFields]       = useState<Field[]>([]);
  const [q, setQ]                 = useState<any>({});
  const [candidates, setCandidates] = useState<any[]>([]);
  const [matches, setMatches]     = useState<any[]>([]);
  const [selected, setSelected]   = useState<any>(null);
  const [log, setLog]             = useState<any>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [name, setName]           = useState("");
  const [uuidInput, setUuidInput] = useState("");
  const [authTab, setAuthTab]     = useState<AuthTab>("new");
  const [copied, setCopied]       = useState(false);
  const [showUUID, setShowUUID]   = useState(false);
  const [messages, setMessages]   = useState<any[]>([]);
  const [input, setInput]         = useState("");
  const [session, setSession]     = useState<string | null>(null);
  const bottomRef                 = useRef<HTMLDivElement>(null);

  useEffect(() => { localStorage.setItem("binomi_lang", lang); }, [lang]);

  // Auto-restore from localStorage on mount
  useEffect(() => {
    const id = localStorage.getItem("binomi_user");
    if (!id) return;
    api.user(id).then(async (u) => {
      setUser(u); setName(u.name); setLang(u.language || lang);
      const s = await api.schema(u.language || lang);
      setFields(s.fields); setQ(u.questionnaire || {});
      setView(Object.keys(u.questionnaire || {}).length ? "home" : "questionnaire");
    }).catch(() => localStorage.removeItem("binomi_user"));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  /* ─── Enter (new user) ─── */
  const enter = async () => {
    if (!name.trim()) return;
    setLoading(true); setError("");
    try {
      const u = await api.enter(name.trim(), lang, undefined);
      setUser(u); localStorage.setItem("binomi_user", u.id);
      const s = await api.schema(lang);
      setFields(s.fields); setQ(u.questionnaire || {});
      setShowUUID(true); // show UUID card after first sign-up
      setView(Object.keys(u.questionnaire || {}).length ? "home" : "questionnaire");
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  /* ─── Restore (returning user) ─── */
  const restore = async () => {
    const id = uuidInput.trim();
    if (!id) return;
    setLoading(true); setError("");
    try {
      const u = await api.user(id);
      setUser(u); setName(u.name); setLang(u.language || lang);
      localStorage.setItem("binomi_user", u.id);
      const s = await api.schema(u.language || lang);
      setFields(s.fields); setQ(u.questionnaire || {});
      setView(Object.keys(u.questionnaire || {}).length ? "home" : "questionnaire");
    } catch {
      setError(t.errorNoId);
    } finally { setLoading(false); }
  };

  const copyUUID = () => {
    if (!user) return;
    navigator.clipboard.writeText(user.id).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const save = async () => {
    setLoading(true); setError("");
    try { await api.saveQuestionnaire(user.id, q, lang); await loadCandidates(); }
    catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  const loadCandidates = async () => {
    setLoading(true); setError("");
    try { const x = await api.candidates(user.id); setCandidates(x.candidates); setView("candidates"); }
    catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  const run = async (c: any) => {
    setLoading(true); setError("");
    try {
      const x = await api.runMatch(user.id, c.id, lang);
      setSelected(x.match); setLog(x.negotiation); setView("result");
      const m = await api.matches(user.id); setMatches(m.matches);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  const loadMatches = async () => {
    setLoading(true); setError("");
    try { const x = await api.matches(user.id); setMatches(x.matches); setView("matches"); }
    catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  const openLog = async (m: any) => {
    setLoading(true); setError("");
    try { const x = await api.negotiation(m.negotiation_log_id); setSelected(m); setLog(x); setView("result"); }
    catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  const cloneIntro = async () => {
    setError("");
    try { const x = await api.cloneIntro(user.id); setMessages([{ role: "assistant", content: x.intro }]); setSession(null); setView("clone"); }
    catch (e: any) { setError(e.message); }
  };

  const send = async () => {
    if (!input.trim() || loading) return;
    const msg = input.trim(); setInput("");
    const next = [...messages, { role: "user", content: msg }]; setMessages(next); setLoading(true);
    try {
      const x = await api.cloneChat({ user_id: user.id, message: msg, history: messages, language: lang, session_id: session });
      setSession(x.session_id); setMessages([...next, { role: "assistant", content: x.reply }]);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  const goToQuestionnaire = async () => {
    const s = await api.schema(lang); setFields(s.fields); setView("questionnaire");
  };

  /* ─── LANDING / AUTH PAGE ─────────────────────────────────────────── */
  if (!user) return (
    <div className={"landing-app " + (lang === "ar" ? "rtl" : "")}>
      {/* Animated gradient blobs */}
      <div className="blob blob-1" />
      <div className="blob blob-2" />

      <nav className="landing-nav">
        <div className="logo dark">Bi<span>no</span>mi</div>
        <div className="lang-pills">
          {["en","fr","ar"].map(l => (
            <button key={l} className={"lang-pill" + (lang === l ? " active" : "")} onClick={() => setLang(l)}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </nav>

      <main className="landing-main">
        {/* Hero text */}
        <p className="landing-tag">{t.tag}</p>
        <h1 className="landing-h1">{t.headline}<span>{t.headlineAccent}</span></h1>
        <p className="landing-sub">{t.sub}</p>

        {/* Feature pills */}
        <div className="feat-pills">
          <span className="feat-pill">{t.feat1}</span>
          <span className="feat-pill">{t.feat2}</span>
          <span className="feat-pill">{t.feat3}</span>
        </div>

        {/* Auth card */}
        <div className="auth-card">
          {/* Tabs */}
          <div className="auth-tabs">
            <button className={"auth-tab" + (authTab === "new" ? " active" : "")} onClick={() => { setAuthTab("new"); setError(""); }}>
              {t.tabNew}
            </button>
            <button className={"auth-tab" + (authTab === "returning" ? " active" : "")} onClick={() => { setAuthTab("returning"); setError(""); }}>
              {t.tabReturn}
            </button>
          </div>

          <div className="auth-body">
            {authTab === "new" ? (
              <>
                <input
                  className="auth-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && enter()}
                  placeholder={t.namePlaceholder}
                  autoFocus
                />
                {error && <div className="auth-error">{error}</div>}
                <button className="auth-btn primary" onClick={enter} disabled={loading || !name.trim()}>
                  {loading ? t.loading : t.getStarted}
                </button>
              </>
            ) : (
              <>
                <input
                  className="auth-input mono"
                  value={uuidInput}
                  onChange={(e) => setUuidInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && restore()}
                  placeholder={t.uuidPlaceholder}
                />
                {error && <div className="auth-error">{error}</div>}
                <button className="auth-btn secondary" onClick={restore} disabled={loading || !uuidInput.trim()}>
                  {loading ? t.loading : t.restore}
                </button>
              </>
            )}
          </div>

          <p className="auth-privacy">🔒 {t.privacyNote}</p>
        </div>
      </main>
    </div>
  );

  /* ─── AUTHENTICATED SHELL ─────────────────────────────────────────── */
  return (
    <div className={"app " + (lang === "ar" ? "rtl" : "")}>
      <nav className="nav">
        <button className="logo" onClick={() => setView("home")}>Bi<span>no</span>mi</button>
        <div className="navlinks">
          <button className={view === "home" ? "active" : ""} onClick={() => setView("home")}>{t.profile}</button>
          <button className={view === "candidates" ? "active" : ""} onClick={loadCandidates}>{t.candidates}</button>
          <button className={view === "matches" ? "active" : ""} onClick={loadMatches}>{t.matches}</button>
          <button className={view === "clone" ? "active" : ""} onClick={cloneIntro}>{t.clone}</button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* UUID chip */}
          <button className="uuid-chip" onClick={() => setShowUUID(!showUUID)} title="Your session ID">
            🔑 {user.name}
          </button>
          <div className="lang-pills compact">
            {["en","fr","ar"].map(l => (
              <button key={l} className={"lang-pill" + (lang === l ? " active" : "")} onClick={() => setLang(l)}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* UUID reveal panel */}
      {showUUID && (
        <div className="uuid-panel">
          <div className="uuid-panel-inner">
            <div>
              <div className="uuid-label">{t.uuidLabel}</div>
              <div className="uuid-value">{user.id}</div>
              <div className="uuid-note">{t.uuidNote}</div>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button className="btn primary" onClick={copyUUID}>{copied ? t.uuidCopied : t.uuidCopy}</button>
              <button className="btn light" onClick={() => setShowUUID(false)}>✕</button>
            </div>
          </div>
        </div>
      )}

      <main className="container">
        {error && <div className="notice">{error}</div>}

        {/* HOME */}
        {view === "home" && <>
          <div className="toolbar">
            <div><h1>{t.profile}</h1><p className="muted">{user.name}</p></div>
            <button className="btn light" onClick={goToQuestionnaire}>{t.editProfile}</button>
          </div>
          <div className="card">
            <h2>Binomi</h2>
            <p className="muted">{t.sub}</p>
            <p className="muted" style={{ marginTop: "0.5rem", fontSize: "0.85rem" }}>🤖 {t.filtered}</p>
            <div className="actions">
              <button className="btn primary" onClick={loadCandidates}>{t.candidates}</button>
              <button className="btn light" onClick={loadMatches}>{t.matches}</button>
            </div>
          </div>
        </>}

        {/* QUESTIONNAIRE */}
        {view === "questionnaire" && <div className="form">
          <div className="toolbar">
            <h1>{t.profile}</h1>
            <button className="btn light" onClick={() => setView("home")}>{t.back}</button>
          </div>
          <div className="card">
            <div className="grid">
              {fields.map((f) => (
                <div className={"field " + (f.type === "textarea" ? "full" : "")} key={f.key}>
                  <label>{f.label}</label>
                  {f.type === "select" ? (
                    <select value={q[f.key] ?? ""} onChange={(e) => setQ({ ...q, [f.key]: e.target.value })}>
                      <option value="">{t.select}</option>
                      {f.options?.map((o) => {
                        const value = typeof o === "string" ? o : o.value;
                        const label = typeof o === "string" ? o : o.label;
                        return <option key={value} value={value}>{label}</option>;
                      })}
                    </select>
                  ) : f.type === "textarea" ? (
                    <textarea value={q[f.key] ?? ""} onChange={(e) => setQ({ ...q, [f.key]: e.target.value })} />
                  ) : (
                    <input type={f.type === "number" ? "number" : "text"} min={f.min} max={f.max}
                      value={q[f.key] ?? ""}
                      onChange={(e) => setQ({ ...q, [f.key]: f.type === "number" ? Number(e.target.value) : e.target.value })} />
                  )}
                </div>
              ))}
            </div>
            <div className="actions">
              <button className="btn primary" onClick={save} disabled={loading}>{loading ? t.loading : t.save}</button>
            </div>
          </div>
        </div>}

        {/* CANDIDATES */}
        {view === "candidates" && <>
          <div className="toolbar">
            <div><h1>{t.candidates}</h1><p className="muted">{t.filtered}</p></div>
            <button className="btn light" onClick={goToQuestionnaire}>{t.editProfile}</button>
          </div>
          <div className="ai-banner">
            <span>🤖</span>
            <span>{t.aiBanner}</span>
          </div>
          {loading && <div className="ai-loading"><div className="spinner" /><span>{t.aiRunning}</span></div>}
          {candidates.length ? (
            <div className="candidate-grid">
              {candidates.map((c) => (
                <div className="card" key={c.id}>
                  <div className="person">
                    <div className="avatar">{c.name[0]}</div>
                    <div><h3>{c.name}</h3><p className="muted">{c.questionnaire.city} · {c.questionnaire.occupation}</p></div>
                  </div>
                  <div className="tags">
                    <span className="tag">{c.questionnaire.budget_min}–{c.questionnaire.budget_max} TND</span>
                    <span className="tag">{c.questionnaire.sleep}</span>
                    <span className="tag">{c.questionnaire.cleanliness}</span>
                    <span className="tag">{c.questionnaire.smoking}</span>
                  </div>
                  <button className="btn primary" onClick={() => run(c)} disabled={loading}>
                    {loading ? t.aiRunning : t.match}
                  </button>
                </div>
              ))}
            </div>
          ) : <div className="card"><p>{t.no}</p></div>}
        </>}

        {/* RESULT */}
        {view === "result" && selected && <>
          <div className="toolbar">
            <h1>{t.why} {selected.other?.name ?? log?.participants?.find((n: string) => n !== user.name)}</h1>
            <button className="btn light" onClick={() => setView("matches")}>{t.back}</button>
          </div>
          <div className="card">
            <div className="statusrow">
              <span className={"status " + selected.status}>{sl(selected.status, lang)}</span>
              <span className="score">{selected.score}/100</span>
            </div>
            <p>{selected.summary}</p>
            <div className="scoregrid">
              {Object.entries(selected.scores || {}).filter(([k]) => k !== "overall").map(([k, v]) => (
                <div className="scorebox" key={k}><b>{String(v)}</b><div className="muted">{k}</div></div>
              ))}
            </div>
            {selected.hard_conflicts?.length > 0 && (
              <div className="section conflict">
                <h3>🚫 Hard conflicts</h3>
                {selected.hard_conflicts.map((x: string) => <p key={x}>{x}</p>)}
              </div>
            )}
            {selected.positives?.length > 0 && (
              <div className="section">
                <h3>{t.sharedGround}</h3>
                {selected.positives.map((x: string) => <p key={x}>{x}</p>)}
              </div>
            )}
            {selected.frictions?.length > 0 && (
              <div className="section">
                <h3>{t.friction}</h3>
                {selected.frictions.map((x: string) => <p key={x}>{x}</p>)}
              </div>
            )}
            {selected.compromise && (
              <div className="section"><h3>{t.compromise}</h3><p>{selected.compromise}</p></div>
            )}
            <div className="section">
              <h3>{t.negotiation}</h3>
              <div className="conversation">
                {log?.conversation?.map((x: any, i: number) => (
                  <div className="turn" key={i}>
                    <b>{x.speaker ?? x.role}</b>
                    {x.phase && <span className="muted"> · {x.phase}</span>}
                    <div>{x.message ?? x.content}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>}

        {/* MATCHES */}
        {view === "matches" && <>
          <div className="toolbar">
            <h1>{t.matches}</h1>
            <button className="btn primary" onClick={loadCandidates}>{t.candidates}</button>
          </div>
          {matches.length ? (
            <div className="candidate-grid">
              {matches.map((m) => (
                <div className="card" key={m.id}>
                  <div className="person">
                    <div className="avatar">{m.other.name[0]}</div>
                    <div><h3>{m.other.name}</h3><span className={"status " + m.status}>{sl(m.status, lang)}</span></div>
                  </div>
                  <div className="score">{m.score}/100</div>
                  <p className="muted">{m.summary}</p>
                  <button className="btn light" onClick={() => openLog(m)}>{t.why}</button>
                </div>
              ))}
            </div>
          ) : <div className="card"><p>{t.no}</p></div>}
        </>}

        {/* CLONE CHAT */}
        {view === "clone" && <div className="chat">
          <div className="toolbar">
            <div><h1>{t.clone}</h1><p className="muted">{t.cloneNote}</p></div>
            <button className="btn light" onClick={() => setView("home")}>{t.back}</button>
          </div>
          <div className="card">
            <div className="messages">
              {messages.map((m, i) => (
                <div key={i} className={"bubble " + (m.role === "user" ? "user" : "bot")}>{m.content}</div>
              ))}
              {loading && <div className="bubble bot">{t.loading}</div>}
              <div ref={bottomRef} />
            </div>
            <div className="chatbar">
              <input value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()} placeholder={t.placeholder} />
              <button className="btn primary" onClick={send} disabled={loading}>{t.send}</button>
            </div>
          </div>
        </div>}
      </main>
    </div>
  );
}
