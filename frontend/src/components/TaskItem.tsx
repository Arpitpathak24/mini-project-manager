import { useEffect, useState } from "react";
import axios from "axios";

interface Task {
  id: number;
  title: string;
  dueDate?: string;
  isCompleted: boolean;
  projectId: number;
}

interface TaskItemsProps {
  projectId: number;
}

export default function TaskItems({ projectId }: TaskItemsProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");

  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchTasks();
  }, [projectId]);

  const fetchTasks = async () => {
    try {
      const res = await axios.get(`/api/projects/${projectId}/tasks`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // ✅ Ensure response is always an array
      if (Array.isArray(res.data)) {
        setTasks(res.data);
      } else {
        console.warn("Unexpected API response:", res.data);
        setTasks([]);
      }
    } catch (err) {
      console.error("Error fetching tasks", err);
      setTasks([]); // fallback if API fails
    }
  };

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(
        `/api/projects/${projectId}/tasks`,
        { title, dueDate },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTitle("");
      setDueDate("");
      fetchTasks();
    } catch (err) {
      console.error("Error creating task", err);
    }
  };

  const toggleCompletion = async (task: Task) => {
    try {
      await axios.put(
        `/api/tasks/${task.id}`,
        { isCompleted: !task.isCompleted },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchTasks();
    } catch (err) {
      console.error("Error updating task", err);
    }
  };

  const deleteTask = async (taskId: number) => {
    try {
      await axios.delete(`/api/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchTasks();
    } catch (err) {
      console.error("Error deleting task", err);
    }
  };

  return (
    <div className="p-4 border rounded-lg shadow mt-4">
      <h3 className="font-bold text-lg mb-2">Tasks</h3>

      {/* Task form */}
      <form onSubmit={addTask} className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Task title"
          className="border p-1 rounded flex-1"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <input
          type="date"
          className="border p-1 rounded"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
        <button className="bg-blue-500 text-white px-3 py-1 rounded">
          Add
        </button>
      </form>

      {/* Task list */}
      {tasks.length === 0 ? (
        <p className="text-gray-500 text-sm">No tasks yet for this project.</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex justify-between items-center border p-2 rounded"
            >
              <div>
                <input
                  type="checkbox"
                  checked={task.isCompleted}
                  onChange={() => toggleCompletion(task)}
                />{" "}
                <span
                  className={
                    task.isCompleted ? "line-through text-gray-500" : ""
                  }
                >
                  {task.title}
                </span>
                {task.dueDate && (
                  <span className="text-sm text-gray-400 ml-2">
                    (Due: {task.dueDate.split("T")[0]})
                  </span>
                )}
              </div>
              <button
                onClick={() => deleteTask(task.id)}
                className="text-red-500 hover:underline"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
