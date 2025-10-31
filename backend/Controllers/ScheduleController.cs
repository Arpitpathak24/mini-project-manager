using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MiniPM.Api.Data;
using System.Security.Claims;
using System.Collections.Generic;
using System.Linq;

namespace MiniPM.Api.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api")]
    public class ScheduleController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly ILogger<ScheduleController> _logger;

        public ScheduleController(AppDbContext db, ILogger<ScheduleController> logger)
        {
            _db = db;
            _logger = logger;
        }

        // POST /api/projects/{id}/schedule
        [HttpPost("projects/{id}/schedule")]
        public async Task<IActionResult> ProjectSchedule(int id) => await GenerateScheduleInternal(id);

        // POST /api/projects/{id}/schedule/generate
        [HttpPost("projects/{id}/schedule/generate")]
        public async Task<IActionResult> ProjectScheduleGenerate(int id) => await GenerateScheduleInternal(id);

        // POST /api/schedule  { "projectId": 13 }
        [HttpPost("schedule")]
        public async Task<IActionResult> GlobalSchedule([FromBody] ProjectIdRequest req)
        {
            if (req == null || req.ProjectId <= 0) return BadRequest(new { error = "projectId required" });
            return await GenerateScheduleInternal(req.ProjectId);
        }

        // NEW: v1 scheduler that accepts tasks + dependencies payload
        // POST /api/v1/projects/{projectId}/schedule
        [HttpPost("v1/projects/{projectId}/schedule")]
        public async Task<IActionResult> ProjectScheduleV1(int projectId, [FromBody] SchedulerRequest req)
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");

                var project = await _db.Projects
                    .Include(p => p.Tasks)
                    .FirstOrDefaultAsync(p => p.Id == projectId && p.UserId == userId);

                if (project == null) return NotFound(new { error = "Project not found" });

                var inputs = (req?.Tasks != null && req.Tasks.Any())
                    ? req.Tasks
                    : project.Tasks.Select(t => new TaskInput
                    {
                        Title = t.Title,
                        EstimatedHours = 0,
                        DueDate = t.DueDate,
                        Dependencies = new List<string>()
                    }).ToList();

                // Validate unique titles
                if (inputs.Select(x => x.Title).Distinct(StringComparer.OrdinalIgnoreCase).Count() != inputs.Count)
                    return BadRequest(new { error = "Task titles must be unique" });

                // Build graph by title
                var nodes = inputs.ToDictionary(t => t.Title, StringComparer.OrdinalIgnoreCase);
                var indegree = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
                var adj = new Dictionary<string, List<string>>(StringComparer.OrdinalIgnoreCase);

                foreach (var t in inputs)
                {
                    indegree[t.Title] = 0;
                    adj[t.Title] = new List<string>();
                }

                // Add edges (dependency -> task)
                foreach (var t in inputs)
                {
                    if (t.Dependencies == null) continue;
                    foreach (var dep in t.Dependencies)
                    {
                        if (!nodes.ContainsKey(dep))
                            return BadRequest(new { error = $"Unknown dependency '{dep}' for task '{t.Title}'" });

                        adj[dep].Add(t.Title);
                        indegree[t.Title] = indegree.GetValueOrDefault(t.Title, 0) + 1;
                    }
                }

                // Kahn's algorithm with priority: earliest due date first (nulls last), then lower estimated hours
                var ready = indegree.Where(kv => kv.Value == 0).Select(kv => kv.Key).ToList();
                List<string> result = new();

                while (ready.Any())
                {
                    // pick best candidate
                    ready.Sort((a, b) =>
                    {
                        var at = nodes[a];
                        var bt = nodes[b];
                        var ad = at.DueDate ?? DateTime.MaxValue;
                        var bd = bt.DueDate ?? DateTime.MaxValue;
                        var cmp = ad.CompareTo(bd);
                        if (cmp != 0) return cmp;
                        return at.EstimatedHours.CompareTo(bt.EstimatedHours);
                    });

                    var cur = ready.First();
                    ready.RemoveAt(0);
                    result.Add(cur);

                    foreach (var neigh in adj[cur])
                    {
                        indegree[neigh]--;
                        if (indegree[neigh] == 0) ready.Add(neigh);
                    }
                }

                if (result.Count != inputs.Count)
                    return BadRequest(new { error = "Cyclic or unresolved dependencies detected" });

                // persist recommended order into existing tasks
                var titleToTask = project.Tasks.ToDictionary(t => t.Title, StringComparer.OrdinalIgnoreCase);
                for (int i = 0; i < result.Count; i++)
                {
                    var title = result[i];
                    if (titleToTask.TryGetValue(title, out var task))
                    {
                        if (task.SortOrder != i) task.SortOrder = i;
                    }
                }
                await _db.SaveChangesAsync();

                return Ok(new { recommendedOrder = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Scheduler failed for project {ProjectId}", projectId);
                return StatusCode(500, new { error = "Server error generating schedule" });
            }
        }

        // existing internal schedule implementation (kept)
        private async Task<IActionResult> GenerateScheduleInternal(int projectId)
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");

                var project = await _db.Projects
                    .Include(p => p.Tasks)
                    .FirstOrDefaultAsync(p => p.Id == projectId && p.UserId == userId);

                if (project == null) return NotFound(new { error = "Project not found" });

                var ordered = project.Tasks
                    .OrderBy(t => t.DueDate ?? DateTime.MaxValue)
                    .ThenBy(t => t.CreatedAt)
                    .ToList();

                for (int i = 0; i < ordered.Count; i++)
                {
                    var task = ordered[i];
                    if (task.SortOrder != i) task.SortOrder = i;
                }

                await _db.SaveChangesAsync();

                var tasks = ordered.Select(t => new
                {
                    id = t.Id,
                    title = t.Title,
                    dueDate = t.DueDate,
                    isCompleted = t.IsCompleted,
                    sortOrder = t.SortOrder
                }).ToList();

                return Ok(new { projectId = projectId, schedule = tasks });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to generate schedule for project {ProjectId}", projectId);
                return StatusCode(500, new { error = "Server error generating schedule" });
            }
        }

        public class ProjectIdRequest { public int ProjectId { get; set; } }

        // DTOs for v1 scheduler
        public class SchedulerRequest
        {
            public List<TaskInput>? Tasks { get; set; }
        }

        public class TaskInput
        {
            public string Title { get; set; } = string.Empty;
            public int EstimatedHours { get; set; } = 0;
            public DateTime? DueDate { get; set; }
            public List<string>? Dependencies { get; set; }
        }
    }
}
