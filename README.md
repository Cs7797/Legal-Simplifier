# Legal Simplifier

Legal Simplifier turns a legal document into a plain-language summary, a clause review, and suggested next steps. Users can compare two documents, ask questions about a saved document, and download PDF reports. Use synthetic documents for the demo.

## Stack

- React, Vite, Tailwind CSS, Axios, and PDF.js in the browser
- Express, Multer, pdf-parse, Mammoth, and Tesseract.js on the server
- Supabase Auth, PostgreSQL with pgvector, and private Supabase Storage
- Groq Chat Completions using `openai/gpt-oss-120b` by default

## Run locally

1. Use Node.js 24 and npm 10 or newer. Run `npm run install:all` from the repository root to install from the three lockfiles.
2. Copy `client/.env.example` and `server/.env.example` to `.env` in their respective directories. Fill in the Supabase and Groq settings.
3. Set up the database as described below.
4. Run `npm run dev` and open `http://localhost:5173`. The API runs on port 5000. Request `GET /health` for a liveness check.

You can also run `npm run dev` from `client` and `npm start` from `server` in separate terminals. Run `npm run build` from the root to build the frontend into `client/dist`.

### Database setup

For a new Supabase project, apply [server/supabase/schema.sql](server/supabase/schema.sql) and then [001_secure_document_storage.sql](server/supabase/migrations/001_secure_document_storage.sql) in the SQL Editor. For an existing installation with the base schema, review and apply the security migration before deploying the backend. Back up the database and validate on staging first.

The schema defines `app_users`, `document_analyses`, and `document_rag_chunks`. The migration enables row-level security, restricts application tables and chunk replacement to the server, adds a document/owner constraint for future writes, and creates or secures the private `legal-files` bucket. Existing chunk rows are not rewritten by the migration. Review any existing mismatched chunk ownership before validating the new constraint. Add the local and deployed frontend root URLs to the Supabase Auth redirect allowlist and set the production Site URL.

## How it works

The browser signs in through Supabase and sends a bearer token to Express. The API validates files and extracts text from digital PDFs, DOCX, UTF-8 TXT, and JPEG/PNG images. OCR supports English images. Scanned PDFs return an unsupported message. Files are limited to 10 MiB, PDFs to 100 pages, and analysis input to 60,000 characters.

Groq receives text for language detection, summary, clause analysis, and review suggestions. If clause assessment is unavailable, the UI displays a partial result without a risk score. Summary and risk reports are available for download, and generated draft PDFs open in a preview. PDF exports support Western European characters and common punctuation. Other scripts remain readable in the browser.

Saved analyses store source text and results in Supabase. Original files go to private Storage and are opened through short-lived signed URLs. In-session data and chat are kept in browser memory. The most recent 25 saved documents return from Supabase after a reload. On first use after upgrading, the app clears older browser-only history and chats. Document text or excerpts are sent to Groq during analysis and contextual chat. Review your providers' data handling before using sensitive documents.

### Document chat and retrieval

Initial analysis sends document text directly to Groq. Follow-up chat can retrieve excerpts from the current document. On save, the server splits text into overlapping chunks and stores 256-dimensional token-hash vectors in PostgreSQL. With an optional direct Postgres connection, retrieval combines pgvector cosine similarity and English full-text search. The Supabase API path retrieves stored chunks and ranks them locally. If stored retrieval yields no match, chat can search the text sent by the browser. The assistant returns the retrieved excerpts with its answer.

## Deployment

### Render backend

The backend-only [Render blueprint](render.yaml) uses the `server` directory, builds with `npm ci --omit=dev`, starts with `npm start`, and checks `/health`. Render supplies `PORT`.

| Variable | Value |
|---|---|
| `NODE_VERSION` | `24.22.3` |
| `NODE_ENV` | `production` |
| `FRONTEND_ORIGIN` | Exact HTTPS Vercel origin, with no trailing slash. Use comma-separated origins for explicitly allowed previews. |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only Supabase service-role credential |
| `GROQ_API_KEY` | Server-only Groq API key |
| `GROQ_MODEL` | Optional Chat Completions model that supports JSON mode. Defaults to `openai/gpt-oss-120b`. |
| `POSTGRES_URL` | Optional, certificate-verified connection to the same Supabase database for direct hybrid retrieval |
| `TRUST_PROXY_HOPS` | Optional. Configure only for a verified proxy path. |

### Vercel frontend

Use the repository root with the existing [Vercel configuration](vercel.json). Set `VITE_API_URL` to the Render HTTPS base URL, `VITE_SUPABASE_URL` to the Supabase project URL, and `VITE_SUPABASE_ANON_KEY` to the public Supabase key. A frontend build is required when these values change. Put server credentials on Render.

The existing same-origin Vercel API routing remains available when `VITE_API_URL` is empty in production. The Render setup above sends application API traffic directly to Render.

## License

[MIT](LICENSE). English OCR data is provided by the `@tesseract.js-data/eng` dependency.
