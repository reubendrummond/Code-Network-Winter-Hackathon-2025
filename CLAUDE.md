# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start development server**: `npm run dev` or `npm start` (runs on port 3000)
- **Build for production**: `npm run build` (runs Vite build + TypeScript check)
- **Preview production build**: `npm run serve`
- **Run tests**: `npm run test` (uses Vitest)

## Architecture Overview

This is a React application built with modern tooling:

### Core Stack
- **Frontend**: React 19 with TypeScript
- **Routing**: TanStack Router with file-based routing
- **Backend**: Convex for serverless functions and real-time database
- **Styling**: Tailwind CSS v4 with shadcn/ui components
- **Build Tool**: Vite with TypeScript compilation
- **Testing**: Vitest with jsdom environment

### Key Directories
- `src/routes/`: File-based routing - each .tsx file becomes a route
- `src/components/ui/`: shadcn/ui component library (fully configured)
- `src/lib/utils.ts`: Utility functions and helpers
- `convex/`: Backend functions (queries, mutations, actions)
- `convex/_generated/`: Auto-generated API types and client code

### Path Aliases
- `@/*` maps to `src/*`
- All imports should use the `@/` alias for consistency

### Component Architecture
- Uses shadcn/ui "new-york" style variant
- Components are in `src/components/ui/` with full Tailwind + Radix UI setup
- Form handling with react-hook-form and Zod validation
- Icons from Lucide React

### Convex Integration
- Backend functions go in `convex/` directory
- Use generated API from `convex/_generated/api`
- Queries use `useQuery(api.functionName, args)`
- Mutations use `useMutation(api.functionName)`

### Routing Patterns
- Root layout in `src/routes/__root.tsx`
- Index route at `src/routes/index.tsx`
- Nested routes follow file system structure
- Router includes devtools and preloading configured

## Key Configuration Notes
- TypeScript strict mode enabled with additional linting rules
- Vite configured with auto code-splitting for routes  
- TanStack Router generates route tree automatically
- Tailwind CSS v4 with CSS variables for theming
- All demo files (prefixed with "demo") can be safely deleted