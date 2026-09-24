using System.Net;
using System.Net.Mail;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using WealthFlow.Application.Common.Interfaces;

namespace WealthFlow.Infrastructure.Services;

/// <summary>
/// Email service supporting Resend HTTPS API (bypasses Render/cloud SMTP port blocks)
/// and standard SMTP with Google App Passwords.
/// </summary>
public class EmailService : IEmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task SendPasswordResetOtpAsync(
        string recipientEmail,
        string recipientName,
        string otpCode,
        CancellationToken cancellationToken = default)
    {
        var fromEmail = Environment.GetEnvironmentVariable("SMTP_FROM_EMAIL") 
            ?? Environment.GetEnvironmentVariable("SMTP_FROM") 
            ?? _configuration["Smtp:FromEmail"] 
            ?? "onboarding@resend.dev";

        var fromName = Environment.GetEnvironmentVariable("SMTP_FROM_NAME") 
            ?? _configuration["Smtp:FromName"] 
            ?? "WealthFlow Security";

        // Always log OTP in server logs for admin/developer diagnostics in cloud environments
        _logger.LogInformation(
            "[SECURITY AUDIT] Password reset OTP generated for {Email}: {Otp}",
            recipientEmail,
            otpCode);

        var htmlBody = $@"
<!DOCTYPE html>
<html>
<head>
  <meta charset=""utf-8"">
  <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
  <title>WealthFlow Security - Password Reset</title>
</head>
<body style=""margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f8fafc;"">
  <table role=""presentation"" style=""width: 100%; border-collapse: collapse; background-color: #0b0f19;"">
    <tr>
      <td align=""center"" style=""padding: 40px 16px;"">
        <table role=""presentation"" style=""width: 100%; max-width: 520px; border-collapse: collapse; background-color: #111827; border: 1px solid #1f2937; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);"">
          <!-- Header -->
          <tr>
            <td style=""padding: 32px 32px 20px 32px; background: linear-gradient(135deg, rgba(79, 70, 229, 0.15) 0%, rgba(13, 148, 136, 0.15) 100%); border-bottom: 1px solid #1f2937;"">
              <div style=""display: inline-block; padding: 8px 12px; background: #4f46e5; border-radius: 8px; font-size: 14px; font-weight: bold; color: #ffffff; letter-spacing: 0.5px;"">
                WealthFlow
              </div>
              <h1 style=""margin: 16px 0 0 0; font-size: 20px; font-weight: 700; color: #ffffff;"">
                Password Reset Verification
              </h1>
              <p style=""margin: 4px 0 0 0; font-size: 13px; color: #94a3b8;"">
                Authoritative Personal Finance ERP
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style=""padding: 32px;"">
              <p style=""margin: 0 0 16px 0; font-size: 14px; line-height: 22px; color: #cbd5e1;"">
                Hello {(string.IsNullOrWhiteSpace(recipientName) ? "there" : recipientName)},
              </p>
              <p style=""margin: 0 0 24px 0; font-size: 14px; line-height: 22px; color: #94a3b8;"">
                We received a request to reset the password for your WealthFlow account. Use the 6-digit verification code below to authorize the change:
              </p>

              <!-- OTP Callout -->
              <div style=""margin: 0 0 24px 0; padding: 24px; background: #0f172a; border: 1px solid #334155; border-radius: 12px; text-align: center;"">
                <span style=""font-family: 'SF Mono', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #38bdf8; text-shadow: 0 0 20px rgba(56, 189, 248, 0.3);"">
                  {otpCode}
                </span>
                <p style=""margin: 12px 0 0 0; font-size: 12px; color: #64748b;"">
                  This code expires in <strong>10 minutes</strong>.
                </p>
              </div>

              <!-- Security Advisory -->
              <div style=""padding: 16px; background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 8px; margin: 0 0 24px 0;"">
                <p style=""margin: 0; font-size: 12px; line-height: 18px; color: #fca5a5;"">
                  <strong>Security Note:</strong> Never share this verification code with anyone. WealthFlow team members will never ask for your verification code or banking credentials.
                </p>
              </div>

              <p style=""margin: 0; font-size: 13px; line-height: 20px; color: #64748b;"">
                If you did not request this password reset, please ignore this email or sign in to verify your active device sessions immediately.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style=""padding: 20px 32px; background-color: #0b0f19; border-top: 1px solid #1f2937; text-align: center;"">
              <p style=""margin: 0; font-size: 11px; color: #475569;"">
                © {DateTime.UtcNow.Year} WealthFlow Enterprise. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>";

        // 1. Try Resend HTTPS API if RESEND_API_KEY is configured (Bypasses Render SMTP port 587 block!)
        var resendApiKey = Environment.GetEnvironmentVariable("RESEND_API_KEY") 
            ?? _configuration["Resend:ApiKey"];

        if (!string.IsNullOrWhiteSpace(resendApiKey))
        {
            try
            {
                using var http = new HttpClient();
                http.DefaultRequestHeaders.UserAgent.ParseAdd("WealthFlow/1.0");
                http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", resendApiKey.Trim());
                var payload = new
                {
                    from = $"{fromName} <onboarding@resend.dev>",
                    to = new[] { recipientEmail },
                    subject = $"WealthFlow Security: {otpCode} is your verification code",
                    html = htmlBody
                };

                var content = new StringContent(
                    JsonSerializer.Serialize(payload),
                    Encoding.UTF8,
                    "application/json");

                using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                timeoutCts.CancelAfter(TimeSpan.FromSeconds(5));

                var res = await http.PostAsync("https://api.resend.com/emails", content, timeoutCts.Token);
                if (res.IsSuccessStatusCode)
                {
                    _logger.LogInformation("Password reset OTP successfully dispatched via Resend HTTPS API to {Email}", recipientEmail);
                    return;
                }

                var err = await res.Content.ReadAsStringAsync(timeoutCts.Token);
                _logger.LogWarning("Resend HTTPS API returned status {Status}: {Error}. Falling back to SMTP...", res.StatusCode, err);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Resend HTTPS API dispatch failed. Falling back to SMTP...");
            }
        }

        // 2. Standard SMTP Dispatch (works when port 587 is open)
        var username = Environment.GetEnvironmentVariable("SMTP_USERNAME") 
            ?? Environment.GetEnvironmentVariable("SMTP_USER") 
            ?? _configuration["Smtp:UserName"];

        var password = Environment.GetEnvironmentVariable("SMTP_PASSWORD") 
            ?? Environment.GetEnvironmentVariable("SMTP_PASS") 
            ?? _configuration["Smtp:Password"];

        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
        {
            _logger.LogWarning(
                "[DEV OTP DELIVERY] Neither Resend nor SMTP credentials configured. Simulated email to {Email}",
                recipientEmail);
            return;
        }

        var host = Environment.GetEnvironmentVariable("SMTP_HOST") 
            ?? _configuration["Smtp:Host"] 
            ?? "smtp.gmail.com";

        var portStr = Environment.GetEnvironmentVariable("SMTP_PORT") 
            ?? _configuration["Smtp:Port"] 
            ?? "587";
        _ = int.TryParse(portStr, out var port);
        if (port <= 0) port = 587;

        var enableSslStr = Environment.GetEnvironmentVariable("SMTP_ENABLE_SSL") 
            ?? _configuration["Smtp:EnableSsl"] 
            ?? "true";
        _ = bool.TryParse(enableSslStr, out var enableSsl);

        var smtpFromEmail = !string.IsNullOrWhiteSpace(username) && username.Contains('@') ? username : fromEmail;

        try
        {
            using var client = new SmtpClient(host, port)
            {
                EnableSsl = enableSsl,
                Credentials = new NetworkCredential(username.Trim(), password.Trim()),
                DeliveryMethod = SmtpDeliveryMethod.Network,
                Timeout = 20000
            };

            using var message = new MailMessage
            {
                From = new MailAddress(smtpFromEmail.Trim(), fromName),
                Subject = $"WealthFlow Security: {otpCode} is your verification code",
                Body = htmlBody,
                IsBodyHtml = true
            };
            message.To.Add(new MailAddress(recipientEmail.Trim()));

            using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            timeoutCts.CancelAfter(TimeSpan.FromSeconds(20));
            await client.SendMailAsync(message, timeoutCts.Token);
            _logger.LogInformation("Password reset OTP successfully dispatched via SMTP to {Email}", recipientEmail);
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Failed to send password reset OTP via SMTP to {Email}: {ErrorMessage}",
                recipientEmail,
                ex.Message);
        }
    }
}
