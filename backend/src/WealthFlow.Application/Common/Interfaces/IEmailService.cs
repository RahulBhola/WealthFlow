namespace WealthFlow.Application.Common.Interfaces;

/// <summary>
/// Abstraction for delivering transactional and security notifications via SMTP.
/// </summary>
public interface IEmailService
{
    Task SendPasswordResetOtpAsync(
        string recipientEmail,
        string recipientName,
        string otpCode,
        CancellationToken cancellationToken = default);
}
