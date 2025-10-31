import { useState } from "react";
import TaskItems from "./TaskItem";
import SmartScheduler from "./SmartScheduler";


interface Project {
  id: number;
  title: string;
  description?: string;
  createdAt: string;
}

interface ProjectCardProps {
  project: Project;
  onDelete: (id: number) => void;
}

export default function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const [showTasks, setShowTasks] = useState(false);

  return (
    <div className="border rounded-lg p-4 shadow mb-3">
      <h2 className="text-xl font-semibold">{project.title}</h2>
      {project.description && <p className="text-gray-600">{project.description}</p>}
      <p className="text-sm text-gray-400">Created: {project.createdAt.split("T")[0]}</p>

      <div className="flex gap-3 mt-3">
        <button
          onClick={() => setShowTasks(!showTasks)}
          className="text-blue-500 hover:underline"
        >
          {showTasks ? "Hide Tasks" : "View Tasks"}
        </button>
        <button
          onClick={() => onDelete(project.id)}
          className="text-red-500 hover:underline"
        >
          Delete
        </button>
      </div>

      {showTasks && (
        <>
          <TaskItems projectId={project.id} />
          <SmartScheduler projectId={project.id} tasks={[]} /> {/* Will connect actual tasks later */}
        </>
      )}

    </div>
  );
}
