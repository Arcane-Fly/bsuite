# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in BSuite, please report it responsibly.

**Contact:** security@braden.com.au

**Response Time:** We aim to acknowledge receipt within 48 hours and provide a detailed response within 5 business days.

**What to Include:**
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

**What to Expect:**
- Confirmation of receipt
- Assessment of severity and impact
- Timeline for fix (if applicable)
- Credit in security advisories (unless you prefer anonymity)

Please do not disclose the vulnerability publicly until we have had a chance to address it.

## Security Best Practices

BSuite follows industry-standard security practices:

- **Authentication:** OAuth 2.1 PKCE flow with JWKS token verification
- **Authorization:** Row Level Security (RLS) on all database tables
- **Data Protection:** HTTPS everywhere, secure cookies, CSP headers
- **Dependency Management:** Regular security audits, automated vulnerability scanning
- **Code Review:** All changes require peer review before merge

## Security Updates

Security patches are released as needed. Users should keep their deployments up to date.

---

*Last updated: 2026-07-06*
