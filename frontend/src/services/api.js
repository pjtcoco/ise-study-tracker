import axios from "axios";

const API = axios.create({ baseURL: "/api" });

API.interceptors.request.use((config) => {
  const user = JSON.parse(localStorage.getItem("user"));
  if (user && user.token) config.headers.Authorization = "Bearer " + user.token;
  return config;
});

API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && err.response.status === 401) {
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export const loginUser = (data) => API.post("/auth/login", data);
export const registerUser = (data) => API.post("/auth/register", data);
export const updateProfile = (data) => API.put("/auth/profile", data);
export const getCourses = () => API.get("/courses");
export const createCourse = (data) => API.post("/courses", data);
export const updateCourse = (id, data) => API.put("/courses/" + id, data);
export const deleteCourse = (id) => API.delete("/courses/" + id);
export const getTasks = () => API.get("/tasks");
export const createTask = (data) => API.post("/tasks", data);
export const updateTask = (id, data) => API.put("/tasks/" + id, data);
export const deleteTask = (id) => API.delete("/tasks/" + id);
export const getNotes = () => API.get("/notes");
export const createNote = (data) => API.post("/notes", data);
export const updateNote = (id, data) => API.put("/notes/" + id, data);
export const deleteNote = (id) => API.delete("/notes/" + id);
export const getSessions = () => API.get("/sessions");
export const createSession = (data) => API.post("/sessions", data);
export const getStats = () => API.get("/sessions/stats");
export default API;
