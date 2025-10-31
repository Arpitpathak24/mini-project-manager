import React, { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../api";
import { AuthContext } from "../auth/AuthContext";

export default function ProjectDetails() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { token } = useContext(AuthContext);

  // form state
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueDate, setTaskDueDate] = useState<string>("");

  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleMessage, setScheduleMessage] = useState<string | null>(null);
  const [recommendedOrder, setRecommendedOrder] = useState<string[] | null>(null);
  const [taskDeps, setTaskDeps] = useState<Record<number, number[]>>({}); // taskId -> array of dependent taskIds

  useEffect(() => {
    if (!id) {
      setError("Missing project id");
      setLoading(false);
      return;
    }

    const fetchProject = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await API.get(`/projects/${id}`);
        setProject(res.data);
      } catch (err: any) {
        console.error("Failed to load project", err?.response ?? err);
        const status = err?.response?.status;
        if (status === 401) {
          navigate("/");
          return;
        }
        if (status === 404) {
          setError("Project not found");
        } else {
          setError(err?.response?.data?.error ?? "Failed to load project");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [id, token, navigate]);

  useEffect(() => {
    // after fetching project, initialize taskDeps map
    const initDeps = (tasks: any[]) => {
      const map: Record<number, number[]> = {};
      tasks.forEach((t) => (map[t.id] = []));
      setTaskDeps(map);
    };

    if (project?.tasks) {
      initDeps(project.tasks);
    }
  }, [project]);

  const refresh = async () => {
    const pr = await API.get(`/projects/${id}`);
    setProject(pr.data);
  };

  const addTask = async () => {
    const title = taskTitle.trim();
    if (!title) {
      alert("Task title is required");
      return;
    }
    if (title.length < 3) {
      alert("Task title must be at least 3 characters long");
      return;
    }

    // send minimal payload expected by the project-scoped endpoint
    const payload = {
      title,
      dueDate: taskDueDate ? taskDueDate : null,
    };

    try {
      await API.post(`/projects/${id}/tasks`, payload);
      setTaskTitle("");
      setTaskDueDate("");
      await refresh();
    } catch (err: any) {
      console.error("Error adding task", err?.response ?? err);
      const resp = err?.response;
      const msg =
        resp?.data?.error ??
        (resp?.data ? JSON.stringify(resp.data) : resp?.statusText) ??
        err?.message;
      alert(msg);
    }
  };

  const toggleComplete = async (task: any) => {
    try {
      // send minimal payload or full task depending on backend
      await API.put(`/tasks/${task.id}`, { ...task, isCompleted: !task.isCompleted });
      await refresh();
    } catch (err: any) {
      console.error("Toggle complete failed", err?.response ?? err);
      alert(err?.response?.data?.error ?? "Failed to update task");
    }
  };

  const deleteTask = async (taskId: number) => {
    if (!confirm("Delete this task?")) return;
    try {
      await API.delete(`/tasks/${taskId}`);
      await refresh();
    } catch (err: any) {
      console.error("Delete task failed", err?.response ?? err);
      alert(err?.response?.data?.error ?? "Failed to delete task");
    }
  };

  // call v1 scheduler which returns recommendedOrder and persists SortOrder on the server
  const generateSmartSchedule = async () => {
    setScheduleMessage(null);
    setRecommendedOrder(null);
    setIsScheduling(true);
    try {
      const res = await API.post(`/v1/projects/${id}/schedule`);
      const order: string[] | undefined = res.data?.recommendedOrder;
      if (order && Array.isArray(order)) {
        setRecommendedOrder(order);
        setScheduleMessage("Recommended order applied and saved.");
      } else {
        setScheduleMessage("Scheduler ran but returned no recommended order.");
      }
      // refresh project to show new persisted order
      await refresh();
    } catch (err: any) {
      console.error("Smart schedule failed", err?.response ?? err);
      const resp = err?.response;
      const status = resp?.status;
      const body = resp?.data;
      const text =
        body?.error ??
        (body?.errors ? Object.values(body.errors).flat().join("; ") : JSON.stringify(body)) ??
        err?.message;
      setScheduleMessage(`Failed to generate schedule (${status ?? "unknown"}): ${text}`);
    } finally {
      setIsScheduling(false);
    }
  };

  // helper to toggle dependency selection
  const toggleDep = (taskId: number, depId: number) => {
    setTaskDeps((prev) => {
      const arr = new Set(prev[taskId] ?? []);
      if (arr.has(depId)) arr.delete(depId);
      else arr.add(depId);
      return { ...prev, [taskId]: Array.from(arr) };
    });
  };

  // Build payload from current project tasks + user-selected dependencies
  const scheduleWithDependencies = async () => {
    if (!project?.tasks?.length) return alert("No tasks to schedule");
    const tasksPayload = project.tasks.map((t: any) => ({
      title: t.title,
      estimatedHours: t.estimatedHours ?? 0,
      dueDate: t.dueDate ?? null,
      // map selected dependency ids to titles
      dependencies: (taskDeps[t.id] ?? []).map((depId) => {
        const dep = project.tasks.find((x: any) => x.id === depId);
        return dep ? dep.title : "";
      }).filter(Boolean),
    }));

    try {
      setScheduleMessage(null);
      setIsScheduling(true);
      const res = await API.post(`/v1/projects/${id}/schedule`, { tasks: tasksPayload });
      const order: string[] | undefined = res.data?.recommendedOrder;
      if (order && Array.isArray(order)) {
        setRecommendedOrder(order);
        setScheduleMessage("Recommended order applied and saved.");
      } else {
        setScheduleMessage("Scheduler ran but returned no recommended order.");
      }
      await refresh();
    } catch (err: any) {
      console.error("Scheduler with deps failed", err?.response ?? err);
      const resp = err?.response;
      const text = resp?.data?.error ?? JSON.stringify(resp?.data) ?? err?.message;
      setScheduleMessage(`Failed: ${text}`);
    } finally {
      setIsScheduling(false);
    }
  };

  if (loading) return <div className="p-6">Loading project...</div>;
  if (error) return <div className="p-6 text-red-600">Error loading project: {error}</div>;
  if (!project) return <div className="p-6">No project data</div>;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">{project.title}</h1>
            <p className="text-sm text-gray-500 mt-1">{project.description}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Back
            </button>
          </div>
        </div>

        {scheduleMessage ? (
          <div className="mt-4">
            <div
              className={`p-3 rounded text-sm ${
                scheduleMessage.startsWith("Failed") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
              }`}
            >
              {scheduleMessage}
            </div>
          </div>
        ) : null}

        {recommendedOrder?.length ? (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Recommended Order</h3>
            <ol className="list-decimal list-inside bg-gray-50 p-3 rounded space-y-1">
              {recommendedOrder.map((t, idx) => (
                <li key={idx} className="text-sm text-gray-800">
                  {t}
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        <div className="mt-6">
          <h2 className="text-lg font-medium text-gray-700 mb-3">Add Task</h2>
          <div className="flex gap-2">
            <input
              className="flex-1 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="Task title"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
            />
            <input
              type="date"
              className="border rounded px-3 py-2 focus:outline-none"
              value={taskDueDate}
              onChange={(e) => setTaskDueDate(e.target.value)}
            />
            <button onClick={addTask} className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">
              Add
            </button>
          </div>
        </div>

        <div className="mt-6">
          <h2 className="text-lg font-medium text-gray-700 mb-3">Tasks</h2>
          <ul className="space-y-3">
            {project.tasks?.length ? (
              project.tasks.map((t: any) => (
                <li key={t.id} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={t.isCompleted}
                      onChange={() => toggleComplete(t)}
                      className="h-4 w-4 text-indigo-600"
                    />
                    <div>
                      <div className="font-medium text-gray-800">{t.title}</div>
                      <div className="text-xs text-gray-500">
                        {t.dueDate ? `Due: ${t.dueDate}` : "No due date"} •{" "}
                        <span className={t.isCompleted ? "text-green-600" : "text-yellow-600"}>
                          {t.isCompleted ? "Completed" : "Incomplete"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => deleteTask(t.id)}
                      className="text-sm text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))
            ) : (
              <li className="text-gray-500">No tasks yet.</li>
            )}
          </ul>
        </div>

        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Set task dependencies</h3>
          <div className="space-y-3">
            {project.tasks?.map((t: any) => (
              <div key={t.id} className="p-3 bg-gray-50 rounded flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="font-medium text-gray-800">{t.title}</div>
                  <div className="text-xs text-gray-500">Select tasks that must be completed before this task</div>
                </div>
                <div className="mt-2 md:mt-0 flex gap-2 flex-wrap">
                  {project.tasks
                    .filter((x: any) => x.id !== t.id)
                    .map((opt: any) => (
                      <button
                        key={opt.id}
                        onClick={() => toggleDep(t.id, opt.id)}
                        className={`text-xs px-2 py-1 rounded border ${taskDeps[t.id]?.includes(opt.id) ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-700"}`}
                      >
                        {opt.title}
                      </button>
                    ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={scheduleWithDependencies} disabled={isScheduling} className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">
              {isScheduling ? "Scheduling..." : "Schedule with dependencies"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
