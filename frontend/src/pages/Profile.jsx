import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { updateProfile } from "../services/api";
import toast from "react-hot-toast";

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    name: user ? user.name : "",
    semester: user ? user.semester : 1,
    weeklyGoalHours: user ? user.weeklyGoalHours : 40,
    program: user ? user.program : "Intelligent Network Systems (ISE)",
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try { const { data } = await updateProfile(form); updateUser(data); toast.success("Saved"); }
    catch { toast.error("Failed"); }
    finally { setSaving(false); }
  };

  const set = (k, v) => setForm({ ...form, [k]: v });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div><h1 className="text-2xl font-bold">Profile</h1><p className="text-gray-500 text-sm">Account settings</p></div>

      <div className="bg-white rounded-xl shadow-sm border p-6 flex items-center gap-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
          {user && user.name ? user.name.charAt(0).toUpperCase() : "U"}
        </div>
        <div>
          <h2 className="text-xl font-semibold">{user ? user.name : ""}</h2>
          <p className="text-gray-500">{user ? user.email : ""}</p>
          <p className="text-sm text-indigo-600">University of Duisburg-Essen</p>
        </div>
      </div>

      <form onSubmit={submit} className="bg-white rounded-xl shadow-sm border p-6 space-y-5">
        <h3 className="text-lg font-semibold border-b pb-3">Edit Profile</h3>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input value={form.name} onChange={(e) => set("name", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" required /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Program</label>
          <input value={form.program} onChange={(e) => set("program", e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
            <select value={form.semester} onChange={(e) => set("semester", Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {[1,2,3,4,5,6].map((s) => <option key={s} value={s}>Semester {s}</option>)}
            </select></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Weekly Goal (hrs)</label>
            <input type="number" value={form.weeklyGoalHours} onChange={(e) => set("weeklyGoalHours", Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" min="1" max="168" /></div>
        </div>
        <button type="submit" disabled={saving}
          className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50">
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
};
export default Profile;
