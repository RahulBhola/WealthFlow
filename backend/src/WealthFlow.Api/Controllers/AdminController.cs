using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WealthFlow.Application.Common.Interfaces;

namespace WealthFlow.Api.Controllers;

[ApiController]
[Route("api/v1/admin")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private readonly ICurrentUserService _currentUserService;

    public AdminController(ICurrentUserService currentUserService)
    {
        _currentUserService = currentUserService;
    }

    [HttpGet("dashboard")]
    public IActionResult GetDashboard()
    {
        return Ok(new
        {
            Status = "Operational",
            AdminId = _currentUserService.UserId,
            AdminEmail = _currentUserService.Email,
            Role = _currentUserService.Role,
            TimestampUtc = DateTime.UtcNow,
            Message = "WealthFlow Singleton Admin Control Center"
        });
    }
}
