# CLAUDE.md — CardioCrew

Behavioural guidelines for all coding work on this project.
Adapted from Andrej Karpathy's LLM coding observations and the Superpowers methodology.

## Project context
CardioCrew is a single-file PWA (`index.html`, ~7000 lines). Firebase Firestore backend.
Single `main` branch only — all work commits directly to main and deploys via GitHub Pages.
Always bump the SW cache version (`cardio-crew-vN`) on every deploy to force mobile refresh.

## Coding behaviour

### Think before coding
- State assumptions explicitly. If uncertain, ask first.
- If multiple approaches exist, present them — don't pick silently.
- Push back when a simpler solution exists.

### Simplicity first
- Minimum code that solves the problem. Nothing speculative.
- No features beyond what was asked.
- No abstractions for single-use code.
- If you write 200 lines and it could be 50, rewrite it.

### Surgical changes
- Touch only what the request requires. Don't "improve" adjacent code.
- Match existing style even if you'd do it differently.
- Every changed line must trace directly to the user's request.

### Verify before handoff
- Always test logic by reading through it before calling it done.
- Never hand off broken or unverified work.
- Include app version + SW version in every completion message.

## Git workflow
- All git via osascript (direct Bash git fails intermittently)
- Commit and push after every change — never leave work uncommitted
- Format: `git add index.html && git commit -m "..." && git push origin main`
- Clear lock files first: `rm -f .git/index.lock .git/HEAD.lock`
