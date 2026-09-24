# Stage 1: Build and publish
FROM mcr.microsoft.com/dotnet/sdk:9.0-alpine AS build
WORKDIR /app

# Copy Directory.Build.props and project files for layer caching
COPY ["backend/Directory.Build.props", "backend/"]
COPY ["backend/src/WealthFlow.Domain/WealthFlow.Domain.csproj", "backend/src/WealthFlow.Domain/"]
COPY ["backend/src/WealthFlow.Application/WealthFlow.Application.csproj", "backend/src/WealthFlow.Application/"]
COPY ["backend/src/WealthFlow.Infrastructure/WealthFlow.Infrastructure.csproj", "backend/src/WealthFlow.Infrastructure/"]
COPY ["backend/src/WealthFlow.Api/WealthFlow.Api.csproj", "backend/src/WealthFlow.Api/"]

RUN dotnet restore "backend/src/WealthFlow.Api/WealthFlow.Api.csproj"

# Copy all backend source files and publish
COPY backend/ backend/
WORKDIR "/app/backend/src/WealthFlow.Api"
RUN dotnet publish "WealthFlow.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Stage 2: Production runtime image (non-root Alpine Linux)
FROM mcr.microsoft.com/dotnet/aspnet:9.0-alpine AS final
WORKDIR /app

# Ensure non-root app user has permissions for upload storage directories
USER root
RUN mkdir -p /app/App_Data/uploads && chown -R app:app /app
USER app

COPY --from=build --chown=app:app /app/publish .

# Environment variables
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production
ENV DOTNET_RUNNING_IN_CONTAINER=true

EXPOSE 8080

# Health check verifies liveness within 10 seconds
HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health/live || exit 1

ENTRYPOINT ["dotnet", "WealthFlow.Api.dll"]
