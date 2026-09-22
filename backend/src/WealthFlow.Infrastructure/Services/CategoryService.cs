using WealthFlow.Application.Common.Interfaces;
using WealthFlow.Application.Features.Categories.DTOs;
using WealthFlow.Application.Features.Categories.Interfaces;
using WealthFlow.Domain.Entities;

namespace WealthFlow.Infrastructure.Services;

/// <summary>
/// Application service implementing hierarchical category management and system category defaults.
/// </summary>
public class CategoryService : ICategoryService
{
    private readonly IUnitOfWork _unitOfWork;

    public CategoryService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<IReadOnlyList<CategoryDto>> GetCategoriesAsync(Guid? userId, CancellationToken cancellationToken = default)
    {
        await EnsureDefaultCategoriesSeededAsync(cancellationToken);

        var allCategories = await _unitOfWork.Categories.GetCategoriesByUserAsync(userId, cancellationToken);

        var parents = allCategories.Where(c => c.ParentCategoryId == null).ToList();
        var childrenLookup = allCategories
            .Where(c => c.ParentCategoryId != null)
            .GroupBy(c => c.ParentCategoryId!.Value)
            .ToDictionary(g => g.Key, g => g.ToList());

        var result = new List<CategoryDto>();

        foreach (var parent in parents)
        {
            IReadOnlyList<CategoryDto> subcategories = Array.Empty<CategoryDto>();
            if (childrenLookup.TryGetValue(parent.Id, out var children))
            {
                subcategories = children.Select(c => MapToDto(c, null)).ToList();
            }

            result.Add(MapToDto(parent, subcategories));
        }

        return result;
    }

    public async Task<CategoryDto> CreateCategoryAsync(Guid userId, CreateCategoryRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            throw new ArgumentException("Category name is required.", nameof(request.Name));
        }

        if (request.ParentCategoryId.HasValue)
        {
            var parent = await _unitOfWork.Categories.GetByIdAsync(request.ParentCategoryId.Value, cancellationToken);
            if (parent == null || (!parent.UserId.HasValue && parent.UserId != userId && parent.UserId != null))
            {
                throw new KeyNotFoundException($"Parent category with ID {request.ParentCategoryId.Value} was not found.");
            }
        }

        var category = new Category(
            name: request.Name.Trim(),
            userId: userId,
            parentCategoryId: request.ParentCategoryId,
            icon: request.Icon?.Trim(),
            colorHex: request.ColorHex?.Trim(),
            isSpecialProtein: request.IsSpecialProtein,
            isSpecialClothing: request.IsSpecialClothing
        );

        await _unitOfWork.Categories.AddAsync(category, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return MapToDto(category, null);
    }

    public async Task<CategoryDto> UpdateCategoryAsync(Guid userId, Guid categoryId, UpdateCategoryRequest request, CancellationToken cancellationToken = default)
    {
        var category = await _unitOfWork.Categories.GetByIdAsync(categoryId, cancellationToken);
        if (category == null)
        {
            throw new KeyNotFoundException($"Category with ID {categoryId} was not found.");
        }

        if (category.UserId == null)
        {
            throw new InvalidOperationException("System categories cannot be modified.");
        }

        if (category.UserId != userId)
        {
            throw new UnauthorizedAccessException("You are not authorized to modify this category.");
        }

        category.Update(
            name: request.Name.Trim(),
            icon: request.Icon?.Trim(),
            colorHex: request.ColorHex?.Trim(),
            isSpecialProtein: request.IsSpecialProtein,
            isSpecialClothing: request.IsSpecialClothing
        );

        await _unitOfWork.Categories.UpdateAsync(category, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return MapToDto(category, null);
    }

    private static CategoryDto MapToDto(Category c, IReadOnlyList<CategoryDto>? subcategories) => new(
        Id: c.Id,
        UserId: c.UserId,
        ParentCategoryId: c.ParentCategoryId,
        Name: c.Name,
        Icon: c.Icon,
        ColorHex: c.ColorHex,
        IsSpecialProtein: c.IsSpecialProtein,
        IsSpecialClothing: c.IsSpecialClothing,
        IsSystem: c.UserId == null,
        IsActive: c.IsActive,
        Subcategories: subcategories
    );

    private async Task EnsureDefaultCategoriesSeededAsync(CancellationToken cancellationToken)
    {
        var existing = await _unitOfWork.Categories.GetCategoriesByUserAsync(null, cancellationToken);
        if (existing.Count > 0)
        {
            return;
        }

        // Seed System Defaults
        var systemTree = new (string Name, string Icon, string Color, (string Name, string Icon, bool isProtein, bool isClothing)[] Subs)[]
        {
            ("Food & Dining", "Utensils", "#F59E0B", new [] {
                ("Groceries", "ShoppingCart", false, false),
                ("Dining Out", "Utensils", false, false),
                ("Coffee & Snacks", "Coffee", false, false),
                ("Protein & Fitness Food", "Dumbbell", true, false)
            }),
            ("Housing", "Home", "#3B82F6", new [] {
                ("Rent", "Key", false, false),
                ("Maintenance", "Wrench", false, false),
                ("Furniture & Decor", "Sofa", false, false)
            }),
            ("Transportation", "Car", "#10B981", new [] {
                ("Fuel", "Fuel", false, false),
                ("Public Transit", "Bus", false, false),
                ("Vehicle Maintenance", "Tool", false, false),
                ("Rideshare", "Taxi", false, false)
            }),
            ("Utilities", "Zap", "#6366F1", new [] {
                ("Electricity", "Zap", false, false),
                ("Water", "Droplet", false, false),
                ("Internet & Broadband", "Wifi", false, false),
                ("Mobile & DTH", "Smartphone", false, false),
                ("Gas", "Flame", false, false)
            }),
            ("Healthcare & Wellness", "HeartPulse", "#EF4444", new [] {
                ("Doctor & Diagnostics", "Stethoscope", false, false),
                ("Pharmacy & Medicines", "Pill", false, false),
                ("Gym & Fitness", "Dumbbell", false, false),
                ("Health Insurance", "Shield", false, false)
            }),
            ("Entertainment & Leisure", "Film", "#8B5CF6", new [] {
                ("Streaming & Subscriptions", "Tv", false, false),
                ("Movies & Outings", "Ticket", false, false),
                ("Games & Hobbies", "Gamepad", false, false)
            }),
            ("Shopping", "ShoppingBag", "#EC4899", new [] {
                ("Clothing & Apparel", "Shirt", false, true),
                ("Electronics & Gadgets", "Laptop", false, false),
                ("Personal Care", "Sparkles", false, false)
            }),
            ("Education & Self Improvement", "BookOpen", "#14B8A6", new [] {
                ("Books & Learning", "Book", false, false),
                ("Courses & Certifications", "GraduationCap", false, false)
            }),
            ("Investments & Savings", "TrendingUp", "#059669", new [] {
                ("SIP / Mutual Funds", "PiggyBank", false, false),
                ("Stocks & Equities", "LineChart", false, false),
                ("Emergency Fund", "ShieldCheck", false, false),
                ("Fixed Deposits", "Lock", false, false)
            }),
            ("Income", "Wallet", "#10B981", new [] {
                ("Salary", "Briefcase", false, false),
                ("Freelance & Side Hustle", "Laptop", false, false),
                ("Dividend & Interest", "Percent", false, false),
                ("Rental Income", "Home", false, false),
                ("Gifts & Cashbacks", "Gift", false, false)
            }),
            ("Transfers", "ArrowRightLeft", "#64748B", new [] {
                ("Account Transfer", "RefreshCw", false, false),
                ("Credit Card Payment", "CreditCard", false, false),
                ("Loan Repayment", "Banknote", false, false)
            })
        };

        foreach (var parentItem in systemTree)
        {
            var parent = new Category(
                name: parentItem.Name,
                userId: null,
                parentCategoryId: null,
                icon: parentItem.Icon,
                colorHex: parentItem.Color
            );
            await _unitOfWork.Categories.AddAsync(parent, cancellationToken);

            foreach (var sub in parentItem.Subs)
            {
                var child = new Category(
                    name: sub.Name,
                    userId: null,
                    parentCategoryId: parent.Id,
                    icon: sub.Icon,
                    colorHex: parentItem.Color,
                    isSpecialProtein: sub.isProtein,
                    isSpecialClothing: sub.isClothing
                );
                await _unitOfWork.Categories.AddAsync(child, cancellationToken);
            }
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
