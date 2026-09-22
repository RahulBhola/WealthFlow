using WealthFlow.Domain.Common;

namespace WealthFlow.Domain.Entities;

/// <summary>
/// Hierarchical spending and income category taxonomy.
/// Supports system presets, user custom categories, and specialized protein/clothing flags.
/// </summary>
public class Category : BaseEntity, IAggregateRoot
{
    public Guid? UserId { get; private set; } // Null for system preset categories
    public Guid? ParentCategoryId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string? Icon { get; private set; }
    public string? ColorHex { get; private set; }
    public bool IsSpecialProtein { get; private set; } = false;
    public bool IsSpecialClothing { get; private set; } = false;
    public bool IsActive { get; private set; } = true;

    protected Category() { }

    public Category(
        string name,
        Guid? userId = null,
        Guid? parentCategoryId = null,
        string? icon = null,
        string? colorHex = null,
        bool isSpecialProtein = false,
        bool isSpecialClothing = false)
    {
        Name = name;
        UserId = userId;
        ParentCategoryId = parentCategoryId;
        Icon = icon;
        ColorHex = colorHex;
        IsSpecialProtein = isSpecialProtein;
        IsSpecialClothing = isSpecialClothing;
        IsActive = true;
    }

    public void Update(string name, string? icon, string? colorHex, bool isSpecialProtein, bool isSpecialClothing)
    {
        Name = name;
        Icon = icon;
        ColorHex = colorHex;
        IsSpecialProtein = isSpecialProtein;
        IsSpecialClothing = isSpecialClothing;
        SetUpdated();
    }

    public void SetActive(bool isActive)
    {
        IsActive = isActive;
        SetUpdated();
    }
}
