# WealthFlow

Enterprise-grade personal finance management, travel expense splitting, investment tracking, and lightweight financial ERP application.

## Documentation

The project architecture and requirements are specified in the [`docs/`](docs/) directory:

1. [01 - Product Requirements Document](docs/01-product-requirements-document.md)
2. [02 - Technical Architecture Document](docs/02-technical-architecture-document.md)
3. [03 - Security & Access Document](docs/03-security-and-access-document.md)
4. [04 - Frontend Specification Document](docs/04-frontend-specification-document.md)
5. [05 - Feature Ticket List](docs/05-feature-ticket-list.md)
6. [06 - Admin ERP UI Design System](docs/06-admin-erp-ui-design-system.md)

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, TanStack Query v5, Dexie.js (IndexedDB), PWA
- **Backend:** ASP.NET Core Web API (.NET 9+), C# 13, Clean Architecture, Dependency Injection, Repository Pattern with Unit of Work, LINQ
- **Database:** PostgreSQL (Initial) → Microsoft Azure SQL Database (Future Portability)
- **Real-Time:** SignalR
