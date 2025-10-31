import { useState } from "react";
import API from "../api";

interface SmartSchedulerProps {
  projectId: number;
}

export default function SmartScheduler({ projectId }: SmartSchedulerProps) {
  const [loading, setLoading] = useState(false);
  const [schedule, setSchedule] = useState<string[]>([]);
  const [error, setError] = useState("");

  const generateSchedule = async () => {
    setLoading(true);
    setError("");
    setSchedule([]);

    try {
      const res = await API.post(`/v1/projects/${projectId}/schedule`);
      setSchedule(res.data.recommendedOrder);
    } catch (err: any) {
      console.error("Error generating schedule:", err);
      setError("Failed to generate schedule. Please check backend or tasks.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-t mt-3 pt-3">
      <h3 className="text-lg font-semibold mb-2">Smart Scheduler</h3>
      <button
        onClick={generateSchedule}
        className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
        disabled={loading}
      >
        {loading ? "Generating..." : "Generate Schedule"}
      </button>

      {error && <p className="text-red-500 mt-2">{error}</p>}

      {schedule.length > 0 && (
        <div className="mt-3">
          <h4 className="font-medium mb-1">Recommended Task Order:</h4>
          <ol className="list-decimal ml-5 text-gray-700">
            {schedule.map((task, i) => (
              <li key={i}>{task}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
