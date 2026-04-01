import { useState, useEffect } from "react";
import { getStats } from "../services/api";

const Analytics = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { getStats().then((r) => setStats(r.data)).catch(() => {}).finally(() => setLoading(false)); }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div></div>;
  if (!stats) return <div className="bg-white rounded-xl shadow-sm border p-16 text-center"><p className="text-gray-500">No data yet. Start studying!</p></div>;

  const rate = stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Analytics</h1><p className="text-gray-500 text-sm">Your study progress</p></div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Hours", value: (stats.totalMinutes / 60).toFixed(1) + "h", bg: "bg-indigo-50 text-indigo-600" },
          { label: "This Week", value: (stats.weeklyMinutes / 60).toFixed(1) + "h", bg: "bg-blue-50 text-blue-600" },
          { label: "Tasks Done", value: stats.completedTasks + "/" + stats.totalTasks, bg: "bg-emerald-50 text-emerald-600" },
          { label: "Sessions", value: stats.totalSessions, bg: "bg-red-50 text-red-500" },
        ].map(({ label, value, bg }) => (
          <div key={label} className="bg-white rounded-xl shadow-sm border p-5">
            <div className={"w-10 h-10 rounded-lg flex items-center justify-center text-lg mb-3 " + bg}>
              {label === "Total Hours" ? "\u23F0" : label === "This Week" ? "\uD83D\uDCC5" : label === "Tasks Done" ? "\u2705" : "\uD83D\uDD25"}
            </div>
            <p className="text-2xl font-bold">{value}</p><p className="text-sm text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold mb-4">Task Completion</h2>
        <div className="flex items-center gap-6">
          <div className="flex-1"><div className="h-4 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full" style={{ width: rate + "%" }} />
          </div></div>
          <span className="text-lg font-bold text-indigo-600">{rate}%</span>
        </div>
        <p className="text-sm text-gray-500 mt-2">{stats.completedTasks} of {stats.totalTasks} completed</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-5 text-center">
          <p className="text-2xl font-bold text-indigo-600">{(stats.monthlyMinutes / 60).toFixed(1)}h</p><p className="text-sm text-gray-500">This Month</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5 text-center">
          <p className="text-2xl font-bold text-emerald-600">{stats.totalSessions}</p><p className="text-sm text-gray-500">Total Sessions</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5 text-center">
          <p className="text-2xl font-bold text-amber-600">{stats.activeCourses}</p><p className="text-sm text-gray-500">Active Courses</p>
        </div>
      </div>
    </div>
  );
};
export default Analytics;
