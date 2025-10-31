import React, { useContext, useEffect, useState } from "react";
import API from "../api";
import { AuthContext } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";

interface Project {
  id: number;
  title: string;
  description?: string;
  createdAt: string;
}

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const navigate = useNavigate();
  const { logout } = useContext(AuthContext);

  const fetchProjects = async () => {
    try {
      const res = await API.get("/projects");
      setProjects(res.data);
    } catch (err: any) {
      console.error("Failed to load projects", err?.response ?? err);
    }
  };

  const addProject = async () => {
    if (!title.trim()) return alert("Project title is required!");
    if (title.trim().length < 3) return alert("Project title must be at least 3 characters.");

    try {
      const res = await API.post("/projects", { title: title.trim(), description });
      setTitle("");
      setDescription("");
      fetchProjects();
    } catch (err: any) {
      console.error("Error creating project", err?.response ?? err);
      const data = err?.response?.data;
      const msg =
        data?.error ??
        (data?.errors ? Object.values(data.errors).flat().join("; ") : JSON.stringify(data));
      alert(`Error creating project: ${msg}`);
    }
  };

  const viewProject = (id: number) => navigate(`/projects/${id}`);

  useEffect(() => {
    fetchProjects();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-800">Projects</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                logout();
                navigate("/");
              }}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="flex gap-3">
            <input
              className="flex-1 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="Project title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <input
              className="w-60 border rounded px-3 py-2 focus:outline-none"
              placeholder="Short description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <button
              onClick={addProject}
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
            >
              Add Project
            </button>
          </div>
        </div>

        <div className="grid gap-4">
          {projects.length ? (
            projects.map((p) => (
              <div key={p.id} className="bg-white p-4 rounded-lg shadow flex justify-between items-center">
                <div>
                  <div className="font-medium text-gray-800">{p.title}</div>
                  <div className="text-sm text-gray-500">{p.description}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => viewProject(p.id)}
                    className="text-sm bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700"
                  >
                    View
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-gray-500">No projects yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
