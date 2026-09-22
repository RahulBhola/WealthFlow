namespace WealthFlow.Application.Features.Categories.DTOs;

public record CreateCategoryRequest(
    string Name,
    Guid? ParentCategoryId = null,
    string? Icon = null,
    string? ColorHex = null,
    bool IsSpecialProtein = false,
    bool IsSpecialClothing = false);

public record UpdateCategoryRequest(
    string Name,
    string? Icon = null,
    string? ColorHex = null,
    bool IsSpecialProtein = false,
    bool IsSpecialClothing = false);

public record CategoryDto(
    Guid Id,
    Guid? UserId,
    Guid? ParentCategoryId,
    string Name,
    string? Icon,
    string? ColorHex,
    bool IsSpecialProtein,
    bool IsSpecialClothing,
    bool IsSystem,
    bool IsActive,
    IReadOnlyList<CategoryDto>? Subcategories = null);
