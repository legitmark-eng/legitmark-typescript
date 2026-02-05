# Security Policy

## Reporting Security Issues

Legitmark takes security seriously. If you discover a security vulnerability in this SDK, please report it responsibly.

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, please email **security@legitmark.com** with:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fixes (optional)

## Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 5 business days
- **Resolution Timeline**: Varies by severity, typically 30-90 days

## Scope

This policy applies to:

- The `legitmark` npm package
- Source code in this repository

For vulnerabilities in the Legitmark API itself (not the SDK), please contact security@legitmark.com directly.

## Safe Harbor

We support responsible disclosure. If you act in good faith to identify and report vulnerabilities following this policy, we will not pursue legal action against you.

## Best Practices for SDK Users

1. **Keep your API key secure** - Never commit API keys to version control
2. **Use environment variables** - Store credentials in `.env` files (which should be gitignored)
3. **Update regularly** - Keep the SDK updated to receive security patches
4. **Validate inputs** - Don't pass untrusted user input directly to SDK methods

Thank you for helping keep Legitmark and our partners secure.
