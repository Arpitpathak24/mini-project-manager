using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MiniPM.Api.Data;
using MiniPM.Api.DTOs;
using MiniPM.Api.Models;
using System.Security.Claims;
using System.Linq;

namespace MiniPM.Api.Controllers
{
    [ApiController]
    [Authorize]
    public class TasksController : ControllerBase
    {
        private readonly AppDbContext _db;
        public TasksController(AppDbContext db)
        {
            _db = db;
        }

        private int CurrentUserId =>
            int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")!);

        // ✅ Create a task under a specific project
        [HttpPost("api/projects/{projectId}/tasks")]
        public async Task<IActionResult> CreateTask(int projectId, CreateTaskRequest req)
        {
            var project = await _db.Projects
                .FirstOrDefaultAsync(p => p.Id == projectId && p.UserId == CurrentUserId);

            if (project == null)
                return NotFound(new { error = "Project not found" });

            // assign SortOrder as last position in the project
            var maxOrder = await _db.Tasks.Where(t => t.ProjectId == projectId).MaxAsync(t => (int?)t.SortOrder) ?? -1;
            var task = new TaskItem
            {
                Title = req.Title,
                DueDate = req.DueDate,
                ProjectId = projectId,
                IsCompleted = false,
                SortOrder = maxOrder + 1,
                CreatedAt = DateTime.UtcNow
            };

            _db.Tasks.Add(task);
            await _db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetTask), new { taskId = task.Id }, task);
        }

        // ✅ Get all tasks for a project
        [HttpGet("api/projects/{projectId}/tasks")]
        public async Task<IActionResult> GetTasksForProject(int projectId)
        {
            var project = await _db.Projects
                .Include(p => p.Tasks)
                .FirstOrDefaultAsync(p => p.Id == projectId && p.UserId == CurrentUserId);

            if (project == null)
                return NotFound(new { message = "Project not found or access denied" });

            return Ok(project.Tasks);
        }

        // ✅ Get a single task by ID
        [HttpGet("api/tasks/{taskId}")]
        public async Task<IActionResult> GetTask(int taskId)
        {
            var task = await _db.Tasks
                .Include(t => t.Project)
                .FirstOrDefaultAsync(t => t.Id == taskId);

            if (task == null || task.Project.UserId != CurrentUserId)
                return NotFound(new { error = "Task not found or unauthorized" });

            return Ok(task);
        }

        // ✅ Update a task
        [HttpPut("api/tasks/{taskId}")]
        public async Task<IActionResult> UpdateTask(int taskId, UpdateTaskRequest req)
        {
            var task = await _db.Tasks
                .Include(t => t.Project)
                .FirstOrDefaultAsync(t => t.Id == taskId);

            if (task == null || task.Project.UserId != CurrentUserId)
                return NotFound(new { error = "Task not found or unauthorized" });

            if (!string.IsNullOrWhiteSpace(req.Title))
                task.Title = req.Title;

            if (req.DueDate.HasValue)
                task.DueDate = req.DueDate;

            if (req.IsCompleted.HasValue)
                task.IsCompleted = req.IsCompleted.Value;

            await _db.SaveChangesAsync();
            return Ok(task);
        }

        // ✅ Delete a task
        [HttpDelete("api/tasks/{taskId}")]
        public async Task<IActionResult> DeleteTask(int taskId)
        {
            var task = await _db.Tasks
                .Include(t => t.Project)
                .FirstOrDefaultAsync(t => t.Id == taskId);

            if (task == null || task.Project.UserId != CurrentUserId)
                return NotFound(new { error = "Task not found or unauthorized" });

            _db.Tasks.Remove(task);
            await _db.SaveChangesAsync();

            return NoContent();
        }
    }
}
