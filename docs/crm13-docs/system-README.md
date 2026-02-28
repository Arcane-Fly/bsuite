# System Documentation

## Architecture

- [MCP System Architecture](architecture/mcp-system.md) - Detailed documentation of the Model Context Protocol system based on Agent Zero's memory system design

## Database & Authentication

### Supabase Integration

- [Getting Started](supabase/getting-started.md) - Quick start guide for Supabase integration
- [Authentication](supabase/authentication.md) - Authentication setup and management
- [Redirect URLs](supabase/redirect-urls.md) - Configuration and implementation of authentication redirects
- [Database Management](supabase/database.md) - Database setup, migrations, and best practices
- [Row Level Security](supabase/row-level-security.md) - Security policies and access control
- [TypeScript Integration](supabase/typescript.md) - Type-safe database operations

## Deployment & Infrastructure

### Vercel Deployment

- [Getting Started](vercel/getting-started.md) - Quick start guide for Vercel deployment
- [Environment Variables](vercel/environment-variables.md) - Configuration and management of environment variables
- [Edge Functions](vercel/edge-functions.md) - Edge computing and serverless functions
- [Monitoring](vercel/monitoring.md) - Application monitoring and analytics
- [CI/CD](vercel/ci-cd.md) - Continuous integration and deployment
- [Security](vercel/security.md) - Security best practices and configuration
- [Performance](vercel/performance.md) - Performance optimization and best practices

## Specifications

- [Workforce One Integration](specifications/workforce-one.md) - Comprehensive specifications for Workforce One integration including payroll, communication, and security features

## Core Features

### Payroll Management

- Pay Item System
- Leave Management
- Timesheet Integration (AnyTime)
- Award Management

### Communication

- Bulk Email/SMS
- Template Management
- Recipient Management
- Batch Processing

### Security

- Feature-level Security
- Role-based Access Control
- Integration Security
- Data Protection

### Document Management

- Template System
- Mail Merge
- Version Control
- Document Copying

## Integration Points

- AnyTime Integration
- ATO Reporting
- Communication APIs
- Database Integration

## Implementation Guidelines

- Security Implementation
- Integration Setup
- Data Management
- Best Practices

## Version Information

Current Version: 6.5.0

- Enhanced security features
- New Award Summary capabilities
- Improved template management
- Employee-Award linking

## Additional Resources

- [CRM7 Features](crm7-features.md)
- [Navigation Guide](navigation.md)
- [Navigation Improvements](progress/navigation-improvements.md)
- [Performance Report](performance-report.md)
- [Improvement Opportunities](progress/improvement-opportunities.md) - Comprehensive analysis of areas for expansion and enhancement
- [Authentication & Notes Fixes](progress/auth-and-notes-fixes.md) - Documentation of fixes for authentication and notes functionality

## Requirements Documentation

- [Compliance](requirements/compliance.md)
- [Functional](requirements/functional.md)
- [Integration](requirements/integration.md)
- [Matrix](requirements/matrix.md)
- [Performance](requirements/performance.md)
- [Security](requirements/security.md)
- [Technical](requirements/technical.md)
- [UI](requirements/ui.md)

## Development Guides

- [Development Environment](development-environment.md)
- [Module Exports](guides/module-exports.md)
- [Auth Redirect Configuration](guides/auth-redirect-configuration.md) - Practical guide for implementing redirect URLs
- [Vercel Environment Variables](guides/vercel-environment-variables.md) - Practical guide for implementing environment variables
- [QA Documentation](qa/README.md)

## Redirects

- Ensure all pages have appropriate redirects for better navigation and user experience.
- Use 301 redirects for permanent changes and 302 redirects for temporary changes.
- Maintain a list of all redirects for easy management and updates.
