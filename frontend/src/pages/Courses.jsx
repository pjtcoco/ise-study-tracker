import { useState, useEffect } from "react";
import { getCourses, createCourse, updateCourse, deleteCourse } from "../services/api";
import toast from "react-hot-toast";

const COLORS = ["#6366f1","#8b5cf6","#ec4899","#ef4444","#f97316","#eab308","#22c55e","#14b8a6","#3b82f6","#6b7280"];
const empty = { name: "", code: "", professor: "", credits: 6, semester: 1, color: "#6366f1", status: "active" };

const Courses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(empty);

  useEffect(() => { load(); }, []);
  const load = async () => { try { setCourses((await getCourses()).data); } catch {} finally { setLoading(false); } };

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (editId) { await updateCourse(editId, form); toast.success("Updated"); }
      else { await createCourse(form); toast.success("Created"); }
      setModal(false); setEditId(null); setForm(empty); load();
    } catch (err) { toast.error("Error"); }
  };

  const edit = (c) => { setForm({ name: c.name, code: c.code || "", professor: c.professor || "", credits: c.credits || 6, semester: c.semester || 1, color: c.color || "#6366f1", status: c.status }); setEditId(c._id); setModal(true); };
  const del = async (id) => { if (!confirm("Delete?")) return; try { await deleteCourse(id); toast.success("Deleted"); load(); } catch {} };
  const set = (k, v) => setForm({ ...form, [k]: v });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Your Courses</h1><p className="text-gray-500 text-sm">Manage your ISE courses</p></div>
        <button onClick={() => { setForm(empty); setEditId(null); setModal(true); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700">+ Add Course</button>
      </div>

      {courses.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-16 text-center">
          <p className="text-5xl mb-4">📚</p><h3 className="text-xl font-semibold mb-2">No courses yet</h3>
          <button onClick={() => setModal(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">Add First Course</button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((c) => (
            <div key={c._id} className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: c.color }} />
                  <div><h3 className="font-semibold">{c.name}</h3><p className="text-sm text-gray-500">{c.code}</p></div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                  <button onClick={() => edit(c)} className="p-1.5 hover:bg-gray-100 rounded text-gray-400 text-sm">Edit</button>
                  <button onClick={() => del(c._id)} className="p-1.5 hover:bg-red-50 rounded text-red-400 text-sm">Del</button>
                </div>
              </div>
              {c.professor && <p className="text-sm text-gray-500 mb-1">Prof: {c.professor}</p>}
              <div className="flex items-center gap-3 text-xs text-gray-400 mt-3">
                <span>{c.credits} ECTS</span><span>Sem {c.semester}</span>
                <span className={"px-2 py-0.5 rounded-full " + (c.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600")}>{c.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">{editId ? "Edit" : "Add"} Course</h2>
              <button onClick={() => { setModal(false); setEditId(null); }} className="text-2xl text-gray-400">\u00D7</button>
            </div>
            <form onSubmit={submit} className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input value={form.name} onChange={(e) => set("name", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                  <input value={form.code} onChange={(e) => set("code", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Credits</label>
                  <input type="number" value={form.credits} onChange={(e) => set("credits", Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Professor</label>
                <input value={form.professor} onChange={(e) => set("professor", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                <div className="flex gap-2">{COLORS.map((co) => (
                  <button key={co} type="button" onClick={() => set("color", co)}
                    className={"w-8 h-8 rounded-full " + (form.color === co ? "ring-2 ring-offset-2 ring-gray-400 scale-125" : "hover:scale-110")}
                    style={{ backgroundColor: co }} />
                ))}</div></div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700">{editId ? "Update" : "Create"}</button>
                <button type="button" onClick={() => { setModal(false); setEditId(null); }} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default Courses;
