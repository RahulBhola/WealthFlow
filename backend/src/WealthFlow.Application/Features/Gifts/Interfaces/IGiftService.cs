using WealthFlow.Application.Features.Gifts.DTOs;

namespace WealthFlow.Application.Features.Gifts.Interfaces;

public interface IGiftService
{
    Task<GiftSummaryDto> GetGiftSummaryAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<GiftDto>> GetGiftsAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<GiftDto> CreateGiftAsync(Guid userId, CreateGiftRequest request, CancellationToken cancellationToken = default);
    Task DeleteGiftAsync(Guid userId, Guid giftId, CancellationToken cancellationToken = default);
}
