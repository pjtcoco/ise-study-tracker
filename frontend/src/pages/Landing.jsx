import { Link } from "react-router-dom";

const Landing = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
    <nav className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-3xl">\uD83D\uDCDA</span>
        <span className="text-xl font-bold text-white">ISE StudyTracker</span>
      </div>
      <div className="flex gap-3">
        <Link to="/login" className="px-5 py-2 text-sm font-medium text-slate-300 hover:text-white">Login</Link>
        <Link to="/register" className="px-5 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-500">Get Started</Link>
      </div>
    </nav>
    <div className="max-w-7xl mx-auto px-6 pt-20 pb-32 text-center">
      <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6">
        Master Your <span className="text-indigo-400">Masters</span> Studies
      </h1>
      <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10">
        The all-in-one study tracker for Intelligent Network Systems students at University of Duisburg-Essen.
      </p>
      <div className="flex gap-4 justify-center">
        <Link to="/register" className="px-8 py-3.5 bg-indigo-600 text-white rounded-xl font-semibold text-lg hover:bg-indigo-500">Start Free</Link>
        <Link to="/login" className="px-8 py-3.5 bg-white/10 text-white rounded-xl font-semibold text-lg hover:bg-white/20 border border-white/10">Sign In</Link>
      </div>
    </div>
  </div>
);
export default Landing;
