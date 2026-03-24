# Security Policy

## Supported Versions

We actively support the following versions of Business Suite Unified:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security vulnerability in Business Suite Unified, please report it to us as soon as possible.

### How to Report

1. **Email**: Send details to security@businesssuite.com
2. **GitHub**: Create a private security advisory
3. **Include**: 
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### Response Timeline

- **Initial Response**: Within 24 hours
- **Status Update**: Within 72 hours
- **Resolution**: Based on severity (1-30 days)

### Security Best Practices

When using Business Suite Unified:

1. **Environment Variables**: Never commit `.env` files
2. **API Keys**: Use environment variables for all secrets
3. **Supabase RLS**: Ensure Row Level Security is properly configured
4. **HTTPS**: Always use HTTPS in production
5. **Updates**: Keep dependencies up to date
6. **Authentication**: Use strong passwords and enable 2FA

### Responsible Disclosure

We follow responsible disclosure practices:

1. We will acknowledge receipt of your vulnerability report
2. We will provide regular updates on our progress
3. We will notify you when the vulnerability is fixed
4. We will credit you in our security advisory (unless you prefer to remain anonymous)

Thank you for helping keep Business Suite Unified and our users safe!