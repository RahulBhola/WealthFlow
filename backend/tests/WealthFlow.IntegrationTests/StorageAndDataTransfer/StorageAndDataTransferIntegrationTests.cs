using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using WealthFlow.Application.Common.Interfaces;
using WealthFlow.Application.Features.Attachments.DTOs;
using WealthFlow.Application.Features.Auth.DTOs;
using WealthFlow.Application.Features.Data.DTOs;
using WealthFlow.Infrastructure.Services.Storage;
using WealthFlow.IntegrationTests.Fixtures;

namespace WealthFlow.IntegrationTests.StorageAndDataTransfer;

public class StorageAndDataTransferIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;

    public StorageAndDataTransferIntegrationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    private async Task<HttpClient> CreateAuthenticatedClientAsync()
    {
        var client = _factory.CreateClient();
        var loginResponse = await client.PostAsJsonAsync("/api/v1/auth/login", new LoginRequest(
            Email: CustomWebApplicationFactory.TestUserEmail,
            Password: CustomWebApplicationFactory.TestUserPassword
        ));

        loginResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var auth = await loginResponse.Content.ReadFromJsonAsync<AuthResponse>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.AccessToken);
        return client;
    }

    [Fact]
    public async Task HealthLive_ShouldReturnOk()
    {
        // Arrange
        var client = _factory.CreateClient();

        // Act
        var response = await client.GetAsync("/health/live");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task HealthReady_ShouldReturnOk_AndContainDatabaseCheck()
    {
        // Arrange
        var client = _factory.CreateClient();

        // Act
        var response = await client.GetAsync("/health/ready");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var content = await response.Content.ReadAsStringAsync();
        content.Should().Contain("Healthy");
        content.Should().Contain("database");
    }

    [Fact]
    public async Task CorrelationId_ShouldBeGeneratedOrEchoedInResponse()
    {
        // Arrange
        var client = _factory.CreateClient();
        var customCorrelationId = "test-corr-id-998877";
        client.DefaultRequestHeaders.Add("X-Correlation-Id", customCorrelationId);

        // Act
        var response = await client.GetAsync("/health");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        response.Headers.Should().ContainKey("X-Correlation-Id");
        response.Headers.GetValues("X-Correlation-Id").First().Should().Be(customCorrelationId);
    }

    [Fact]
    public async Task UploadAttachment_WithValidJpeg_ShouldSucceed()
    {
        // Arrange
        var client = await CreateAuthenticatedClientAsync();

        // Valid JPEG header bytes (FF D8 FF E0 ...)
        var jpegBytes = new byte[] { 0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01 };
        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(jpegBytes);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
        content.Add(fileContent, "file", "receipt.jpg");
        content.Add(new StringContent("Transaction"), "linkedEntityType");
        content.Add(new StringContent(Guid.NewGuid().ToString()), "linkedEntityId");

        // Act
        var response = await client.PostAsync("/api/v1/attachments/upload", content);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var dto = await response.Content.ReadFromJsonAsync<AttachmentDto>();
        dto.Should().NotBeNull();
        dto!.OriginalFileName.Should().Be("receipt.jpg");
        dto.MimeType.Should().Be("image/jpeg");
        dto.FileSizeBytes.Should().Be(jpegBytes.Length);
        dto.StoragePath.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task UploadAttachment_WithSpoofedMimeType_ShouldFailMagicByteValidation()
    {
        // Arrange
        var client = await CreateAuthenticatedClientAsync();

        // Plain text bytes claiming to be image/jpeg
        var fakeBytes = Encoding.UTF8.GetBytes("Not A Real JPEG File Content!");
        using var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(fakeBytes);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
        content.Add(fileContent, "file", "fake.jpg");
        content.Add(new StringContent("Transaction"), "linkedEntityType");
        content.Add(new StringContent(Guid.NewGuid().ToString()), "linkedEntityId");

        // Act
        var response = await client.PostAsync("/api/v1/attachments/upload", content);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("INVALID_FILE_SIGNATURE");
    }

    [Fact]
    public async Task DownloadAttachment_ShouldStreamContent_WithCorrectMetadata()
    {
        // Arrange
        var client = await CreateAuthenticatedClientAsync();

        var pdfBytes = new byte[] { 0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34, 0x0A }; // %PDF-1.4
        using var uploadContent = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(pdfBytes);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
        uploadContent.Add(fileContent, "file", "tax_invoice.pdf");
        uploadContent.Add(new StringContent("Transaction"), "linkedEntityType");
        uploadContent.Add(new StringContent(Guid.NewGuid().ToString()), "linkedEntityId");

        var uploadResponse = await client.PostAsync("/api/v1/attachments/upload", uploadContent);
        uploadResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var uploadedDto = await uploadResponse.Content.ReadFromJsonAsync<AttachmentDto>();

        // Act
        var downloadResponse = await client.GetAsync($"/api/v1/attachments/{uploadedDto!.Id}/download");

        // Assert
        downloadResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        downloadResponse.Content.Headers.ContentType?.MediaType.Should().Be("application/pdf");
        var downloadedBytes = await downloadResponse.Content.ReadAsByteArrayAsync();
        downloadedBytes.Should().Equal(pdfBytes);
    }

    [Fact]
    public async Task DeleteAttachment_ShouldRemoveEntity_AndSubsequentGetShouldReturn404()
    {
        // Arrange
        var client = await CreateAuthenticatedClientAsync();

        var pngBytes = new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D };
        using var uploadContent = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(pngBytes);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        uploadContent.Add(fileContent, "file", "chart.png");
        uploadContent.Add(new StringContent("TripExpense"), "linkedEntityType");
        var linkedExpenseId = Guid.NewGuid();
        uploadContent.Add(new StringContent(linkedExpenseId.ToString()), "linkedEntityId");

        var uploadResponse = await client.PostAsync("/api/v1/attachments/upload", uploadContent);
        uploadResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var uploadedDto = await uploadResponse.Content.ReadFromJsonAsync<AttachmentDto>();

        // Act - Delete
        var deleteResponse = await client.DeleteAsync($"/api/v1/attachments/{uploadedDto!.Id}");
        deleteResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);

        // Assert - Subsequent retrieval returns 404
        var getResponse = await client.GetAsync($"/api/v1/attachments/{uploadedDto.Id}");
        getResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task ExportUserData_JsonAndCsv_ShouldSucceed()
    {
        // Arrange
        var client = await CreateAuthenticatedClientAsync();

        // Act - JSON Export
        var jsonResponse = await client.GetAsync("/api/v1/data/export?format=json");
        jsonResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        jsonResponse.Content.Headers.ContentType?.MediaType.Should().Be("application/json");

        var exportDto = await jsonResponse.Content.ReadFromJsonAsync<DataExportDto>();
        exportDto.Should().NotBeNull();
        exportDto!.UserId.Should().Be(CustomWebApplicationFactory.TestUserId);
        exportDto.Version.Should().Be("1.0.0");

        // Act - CSV Export
        var csvResponse = await client.GetAsync("/api/v1/data/export?format=csv");
        csvResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        csvResponse.Content.Headers.ContentType?.MediaType.Should().Be("text/csv");

        var csvText = await csvResponse.Content.ReadAsStringAsync();
        csvText.Should().StartWith("TransactionId,DateUtc,AccountName,CategoryName,Amount,EventType,Description,Merchant,Notes,Tags");
    }

    [Fact]
    public async Task ImportUserData_Json_ShouldImportRecordsAtomically()
    {
        // Arrange
        var client = await CreateAuthenticatedClientAsync();
        var importPayload = new DataExportDto
        {
            Version = "1.0.0",
            UserId = CustomWebApplicationFactory.TestUserId,
            Accounts = new List<AccountExportDto>
            {
                new()
                {
                    Id = Guid.NewGuid(),
                    Name = $"Imported Account {Guid.NewGuid():N}",
                    AccountType = "Bank",
                    OpeningBalance = 25000m,
                    CurrentBalance = 25000m,
                    Currency = "INR",
                    IsActive = true
                }
            },
            Categories = new List<CategoryExportDto>
            {
                new()
                {
                    Id = Guid.NewGuid(),
                    Name = $"Imported Cat {Guid.NewGuid():N}",
                    ColorHex = "#10B981",
                    IsActive = true
                }
            }
        };

        // Act
        var response = await client.PostAsJsonAsync("/api/v1/data/import", importPayload);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<DataImportResultDto>();
        result.Should().NotBeNull();
        result!.Success.Should().BeTrue();
        result.ImportedAccounts.Should().Be(1);
        result.ImportedCategories.Should().Be(1);
    }

    [Fact]
    public async Task StorageProvider_ServiceDecoupling_UnitCheck()
    {
        // Arrange & Assert
        // Verify GoogleDriveStorageService instantiates cleanly with local fallback when credentials missing
        var inMemoryConfig = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["GoogleDrive:RootFolderId"] = "mock_folder",
            ["StorageProvider"] = "GoogleDrive"
        }).Build();

        var googleService = new GoogleDriveStorageService(inMemoryConfig, NullLogger<GoogleDriveStorageService>.Instance);
        googleService.Should().NotBeNull();

        // Verify AzureBlobStorageService instantiates cleanly with local fallback when connection missing
        var azureConfig = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["AzureBlob:ContainerName"] = "test-container",
            ["StorageProvider"] = "AzureBlob"
        }).Build();

        var azureService = new AzureBlobStorageService(azureConfig, NullLogger<AzureBlobStorageService>.Instance);
        azureService.Should().NotBeNull();

        // Verify upload and download through local fallback
        using var testStream = new MemoryStream(new byte[] { 1, 2, 3, 4, 5 });
        var uploadRes = await googleService.UploadFileAsync(testStream, "test.dat", "application/octet-stream");
        uploadRes.StoragePath.Should().NotBeNullOrWhiteSpace();

        var downloadRes = await googleService.DownloadFileAsync(uploadRes.StoragePath);
        downloadRes.Should().NotBeNull();
        downloadRes!.ContentStream.Length.Should().Be(5);

        // Cleanup
        await googleService.DeleteFileAsync(uploadRes.StoragePath);
    }
}
