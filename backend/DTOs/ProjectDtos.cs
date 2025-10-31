using System.ComponentModel.DataAnnotations;

namespace MiniPM.Api.DTOs
{
    public record CreateProjectRequest([Required][MinLength(3)][MaxLength(100)] string Title, string? Description);
    public record ProjectResponse(int Id, string Title, string? Description, DateTime CreatedAt);
}
