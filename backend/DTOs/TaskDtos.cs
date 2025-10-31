using System;
using System.ComponentModel.DataAnnotations;

namespace MiniPM.Api.DTOs
{
    public record CreateTaskRequest(
        [Required, StringLength(100, MinimumLength = 3)] string Title,
        DateTime? DueDate
    );

    public record UpdateTaskRequest(
        int Id,
        string? Title,
        DateTime? DueDate,
        bool? IsCompleted
    );
}
