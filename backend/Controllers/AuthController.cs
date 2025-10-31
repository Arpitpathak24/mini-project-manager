using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using MiniPM.Api.DTOs;
using MiniPM.Api.Services;

namespace MiniPM.Api.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly AuthService _authService;
        private readonly ILogger<AuthController> _logger;

        public AuthController(AuthService authService, ILogger<AuthController> logger)
        {
            _authService = authService;
            _logger = logger;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] AuthRequest req)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            try
            {
                var user = await _authService.Register(req.Username, req.Password);
                if (user == null) return BadRequest(new { error = "Username already taken" });

                return Ok(new { id = user.Id, username = user.Username });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Register failed for {Username}", req.Username);
                return StatusCode(500, new { error = "Server error" });
            }
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] AuthRequest req)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            try
            {
                var token = await _authService.Login(req.Username, req.Password);
                if (token == null) return Unauthorized(new { error = "Invalid credentials" });

                return Ok(new { token });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Login failed for {Username}", req.Username);
                return StatusCode(500, new { error = "Server error" });
            }
        }
    }
}
