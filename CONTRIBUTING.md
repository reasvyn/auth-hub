# Contributing to Auth-Hub

Thank you for your interest in contributing to Auth-Hub! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct. Please be respectful and constructive in all interactions.

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

### Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/auth-hub.git
   cd auth-hub
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Build all packages:
   ```bash
   npm run build
   ```

## Project Structure

```
auth-hub/
├── packages/
│   ├── types/        # Shared TypeScript types
│   ├── core/         # Core auth logic (framework-agnostic)
│   ├── react/        # React components & hooks
│   └── node-sdk/     # Node.js SDK
├── apps/
│   └── docs/         # Documentation site
├── turbo.json        # Turborepo config
├── tsconfig.json     # Base TypeScript config
└── package.json      # Root workspace
```

## Development Workflow

### Branching Strategy

- `main` - stable, production-ready code
- `develop` - integration branch for features
- `feature/*` - new features
- `fix/*` - bug fixes
- `chore/*` - maintenance tasks

### Making Changes

1. Create a branch from `develop`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes with clear, focused commits

3. Run tests and linting:
   ```bash
   npm run lint
   npm run type-check
   npm run test
   ```

4. Format your code:
   ```bash
   npm run format
   ```

5. Push your branch and open a Pull Request

### Commit Convention

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Build process or tooling changes

Examples:
```
feat(core): add TOTP 2FA support
fix(react): resolve LoginForm validation issue
docs(types): add JSDoc comments to AuthError
```

## Adding a New Package

1. Create directory under `packages/`:
   ```bash
   mkdir packages/my-package
   ```

2. Initialize with proper `package.json`:
   ```json
   {
     "name": "@auth-hub/my-package",
     "version": "0.0.1",
     "main": "./dist/index.js",
     "types": "./dist/index.d.ts"
   }
   ```

3. Add `tsconfig.json` extending root:
   ```json
   {
     "extends": "../../tsconfig.json",
     "compilerOptions": {
       "outDir": "./dist",
       "rootDir": "./src"
     }
   }
   ```

4. Add it to the workspace in the root `package.json`

## Testing

- Write tests for all new functionality
- Tests should live in `src/__tests__/` or alongside files as `*.test.ts`
- Run tests with `npm run test`
- Aim for high coverage, especially for security-critical code

## Documentation

- Update relevant README files when adding features
- Add JSDoc comments to exported functions and types
- Include usage examples in package READMEs

## Pull Request Process

1. Ensure all tests pass
2. Update documentation as needed
3. Add a clear description of changes
4. Reference any related issues
5. Request review from maintainers

## Security

If you discover a security vulnerability, please do **not** open a public issue. Instead, email the maintainers directly. We take security seriously and will respond promptly.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
