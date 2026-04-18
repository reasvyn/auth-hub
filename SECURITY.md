# Security Policy

## Overview

Security is a core concern in Auth-TS because this repository provides authentication, authorization, session, and identity-related building blocks. We take vulnerability reports seriously and appreciate responsible disclosure.

## Reporting a Vulnerability

If you discover a security issue, please **do not open a public issue or pull request**.

Instead, report it privately via email:

- **Security contact:** [reasvyn@gmail.com](mailto:reasvyn@gmail.com)

When possible, include:

1. A clear description of the issue
2. Affected package(s), file(s), or feature(s)
3. Reproduction steps or a proof of concept
4. The expected impact and any suggested mitigation

## Scope

This policy applies to the packages and source code in this repository, including but not limited to:

- `@reasvyn/auth-core`
- `@reasvyn/auth-types`
- `@reasvyn/auth-react`
- `@reasvyn/auth-node-sdk`
- `@reasvyn/auth-express`
- `@reasvyn/auth-nextjs`
- `@reasvyn/auth-rbac`
- `@reasvyn/auth-team`

## Responsible Disclosure Expectations

Please:

- Give maintainers a reasonable opportunity to investigate and address the issue before public disclosure
- Share enough detail for us to reproduce and validate the problem
- Avoid accessing, modifying, or destroying data that does not belong to you
- Avoid disruptive testing that could affect users, systems, or infrastructure

## Support and Security Questions

For security-related questions, concerns, or support requests, use the same contact:

- **Email:** [reasvyn@gmail.com](mailto:reasvyn@gmail.com)

## Security Best Practices for Contributors

If you contribute to this repository:

- Never commit secrets, API keys, tokens, or credentials
- Prefer least-privilege defaults and explicit error handling
- Preserve type safety and validation in authentication flows
- Add or update tests for security-sensitive behavior when changing auth logic
- Report suspected vulnerabilities privately, even if you are unsure whether they are exploitable
