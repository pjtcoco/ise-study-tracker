import { useState, useEffect } from "react";
import { getLectures, uploadLecture, askLecture, deleteLecture, getCourses } from "../services/api";
import toast from "react-hot-toast";

const AiTutor = () => {
  const [lectures, setLectures] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadModal, setUploadModal] = useState(false);
  const [activeLecture, setActiveLecture] = useState(null);
  const [question, setQuestion] = useState("");
  const [chat, setChat] = useState([]);
  const [asking, setAsking] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", course: "" });

  useEffect(() => { load(); }, []);
  const load = async () => {
    try {
      const [l, c] = await Promise.all([getLectures(), getCourses()]);
      setLectures(l.data); setCourses(c.data);
    } catch {} finally { setLoading(false); }
  };

  const submitUpload = async (e) => {
    e.preventDefault();
    if (!form.content.trim()) return toast.error("Paste lecture content");
    try {
      const payload = { ...form };
      if (!payload.course) delete payload.course;
      await uploadLecture(payload);
      toast.success("Lecture uploaded and analyzed!");
      setUploadModal(false); setForm({ title: "", content: "", course: "" }); load();
    } catch { toast.error("Failed to upload"); }
  };

  const openLecture = (lec) => {
    setActiveLecture(lec);
    setChat(lec.explanations || []);
  };

  const ask = async (e) => {
    e.preventDefault();
    if (!question.trim() || !activeLecture) return;
    setAsking(true);
    try {
      const { data } = await askLecture(activeLecture._id, { question });
      setChat((prev) => [...prev, data]);
      setQuestion("");
    } catch { toast.error("Failed to get answer"); }
    finally { setAsking(false); }
  };

  const del = async (id) => {
    if (!confirm("Delete this lecture?")) return;
    try { await deleteLecture(id); toast.success("Deleted"); if (activeLecture && activeLecture._id === id) setActiveLecture(null); load(); }
    catch { toast.error("Failed"); }
  };

  const set = (k, v) => setForm({ ...form, [k]: v });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">AI Tutor</h1><p className="text-gray-500 text-sm">Upload lectures and get explanations</p></div>
        <button onClick={() => setUploadModal(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700">+ Upload Lecture</button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-3">
          <h3 className="font-semibold text-gray-700">Your Lectures</h3>
          {lectures.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border p-6 text-center">
              <p className="text-3xl mb-2">🤖</p>
              <p className="text-gray-500 text-sm">Upload a lecture to get started</p>
            </div>
          ) : (
            lectures.map((lec) => (
              <div key={lec._id} className={"bg-white rounded-xl shadow-sm border p-4 cursor-pointer hover:shadow-md transition-shadow group " + (activeLecture && activeLecture._id === lec._id ? "ring-2 ring-indigo-500" : "")}
                onClick={() => openLecture(lec)}>
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-sm">{lec.title}</h4>
                    {lec.course && <span className="text-xs px-2 py-0.5 rounded-full mt-1 inline-block" style={{ backgroundColor: (lec.course.color || "#6b7280") + "20", color: lec.course.color }}>{lec.course.name}</span>}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); del(lec._id); }} className="text-red-400 text-xs opacity-0 group-hover:opacity-100">Del</button>
                </div>
                {lec.keyPoints && lec.keyPoints.length > 0 && (
                  <div className="mt-2"><p className="text-xs text-gray-400">{lec.keyPoints.length} key points</p></div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="lg:col-span-2">
          {activeLecture ? (
            <div className="space-y-4">
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h2 className="text-xl font-bold mb-2">{activeLecture.title}</h2>
                {activeLecture.summary && (
                  <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 mb-4">
                    <h3 className="font-semibold text-indigo-900 text-sm mb-1">Summary</h3>
                    <p className="text-sm text-indigo-700">{activeLecture.summary}</p>
                  </div>
                )}
                {activeLecture.keyPoints && activeLecture.keyPoints.length > 0 && (
                  <div className="mb-4">
                    <h3 className="font-semibold text-sm mb-2">Key Points</h3>
                    <ul className="space-y-1">
                      {activeLecture.keyPoints.map((kp, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                          <span className="text-indigo-500 mt-0.5">\u2022</span>{kp}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="font-semibold mb-4">Ask me anything about this lecture</h3>
                <div className="space-y-4 max-h-96 overflow-y-auto mb-4">
                  {chat.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Ask a question to start learning!</p>}
                  {chat.map((msg, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-end"><div className="bg-indigo-600 text-white rounded-2xl rounded-br-md px-4 py-2 max-w-[80%] text-sm">{msg.question}</div></div>
                      <div className="flex justify-start"><div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-2 max-w-[80%] text-sm whitespace-pre-wrap">{msg.answer}</div></div>
                    </div>
                  ))}
                </div>
                <form onSubmit={ask} className="flex gap-2">
                  <input value={question} onChange={(e) => setQuestion(e.target.value)}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. Explain what TCP handshake means..." disabled={asking} />
                  <button type="submit" disabled={asking}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50">
                    {asking ? "..." : "Ask"}</button>
                </form>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border p-16 text-center">
              <p className="text-5xl mb-4">🤖</p>
              <h3 className="text-xl font-semibold mb-2">Select a lecture</h3>
              <p className="text-gray-500">Choose a lecture from the left or upload a new one to start asking questions.</p>
            </div>
          )}
        </div>
      </div>

      {uploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">Upload Lecture</h2>
              <button onClick={() => setUploadModal(false)} className="text-2xl text-gray-400">\u00D7</button>
            </div>
            <form onSubmit={submitUpload} className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input value={form.title} onChange={(e) => set("title", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. Lecture 3: TCP/IP Protocol" required /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                <select value={form.course} onChange={(e) => set("course", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">No course</option>
                  {courses.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Lecture Content *</label>
                <textarea value={form.content} onChange={(e) => set("content", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                  rows="12" placeholder="Paste your lecture notes, slides text, or transcript here..." required />
                <p className="text-xs text-gray-400 mt-1">Paste lecture notes, slides content, or transcripts. The AI will analyze and help you understand.</p></div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700">Upload & Analyze</button>
                <button type="button" onClick={() => setUploadModal(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default AiTutor;
