import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const nav = [
  { path: "/dashboard", label: "Dashboard", icon: "🏠" },
  { path: "/courses", label: "Courses", icon: "🎓" },
  { path: "/schedule", label: "Schedule", icon: "📅" },
  { path: "/tasks", label: "Tasks", icon: "📋" },
  { path: "/notes", label: "Notes", icon: "📝" },
  { path: "/ai-tutor", label: "AI Tutor", icon: "🤖" },
  { path: "/timer", label: "Study Timer", icon: "⏱️" },
  { path: "/analytics", label: "Analytics", icon: "📊" },
  { path: "/profile", label: "Profile", icon: "👤" },
];

const Layout = ({ children }) => {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const loc = useLocation();
  const go = useNavigate();

  return (
    <div className="min-h-screen flex bg-gray-50">
      {open && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={"fixed lg:static inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white transform transition-transform duration-300 flex flex-col " + (open ? "translate-x-0" : "-translate-x-full lg:translate-x-0")}>
        <div className="p-6 border-b border-slate-700">
          <Link to="/dashboard" className="flex items-center gap-3">
            <span className="text-2xl">📚</span>
            <div><h1 className="font-bold text-lg leading-tight">ISE StudyTracker</h1><p className="text-xs text-slate-400">Uni Duisburg-Essen</p></div>
          </Link>
        </div>
        <div className="flex-1 py-4 overflow-y-auto">
          {nav.map(({ path, label, icon }) => (
            <Link key={path} to={path} onClick={() => setOpen(false)}
              className={"flex items-center gap-3 px-6 py-3 mx-2 rounded-lg text-sm font-medium transition-all " + (loc.pathname === path ? "bg-indigo-600 text-white shadow-lg" : "text-slate-300 hover:bg-slate-800 hover:text-white")}>
              <span className="text-lg">{icon}</span>{label}
            </Link>
          ))}
        </div>
        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-9 h-9 rounded-full bg-indigo-500 flex items-center justify-center text-sm font-bold">{user && user.name ? user.name.charAt(0).toUpperCase() : "U"}</div>
            <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{user ? user.name : ""}</p><p className="text-xs text-slate-400">Semester {user ? user.semester : 1}</p></div>
          </div>
          <button onClick={() => { logout(); go("/"); }} className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:text-red-400 hover:bg-slate-800 rounded-lg">Logout</button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        <header className="bg-white border-b border-gray-200 px-4 lg:px-8 py-4 flex items-center gap-4 sticky top-0 z-20">
          <button onClick={() => setOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-xl">\u2630</button>
          <h2 className="text-lg font-semibold text-gray-800 flex-1">{(nav.find((n) => n.path === loc.pathname) || {}).label || "ISE StudyTracker"}</h2>
        </header>
        <main className="flex-1 p-4 lg:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
};
export default Layout;
