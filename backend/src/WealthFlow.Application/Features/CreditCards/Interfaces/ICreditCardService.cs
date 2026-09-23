using WealthFlow.Application.Features.CreditCards.DTOs;

namespace WealthFlow.Application.Features.CreditCards.Interfaces;

public interface ICreditCardService
{
    Task<CreditCardSummaryDto> GetCreditCardSummaryAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<CreditCardDto>> GetCreditCardsAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<CreditCardDto> GetCreditCardByIdAsync(Guid userId, Guid cardId, CancellationToken cancellationToken = default);
    Task<CreditCardDto> CreateCreditCardAsync(Guid userId, CreateCreditCardRequest request, CancellationToken cancellationToken = default);
    Task<CreditCardDto> UpdateCreditCardAsync(Guid userId, Guid cardId, UpdateCreditCardRequest request, CancellationToken cancellationToken = default);
    Task<CreditCardBillPaymentResponse> PayBillAsync(Guid userId, Guid cardId, PayCreditCardBillRequest request, CancellationToken cancellationToken = default);
    Task DeleteCreditCardAsync(Guid userId, Guid cardId, CancellationToken cancellationToken = default);
}
