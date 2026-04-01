import { useState, useEffect, useRef } from "react";
import { getCourses, createSession, getSessions } from "../services/api";
import toast from "react-hot-toast";

const PRESETS = [{ label: "Pomodoro", work: 25, rest: 5 }, { label: "Long", work: 50, rest: 10 }, { label: "Short", work: 15, rest: 3 }];

const Timer = () => {
  const [courses, setCourses] = useState([]);
  const [course, setCourse] = useState("");
  const [preset, setPreset] = useState(0);
  const [left, setLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [brk, setBrk] = useState(false);
  const [count, setCount] = useState(0);
  const [total, setTotal] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    getCourses().then((r) => setCourses(r.data)).catch(() => {});
    getSessions().then((r) => {
      const today = new Date().toDateString();
      const ts = r.data.filter((s) => new Date(s.date).toDateString() === today);
      setCount(ts.length);
      setTotal(ts.reduce((sum, s) => sum + s.duration, 0));
    }).catch(() => {});
    return () => clearInterval(ref.current);
  }, []);

  useEffect(() => {
    if (running && left > 0) { ref.current = setInterval(() => setLeft((p) => p - 1), 1000); }
    else if (left === 0) { clearInterval(ref.current); done(); }
    else { clearInterval(ref.current); }
    return () => clearInterval(ref.current);
  }, [running, left]);

  const done = async () => {
    setRunning(false);
    if (!brk) {
      try {
        const d = PRESETS[preset].work;
        const p = { duration: d, type: "pomodoro" };
        if (course) p.course = course;
        await createSession(p);
        setCount((x) => x + 1); setTotal((x) => x + d);
        toast.success(d + " min logged!");
      } catch {}
      setBrk(true); setLeft(PRESETS[preset].rest * 60);
    } else {
      setBrk(false); setLeft(PRESETS[preset].work * 60);
    }
  };

  const reset = () => { setRunning(false); setBrk(false); setLeft(PRESETS[preset].work * 60); };
  const pick = (i) => { setPreset(i); setRunning(false); setBrk(false); setLeft(PRESETS[i].work * 60); };

  const m = Math.floor(left / 60);
  const s = left % 60;
  const tot = brk ? PRESETS[preset].rest * 60 : PRESETS[preset].work * 60;
  const pct = ((tot - left) / tot) * 100;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center"><h1 className="text-2xl font-bold">Study Timer</h1><p className="text-gray-500">Pomodoro technique</p></div>

      <div className="flex justify-center gap-2">
        {PRESETS.map((p, i) => (
          <button key={p.label} onClick={() => pick(i)} className={"px-4 py-2 rounded-lg text-sm font-medium " + (preset === i ? "bg-indigo-600 text-white" : "bg-white text-gray-600 border hover:bg-gray-100")}>{p.label} ({p.work}/{p.rest})</button>
        ))}
      </div>

      <div className={"bg-white rounded-xl shadow-sm border p-12 text-center " + (brk ? "bg-emerald-50 border-emerald-200" : "")}>
        <p className={"text-sm font-medium mb-6 " + (brk ? "text-emerald-600" : "text-indigo-600")}>{brk ? "\u2615 Break" : "\uD83D\uDCDA Study"}</p>

        <div className="relative inline-flex items-center justify-center mb-8">
          <svg className="w-52 h-52 -rotate-90" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="90" fill="none" stroke="#e5e7eb" strokeWidth="8" />
            <circle cx="100" cy="100" r="90" fill="none" stroke={brk ? "#10b981" : "#6366f1"} strokeWidth="8" strokeLinecap="round"
              strokeDasharray={String(2 * Math.PI * 90)} strokeDashoffset={String(2 * Math.PI * 90 * (1 - pct / 100))} style={{ transition: "stroke-dashoffset 1s" }} />
          </svg>
          <span className="absolute text-5xl font-bold" style={{ fontVariantNumeric: "tabular-nums" }}>
            {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
          </span>
        </div>

        <div className="flex justify-center gap-4">
          <button onClick={() => setRunning(!running)}
            className={"w-14 h-14 rounded-full flex items-center justify-center text-white text-2xl " + (running ? "bg-amber-500" : brk ? "bg-emerald-500" : "bg-indigo-600")}>
            {running ? "\u23F8" : "\u25B6"}
          </button>
          <button onClick={reset} className="w-14 h-14 rounded-full flex items-center justify-center bg-gray-200 text-gray-600 text-2xl">\u21BB</button>
        </div>

        <div className="mt-8 max-w-xs mx-auto">
          <select value={course} onChange={(e) => setCourse(e.target.value)} disabled={running}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">No course</option>
            {courses.filter((c) => c.status === "active").map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-5 text-center">
          <p className="text-3xl font-bold text-indigo-600">{count}</p><p className="text-sm text-gray-500">Sessions Today</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5 text-center">
          <p className="text-3xl font-bold text-emerald-600">{(total / 60).toFixed(1)}h</p><p className="text-sm text-gray-500">Study Today</p>
        </div>
      </div>
    </div>
  );
};
export default Timer;
