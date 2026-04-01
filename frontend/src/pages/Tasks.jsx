import { useState, useEffect } from "react";
import { getTasks, createTask, updateTask, deleteTask, getCourses } from "../services/api";
import toast from "react-hot-toast";

const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", course: "", type: "assignment", dueDate: "", priority: "medium" });

  useEffect(() => { load(); }, []);
  const load = async () => { try { const [t, c] = await Promise.all([getTasks(), getCourses()]); setTasks(t.data); setCourses(c.data); } catch {} finally { setLoading(false); } };

  const submit = async (e) => {
    e.preventDefault();
    try {
      const p = { ...form };
      if (!p.course) delete p.course;
      if (!p.dueDate) delete p.dueDate;
      await createTask(p); toast.success("Created");
      setModal(false); setForm({ title: "", description: "", course: "", type: "assignment", dueDate: "", priority: "medium" }); load();
    } catch (err) { toast.error("Error"); }
  };

  const toggle = async (t) => {
    try { await updateTask(t._id, { status: t.status === "completed" ? "pending" : "completed" }); toast.success("Updated"); load(); }
    catch { toast.error("Failed"); }
  };

  const del = async (id) => { if (!confirm("Delete?")) return; try { await deleteTask(id); toast.success("Deleted"); load(); } catch {} };
  const set = (k, v) => setForm({ ...form, [k]: v });

  const filtered = tasks.filter((t) => filter === "all" ? true : filter === "completed" ? t.status === "completed" : t.status !== "completed");

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div><h1 className="text-2xl font-bold">Tasks</h1><p className="text-gray-500 text-sm">{filtered.length} tasks</p></div>
        <button onClick={() => setModal(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700">+ Add Task</button>
      </div>

      <div className="flex gap-2">
        {["all", "pending", "completed"].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={"px-4 py-2 rounded-lg text-sm font-medium " + (filter === f ? "bg-indigo-600 text-white" : "bg-white text-gray-600 border hover:bg-gray-100")}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-16 text-center"><p className="text-5xl mb-4">\u2705</p><h3 className="text-xl font-semibold">No tasks</h3></div>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => (
            <div key={t._id} className={"bg-white rounded-xl shadow-sm border p-4 flex items-center gap-4 group " + (t.status === "completed" ? "opacity-60" : "")}>
              <button onClick={() => toggle(t)}
                className={"w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 text-sm " + (t.status === "completed" ? "bg-green-500 border-green-500 text-white" : "border-gray-300 hover:border-indigo-500")}>
                {t.status === "completed" ? "\u2713" : ""}
              </button>
              <div className="flex-1 min-w-0">
                <p className={"font-medium " + (t.status === "completed" ? "line-through text-gray-400" : "")}>{t.title}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {t.course && <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: (t.course.color || "#6b7280") + "20", color: t.course.color || "#6b7280" }}>{t.course.name}</span>}
                  <span className={"text-xs px-2 py-0.5 rounded-full " + (t.priority === "high" ? "bg-red-100 text-red-700" : t.priority === "medium" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700")}>{t.priority}</span>
                  {t.dueDate && <span className="text-xs text-gray-400">{new Date(t.dueDate).toLocaleDateString()}</span>}
                </div>
              </div>
              <button onClick={() => del(t._id)} className="p-2 opacity-0 group-hover:opacity-100 text-red-400 text-sm">Del</button>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">New Task</h2>
              <button onClick={() => setModal(false)} className="text-2xl text-gray-400">\u00D7</button>
            </div>
            <form onSubmit={submit} className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input value={form.title} onChange={(e) => set("title", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                  <select value={form.course} onChange={(e) => set("course", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">General</option>{courses.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select value={form.priority} onChange={(e) => set("priority", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                  </select></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700">Create</button>
                <button type="button" onClick={() => setModal(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default Tasks;
