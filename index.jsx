import { useState, useRef, useCallback } from "react";

const PROMPT = `You are a precise facial analysis system. Analyze this face photo and return ONLY valid JSON, no markdown, no backticks, no extra text.

Return exactly:
{
  "score": <number 1.0-10.0 one decimal>,
  "grade": <"Exceptional"|"Very Good"|"Good"|"Average"|"Below Average">,
  "summary": <one sentence max 12 words>,
  "age_estimate": <number>,
  "gender": <"Male"|"Female"|"Ambiguous">,
  "face_shape": <"Oval"|"Round"|"Square"|"Heart"|"Diamond"|"Oblong">,
  "expression": <one word>,
  "metrics": {
    "symmetry": <0.0-10.0>,
    "proportions": <0.0-10.0>,
    "cheekbones": <0.0-10.0>,
    "jawline": <0.0-10.0>,
    "eyes": <0.0-10.0>,
    "nose": <0.0-10.0>,
    "lips": <0.0-10.0>
  },
  "highlights": [<2-4 short notable feature strings>],
  "no_face": <true if no human face, false otherwise>
}`;

const METRICS_LABELS = [
  ["symmetry", "Symmetry"],
  ["proportions", "Proportions"],
  ["cheekbones", "Cheekbones"],
  ["jawline", "Jawline"],
  ["eyes", "Eyes"],
  ["nose", "Nose"],
  ["lips", "Lips"],
];

export default function FaceAnalysis() {
  const [phase, setPhase] = useState("idle"); // idle | preview | scanning | done | error
  const [imgSrc, setImgSrc] = useState(null);
  const [imgName, setImgName] = useState("");
  const [b64, setB64] = useState(null);
  const [result, setResult] = useState(null);
  const [errMsg, setErrMsg] = useState("");
  const fileRef = useRef();

  const handleFile = useCallback((file) => {
    if (!file) return;
    setImgName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      setImgSrc(dataUrl);
      setB64(dataUrl.split(",")[1]);
      setPhase("preview");
      setResult(null);
      setErrMsg("");
    };
    reader.readAsDataURL(file);
  }, []);

  const onFileInput = (e) => { handleFile(e.target.files[0]); e.target.value = ""; };

  const onDrop = (e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  };

  const reset = () => {
    setPhase("idle");
    setImgSrc(null);
    setB64(null);
    setResult(null);
    setErrMsg("");
  };

  const analyze = async () => {
    if (!b64) return;
    setPhase("scanning");
    setResult(null);
    setErrMsg("");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: "image/jpeg", data: b64 } },
              { type: "text", text: PROMPT }
            ]
          }]
        })
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error?.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      const raw = data.content?.find(b => b.type === "text")?.text || "";
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      if (parsed.no_face) throw new Error("No human face detected in this image");
      setResult(parsed);
      setPhase("done");
    } catch (e) {
      setErrMsg(e.message);
      setPhase("error");
    }
  };

  return (
    <div style={s.root}>
      {/* Ambient bg */}
      <div style={s.bg} />
      <div style={s.bgBlob1} />
      <div style={s.bgBlob2} />

      {/* Header */}
      <header style={s.header}>
        <span style={s.wordmark}>face<span style={s.wordmarkDim}>.</span>analysis</span>
        <div style={s.headerRight}>
          <span style={{
            ...s.dot,
            background: phase === "scanning" ? "rgba(180,150,255,0.9)" : "rgba(100,210,155,0.85)",
            boxShadow: phase === "scanning" ? "0 0 10px rgba(170,130,255,0.7)" : "0 0 8px rgba(90,200,140,0.6)",
          }} />
          <span style={s.statusTxt}>
            {phase === "scanning" ? "scanning" : phase === "error" ? "error" : "ready"}
          </span>
        </div>
      </header>

      {/* Body */}
      <div style={s.body}>

        {/* Left panel */}
        <div style={s.leftPanel}>

          {/* Idle — upload zone */}
          {phase === "idle" && (
            <div
              style={s.uploadZone}
              onClick={() => fileRef.current.click()}
              onDrop={onDrop}
              onDragOver={e => e.preventDefault()}
            >
              <div style={s.uploadIcon}>🖼</div>
              <div style={s.uploadLabel}>Drop a photo or click to upload</div>
              <div style={s.uploadSub}>jpg · png · webp</div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={onFileInput} />
            </div>
          )}

          {/* Preview / scanning / done / error */}
          {phase !== "idle" && (
            <div style={s.imgWrap}>
              <img src={imgSrc} alt="" style={s.previewImg} />

              {/* Scan overlay */}
              {phase === "scanning" && (
                <div style={s.scanOverlay}>
                  <div style={s.ring} />
                  <div style={s.scanTxt}>SCANNING</div>
                  <ScanLine />
                </div>
              )}

              {/* Bottom bar */}
              {phase !== "scanning" && (
                <div style={s.imgBar}>
                  <span style={s.imgBadge}>{imgName}</span>
                  <button style={s.changeBtn} onClick={reset}>Change</button>
                </div>
              )}

              {/* Analyze button */}
              {(phase === "preview" || phase === "error" || phase === "done") && (
                <button style={s.analyzeBtn} onClick={analyze}>
                  {phase === "done" ? "Re-analyze" : "Analyze face"}
                </button>
              )}

              {/* Error */}
              {phase === "error" && (
                <div style={s.errBanner}>
                  <span style={{ color: "rgba(255,110,110,0.85)", fontFamily: "DM Mono,monospace", fontSize: 11 }}>
                    {errMsg}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div style={s.rightCol}>
          {!result ? (
            <div style={{ ...s.glass, flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: 32, textAlign: "center" }}>
              <div style={{ fontSize: 28, opacity: 0.18 }}>◎</div>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", fontWeight: 300 }}>No analysis yet</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.22)", fontFamily: "DM Mono,monospace", lineHeight: 1.7 }}>
                Upload a photo and press<br />Analyze face
              </div>
            </div>
          ) : (
            <Results data={result} />
          )}
        </div>

      </div>
    </div>
  );
}

// ── Scan line animation ──────────────────────────────────
function ScanLine() {
  const [top, setTop] = useState(0);
  const rafRef = useRef();
  const startRef = useRef(null);

  const animate = (ts) => {
    if (!startRef.current) startRef.current = ts;
    const elapsed = (ts - startRef.current) % 2800;
    const pct = elapsed / 2800;
    setTop(pct * 100);
    rafRef.current = requestAnimationFrame(animate);
  };

  useState(() => {
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  });

  return (
    <div style={{
      position: "absolute", left: 0, right: 0, top: `${top}%`,
      height: 1,
      background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)",
      pointerEvents: "none",
      zIndex: 5,
    }} />
  );
}

// ── Results ──────────────────────────────────────────────
function Results({ data }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
      <ScoreCard data={data} />
      <MetricsCard metrics={data.metrics} />
      <InfoCard data={data} />
      {data.highlights?.length > 0 && <TagsCard tags={data.highlights} />}
    </div>
  );
}

function ScoreCard({ data }) {
  const pct = data.score * 10;
  return (
    <div style={{ ...s.glass, ...s.card }}>
      <div style={s.cardHeader}>overall score</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 10 }}>
        <span style={{ fontSize: 52, fontWeight: 300, lineHeight: 1, color: "rgba(255,255,255,0.92)", letterSpacing: "-0.02em" }}>
          {data.score.toFixed(1)}
        </span>
        <span style={{ fontFamily: "DM Mono,monospace", fontSize: 13, color: "rgba(255,255,255,0.28)", paddingBottom: 4 }}>/ 10</span>
        <span style={{ marginLeft: "auto", fontFamily: "DM Mono,monospace", fontSize: 11, color: "rgba(255,255,255,0.45)", letterSpacing: "0.1em", paddingBottom: 4 }}>
          {data.grade}
        </span>
      </div>
      <div style={{ height: 2, background: "rgba(255,255,255,0.07)", borderRadius: 2, marginBottom: 8 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "rgba(255,255,255,0.5)", borderRadius: 2, transition: "width 1s cubic-bezier(.4,0,.2,1)" }} />
      </div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.32)", fontFamily: "DM Mono,monospace", lineHeight: 1.5 }}>{data.summary}</div>
    </div>
  );
}

function MetricsCard({ metrics }) {
  return (
    <div style={{ ...s.glass, ...s.card }}>
      <div style={s.cardHeader}>facial metrics</div>
      {METRICS_LABELS.map(([key, label]) => (
        <div key={key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", minWidth: 84, fontWeight: 300 }}>{label}</span>
          <div style={{ flex: 1, height: 2, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
            <div style={{ height: "100%", width: `${(metrics[key] || 0) * 10}%`, background: "rgba(255,255,255,0.38)", borderRadius: 2, transition: "width 1s cubic-bezier(.4,0,.2,1)" }} />
          </div>
          <span style={{ fontFamily: "DM Mono,monospace", fontSize: 11, color: "rgba(255,255,255,0.4)", minWidth: 24, textAlign: "right" }}>
            {(metrics[key] || 0).toFixed(1)}
          </span>
        </div>
      ))}
    </div>
  );
}

function InfoCard({ data }) {
  const rows = [
    ["Age", `~${data.age_estimate} yrs`],
    ["Gender", data.gender],
    ["Face shape", data.face_shape],
    ["Expression", data.expression],
  ];
  return (
    <div style={{ ...s.glass, ...s.card }}>
      <div style={s.cardHeader}>face profile</div>
      {rows.map(([k, v]) => (
        <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <span style={{ fontFamily: "DM Mono,monospace", fontSize: 10, letterSpacing: "0.08em", color: "rgba(255,255,255,0.25)", textTransform: "uppercase" }}>{k}</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", fontWeight: 300 }}>{v}</span>
        </div>
      ))}
    </div>
  );
}

function TagsCard({ tags }) {
  return (
    <div style={{ ...s.glass, ...s.card }}>
      <div style={s.cardHeader}>notable features</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {tags.map((t, i) => (
          <span key={i} style={{
            fontFamily: "DM Mono,monospace", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase",
            padding: "4px 9px", borderRadius: 6,
            border: `1px solid ${i < 2 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)"}`,
            color: i < 2 ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.25)",
            background: i < 2 ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.02)",
          }}>{t}</span>
        ))}
      </div>
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────
const glass = {
  background: "rgba(255,255,255,0.07)",
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: 18,
  backdropFilter: "blur(28px) saturate(150%)",
  WebkitBackdropFilter: "blur(28px) saturate(150%)",
  position: "relative",
  overflow: "hidden",
};

const s = {
  root: {
    minHeight: "100vh",
    background: "#0d0d14",
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 300,
    color: "rgba(255,255,255,0.9)",
    display: "grid",
    gridTemplateRows: "52px 1fr",
    padding: 14,
    gap: 10,
    position: "relative",
    overflow: "hidden",
  },
  bg: {
    position: "fixed", inset: 0,
    background: "linear-gradient(160deg, #0d0f1e 0%, #0a0a12 50%, #130d1a 100%)",
    zIndex: 0,
  },
  bgBlob1: {
    position: "fixed", zIndex: 0,
    width: "60vw", height: "50vh",
    top: "-10vh", left: "-10vw",
    background: "radial-gradient(ellipse, rgba(90,130,255,0.14) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  bgBlob2: {
    position: "fixed", zIndex: 0,
    width: "50vw", height: "60vh",
    bottom: "-15vh", right: "-10vw",
    background: "radial-gradient(ellipse, rgba(170,90,255,0.12) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  header: {
    ...glass,
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "0 18px",
    zIndex: 10,
  },
  wordmark: {
    fontFamily: "DM Mono, monospace",
    fontSize: 13, fontWeight: 500,
    letterSpacing: "0.12em",
    color: "rgba(255,255,255,0.88)",
  },
  wordmarkDim: { opacity: 0.35, fontWeight: 400 },
  headerRight: { display: "flex", alignItems: "center", gap: 8, fontFamily: "DM Mono,monospace", fontSize: 11, color: "rgba(255,255,255,0.38)", letterSpacing: "0.06em" },
  dot: { width: 6, height: 6, borderRadius: "50%", display: "inline-block", transition: "all 0.4s" },
  statusTxt: {},
  body: {
    display: "grid",
    gridTemplateColumns: "1fr 320px",
    gap: 10,
    overflow: "hidden",
    zIndex: 1,
    position: "relative",
  },
  leftPanel: { ...glass, position: "relative", overflow: "hidden" },
  rightCol: {
    display: "flex", flexDirection: "column", gap: 10,
    overflowY: "auto",
  },
  glass,
  card: { padding: "18px 18px 14px" },
  cardHeader: {
    fontFamily: "DM Mono,monospace", fontSize: 9,
    letterSpacing: "0.18em", textTransform: "uppercase",
    color: "rgba(255,255,255,0.25)", marginBottom: 14,
  },

  // Upload
  uploadZone: {
    height: "100%", display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center", gap: 14,
    cursor: "pointer", borderRadius: 18, padding: 32,
  },
  uploadIcon: {
    width: 54, height: 54, borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.05)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 22,
  },
  uploadLabel: { fontSize: 14, color: "rgba(255,255,255,0.38)", textAlign: "center", lineHeight: 1.6 },
  uploadSub: { fontFamily: "DM Mono,monospace", fontSize: 11, color: "rgba(255,255,255,0.18)" },

  // Image
  imgWrap: { width: "100%", height: "100%", position: "relative" },
  previewImg: { width: "100%", height: "100%", objectFit: "cover", display: "block", borderRadius: 18 },
  scanOverlay: {
    position: "absolute", inset: 0,
    background: "rgba(8,8,18,0.55)",
    backdropFilter: "blur(2px)",
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center", gap: 18,
    zIndex: 4, borderRadius: 18,
  },
  ring: {
    width: 56, height: 56, borderRadius: "50%",
    border: "1.5px solid rgba(255,255,255,0.12)",
    borderTopColor: "rgba(255,255,255,0.65)",
    animation: "spin 1s linear infinite",
  },
  scanTxt: { fontFamily: "DM Mono,monospace", fontSize: 10, letterSpacing: "0.18em", color: "rgba(255,255,255,0.35)" },
  imgBar: {
    position: "absolute", bottom: 14, left: 14, right: 14,
    display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 3,
  },
  imgBadge: {
    fontFamily: "DM Mono,monospace", fontSize: 10, letterSpacing: "0.08em",
    color: "rgba(255,255,255,0.4)",
    background: "rgba(0,0,0,0.42)", border: "1px solid rgba(255,255,255,0.1)",
    padding: "5px 10px", borderRadius: 8, backdropFilter: "blur(14px)",
  },
  changeBtn: {
    fontFamily: "DM Mono,monospace", fontSize: 10, letterSpacing: "0.08em",
    color: "rgba(255,255,255,0.4)",
    background: "rgba(0,0,0,0.42)", border: "1px solid rgba(255,255,255,0.1)",
    padding: "5px 12px", borderRadius: 8, cursor: "pointer", backdropFilter: "blur(14px)",
  },
  analyzeBtn: {
    position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)",
    fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 400,
    letterSpacing: "0.04em", color: "rgba(255,255,255,0.82)",
    background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)",
    padding: "10px 28px", borderRadius: 12, cursor: "pointer",
    backdropFilter: "blur(20px)", whiteSpace: "nowrap", zIndex: 4,
  },
  errBanner: {
    position: "absolute", bottom: 60, left: 14, right: 14,
    background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,80,80,0.2)",
    borderRadius: 10, padding: "10px 14px", backdropFilter: "blur(14px)",
    textAlign: "center", zIndex: 5,
  },
};

