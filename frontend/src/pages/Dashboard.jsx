import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getCourses, getTasks, getStats } from "../services/api";

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getStats().catch(() => ({ data: null })),
      getTasks().catch(() => ({ data: [] })),
      getCourses().catch(() => ({ data: [] })),
    ]).then(([s, t, c]) => {
      setStats(s.data);
      setTasks((t.data || []).filter((x) => x.status !== "completed").slice(0, 5));
      setCourses(c.data || []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div></div>;

  const cards = [
    { label: "Active Courses", value: stats ? stats.activeCourses : courses.filter((c) => c.status === "active").length, bg: "bg-indigo-50 text-indigo-600", link: "/courses" },
    { label: "Pending Tasks", value: stats ? stats.pendingTasks : tasks.length, bg: "bg-amber-50 text-amber-600", link: "/tasks" },
    { label: "Study Hours", value: stats ? (stats.weeklyMinutes / 60).toFixed(1) : "0", bg: "bg-emerald-50 text-emerald-600", link: "/analytics" },
    { label: "Sessions", value: stats ? stats.totalSessions : 0, bg: "bg-red-50 text-red-500", link: "/timer" },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-1">Welcome back, {user ? user.name.split(" ")[0] : ""}!</h1>
        <p className="text-indigo-200">Semester {user ? user.semester : 1} - University of Duisburg-Essen</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, bg, link }) => (
          <Link to={link} key={label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className={"w-10 h-10 rounded-lg flex items-center justify-center text-lg mb-3 " + bg}>
              {label === "Active Courses" ? "🎓" : label === "Pending Tasks" ? "📋" : label === "Study Hours" ? "\u23F0" : "🔥"}
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500">{label}</p>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Upcoming Tasks</h2>
            <Link to="/tasks" className="text-sm text-indigo-600 font-medium">View all</Link>
          </div>
          {tasks.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No pending tasks. <Link to="/tasks" className="text-indigo-600">Create one</Link></p>
          ) : (
            <div className="space-y-3">
              {tasks.map((t) => (
                <div key={t._id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.course ? t.course.color : "#6b7280" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.title}</p>
                    <p className="text-xs text-gray-400">{t.course ? t.course.name : "General"}</p>
                  </div>
                  <span className={"text-xs px-2 py-0.5 rounded-full " + (t.priority === "high" ? "bg-red-100 text-red-700" : t.priority === "medium" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700")}>{t.priority}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Your Courses</h2>
            <Link to="/courses" className="text-sm text-indigo-600 font-medium">Manage</Link>
          </div>
          {courses.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No courses yet. <Link to="/courses" className="text-indigo-600">Add one</Link></p>
          ) : (
            <div className="space-y-3">
              {courses.filter((c) => c.status === "active").slice(0, 6).map((c) => (
                <div key={c._id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <p className="text-xs text-gray-400">{c.code || ""} {c.professor ? "- " + c.professor : ""}</p>
                  </div>
                  <span className="text-xs text-gray-400">{c.credits} ECTS</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link to="/courses" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-indigo-50 hover:bg-indigo-100">
            <span className="text-2xl">🎓</span><span className="text-sm font-medium text-indigo-700">Add Course</span>
          </Link>
          <Link to="/tasks" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-amber-50 hover:bg-amber-100">
            <span className="text-2xl">📋</span><span className="text-sm font-medium text-amber-700">New Task</span>
          </Link>
          <Link to="/notes" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-emerald-50 hover:bg-emerald-100">
            <span className="text-2xl">📝</span><span className="text-sm font-medium text-emerald-700">Write Note</span>
          </Link>
          <Link to="/timer" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-red-50 hover:bg-red-100">
            <span className="text-2xl">⏱️</span><span className="text-sm font-medium text-red-600">Study Now</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
export default Dashboard;
