# Contributing to Auth-TS

Thank you for your interest in contributing to Auth-TS. This document covers the repository workflow for the monorepo and its published `@reasvyn/*` packages.

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
   git clone https://github.com/YOUR_USERNAME/auth-ts.git
   cd auth-ts
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
auth-ts/
├── packages/
│   ├── types/              # Shared TypeScript types
│   ├── core/               # Core auth logic
│   ├── react/              # React components & hooks
│   ├── node-sdk/           # HTTP SDK
│   ├── rbac/               # RBAC engine + bindings
│   ├── team/               # Team management module
│   └── adapters/
│       ├── express/        # Express adapter
│       └── nextjs/         # Next.js adapter
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

3. Run root validation commands:
   ```bash
   npm run lint
   npm run type-check
   npm run test
   npm run build
   ```

4. Format your code:
   ```bash
   npm run format
   ```

5. If you changed dependencies or the root manifest, refresh the lockfile with `npm install`

6. Push your branch and open a Pull Request

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
     "name": "@reasvyn/auth-my-package",
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
5. Add package-level scripts for `build`, `lint`, `type-check`, and `clean`, following the existing packages

## Testing

- Write tests for all new functionality
- Tests should live in `src/__tests__/` or alongside files as `*.test.ts`
- Run tests with `npm run test`
- Aim for high coverage, especially for security-critical code

## Documentation

- Update relevant README files when adding features
- Add JSDoc comments to exported functions and types
- Include usage examples in package READMEs

## Release Workflow

Releases are **per package**, not one global monorepo version.

1. Bump the target package version in that package's `package.json`.
2. Update any affected README or usage docs.
3. Run the root validation commands.
4. Merge the release commit.
5. Trigger the **Publish Package** workflow in GitHub Actions with the workspace name, such as `@reasvyn/auth-react`.

The workflow publishes the selected workspace package using npm and expects `NPM_TOKEN` to be configured in repository secrets.

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
