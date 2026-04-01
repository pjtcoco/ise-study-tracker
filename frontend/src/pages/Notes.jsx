import { useState, useEffect } from "react";
import { getNotes, createNote, updateNote, deleteNote, getCourses } from "../services/api";
import toast from "react-hot-toast";

const Notes = () => {
  const [notes, setNotes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState(false);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ title: "", content: "", course: "", tags: "" });

  useEffect(() => { load(); }, []);
  const load = async () => { try { const [n, c] = await Promise.all([getNotes(), getCourses()]); setNotes(n.data); setCourses(c.data); } catch {} finally { setLoading(false); } };

  const submit = async (e) => {
    e.preventDefault();
    try {
      const p = { ...form, tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [] };
      if (!p.course) delete p.course;
      if (editId) { await updateNote(editId, p); toast.success("Updated"); }
      else { await createNote(p); toast.success("Created"); }
      setEditor(false); setEditId(null); setForm({ title: "", content: "", course: "", tags: "" }); load();
    } catch { toast.error("Error"); }
  };

  const edit = (n) => { setForm({ title: n.title, content: n.content || "", course: n.course ? n.course._id : "", tags: n.tags ? n.tags.join(", ") : "" }); setEditId(n._id); setEditor(true); };
  const del = async (id) => { if (!confirm("Delete?")) return; try { await deleteNote(id); toast.success("Deleted"); load(); } catch {} };
  const set = (k, v) => setForm({ ...form, [k]: v });

  const filtered = notes.filter((n) => !search || n.title.toLowerCase().includes(search.toLowerCase()) || (n.content && n.content.toLowerCase().includes(search.toLowerCase())));

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div><h1 className="text-2xl font-bold">Notes</h1><p className="text-gray-500 text-sm">{filtered.length} notes</p></div>
        <button onClick={() => { setForm({ title: "", content: "", course: "", tags: "" }); setEditId(null); setEditor(true); }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700">+ New Note</button>
      </div>

      <input value={search} onChange={(e) => setSearch(e.target.value)}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Search notes..." />

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-16 text-center"><p className="text-5xl mb-4">\uD83D\uDCDD</p><h3 className="text-xl font-semibold">No notes yet</h3></div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((n) => (
            <div key={n._id} className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md cursor-pointer group" onClick={() => edit(n)}>
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold truncate">{n.title}</h3>
                <button onClick={(e) => { e.stopPropagation(); del(n._id); }} className="p-1 opacity-0 group-hover:opacity-100 text-red-400 text-sm">Del</button>
              </div>
              {n.course && <span className="text-xs px-2 py-0.5 rounded-full inline-block mb-2" style={{ backgroundColor: (n.course.color || "#6b7280") + "20", color: n.course.color || "#6b7280" }}>{n.course.name}</span>}
              <p className="text-sm text-gray-500 line-clamp-3 mb-3">{n.content || "No content"}</p>
              <div className="flex gap-1 flex-wrap">{(n.tags || []).slice(0, 3).map((t) => <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{t}</span>)}</div>
            </div>
          ))}
        </div>
      )}

      {editor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">{editId ? "Edit" : "New"} Note</h2>
              <button onClick={() => { setEditor(false); setEditId(null); }} className="text-2xl text-gray-400">\u00D7</button>
            </div>
            <form onSubmit={submit} className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input value={form.title} onChange={(e) => set("title", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" required /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                <select value={form.course} onChange={(e) => set("course", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">No course</option>{courses.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                <textarea value={form.content} onChange={(e) => set("content", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm" rows="10" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
                <input value={form.tags} onChange={(e) => set("tags", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700">{editId ? "Update" : "Create"}</button>
                <button type="button" onClick={() => { setEditor(false); setEditId(null); }} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default Notes;
