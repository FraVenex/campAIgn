# Agent Instructions

## Package Manager
Use **npm**: `npm install`, `npm run dev`, `npm run build`

## Commit Attribution
AI commits MUST include:
```
Co-Authored-By: Antigravity <antigravity@google.com>
```

## File-Scoped Commands
| Task | Command |
|------|---------|
| Typecheck | `npx tsc --noEmit` |
| Lint | `npx eslint .` |
| Test | `npm test` |

## Key Conventions
- **Language**: Code in English, Documentation/UI in Italian.
- **Atomic Tasks**: Work in small steps.
- **Context**: Always read `./docs/context/` before starting.
- **Design**: Minimal, warm, agricultural (Beige/Sage).
- **Arnaldo**: The AI agent is called "Arnaldo".

## Project State
See [docs/context/project-state.md](docs/context/project-state.md) for current progress.
