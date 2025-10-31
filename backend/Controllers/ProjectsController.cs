using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MiniPM.Api.Data;
using MiniPM.Api.DTOs;
using MiniPM.Api.Models;
using System.Security.Claims;
using Microsoft.Extensions.Logging;

namespace MiniPM.Api.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/projects")]
    public class ProjectsController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly ILogger<ProjectsController> _logger;

        public ProjectsController(AppDbContext db, ILogger<ProjectsController> logger)
        {
            _db = db;
            _logger = logger;
        }

        private int CurrentUserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")!);

        [HttpGet]
        public async Task<IActionResult> GetProjects()
        {
            var projects = await _db.Projects
                .Where(p => p.UserId == CurrentUserId)
                .Select(p => new ProjectResponse(p.Id, p.Title, p.Description, p.CreatedAt))
                .ToListAsync();
            return Ok(projects);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateProjectRequest req)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");
                var project = new Project { Title = req.Title, Description = req.Description, UserId = userId, CreatedAt = DateTime.UtcNow };
                _db.Projects.Add(project);
                await _db.SaveChangesAsync();
                return Ok(project);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Create project failed");
                return StatusCode(500, new { error = "Server error" });
            }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetProject(int id)
        {
            try
            {
                var claimValue = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
                if (string.IsNullOrEmpty(claimValue) || !int.TryParse(claimValue, out var userId))
                {
                    _logger.LogWarning("GetProject: invalid or missing user id claim. Claim value: {Claim}", claimValue);
                    return Unauthorized(new { error = "Invalid authentication token" });
                }
                 var project = await _db.Projects
                     .Include(p => p.Tasks)
                     .Where(p => p.Id == id && p.UserId == userId)
                     .FirstOrDefaultAsync();

                if (project == null)
                {
                    _logger.LogInformation("Project {ProjectId} not found for user {UserId}", id, userId);
                    return NotFound(new { error = "Project not found" });
                }

                var tasks = project.Tasks
                    // Temporary: avoid referencing DB columns that may not exist yet
                    .OrderBy(t => t.DueDate ?? DateTime.MaxValue)
                    .Select(t => new { t.Id, t.Title, isCompleted = t.IsCompleted, dueDate = t.DueDate })
                     .ToList();

                return Ok(new
                {
                    project.Id,
                    project.Title,
                    project.Description,
                    project.CreatedAt,
                    tasks
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetProject failed for {ProjectId}", id);
                // Return detailed error info temporarily to help debug
                return StatusCode(500, new { error = "Server error loading project", message = ex.Message, stack = ex.StackTrace });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteProject(int id)
        {
            var project = await _db.Projects.FirstOrDefaultAsync(p => p.Id == id && p.UserId == CurrentUserId);
            if (project == null) return NotFound();
            _db.Projects.Remove(project);
            await _db.SaveChangesAsync();
            return NoContent();
        }
    }
}
