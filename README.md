# Legal Simplifier

Legal Simplifier helps you read a contract in two passes. Upload a document to get a plain-language summary, a clause-by-clause review, and suggested next steps. Then ask a specific question, such as “How much notice do I need to give before ending this lease?” Document chat searches the lease for relevant passages and returns the excerpts alongside the answer so you can check the wording yourself.

You can also compare two documents, reopen a saved analysis, and download summary and risk reports as PDFs. Use a synthetic contract if you're trying the app as a demo.

## How document chat uses RAG

The initial review sends extracted text to Groq. Follow-up questions use **retrieval-augmented generation (RAG)** to bring passages from the selected document into the conversation.

1. **Index the document when it's saved.** The server splits the text into passages, targeting 1,200 characters with 180 characters of overlap so a clause can carry across a boundary. It hashes the words in each passage into a normalized 256-dimensional vector and stores the text and vector together in PostgreSQL. These vectors represent word usage and can be computed locally. [Chunking](server/services/rag/chunkingService.js) · [Vector generation](server/services/rag/embeddingService.js)
2. **Find passages for the question.** For the lease example, the server searches only chunks belonging to that user and document. With a direct PostgreSQL connection, it combines pgvector cosine similarity with English full-text search, then reranks candidates using word overlap, phrase matches, and legal terms. With only the Supabase API configured, it fetches the document's chunks and ranks them in the backend. [Retrieval](server/services/rag/postgresVectorStore.js) · [Reranking](server/services/rag/rerankingService.js)
3. **Answer with the source in view.** The chat service takes up to five stored passages and includes them in the Groq prompt. The response carries the retrieved excerpts back to the client. If stored retrieval returns nothing and the browser supplied the original text, the server can select up to four passages from that text. [Chat implementation](server/services/aiService.js)

## Project stack

| Part | Implementation |
| --- | --- |
| Frontend | React and Vite for the browser app, Tailwind CSS for styling, Axios for API calls, and PDF.js for previews |
| Backend | Node.js 24 and Express for the API, Multer for uploads |
| Text extraction | pdf-parse for digital PDFs, Mammoth for DOCX, UTF-8 decoding for TXT, and Tesseract.js for English OCR on PNG and JPEG images |
| Analysis and chat | Groq Chat Completions, using `openai/gpt-oss-120b` by default. The backend computes the risk score from clause assessments. |
| Accounts and storage | Supabase Auth for sign-in, PostgreSQL with pgvector for analyses and searchable passages, and private Supabase Storage for original files |

## Uploads, privacy, and limits

The browser sends a Supabase access token to Express. Saved analyses include the extracted text and results. Original files stay in the private `legal-files` bucket and open through short-lived signed URLs. After a reload, the app fetches the 25 most recent saved documents. Chat stays in browser memory. Document text and chat excerpts are sent to Groq for processing.

Uploads are limited to 10 MiB, PDFs to 100 pages, and analysis input to 60,000 characters. PDFs need a text layer. Image-only scans can be uploaded as PNG or JPEG for English OCR. If clause assessment is unavailable, the app shows the partial analysis and leaves the risk score blank. PDF exports support Western European characters and common punctuation. Other scripts remain readable in the browser.

## Run locally

1. Use Node.js 24 and npm 10 or newer. Run `npm run install:all` from the repository root to install from the three lockfiles.
2. Copy `client/.env.example` and `server/.env.example` to `.env` in their respective directories. Fill in the Supabase and Groq settings.
3. Set up the database as described below.
4. Run `npm run dev` and open `http://localhost:5173`. The API runs on port 5000. Request `GET /health` for a liveness check.

You can also run `npm run dev` from `client` and `npm start` from `server` in separate terminals. Run `npm run build` from the root to build the frontend into `client/dist`.

### Database setup

For a new Supabase project, apply [server/supabase/schema.sql](server/supabase/schema.sql) and then [001_secure_document_storage.sql](server/supabase/migrations/001_secure_document_storage.sql) in the SQL Editor. For an existing installation with the base schema, review and apply the security migration before deploying the backend. Back up the database and validate on staging first.

The schema defines `app_users`, `document_analyses`, and `document_rag_chunks`. The migration enables row-level security, restricts application tables and chunk replacement to the server, adds a document/owner constraint for future writes, and creates or secures the private `legal-files` bucket. Existing chunk rows are not rewritten by the migration. Review any existing mismatched chunk ownership before validating the new constraint. Run the read-only [verification queries](server/supabase/verify.sql) to inspect the setup. Add the local and deployed frontend root URLs to the Supabase Auth redirect allowlist and set the production Site URL.

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
