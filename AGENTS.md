# AGENTS.md

This file contains guidelines and commands for agentic coding agents working in the mineserver-cli repository.

## Build, Lint, and Test Commands

### Primary Commands

- `npm run build` - Compiles TypeScript to JavaScript in `dist/` directory
- `npm run dev` - Runs TypeScript compiler in watch mode for development
- `npm run test` - Runs full test suite (prettier check + xo linting + ava tests)
- `npm run prepare` - Same as build, runs automatically before npm publish

### Running Individual Tests

- `ava` - Run all ava tests
- `ava path/to/test.test.ts` - Run specific test file
- `ava --match="test name"` - Run tests matching specific name pattern

### Code Quality Commands

- `prettier --check .` - Check code formatting
- `prettier --write .` - Fix code formatting
- `xo` - Run ESLint with XO configuration
- `xo --fix` - Auto-fix ESLint issues

## Project Structure

```
source/                    # TypeScript source code
├── app.tsx               # Main React app entry point
├── cli.tsx               # CLI entry point with shebang
├── ctx.tsx               # React context for page navigation
├── welcomepage.tsx       # Welcome screen component
├── components/           # React components
│   ├── welcomeselector.tsx
│   ├── newinstance.tsx
│   ├── useinstance/      # Server management components
│   └── ui/               # Reusable UI components
└── utils/                # Utility functions
    ├── downloadserver.ts
    ├── startinstance.tsx
    ├── edit.tsx
    └── initialize/       # Server initialization logic

data/versions/            # Server instances stored here
dist/                     # Compiled JavaScript output
```

## Code Style Guidelines

### General Formatting

- Use tabs for indentation (configured in .editorconfig)
- LF line endings
- UTF-8 encoding
- Trim trailing whitespace
- Insert final newline

### TypeScript Configuration

- Extends `@sindresorhus/tsconfig`
- Output directory: `dist/`
- Source files in: `source/`
- ES modules (`"type": "module"` in package.json)

### Import Style

- Use ES6 import/export syntax
- Import React components: `import React from 'react';`
- Group imports: external libraries first, then internal modules
- Use file extensions in imports (`.js`, `.ts`, `.tsx`) due to ES modules

### React/Ink Component Guidelines

- Use functional components with hooks
- TypeScript generics for type-safe props: `WelcomeSelector<T extends string>`
- Destructure props in function signature
- Use Ink components: `Box`, `Text`, `useApp`, etc.
- Follow React naming conventions (PascalCase for components)

### Naming Conventions

- Components: PascalCase (`WelcomeSelector`, `NewInstance`)
- Functions/variables: camelCase (`downloadServer`, `handleSelect`)
- Files: kebab-case for utilities (`download-server.ts`), PascalCase for components
- Constants: UPPER_SNAKE_CASE when appropriate
- Types: PascalCase with descriptive suffixes (`MenuItem<T>`, `ProgressHandler`)

### Error Handling

- Use try/catch blocks for async operations
- Throw descriptive Error objects with context
- Handle network errors with retry logic (see `streamDownloadToFile`)
- Validate responses and throw meaningful errors
- Clean up resources in finally blocks

### Type Safety

- Use TypeScript interfaces for object shapes
- Generic types for reusable components
- Type annotations for function parameters and return values
- Use `unknown` instead of `any` for untyped data
- Type guards for runtime type checking

### File Organization

- Keep related files in same directory
- Use `index.ts` files for clean exports when needed
- Separate UI components from business logic
- Utility functions in dedicated `utils/` directory
- Type definitions in dedicated files or inline

### ESLint Configuration (XO)

- Extends `xo-react` configuration
- Prettier integration enabled
- React prop-types validation disabled
- Follow XO's opinionated style guide

### Testing (AVA)

- Test files use `.test.ts` or `.test.tsx` extension
- ES module loading with `ts-node/esm`
- Use `ink-testing-library` for React component testing
- Focus on testing business logic and user interactions

### Dependencies

- React 18+ with Ink for CLI UI
- TypeScript for type safety
- Meow for CLI argument parsing
- Ava for testing framework
- XO for linting (ESLint + Prettier)
- Node.js version requirement: >=16

### Git Hooks

- Pre-commit hooks should run linting and formatting
- Use conventional commit messages
- Ensure tests pass before committing

### Performance Considerations

- Use streaming for large file downloads
- Implement progress callbacks for long-running operations
- Clean up resources properly (file handles, processes)
- Use async/await consistently for async operations

### Security Best Practices

- Validate file paths to prevent directory traversal
- Verify file hashes (SHA1) for downloaded files
- Handle user input sanitization
- Don't expose sensitive information in logs
- Use secure file permissions for server data

## Development Workflow

1. Make changes in `source/` directory
2. Run `npm run dev` for automatic compilation
3. Use `npm run test` to verify code quality
4. Test CLI functionality with `node dist/cli.js`
5. Build with `npm run build` before committing
6. Ensure all tests pass and code is properly formatted
