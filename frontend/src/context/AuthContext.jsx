import { createContext, useContext, useState, useEffect } from "react";
import { loginUser, registerUser } from "../services/api";
import toast from "react-hot-toast";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const { data } = await loginUser({ email, password });
    localStorage.setItem("user", JSON.stringify(data));
    setUser(data);
    toast.success("Welcome back, " + data.name + "!");
  };

  const register = async (formData) => {
    const { data } = await registerUser(formData);
    localStorage.setItem("user", JSON.stringify(data));
    setUser(data);
    toast.success("Welcome to ISE StudyTracker!");
  };

  const logout = () => {
    localStorage.removeItem("user");
    setUser(null);
    toast.success("Logged out");
  };

  const updateUser = (d) => {
    const updated = { ...user, ...d };
    localStorage.setItem("user", JSON.stringify(updated));
    setUser(updated);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};
