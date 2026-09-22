using WealthFlow.Application.Features.Categories.DTOs;

namespace WealthFlow.Application.Features.Categories.Interfaces;

/// <summary>
/// Application service contract for hierarchical income and expense category management.
/// </summary>
public interface ICategoryService
{
    Task<IReadOnlyList<CategoryDto>> GetCategoriesAsync(Guid? userId, CancellationToken cancellationToken = default);
    Task<CategoryDto> CreateCategoryAsync(Guid userId, CreateCategoryRequest request, CancellationToken cancellationToken = default);
    Task<CategoryDto> UpdateCategoryAsync(Guid userId, Guid categoryId, UpdateCategoryRequest request, CancellationToken cancellationToken = default);
}
