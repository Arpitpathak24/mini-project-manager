using System;
using System.Collections.Generic;

namespace MiniPM.Api.Models
{
    public class Project
    {
        public int Id { get; set; }

        // Title is required (3–100 chars)
        public string Title { get; set; } = string.Empty;

        // Optional project description (up to 500 chars)
        public string? Description { get; set; }

        // Automatically set when project is created
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Foreign key to the user who owns this project
        public int UserId { get; set; }
        public User User { get; set; } = null!;

        // Navigation property for related tasks
        public List<TaskItem> Tasks { get; set; } = new();
    }
}
