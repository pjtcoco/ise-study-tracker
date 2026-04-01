import { useState, useEffect } from "react";
import { getSchedule, getCourses, updateCourse } from "../services/api";
import toast from "react-hot-toast";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const HOURS = ["08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00"];
const TYPES = ["lecture", "tutorial", "lab", "seminar"];

const Schedule = () => {
  const [schedule, setSchedule] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ course: "", day: "Monday", startTime: "08:00", endTime: "10:00", room: "", type: "lecture" });

  useEffect(() => { load(); }, []);
  const load = async () => {
    try {
      const [s, c] = await Promise.all([getSchedule(), getCourses()]);
      setSchedule(s.data); setCourses(c.data);
    } catch {} finally { setLoading(false); }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.course) return toast.error("Select a course");
    try {
      const course = courses.find((c) => c._id === form.course);
      const existingSchedule = course.schedule || [];
      existingSchedule.push({ day: form.day, startTime: form.startTime, endTime: form.endTime, room: form.room, type: form.type });
      await updateCourse(form.course, { schedule: existingSchedule });
      toast.success("Schedule added");
      setModal(false); setForm({ course: "", day: "Monday", startTime: "08:00", endTime: "10:00", room: "", type: "lecture" }); load();
    } catch { toast.error("Error"); }
  };

  const getSlot = (day, hour) => {
    return schedule.filter((s) => s.day === day && s.startTime === hour);
  };

  const set = (k, v) => setForm({ ...form, [k]: v });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Weekly Schedule</h1><p className="text-gray-500 text-sm">Your timetable</p></div>
        <button onClick={() => setModal(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700">+ Add Slot</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="border-b"><th className="p-3 text-left text-sm font-medium text-gray-500 w-20">Time</th>
              {DAYS.map((d) => <th key={d} className="p-3 text-left text-sm font-medium text-gray-500">{d}</th>)}
            </tr>
          </thead>
          <tbody>
            {HOURS.map((hour) => (
              <tr key={hour} className="border-b hover:bg-gray-50">
                <td className="p-3 text-sm text-gray-500 font-mono">{hour}</td>
                {DAYS.map((day) => {
                  const slots = getSlot(day, hour);
                  return (
                    <td key={day} className="p-2">
                      {slots.map((slot, i) => (
                        <div key={i} className="rounded-lg p-2 text-xs mb-1" style={{ backgroundColor: (slot.color || "#6366f1") + "20", borderLeft: "3px solid " + (slot.color || "#6366f1") }}>
                          <p className="font-semibold" style={{ color: slot.color || "#6366f1" }}>{slot.courseName}</p>
                          <p className="text-gray-500">{slot.startTime}-{slot.endTime}</p>
                          {slot.room && <p className="text-gray-400">{slot.room}</p>}
                          <span className="text-gray-400">{slot.type}</span>
                        </div>
                      ))}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold mb-4">Legend</h2>
        <div className="flex flex-wrap gap-3">
          {courses.filter((c) => c.status === "active").map((c) => (
            <div key={c._id} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
              <span className="text-sm text-gray-600">{c.name}</span>
            </div>
          ))}
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">Add Schedule Slot</h2>
              <button onClick={() => setModal(false)} className="text-2xl text-gray-400">\u00D7</button>
            </div>
            <form onSubmit={submit} className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Course *</label>
                <select value={form.course} onChange={(e) => set("course", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Select course</option>
                  {courses.filter((c) => c.status === "active").map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Day</label>
                  <select value={form.day} onChange={(e) => set("day", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select value={form.type} onChange={(e) => set("type", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Start</label>
                  <select value={form.startTime} onChange={(e) => set("startTime", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">End</label>
                  <select value={form.endTime} onChange={(e) => set("endTime", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
                <input value={form.room} onChange={(e) => set("room", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. BA 001" /></div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700">Add</button>
                <button type="button" onClick={() => setModal(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default Schedule;
