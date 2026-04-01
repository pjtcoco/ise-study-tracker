import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";

const Register = () => {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "", semester: 1 });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) return toast.error("Passwords don't match");
    setLoading(true);
    try { await register({ name: form.name, email: form.email, password: form.password, semester: form.semester }); navigate("/dashboard"); }
    catch (err) { toast.error(err.response ? err.response.data.message : "Failed"); }
    finally { setLoading(false); }
  };

  const set = (k, v) => setForm({ ...form, [k]: v });

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 to-purple-900 items-center justify-center p-12">
        <div className="max-w-md text-white">
          <span className="text-6xl mb-6 block">\uD83D\uDE80</span>
          <h2 className="text-4xl font-bold mb-4">Start Your Journey</h2>
          <p className="text-indigo-200 text-lg">Join ISE StudyTracker today.</p>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h1>
          <p className="text-gray-500 mb-8">Set up your study tracker</p>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input value={form.name} onChange={(e) => set("name", e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input type="password" value={form.password} onChange={(e) => set("password", e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm</label>
                <input type="password" value={form.confirmPassword} onChange={(e) => set("confirmPassword", e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
              <select value={form.semester} onChange={(e) => set("semester", Number(e.target.value))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {[1,2,3,4,5,6].map((s) => <option key={s} value={s}>Semester {s}</option>)}
              </select>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50">
              {loading ? "Creating..." : "Create Account"}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-6">
            Have an account? <Link to="/login" className="text-indigo-600 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};
export default Register;
