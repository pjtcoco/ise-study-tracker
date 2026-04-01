import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault(); setLoading(true);
    try { await login(email, password); navigate("/dashboard"); }
    catch (err) { toast.error(err.response ? err.response.data.message : "Login failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 to-indigo-900 items-center justify-center p-12">
        <div className="max-w-md text-white">
          <span className="text-6xl mb-6 block">\uD83D\uDCDA</span>
          <h2 className="text-4xl font-bold mb-4">Welcome back!</h2>
          <p className="text-indigo-200 text-lg">Continue tracking your ISE studies.</p>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Sign In</h1>
          <p className="text-gray-500 mb-8">Enter your credentials</p>
          <form onSubmit={submit} className="space-y-5">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" required /></div>
            <div className="text-right"><Link to="/forgot-password" className="text-sm text-indigo-600 hover:text-indigo-500">Forgot password?</Link></div>
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50">
              {loading ? "Signing in..." : "Sign In"}</button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-6">No account? <Link to="/register" className="text-indigo-600 font-medium">Create one</Link></p>
          <p className="text-center mt-3"><Link to="/" className="text-sm text-gray-400">Back to home</Link></p>
        </div>
      </div>
    </div>
  );
};
export default Login;
