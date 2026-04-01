import { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "../services/api";
import toast from "react-hot-toast";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [resetUrl, setResetUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const { data } = await forgotPassword({ email });
      setSent(true);
      if (data.resetUrl) setResetUrl(data.resetUrl);
      toast.success("Reset link generated!");
    } catch (err) { toast.error(err.response ? err.response.data.message : "Failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Forgot Password</h1>
        {sent ? (
          <div className="space-y-4">
            <p className="text-gray-500">Reset link has been generated.</p>
            {resetUrl && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <p className="text-sm text-indigo-700 mb-2">Development mode - click link below:</p>
                <a href={resetUrl} className="text-indigo-600 text-sm break-all underline">{resetUrl}</a>
              </div>
            )}
            <Link to="/login" className="block text-center text-indigo-600 font-medium">Back to login</Link>
          </div>
        ) : (
          <div>
            <p className="text-gray-500 mb-8">Enter your email and we will send a reset link.</p>
            <form onSubmit={submit} className="space-y-5">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" required /></div>
              <button type="submit" disabled={loading}
                className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50">
                {loading ? "Sending..." : "Send Reset Link"}</button>
            </form>
            <p className="text-center mt-6"><Link to="/login" className="text-sm text-gray-400">Back to login</Link></p>
          </div>
        )}
      </div>
    </div>
  );
};
export default ForgotPassword;
