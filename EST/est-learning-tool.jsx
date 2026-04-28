import React, { useState, useEffect, useRef } from 'react';
import { Activity, Zap, AlertTriangle, CheckCircle2, XCircle, Loader2, Heart, Shield, Cpu, FileText, ChevronRight, Play, RotateCcw, Award, BookOpen, Gauge, Cable } from 'lucide-react';

// ============================================================
// API HELPER
// ============================================================
const callClaude = async (prompt, maxTokens = 800) => {
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-opus-4-5",
        max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }]
      })
    });
    const data = await response.json();
    return data.content
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("\n");
  } catch (e) {
    return "AI unavailable. Check connection.";
  }
};

// ============================================================
// SHARED UI
// ============================================================
const Panel = ({ children, className = "", label }) => (
  <div className={`relative border border-slate-700/60 bg-slate-900/40 backdrop-blur ${className}`}>
    {label && (
      <div className="absolute -top-2.5 left-4 px-2 bg-slate-950 text-[10px] font-mono tracking-[0.2em] text-cyan-400 uppercase">
        {label}
      </div>
    )}
    {children}
  </div>
);

const StatusDot = ({ status }) => {
  const colors = {
    pass: "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]",
    fail: "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]",
    pending: "bg-slate-600",
    active: "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.6)] animate-pulse"
  };
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[status]}`} />;
};

const AIBox = ({ loading, content, accent = "cyan" }) => {
  const accentClass = accent === "amber" ? "border-amber-500/40 text-amber-100" : "border-cyan-500/40 text-cyan-100";
  return (
    <div className={`mt-4 p-4 border-l-2 ${accentClass} bg-slate-950/60 text-sm leading-relaxed`}>
      <div className="flex items-center gap-2 mb-2 text-[10px] font-mono tracking-[0.2em] uppercase opacity-70">
        <Cpu className="w-3 h-3" />
        Claude Opus 4.5 · Clinical Engineer Tutor
      </div>
      {loading ? (
        <div className="flex items-center gap-2 opacity-70">
          <Loader2 className="w-4 h-4 animate-spin" /> Thinking…
        </div>
      ) : (
        <div className="whitespace-pre-wrap font-light">{content || "Hover or click to query."}</div>
      )}
    </div>
  );
};

// ============================================================
// MODULE 1 — CURRENT vs BODY EFFECT
// ============================================================
const Module1 = () => {
  const [hoveredBand, setHoveredBand] = useState(null);
  const [aiContent, setAiContent] = useState("");
  const [loading, setLoading] = useState(false);
  const lastQuery = useRef(null);

  // Log scale: 0.001 mA to 1000 mA → log10 = -3 to 3, span 6
  const toY = (mA) => {
    const v = Math.log10(mA);
    return ((3 - v) / 6) * 100; // top=0% at 1000mA, bottom=100% at 0.001mA
  };

  const macroBands = [
    { label: "Perception", min: 0.5, max: 2, color: "from-sky-500/40 to-sky-500/10", text: "text-sky-300" },
    { label: "Painful / Startle", min: 2, max: 10, color: "from-cyan-500/40 to-cyan-500/10", text: "text-cyan-300" },
    { label: "Let-go threshold", min: 10, max: 20, color: "from-yellow-500/40 to-yellow-500/10", text: "text-yellow-300" },
    { label: "Respiratory paralysis", min: 20, max: 50, color: "from-orange-500/40 to-orange-500/10", text: "text-orange-300" },
    { label: "Ventricular fibrillation", min: 50, max: 200, color: "from-red-600/50 to-red-600/10", text: "text-red-300" },
    { label: "Cardiac arrest / burns", min: 200, max: 1000, color: "from-red-900/60 to-red-900/20", text: "text-red-400" },
  ];

  const microBands = [
    { label: "Sub-perception (safe)", min: 0.001, max: 0.01, color: "from-slate-600/30 to-slate-600/5", text: "text-slate-400" },
    { label: "VF threshold (intracardiac)", min: 0.01, max: 0.1, color: "from-red-600/40 to-red-600/10", text: "text-red-300" },
    { label: "Lethal microshock", min: 0.1, max: 1, color: "from-red-900/60 to-red-900/20", text: "text-red-400" },
  ];

  const iecLimits = [
    { value: 0.5, label: "Type B/BF earth leakage NC", color: "border-cyan-400" },
    { value: 0.1, label: "Type B/BF patient leakage NC", color: "border-amber-400" },
    { value: 0.01, label: "Type CF patient leakage NC", color: "border-pink-400" },
  ];

  const handleHover = async (band, mode) => {
    const key = `${mode}-${band.label}`;
    if (lastQuery.current === key) return;
    lastQuery.current = key;
    setHoveredBand({ ...band, mode });
    setLoading(true);
    setAiContent("");
    const prompt = `You are a clinical engineering educator. Explain in 4-5 sentences the physiological mechanism and clinical relevance for an NHS clinical engineer of this current band:

Mode: ${mode === 'macro' ? 'Macroshock (current through external skin contact)' : 'Microshock (current through intracardiac catheter)'}
Band: ${band.label}
Current range: ${band.min} mA to ${band.max} mA

Be technical and specific. Mention why this matters for IEC 60601-1 leakage limits if relevant. No preamble.`;
    const result = await callClaude(prompt, 400);
    setAiContent(result);
    setLoading(false);
  };

  return (
    <Panel label="Module 01 · Current vs Physiological Effect" className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart area */}
        <div className="lg:col-span-2">
          <div className="flex items-baseline justify-between mb-4">
            <h3 className="text-xl font-light tracking-tight text-slate-100">Current Threshold Atlas</h3>
            <span className="text-[10px] font-mono text-slate-500 tracking-[0.2em] uppercase">50 Hz AC · 1 second exposure</span>
          </div>

          <div className="relative h-[480px] flex gap-3">
            {/* Y axis */}
            <div className="w-14 relative font-mono text-[10px] text-slate-500">
              {[1000, 100, 10, 1, 0.1, 0.01, 0.001].map(v => (
                <div key={v} className="absolute right-0 -translate-y-1/2 pr-2"
                  style={{ top: `${toY(v)}%` }}>
                  {v >= 1 ? `${v}` : v.toString()} mA
                </div>
              ))}
              <div className="absolute right-0 left-0 h-full border-r border-slate-700"></div>
            </div>

            {/* Macroshock column */}
            <div className="flex-1 relative">
              <div className="absolute -top-7 left-0 text-[10px] font-mono tracking-[0.2em] uppercase text-cyan-400">Macroshock</div>
              <div className="relative h-full border border-slate-700/60">
                {macroBands.map((b) => {
                  const top = toY(b.max);
                  const bottom = toY(b.min);
                  const height = bottom - top;
                  const isActive = hoveredBand?.mode === 'macro' && hoveredBand?.label === b.label;
                  return (
                    <div
                      key={b.label}
                      onMouseEnter={() => handleHover(b, 'macro')}
                      className={`absolute left-0 right-0 bg-gradient-to-r ${b.color} border-y border-slate-700/40 cursor-pointer transition-all hover:brightness-150 ${isActive ? 'brightness-150 ring-1 ring-cyan-400/50' : ''}`}
                      style={{ top: `${top}%`, height: `${height}%` }}
                    >
                      <div className={`p-1.5 text-[10px] font-mono ${b.text} truncate`}>
                        {b.label} · {b.min}–{b.max} mA
                      </div>
                    </div>
                  );
                })}
                {/* IEC limit markers */}
                {iecLimits.map((l, i) => (
                  <div key={i} className={`absolute left-0 right-0 border-t-2 border-dashed ${l.color} pointer-events-none`}
                    style={{ top: `${toY(l.value)}%` }}>
                    <span className={`absolute right-1 -top-3 text-[9px] font-mono ${l.color.replace('border-', 'text-')}`}>
                      {l.value} mA
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Microshock column */}
            <div className="flex-1 relative">
              <div className="absolute -top-7 left-0 text-[10px] font-mono tracking-[0.2em] uppercase text-pink-400">Microshock · Intracardiac</div>
              <div className="relative h-full border border-slate-700/60">
                {microBands.map((b) => {
                  const top = toY(b.max);
                  const bottom = toY(b.min);
                  const height = bottom - top;
                  const isActive = hoveredBand?.mode === 'micro' && hoveredBand?.label === b.label;
                  return (
                    <div
                      key={b.label}
                      onMouseEnter={() => handleHover(b, 'micro')}
                      className={`absolute left-0 right-0 bg-gradient-to-r ${b.color} border-y border-slate-700/40 cursor-pointer transition-all hover:brightness-150 ${isActive ? 'brightness-150 ring-1 ring-pink-400/50' : ''}`}
                      style={{ top: `${top}%`, height: `${height}%` }}
                    >
                      <div className={`p-1.5 text-[10px] font-mono ${b.text} truncate`}>
                        {b.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-6 grid grid-cols-3 gap-2 text-[10px] font-mono">
            {iecLimits.map((l, i) => (
              <div key={i} className="flex items-center gap-2 text-slate-400">
                <div className={`w-4 border-t-2 border-dashed ${l.color}`}></div>
                <span>{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI Panel */}
        <div>
          <div className="text-[10px] font-mono tracking-[0.2em] uppercase text-slate-500 mb-2">Selected band</div>
          <div className="text-2xl font-light text-slate-100 mb-1">
            {hoveredBand?.label || "—"}
          </div>
          <div className="text-xs font-mono text-slate-500">
            {hoveredBand ? `${hoveredBand.min} mA → ${hoveredBand.max} mA · ${hoveredBand.mode}` : "Hover a band to query Claude"}
          </div>
          <AIBox loading={loading} content={aiContent} />
          <div className="mt-4 p-3 bg-amber-950/30 border border-amber-800/40 text-amber-200 text-xs">
            <AlertTriangle className="w-3 h-3 inline mr-1" />
            Microshock thresholds are 100–1000× lower than macroshock. A current that is imperceptible at the skin can induce VF if delivered intracardiac.
          </div>
        </div>
      </div>
    </Panel>
  );
};

// ============================================================
// MODULE 2 — APPLIED PART TYPES
// ============================================================
const Module2 = () => {
  const [selected, setSelected] = useState(null);
  const [scenario, setScenario] = useState("");
  const [loading, setLoading] = useState(false);

  const types = [
    {
      id: 'B',
      name: 'Type B',
      symbol: '⊓',
      iecRef: 'IEC 60601-1 Table 3 & 4',
      description: 'Body-protected. Earthed applied part. No direct cardiac use.',
      defib: false,
      isolated: false,
      limits: {
        earthLeakageNC: '0.5 mA', earthLeakageSFC: '1.0 mA',
        patientLeakageNC: '0.1 mA', patientLeakageSFC: '0.5 mA',
        patientAuxNC: '0.1 mA', patientAuxSFC: '0.5 mA',
      },
      examples: ['Operating tables', 'Surgical lights', 'Hospital beds', 'Phototherapy lamps'],
      color: 'cyan',
    },
    {
      id: 'BF',
      name: 'Type BF',
      symbol: '⊓',
      iecRef: 'IEC 60601-1 Table 3 & 4',
      description: 'Body Floating. Patient circuit isolated from earth. No direct cardiac contact.',
      defib: false,
      isolated: true,
      limits: {
        earthLeakageNC: '0.5 mA', earthLeakageSFC: '1.0 mA',
        patientLeakageNC: '0.1 mA', patientLeakageSFC: '0.5 mA',
        patientAuxNC: '0.1 mA', patientAuxSFC: '0.5 mA',
        mainsOnAP: '5.0 mA',
      },
      examples: ['ECG (12-lead surface)', 'NIBP monitors', 'SpO₂ probes', 'Ultrasound transducers'],
      color: 'amber',
    },
    {
      id: 'CF',
      name: 'Type CF',
      symbol: '♥',
      iecRef: 'IEC 60601-1 Table 3 & 4',
      description: 'Cardiac Floating. Highest protection. Suitable for direct cardiac contact.',
      defib: true,
      isolated: true,
      limits: {
        earthLeakageNC: '0.5 mA', earthLeakageSFC: '1.0 mA',
        patientLeakageNC: '0.01 mA', patientLeakageSFC: '0.05 mA',
        patientAuxNC: '0.01 mA', patientAuxSFC: '0.05 mA',
        mainsOnAP: '0.05 mA',
      },
      examples: ['Pressure transducers (intracardiac)', 'Pacing leads', 'Cardiac catheterisation', 'CVP monitoring'],
      color: 'pink',
    }
  ];

  const handleSelect = async (t) => {
    setSelected(t);
    setLoading(true);
    setScenario("");
    const prompt = `You are an NHS clinical engineering educator. Generate a realistic clinical scenario (4-6 sentences) involving a Type ${t.id} applied part medical device in a UK NHS hospital setting.

Include:
- Specific NHS clinical environment (e.g. ICU, theatre, ED)
- Specific device type with realistic make/model where helpful
- The clinical task being performed
- Why Type ${t.id} classification is essential here
- One realistic safety consideration the clinical engineer must check during PPM

Be specific, technical, and grounded. Use British English. No preamble.`;
    const result = await callClaude(prompt, 500);
    setScenario(result);
    setLoading(false);
  };

  const colorMap = {
    cyan: { border: 'border-cyan-500', bg: 'bg-cyan-950/30', text: 'text-cyan-300', glow: 'shadow-[0_0_30px_rgba(34,211,238,0.15)]' },
    amber: { border: 'border-amber-500', bg: 'bg-amber-950/30', text: 'text-amber-300', glow: 'shadow-[0_0_30px_rgba(251,191,36,0.15)]' },
    pink: { border: 'border-pink-500', bg: 'bg-pink-950/30', text: 'text-pink-300', glow: 'shadow-[0_0_30px_rgba(236,72,153,0.15)]' },
  };

  return (
    <Panel label="Module 02 · Applied Part Classification" className="p-6">
      <div className="flex items-baseline justify-between mb-6">
        <h3 className="text-xl font-light tracking-tight text-slate-100">Patient-Applied Part Types</h3>
        <span className="text-[10px] font-mono text-slate-500 tracking-[0.2em] uppercase">IEC 60601-1 Cl. 8.5</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {types.map(t => {
          const c = colorMap[t.color];
          const active = selected?.id === t.id;
          return (
            <button
              key={t.id}
              onClick={() => handleSelect(t)}
              className={`text-left p-5 border ${active ? c.border + ' ' + c.bg + ' ' + c.glow : 'border-slate-700/60 bg-slate-900/30'} hover:${c.border} transition-all group`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className={`text-[10px] font-mono tracking-[0.2em] uppercase ${active ? c.text : 'text-slate-500'}`}>{t.iecRef}</div>
                  <div className={`text-3xl font-light mt-1 ${active ? c.text : 'text-slate-200'}`}>{t.name}</div>
                </div>
                <div className={`w-12 h-12 border-2 ${active ? c.border : 'border-slate-600'} flex items-center justify-center text-2xl ${c.text}`}>
                  {t.id === 'CF' ? <Heart className="w-6 h-6 fill-current" /> : t.id === 'BF' ? <Shield className="w-6 h-6" /> : <Activity className="w-6 h-6" />}
                </div>
              </div>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">{t.description}</p>

              <div className="space-y-1 text-[10px] font-mono">
                <div className="flex justify-between text-slate-500"><span>Patient leakage NC</span><span className={c.text}>{t.limits.patientLeakageNC}</span></div>
                <div className="flex justify-between text-slate-500"><span>Patient leakage SFC</span><span className={c.text}>{t.limits.patientLeakageSFC}</span></div>
                {t.limits.mainsOnAP && <div className="flex justify-between text-slate-500"><span>Mains on AP</span><span className={c.text}>{t.limits.mainsOnAP}</span></div>}
                <div className="flex justify-between text-slate-500 pt-1 border-t border-slate-800">
                  <span>Isolated</span>
                  <span className={t.isolated ? 'text-emerald-400' : 'text-slate-600'}>{t.isolated ? '✓ YES' : '✗ NO'}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Defib protected</span>
                  <span className={t.defib ? 'text-emerald-400' : 'text-slate-600'}>{t.defib ? '✓ YES' : '✗ NO'}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Isolation barrier diagram */}
      {selected && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div className="text-[10px] font-mono tracking-[0.2em] uppercase text-slate-500 mb-3">Isolation Topology</div>
            <svg viewBox="0 0 400 200" className="w-full border border-slate-700/60 bg-slate-950/40">
              {/* Mains */}
              <rect x="10" y="80" width="60" height="40" fill="none" stroke="#475569" strokeWidth="1" />
              <text x="40" y="105" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="monospace">MAINS</text>
              <line x1="70" y1="100" x2="120" y2="100" stroke="#06b6d4" strokeWidth="1.5" />

              {/* Device */}
              <rect x="120" y="60" width="100" height="80" fill="none" stroke="#06b6d4" strokeWidth="1.5" />
              <text x="170" y="85" textAnchor="middle" fill="#67e8f9" fontSize="10" fontFamily="monospace">DEVICE</text>
              <text x="170" y="100" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">Class I</text>
              <text x="170" y="115" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">Type {selected.id}</text>

              {/* Earth */}
              <line x1="170" y1="140" x2="170" y2="170" stroke="#10b981" strokeWidth="1.5" />
              <line x1="155" y1="170" x2="185" y2="170" stroke="#10b981" strokeWidth="2" />
              <line x1="160" y1="175" x2="180" y2="175" stroke="#10b981" strokeWidth="1.5" />
              <line x1="165" y1="180" x2="175" y2="180" stroke="#10b981" strokeWidth="1" />
              <text x="200" y="175" fill="#10b981" fontSize="9" fontFamily="monospace">PE</text>

              {/* Isolation barrier */}
              {selected.isolated && (
                <>
                  <line x1="220" y1="55" x2="220" y2="145" stroke={selected.color === 'pink' ? '#ec4899' : '#fbbf24'} strokeWidth="2" strokeDasharray="4,2" />
                  <text x="220" y="50" textAnchor="middle" fill={selected.color === 'pink' ? '#f472b6' : '#fcd34d'} fontSize="8" fontFamily="monospace">
                    {selected.id === 'CF' ? '4 kV ISOLATION' : 'ISOLATION'}
                  </text>
                </>
              )}

              {/* Applied part */}
              <line x1="220" y1="100" x2="280" y2="100" stroke={selected.color === 'pink' ? '#ec4899' : selected.color === 'amber' ? '#fbbf24' : '#06b6d4'} strokeWidth="1.5" />
              <rect x="280" y="80" width="60" height="40" fill="none" stroke={selected.color === 'pink' ? '#ec4899' : selected.color === 'amber' ? '#fbbf24' : '#06b6d4'} strokeWidth="1.5" />
              <text x="310" y="105" textAnchor="middle" fill={selected.color === 'pink' ? '#f472b6' : selected.color === 'amber' ? '#fcd34d' : '#67e8f9'} fontSize="10" fontFamily="monospace">AP</text>

              {/* Patient */}
              <circle cx="370" cy="100" r="15" fill="none" stroke="#cbd5e1" strokeWidth="1" />
              <text x="370" y="104" textAnchor="middle" fill="#cbd5e1" fontSize="10" fontFamily="monospace">Pt</text>
              <line x1="340" y1="100" x2="355" y2="100" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="2,2" />
            </svg>

            <div className="mt-3 text-[10px] font-mono text-slate-500">
              {selected.isolated
                ? `Floating applied part — galvanically isolated from primary circuit. ${selected.id === 'CF' ? 'Withstands 4 kV for direct cardiac use.' : 'Suitable for skin/superficial contact.'}`
                : `Earth-referenced — applied part shares ground with chassis. Body-protected only.`}
            </div>

            <div className="mt-4">
              <div className="text-[10px] font-mono tracking-[0.2em] uppercase text-slate-500 mb-2">Typical NHS devices</div>
              <div className="flex flex-wrap gap-2">
                {selected.examples.map(e => (
                  <span key={e} className={`text-xs px-2 py-1 border ${colorMap[selected.color].border}/40 ${colorMap[selected.color].text}`}>{e}</span>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="text-[10px] font-mono tracking-[0.2em] uppercase text-slate-500 mb-3">NHS Clinical Scenario</div>
            <AIBox loading={loading} content={scenario} accent={selected.color === 'amber' ? 'amber' : 'cyan'} />
          </div>
        </div>
      )}
    </Panel>
  );
};

// ============================================================
// MODULE 3 — EST TEST SEQUENCE SIMULATOR
// ============================================================
const Module3 = () => {
  const [results, setResults] = useState(null);
  const [running, setRunning] = useState(false);
  const [activeStep, setActiveStep] = useState(-1);
  const [diagnosis, setDiagnosis] = useState("");
  const [loadingDx, setLoadingDx] = useState(false);

  const steps = [
    { id: 'visual', name: 'Visual Inspection', measure: 'Cable integrity, casing, applied parts, labelling', limit: 'No physical defects', unit: '' },
    { id: 'earth', name: 'Earth Continuity', measure: 'Resistance from PE pin to chassis', limit: '≤ 0.30 Ω (incl. lead) per HTM 06-01', unit: 'Ω' },
    { id: 'insulation', name: 'Insulation Resistance', measure: 'Mains to chassis @ 500 V DC', limit: '≥ 2 MΩ (general) / ≥ 7 MΩ (B/F)', unit: 'MΩ' },
    { id: 'el-nc', name: 'Earth Leakage (NC)', measure: 'Current in PE conductor, normal condition', limit: '≤ 0.5 mA', unit: 'mA' },
    { id: 'el-sfc', name: 'Earth Leakage (SFC)', measure: 'Earth leakage with open neutral simulated', limit: '≤ 1.0 mA', unit: 'mA' },
    { id: 'pl-nc', name: 'Patient Leakage (NC)', measure: 'Current AP → earth via patient model', limit: '≤ 0.1 mA (BF) / ≤ 0.01 mA (CF)', unit: 'mA' },
    { id: 'pl-sfc', name: 'Patient Leakage (SFC)', measure: 'Patient leakage, open earth condition', limit: '≤ 0.5 mA (BF) / ≤ 0.05 mA (CF)', unit: 'mA' },
    { id: 'moap', name: 'Mains on Applied Part', measure: 'Mains voltage applied to AP, current measured', limit: '≤ 5.0 mA (BF) / ≤ 0.05 mA (CF)', unit: 'mA' },
  ];

  // Generate result with one fault injected
  const generateResults = () => {
    const faultIndex = Math.floor(Math.random() * steps.length);
    return steps.map((s, i) => {
      const fault = i === faultIndex;
      let value, pass;
      switch (s.id) {
        case 'visual':
          value = fault ? 'Frayed mains cable strain relief' : 'OK · No defects';
          pass = !fault;
          break;
        case 'earth':
          value = fault ? (Math.random() * 1.5 + 0.5).toFixed(2) : (Math.random() * 0.15 + 0.08).toFixed(2);
          pass = parseFloat(value) <= 0.30;
          break;
        case 'insulation':
          value = fault ? (Math.random() * 1.5 + 0.5).toFixed(1) : (Math.random() * 80 + 20).toFixed(1);
          pass = parseFloat(value) >= 2;
          break;
        case 'el-nc':
          value = fault ? (Math.random() * 0.4 + 0.6).toFixed(3) : (Math.random() * 0.3 + 0.05).toFixed(3);
          pass = parseFloat(value) <= 0.5;
          break;
        case 'el-sfc':
          value = fault ? (Math.random() * 1 + 1.2).toFixed(3) : (Math.random() * 0.5 + 0.2).toFixed(3);
          pass = parseFloat(value) <= 1.0;
          break;
        case 'pl-nc':
          value = fault ? (Math.random() * 0.3 + 0.15).toFixed(4) : (Math.random() * 0.05 + 0.005).toFixed(4);
          pass = parseFloat(value) <= 0.1;
          break;
        case 'pl-sfc':
          value = fault ? (Math.random() * 0.8 + 0.6).toFixed(4) : (Math.random() * 0.2 + 0.05).toFixed(4);
          pass = parseFloat(value) <= 0.5;
          break;
        case 'moap':
          value = fault ? (Math.random() * 8 + 6).toFixed(3) : (Math.random() * 2 + 0.5).toFixed(3);
          pass = parseFloat(value) <= 5.0;
          break;
        default:
          value = '—'; pass = true;
      }
      return { ...s, value, pass, fault };
    });
  };

  const runSimulation = async () => {
    setRunning(true);
    setDiagnosis("");
    setResults(null);
    const final = generateResults();

    // animate
    for (let i = 0; i < final.length; i++) {
      setActiveStep(i);
      await new Promise(r => setTimeout(r, 450));
    }
    setActiveStep(-1);
    setResults(final);
    setRunning(false);

    // diagnose
    const failed = final.find(s => !s.pass);
    if (failed) {
      setLoadingDx(true);
      const prompt = `You are an NHS clinical engineering tutor. A Class I Type BF medical device just failed Electrical Safety Testing. Diagnose the fault and explain to a Band 5/6 clinical engineer in ~6 sentences:

FAILED TEST: ${failed.name}
Measured value: ${failed.value} ${failed.unit}
IEC 60601-1 limit: ${failed.limit}

Cover:
1. Most likely physical cause of this fault
2. Clinical risk if device is returned to service
3. Required action per NHS practice (repair / condemn / quarantine / MHRA report)
4. Reference to relevant IEC 60601-1 clause or HTM 06-01 guidance

Be specific and decisive. No preamble.`;
      const dx = await callClaude(prompt, 600);
      setDiagnosis(dx);
      setLoadingDx(false);
    }
  };

  return (
    <Panel label="Module 03 · EST Sequence Simulator" className="p-6">
      <div className="flex items-baseline justify-between mb-6">
        <div>
          <h3 className="text-xl font-light tracking-tight text-slate-100">Class I · Type BF Test Sequence</h3>
          <p className="text-xs text-slate-500 mt-1 font-mono">Simulated patient monitor · IEC 60601-1 Cl. 8.7 / HTM 06-01</p>
        </div>
        <button
          onClick={runSimulation}
          disabled={running}
          className="flex items-center gap-2 px-5 py-2.5 bg-cyan-500 text-slate-950 font-mono text-xs tracking-[0.2em] uppercase hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {running ? <><Loader2 className="w-4 h-4 animate-spin" /> Running</> : <><Play className="w-4 h-4" /> Run Simulation</>}
        </button>
      </div>

      <div className="border border-slate-700/60 bg-slate-950/40">
        {/* Header */}
        <div className="grid grid-cols-12 gap-2 px-4 py-2 border-b border-slate-700/60 text-[10px] font-mono tracking-[0.2em] uppercase text-slate-500">
          <div className="col-span-1">#</div>
          <div className="col-span-3">Test</div>
          <div className="col-span-4">Measurement</div>
          <div className="col-span-2">Result</div>
          <div className="col-span-2">Limit</div>
        </div>
        {steps.map((s, i) => {
          const r = results?.[i];
          const isActive = activeStep === i;
          const status = r ? (r.pass ? 'pass' : 'fail') : (isActive ? 'active' : 'pending');
          return (
            <div key={s.id} className={`grid grid-cols-12 gap-2 px-4 py-3 border-b border-slate-800/60 items-center text-xs ${isActive ? 'bg-amber-950/20' : r && !r.pass ? 'bg-red-950/20' : ''}`}>
              <div className="col-span-1 flex items-center gap-2 font-mono text-slate-500">
                <StatusDot status={status} />
                {String(i + 1).padStart(2, '0')}
              </div>
              <div className="col-span-3 text-slate-200">{s.name}</div>
              <div className="col-span-4 text-slate-500 text-[11px]">{s.measure}</div>
              <div className="col-span-2 font-mono">
                {r ? (
                  <span className={r.pass ? 'text-emerald-400' : 'text-red-400'}>
                    {r.value} {r.unit}
                  </span>
                ) : (
                  <span className="text-slate-700">—</span>
                )}
              </div>
              <div className="col-span-2 font-mono text-[10px] text-slate-500">{s.limit}</div>
            </div>
          );
        })}
      </div>

      {results && (
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className={`p-4 border ${results.every(r => r.pass) ? 'border-emerald-500/40 bg-emerald-950/20' : 'border-red-500/40 bg-red-950/20'}`}>
            <div className="text-[10px] font-mono tracking-[0.2em] uppercase text-slate-500 mb-2">Overall verdict</div>
            <div className={`text-2xl font-light ${results.every(r => r.pass) ? 'text-emerald-300' : 'text-red-300'}`}>
              {results.every(r => r.pass) ? '✓ DEVICE SAFE' : '✗ DEVICE FAILED'}
            </div>
            <div className="text-xs text-slate-400 mt-2 font-mono">
              {results.filter(r => r.pass).length}/{results.length} tests passed
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="text-[10px] font-mono tracking-[0.2em] uppercase text-slate-500 mb-2">Claude Diagnosis</div>
            {results.every(r => r.pass) ? (
              <div className="p-4 border border-emerald-700/40 bg-slate-950/60 text-sm text-emerald-200">
                Device passes all required electrical safety tests. Issue PPM label, log in asset management system, return to clinical use. Next test interval per HTM 06-01 risk classification.
              </div>
            ) : (
              <AIBox loading={loadingDx} content={diagnosis} accent="amber" />
            )}
          </div>
        </div>
      )}
    </Panel>
  );
};

// ============================================================
// MODULE 4 — LEAKAGE PATHWAYS DIAGRAM
// ============================================================
const Module4 = () => {
  const [condition, setCondition] = useState('NC');
  const [hoveredPath, setHoveredPath] = useState(null);
  const [aiContent, setAiContent] = useState("");
  const [loading, setLoading] = useState(false);
  const lastQuery = useRef(null);

  const paths = {
    earth: {
      label: 'Earth Leakage Current',
      desc: 'Current flowing from mains parts through insulation/Y-capacitors to PE conductor',
      limitNC: '0.5 mA',
      limitSFC: '1.0 mA',
      color: '#10b981',
    },
    touch: {
      label: 'Touch Current',
      desc: 'Current flowing from accessible parts through operator/patient touching the chassis',
      limitNC: '0.1 mA',
      limitSFC: '0.5 mA',
      color: '#06b6d4',
    },
    patient: {
      label: 'Patient Leakage Current',
      desc: 'Current flowing from applied part to earth via patient body (or from earth to AP via patient)',
      limitNC: '0.1 mA (BF) / 0.01 mA (CF)',
      limitSFC: '0.5 mA (BF) / 0.05 mA (CF)',
      color: '#fbbf24',
    },
    aux: {
      label: 'Patient Auxiliary Current',
      desc: 'Functional current flowing between applied parts (e.g. between ECG electrodes for impedance measurement)',
      limitNC: '0.1 mA (BF) / 0.01 mA (CF)',
      limitSFC: '0.5 mA (BF) / 0.05 mA (CF)',
      color: '#ec4899',
    }
  };

  const handleHover = async (key) => {
    if (lastQuery.current === `${key}-${condition}`) return;
    lastQuery.current = `${key}-${condition}`;
    setHoveredPath(key);
    setLoading(true);
    setAiContent("");
    const p = paths[key];
    const prompt = `You are an NHS clinical engineering educator. Explain in 4-5 sentences for a clinical engineer:

CURRENT TYPE: ${p.label}
CONDITION: ${condition === 'NC' ? 'Normal Condition' : 'Single Fault Condition (open earth)'}

Cover:
1. The physical/electrical mechanism that drives this current
2. The dominant pathway (capacitive, resistive, etc.)
3. Why ${condition === 'SFC' ? 'open-earth fault increases this current' : 'this current exists even in healthy device'}
4. Clinical hazard (macroshock or microshock)

Be technical, specific. Reference IEC 60601-1 where relevant. No preamble.`;
    const result = await callClaude(prompt, 400);
    setAiContent(result);
    setLoading(false);
  };

  return (
    <Panel label="Module 04 · Leakage Current Pathways" className="p-6">
      <div className="flex items-baseline justify-between mb-6">
        <h3 className="text-xl font-light tracking-tight text-slate-100">Current Flow Topology</h3>
        <div className="flex border border-slate-700">
          <button
            onClick={() => setCondition('NC')}
            className={`px-4 py-1.5 text-[10px] font-mono tracking-[0.2em] uppercase transition ${condition === 'NC' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'}`}
          >Normal Condition</button>
          <button
            onClick={() => setCondition('SFC')}
            className={`px-4 py-1.5 text-[10px] font-mono tracking-[0.2em] uppercase transition ${condition === 'SFC' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'}`}
          >Single Fault (Open Earth)</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <svg viewBox="0 0 800 500" className="w-full border border-slate-700/60 bg-slate-950/40">
            {/* Grid */}
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.5" />
              </pattern>
              <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#06b6d4" />
              </marker>
              <marker id="arrowhead-amber" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#fbbf24" />
              </marker>
              <marker id="arrowhead-pink" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#ec4899" />
              </marker>
              <marker id="arrowhead-green" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#10b981" />
              </marker>
            </defs>
            <rect width="800" height="500" fill="url(#grid)" />

            {/* Mains supply */}
            <rect x="30" y="180" width="100" height="100" fill="none" stroke="#475569" strokeWidth="1.5" />
            <text x="80" y="215" textAnchor="middle" fill="#94a3b8" fontSize="11" fontFamily="monospace">230 V</text>
            <text x="80" y="232" textAnchor="middle" fill="#94a3b8" fontSize="11" fontFamily="monospace">50 Hz</text>
            <text x="80" y="260" textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="monospace">UK MAINS</text>

            {/* L, N, PE labels */}
            <text x="135" y="200" fill="#fbbf24" fontSize="10" fontFamily="monospace">L</text>
            <text x="135" y="235" fill="#3b82f6" fontSize="10" fontFamily="monospace">N</text>
            <text x="135" y="270" fill="#10b981" fontSize="10" fontFamily="monospace">PE</text>

            {/* Wires to device */}
            <line x1="130" y1="200" x2="280" y2="200" stroke="#fbbf24" strokeWidth="1.5" />
            <line x1="130" y1="235" x2="280" y2="235" stroke="#3b82f6" strokeWidth="1.5" />
            <line
              x1="130" y1="270" x2="280" y2="270"
              stroke={condition === 'SFC' ? '#ef4444' : '#10b981'}
              strokeWidth="1.5"
              strokeDasharray={condition === 'SFC' ? '4,4' : '0'}
            />
            {condition === 'SFC' && (
              <>
                <line x1="195" y1="262" x2="215" y2="278" stroke="#ef4444" strokeWidth="2" />
                <line x1="215" y1="262" x2="195" y2="278" stroke="#ef4444" strokeWidth="2" />
                <text x="205" y="295" textAnchor="middle" fill="#ef4444" fontSize="9" fontFamily="monospace">OPEN PE</text>
              </>
            )}

            {/* Device chassis */}
            <rect x="280" y="140" width="220" height="200" fill="none" stroke="#06b6d4" strokeWidth="2" />
            <text x="390" y="165" textAnchor="middle" fill="#67e8f9" fontSize="11" fontFamily="monospace">MEDICAL DEVICE</text>
            <text x="390" y="180" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">Class I · Type BF</text>

            {/* Y capacitors (EMC filter) */}
            <line x1="320" y1="200" x2="320" y2="270" stroke="#475569" strokeWidth="1" strokeDasharray="3,2" />
            <line x1="335" y1="235" x2="335" y2="270" stroke="#475569" strokeWidth="1" strokeDasharray="3,2" />
            <text x="320" y="195" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="monospace">Cy</text>

            {/* Isolation barrier (dashed vertical line) */}
            <line x1="430" y1="160" x2="430" y2="320" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="5,3" />
            <text x="430" y="155" textAnchor="middle" fill="#fcd34d" fontSize="8" fontFamily="monospace">ISOLATION</text>

            {/* Applied part */}
            <rect x="450" y="220" width="40" height="50" fill="none" stroke="#fbbf24" strokeWidth="1.5" />
            <text x="470" y="245" textAnchor="middle" fill="#fcd34d" fontSize="9" fontFamily="monospace">AP</text>

            {/* Patient */}
            <circle cx="600" cy="245" r="35" fill="none" stroke="#cbd5e1" strokeWidth="1.5" />
            <text x="600" y="240" textAnchor="middle" fill="#cbd5e1" fontSize="11" fontFamily="monospace">PATIENT</text>
            <text x="600" y="255" textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="monospace">~1 kΩ</text>

            {/* Cable from AP to patient */}
            <line x1="490" y1="245" x2="565" y2="245" stroke="#fbbf24" strokeWidth="1.5" />

            {/* PATH 1: Earth leakage (mains → device → PE) */}
            <path
              d={`M 320 200 Q 360 270 ${condition === 'SFC' ? '320 320' : '160 270'}`}
              fill="none"
              stroke={paths.earth.color}
              strokeWidth={hoveredPath === 'earth' ? 3 : 2}
              strokeDasharray="6,3"
              opacity={hoveredPath === 'earth' || !hoveredPath ? 1 : 0.3}
              markerEnd="url(#arrowhead-green)"
              onMouseEnter={() => handleHover('earth')}
              style={{ cursor: 'pointer' }}
              className="hover:opacity-100"
            >
              <animate attributeName="stroke-dashoffset" from="0" to="-18" dur="1s" repeatCount="indefinite" />
            </path>
            <text
              x={condition === 'SFC' ? '340' : '230'}
              y={condition === 'SFC' ? '310' : '255'}
              fill={paths.earth.color}
              fontSize="9"
              fontFamily="monospace"
              opacity={hoveredPath === 'earth' || !hoveredPath ? 1 : 0.3}
              onMouseEnter={() => handleHover('earth')}
              style={{ cursor: 'pointer' }}
            >I_earth</text>

            {/* PATH 2: Touch current (chassis → operator) */}
            <path
              d="M 390 140 Q 420 80 500 80"
              fill="none"
              stroke={paths.touch.color}
              strokeWidth={hoveredPath === 'touch' ? 3 : 2}
              strokeDasharray="6,3"
              opacity={hoveredPath === 'touch' || !hoveredPath ? 1 : 0.3}
              markerEnd="url(#arrowhead)"
              onMouseEnter={() => handleHover('touch')}
              style={{ cursor: 'pointer' }}
              className="hover:opacity-100"
            >
              <animate attributeName="stroke-dashoffset" from="0" to="-18" dur="1s" repeatCount="indefinite" />
            </path>
            <text x="430" y="100" fill={paths.touch.color} fontSize="9" fontFamily="monospace"
              opacity={hoveredPath === 'touch' || !hoveredPath ? 1 : 0.3}
              onMouseEnter={() => handleHover('touch')}
              style={{ cursor: 'pointer' }}>I_touch</text>
            <circle cx="510" cy="80" r="8" fill="none" stroke={paths.touch.color} strokeWidth="1" opacity={hoveredPath === 'touch' || !hoveredPath ? 1 : 0.3} />
            <text x="525" y="84" fill={paths.touch.color} fontSize="9" fontFamily="monospace" opacity={hoveredPath === 'touch' || !hoveredPath ? 1 : 0.3}>operator</text>

            {/* PATH 3: Patient leakage (AP → patient → earth) */}
            <path
              d="M 600 280 Q 600 380 280 380 L 160 380 Q 80 380 80 290"
              fill="none"
              stroke={paths.patient.color}
              strokeWidth={hoveredPath === 'patient' ? 3 : 2}
              strokeDasharray="6,3"
              opacity={hoveredPath === 'patient' || !hoveredPath ? 1 : 0.3}
              markerEnd="url(#arrowhead-amber)"
              onMouseEnter={() => handleHover('patient')}
              style={{ cursor: 'pointer' }}
              className="hover:opacity-100"
            >
              <animate attributeName="stroke-dashoffset" from="0" to="-18" dur="1s" repeatCount="indefinite" />
            </path>
            <text x="380" y="395" fill={paths.patient.color} fontSize="9" fontFamily="monospace"
              opacity={hoveredPath === 'patient' || !hoveredPath ? 1 : 0.3}
              onMouseEnter={() => handleHover('patient')}
              style={{ cursor: 'pointer' }}>I_patient (return via earth)</text>

            {/* PATH 4: Patient auxiliary (between APs) */}
            <rect x="450" y="290" width="40" height="30" fill="none" stroke="#ec4899" strokeWidth="1" strokeDasharray="2,2" opacity="0.5" />
            <text x="470" y="310" textAnchor="middle" fill="#ec4899" fontSize="8" fontFamily="monospace" opacity="0.6">AP2</text>
            <line x1="490" y1="305" x2="565" y2="270" stroke="#ec4899" strokeWidth="1" strokeDasharray="2,2" opacity="0.5" />
            <path
              d="M 580 230 Q 590 250 580 270"
              fill="none"
              stroke={paths.aux.color}
              strokeWidth={hoveredPath === 'aux' ? 3 : 2}
              strokeDasharray="4,2"
              opacity={hoveredPath === 'aux' || !hoveredPath ? 1 : 0.3}
              markerEnd="url(#arrowhead-pink)"
              onMouseEnter={() => handleHover('aux')}
              style={{ cursor: 'pointer' }}
              className="hover:opacity-100"
            >
              <animate attributeName="stroke-dashoffset" from="0" to="-12" dur="1s" repeatCount="indefinite" />
            </path>
            <text x="640" y="250" fill={paths.aux.color} fontSize="9" fontFamily="monospace"
              opacity={hoveredPath === 'aux' || !hoveredPath ? 1 : 0.3}
              onMouseEnter={() => handleHover('aux')}
              style={{ cursor: 'pointer' }}>I_aux</text>

            {/* Earth ground symbol */}
            <line x1="80" y1="290" x2="80" y2="430" stroke="#10b981" strokeWidth="1.5" />
            <line x1="60" y1="430" x2="100" y2="430" stroke="#10b981" strokeWidth="2" />
            <line x1="68" y1="438" x2="92" y2="438" stroke="#10b981" strokeWidth="1.5" />
            <line x1="74" y1="446" x2="86" y2="446" stroke="#10b981" strokeWidth="1" />
            <text x="80" y="465" textAnchor="middle" fill="#10b981" fontSize="9" fontFamily="monospace">PE / EARTH</text>
          </svg>

          {/* Legend */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            {Object.entries(paths).map(([key, p]) => (
              <button
                key={key}
                onMouseEnter={() => handleHover(key)}
                className={`flex items-center gap-2 p-2 border text-left transition ${hoveredPath === key ? 'border-slate-500 bg-slate-800/40' : 'border-slate-800 hover:border-slate-700'}`}
              >
                <div className="w-4 h-0.5" style={{ background: p.color }}></div>
                <div className="flex-1">
                  <div className="text-xs text-slate-200">{p.label}</div>
                  <div className="text-[10px] font-mono text-slate-500">
                    NC: {p.limitNC} · SFC: {p.limitSFC}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[10px] font-mono tracking-[0.2em] uppercase text-slate-500 mb-2">Selected pathway</div>
          <div className="text-xl font-light text-slate-100 mb-1">{hoveredPath ? paths[hoveredPath].label : "—"}</div>
          <div className="text-xs text-slate-500 font-mono mb-2">
            {hoveredPath ? `Limit: ${condition === 'NC' ? paths[hoveredPath].limitNC : paths[hoveredPath].limitSFC}` : 'Hover any path or legend'}
          </div>
          <AIBox loading={loading} content={aiContent} accent={condition === 'SFC' ? 'amber' : 'cyan'} />
          {condition === 'SFC' && (
            <div className="mt-4 p-3 bg-amber-950/30 border border-amber-800/40 text-amber-200 text-xs">
              <Zap className="w-3 h-3 inline mr-1" />
              Open-earth fault: chassis floats at mains potential via Y-capacitors. All currents redistribute through patient/operator return paths.
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
};

// ============================================================
// MODULE 5 — NHS CONTEXT QUIZ
// ============================================================
const Module5 = () => {
  const questions = [
    {
      q: "What is the maximum permissible earth leakage current under Normal Condition for a Class I medical device per IEC 60601-1?",
      options: ["0.1 mA", "0.5 mA", "1.0 mA", "5.0 mA"],
      correct: 1,
      ref: "IEC 60601-1 Cl. 8.7.3, Table 4"
    },
    {
      q: "A Type CF applied part has a maximum patient leakage current under Normal Condition of:",
      options: ["0.1 mA", "0.05 mA", "0.01 mA", "0.5 mA"],
      correct: 2,
      ref: "IEC 60601-1 Cl. 8.7.3, Table 3"
    },
    {
      q: "Per HTM 06-01, the maximum acceptable earth continuity resistance (including mains lead) for a Class I device is typically:",
      options: ["0.10 Ω", "0.20 Ω", "0.30 Ω", "1.00 Ω"],
      correct: 2,
      ref: "HTM 06-01 Part A, NHS guidance"
    },
    {
      q: "An IT-isolated power supply system in an operating theatre is required by HTM 06-01 Part C primarily to:",
      options: [
        "Reduce mains harmonics",
        "Allow first-fault tolerance without supply interruption",
        "Improve EMC performance",
        "Lower energy consumption"
      ],
      correct: 1,
      ref: "HTM 06-01 Part C / IEC 60364-7-710"
    },
    {
      q: "A Single Fault Condition test for earth leakage simulates which fault?",
      options: [
        "Short circuit between L and N",
        "Open neutral conductor",
        "Open earth conductor (or in some standards, open neutral)",
        "Loss of all phases"
      ],
      correct: 2,
      ref: "IEC 60601-1 Cl. 8.7.2"
    },
    {
      q: "A clinical engineer measures 7.2 mA earth leakage under SFC on a Class I patient warmer. The correct action is:",
      options: [
        "Pass — within limit",
        "Pass with caution and shorten PPM interval",
        "Fail, quarantine, repair, retest before return to service",
        "Fail and immediately raise MHRA Yellow Card alert"
      ],
      correct: 2,
      ref: "IEC 60601-1 Cl. 8.7.3 + NHS local SOP"
    },
    {
      q: "The microshock VF threshold for current delivered directly to the myocardium is approximately:",
      options: ["100 mA", "10 mA", "1 mA", "10–100 µA (0.01–0.1 mA)"],
      correct: 3,
      ref: "Bronzino, IEC 60601-1 rationale for Type CF"
    },
    {
      q: "Mains-on-Applied-Part testing is mandatory for which applied part type(s)?",
      options: ["Type B only", "Type B and BF", "Type BF and CF (F-type)", "All types equally"],
      correct: 2,
      ref: "IEC 60601-1 Cl. 8.7.4.7"
    },
    {
      q: "Insulation resistance testing on a medical device is typically performed at what test voltage?",
      options: ["100 V DC", "250 V AC", "500 V DC", "1000 V AC"],
      correct: 2,
      ref: "IEC 60601-1 / HTM 06-01 practice"
    },
    {
      q: "An ECG monitor (Type BF) and a pacing system (Type CF) are connected to the same patient. The combined leakage limit for the patient is governed by:",
      options: [
        "The lower of the two individual limits",
        "The sum of both limits",
        "IEC 60601-1 Clause 16 — Medical Electrical Systems requirements",
        "Whichever device has the higher classification"
      ],
      correct: 2,
      ref: "IEC 60601-1 Cl. 16 (ME Systems)"
    }
  ];

  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [aiFeedback, setAiFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [finished, setFinished] = useState(false);

  const submit = async () => {
    if (selected === null) return;
    const isCorrect = selected === questions[current].correct;
    const newAnswers = [...answers, { ...questions[current], selected, correct: isCorrect }];
    setAnswers(newAnswers);
    setShowFeedback(true);

    if (!isCorrect) {
      setLoading(true);
      const q = questions[current];
      const prompt = `You are an NHS clinical engineering tutor. The trainee answered the following question incorrectly:

QUESTION: ${q.q}
THEIR ANSWER: ${q.options[selected]}
CORRECT ANSWER: ${q.options[q.correct]}
REFERENCE: ${q.ref}

In 4-5 sentences, explain:
1. Why their answer is wrong
2. The technical reasoning behind the correct answer
3. The relevant standard clause and what it specifically requires
4. A memorable way to recall this for an NHS Band 6 interview

Be precise and technical. No preamble.`;
      const fb = await callClaude(prompt, 500);
      setAiFeedback(fb);
      setLoading(false);
    }
  };

  const next = () => {
    if (current + 1 < questions.length) {
      setCurrent(current + 1);
      setSelected(null);
      setShowFeedback(false);
      setAiFeedback("");
    } else {
      setFinished(true);
    }
  };

  const reset = () => {
    setCurrent(0); setAnswers([]); setSelected(null); setShowFeedback(false); setAiFeedback(""); setFinished(false);
  };

  const score = answers.filter(a => a.correct).length;

  if (finished) {
    const pct = (score / questions.length) * 100;
    let band, msg, color;
    if (pct >= 90) { band = "Band 7+ Mastery"; msg = "Specialist-level command of EST. Ready for SME / regulatory roles."; color = "text-emerald-300 border-emerald-500/40"; }
    else if (pct >= 70) { band = "Band 6 Competency"; msg = "Solid working knowledge. Suitable for autonomous clinical engineering practice."; color = "text-cyan-300 border-cyan-500/40"; }
    else if (pct >= 50) { band = "Band 5 Foundational"; msg = "Adequate baseline. Continue structured CPD and shadow senior engineers."; color = "text-amber-300 border-amber-500/40"; }
    else { band = "Trainee Level"; msg = "Significant gaps. Re-study IEC 60601-1 Clauses 8.5–8.7 and HTM 06-01 fundamentals."; color = "text-red-300 border-red-500/40"; }

    return (
      <Panel label="Module 05 · Assessment Complete" className="p-8">
        <div className="text-center max-w-2xl mx-auto">
          <Award className="w-16 h-16 mx-auto mb-4 text-cyan-400" />
          <div className="text-[10px] font-mono tracking-[0.2em] uppercase text-slate-500 mb-2">Final score</div>
          <div className="text-7xl font-extralight text-slate-100 mb-2">{score}<span className="text-3xl text-slate-500">/{questions.length}</span></div>
          <div className={`inline-block mt-4 px-4 py-2 border ${color} text-lg font-light`}>{band}</div>
          <p className="mt-4 text-slate-400 text-sm">{msg}</p>

          <div className="mt-8 grid grid-cols-1 gap-2">
            {answers.map((a, i) => (
              <div key={i} className={`flex items-center gap-3 p-3 border text-left ${a.correct ? 'border-emerald-700/40 bg-emerald-950/10' : 'border-red-700/40 bg-red-950/10'}`}>
                {a.correct ? <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" /> : <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
                <div className="flex-1 text-xs">
                  <div className="text-slate-300">{i + 1}. {a.q}</div>
                  <div className="text-[10px] font-mono text-slate-500 mt-1">{a.ref}</div>
                </div>
              </div>
            ))}
          </div>

          <button onClick={reset} className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-500 text-slate-950 font-mono text-xs tracking-[0.2em] uppercase hover:bg-cyan-400">
            <RotateCcw className="w-4 h-4" /> Retake Assessment
          </button>
        </div>
      </Panel>
    );
  }

  const q = questions[current];

  return (
    <Panel label="Module 05 · NHS Competency Assessment" className="p-6">
      <div className="flex items-baseline justify-between mb-6">
        <h3 className="text-xl font-light tracking-tight text-slate-100">Knowledge Check</h3>
        <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-slate-500">
          Question {current + 1} of {questions.length} · Score {score}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-slate-800 mb-6 relative overflow-hidden">
        <div className="absolute inset-y-0 left-0 bg-cyan-500 transition-all" style={{ width: `${((current) / questions.length) * 100}%` }}></div>
      </div>

      <div className="border border-slate-700/60 bg-slate-950/40 p-6">
        <div className="text-[10px] font-mono tracking-[0.2em] uppercase text-cyan-400 mb-3">Q{current + 1}</div>
        <div className="text-lg text-slate-100 mb-6 leading-relaxed">{q.q}</div>

        <div className="space-y-2">
          {q.options.map((opt, i) => {
            const isSelected = selected === i;
            const isCorrect = i === q.correct;
            let cls = 'border-slate-700 hover:border-slate-500';
            if (showFeedback) {
              if (isCorrect) cls = 'border-emerald-500 bg-emerald-950/30 text-emerald-200';
              else if (isSelected && !isCorrect) cls = 'border-red-500 bg-red-950/30 text-red-200';
              else cls = 'border-slate-800 text-slate-500';
            } else if (isSelected) {
              cls = 'border-cyan-500 bg-cyan-950/30 text-cyan-100';
            }
            return (
              <button
                key={i}
                disabled={showFeedback}
                onClick={() => setSelected(i)}
                className={`w-full p-3 text-left border transition flex items-center gap-3 ${cls}`}
              >
                <span className="font-mono text-[10px] text-slate-500">{String.fromCharCode(65 + i)}</span>
                <span className="text-sm">{opt}</span>
                {showFeedback && isCorrect && <CheckCircle2 className="w-4 h-4 ml-auto text-emerald-400" />}
                {showFeedback && isSelected && !isCorrect && <XCircle className="w-4 h-4 ml-auto text-red-400" />}
              </button>
            );
          })}
        </div>

        {showFeedback && (
          <div className="mt-6">
            <div className="text-[10px] font-mono tracking-[0.2em] uppercase text-slate-500 mb-2">Reference · {q.ref}</div>
            {!answers[answers.length - 1]?.correct && <AIBox loading={loading} content={aiFeedback} accent="amber" />}
            {answers[answers.length - 1]?.correct && (
              <div className="p-4 border-l-2 border-emerald-500/40 bg-slate-950/60 text-sm text-emerald-200">
                <CheckCircle2 className="w-4 h-4 inline mr-2" />
                Correct. Reference: {q.ref}
              </div>
            )}
            <button onClick={next} className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-500 text-slate-950 font-mono text-xs tracking-[0.2em] uppercase hover:bg-cyan-400">
              {current + 1 === questions.length ? 'See Results' : 'Next Question'} <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {!showFeedback && (
          <button
            onClick={submit}
            disabled={selected === null}
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-500 text-slate-950 font-mono text-xs tracking-[0.2em] uppercase hover:bg-cyan-400 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Submit Answer
          </button>
        )}
      </div>
    </Panel>
  );
};

// ============================================================
// ROOT
// ============================================================
export default function App() {
  const [active, setActive] = useState(0);

  const modules = [
    { id: 0, name: 'Current vs Body', icon: Zap, component: Module1 },
    { id: 1, name: 'Applied Parts', icon: Heart, component: Module2 },
    { id: 2, name: 'Test Sequence', icon: Gauge, component: Module3 },
    { id: 3, name: 'Leakage Pathways', icon: Cable, component: Module4 },
    { id: 4, name: 'NHS Quiz', icon: BookOpen, component: Module5 },
  ];

  const ActiveComponent = modules[active].component;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100" style={{ fontFamily: "'IBM Plex Sans', -apple-system, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500&family=IBM+Plex+Sans:wght@200;300;400;500;600&display=swap');
        body { font-family: 'IBM Plex Sans', sans-serif; }
        .font-mono { font-family: 'IBM Plex Mono', monospace !important; }
      `}</style>

      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 border-2 border-cyan-400 flex items-center justify-center">
              <Zap className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="text-[10px] font-mono tracking-[0.3em] uppercase text-cyan-400">EST · Clinical Engineering</div>
              <div className="text-lg font-light tracking-tight">Electrical Safety Testing Atlas</div>
            </div>
          </div>
          <div className="text-right text-[10px] font-mono tracking-[0.2em] uppercase text-slate-500">
            <div>NHS Band 6 Competency</div>
            <div className="text-slate-600">IEC 60601-1 · HTM 06-01</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-6 flex border-t border-slate-800 overflow-x-auto">
          {modules.map(m => {
            const Icon = m.icon;
            const isActive = active === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setActive(m.id)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-mono tracking-[0.15em] uppercase whitespace-nowrap border-b-2 transition ${isActive ? 'border-cyan-400 text-cyan-300' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="text-[10px] text-slate-600">0{m.id + 1}</span>
                {m.name}
              </button>
            );
          })}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <ActiveComponent />
      </main>

      <footer className="border-t border-slate-800 mt-12 py-6 text-center text-[10px] font-mono tracking-[0.2em] uppercase text-slate-600">
        Powered by Claude Opus 4.5 · For NHS clinical engineering training only · Not a substitute for IEC 60601-1 / HTM 06-01
      </footer>
    </div>
  );
}
