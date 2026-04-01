import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Courses from "./pages/Courses";
import Tasks from "./pages/Tasks";
import Notes from "./pages/Notes";
import Timer from "./pages/Timer";
import Analytics from "./pages/Analytics";
import Schedule from "./pages/Schedule";
import AiTutor from "./pages/AiTutor";
import Profile from "./pages/Profile";

function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Landing />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
      <Route path="/courses" element={<ProtectedRoute><Layout><Courses /></Layout></ProtectedRoute>} />
      <Route path="/tasks" element={<ProtectedRoute><Layout><Tasks /></Layout></ProtectedRoute>} />
      <Route path="/notes" element={<ProtectedRoute><Layout><Notes /></Layout></ProtectedRoute>} />
      <Route path="/timer" element={<ProtectedRoute><Layout><Timer /></Layout></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><Layout><Analytics /></Layout></ProtectedRoute>} />
      <Route path="/schedule" element={<ProtectedRoute><Layout><Schedule /></Layout></ProtectedRoute>} />
      <Route path="/ai-tutor" element={<ProtectedRoute><Layout><AiTutor /></Layout></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
export default App;
