# Clinical Aid — Study AI Chat

Standalone AI chat workspace, independent from Clinical Companion.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui (planned)
- Provider adapters for OpenAI-compatible APIs and native provider APIs

## Security

- Never commit API keys, `.env` files, access tokens, or credentials.
- Provider secrets must be accessed only by server-side routes/actions.
- Client-side BYOK values should be treated as sensitive and never logged or persisted without explicit user consent.
- Configure secrets in the deployment provider's environment settings.

## Local development

```bash
npm install
npm run dev
```

## Roadmap

- [ ] Chat UI and responsive layout
- [ ] Streaming AI responses
- [ ] Provider/model configuration
- [ ] Conversation persistence
- [ ] Gems/custom system prompts
- [ ] Markdown, code, tables, and export
- [ ] Authentication, usage limits, and deployment hardening

This project is separate from Clinical Companion; do not import, modify, or deploy that application from this repository.
