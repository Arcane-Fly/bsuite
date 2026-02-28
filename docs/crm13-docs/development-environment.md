# Development Environment

This document outlines the development environment setup for the CRM13 project.

## DevContainer Setup

The project uses VS Code's Remote Containers feature to provide a consistent development environment. The configuration files are located in the `.devcontainer` directory.

### Recent Security Improvements

The following security improvements have been made to the container configuration:

1. **Environment Variables**: Sensitive information like database passwords are now loaded from environment variables instead of being hardcoded in the configuration files.
2. **Docker Optimization**: The Dockerfile has been optimized to reduce the number of layers and properly manage cache, improving build times and reducing image size.

### Getting Started

1. Copy `.devcontainer/.env.example` to `.devcontainer/.env`:

   ```bash
   cp .devcontainer/.env.example .devcontainer/.env
   ```

2. Edit the `.env` file to set your Supabase credentials:

   ```variables
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

   These values can be obtained from your Supabase project dashboard.

3. Open the project in VS Code and use the "Remote-Containers: Reopen in Container" command to start development.

### Configuration Files

- `devcontainer.json`: VS Code development container configuration
- `docker-compose.yml`: Multi-container Docker setup for the development environment
- `Dockerfile`: Container image definition for the development environment
- `.env.example`: Template for environment variables (copy to `.env` with your values)
- `.gitignore`: Ensures sensitive files like `.env` are not committed to the repository

### Notes

- The `.env` file is ignored by Git to prevent committing sensitive information
- Default fallback values are provided in the docker-compose.yml for convenience in development, but should be replaced with secure values in production

## Development Tools

The development container comes pre-configured with the following tools:

- Node.js 20
- PostgreSQL client
- npm-check-updates
- TypeScript
- pnpm 10.4.1

## VS Code Extensions

The development container automatically installs the following VS Code extensions:

- ESLint
- Prettier
- Tailwind CSS
- TypeScript
- React/JS Snippets
- Auto Rename Tag
- Path Intellisense
- DotENV
- Material Icon Theme
- GitHub Copilot
- GitHub Copilot Chat
- Angular Console
- Prisma
- Vitest Explorer
- IntelliCode
- Docker

## Environment Configuration

The development environment is configured with the following settings:

- Default formatter: Prettier
- Format on save: Enabled
- ESLint auto-fix on save: Enabled
- TypeScript SDK: Node modules version
- ESLint validation for JavaScript, TypeScript, and React files

## Supabase Integration

The development container is configured to connect to an online Supabase instance. This ensures consistency between development and production environments and eliminates the need to run a local Supabase instance.

The connection to Supabase is configured through environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`: The URL of your Supabase project
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: The anonymous key for your Supabase project

These values should be set in the `.devcontainer/.env` file. For more information on Supabase integration, see the [Supabase documentation](supabase/getting-started.md).
