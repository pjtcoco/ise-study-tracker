import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { resetPassword } from "../services/api";
import toast from "react-hot-toast";

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (password !== confirm) return toast.error("Passwords don't match");
    if (password.length < 6) return toast.error("Min 6 characters");
    setLoading(true);
    try {
      await resetPassword({ token, password });
      toast.success("Password reset! Please login.");
      navigate("/login");
    } catch (err) { toast.error(err.response ? err.response.data.message : "Failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Reset Password</h1>
        <p className="text-gray-500 mb-8">Enter your new password</p>
        <form onSubmit={submit} className="space-y-5">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" required /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" required /></div>
          <button type="submit" disabled={loading}
            className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50">
            {loading ? "Resetting..." : "Reset Password"}</button>
        </form>
        <p className="text-center mt-6"><Link to="/login" className="text-sm text-gray-400">Back to login</Link></p>
      </div>
    </div>
  );
};
export default ResetPassword;
