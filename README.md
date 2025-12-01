# ConceptHub

A concise repository for the ConceptHub project.

## Project framing

See the full plan, goals, scope, and setup in:

- [projectframing.md](./projectframing.md)

## Functional Design

Functional Design is a separate folder in the repo

## Quick Start

1. Set up environment variables:

   Copy the template file and fill in your values:

   ```bash
   cp .env.template .env
   ```

   Then edit `.env` and set:
   - `MONGODB_URL`: Your MongoDB connection string (e.g., `mongodb://localhost:27017` or MongoDB Atlas connection string)
   - `DB_NAME`: The name of the database to use (e.g., `concepthub`)
   - `SUPABASE_URL`: Your Supabase project URL (e.g., `https://your-project.supabase.co`)
   - `SUPABASE_SECRET_KEY`: Your Supabase secret key (for server-side storage operations)
   - `SUPABASE_STORAGE_BUCKET`: The name of the storage bucket to use for concepts (defaults to `concepts` if not set)

2. Generate imports (required before running server or tests):

   ```bash
   deno task import
   ```

3. Start the server:

   ```bash
   deno task start
   ```

## Setup

### Environment Variables

The application requires the following environment variables to be set in a `.env` file:

- `MONGODB_URL`: MongoDB connection string (e.g., `mongodb://localhost:27017` or MongoDB Atlas connection string)
- `DB_NAME`: Name of the database to use (e.g., `concepthub`)
- `SUPABASE_URL`: Your Supabase project URL (e.g., `https://your-project.supabase.co`)
- `SUPABASE_SECRET_KEY`: Your Supabase secret key (for server-side storage operations)
- `SUPABASE_STORAGE_BUCKET`: (Optional) The name of the storage bucket to use for concepts (defaults to `concepts` if not set)

Copy `.env.template` to `.env` and fill in your values:

```bash
cp .env.template .env
```

The `.env` file is automatically loaded by the application using Deno's dotenv support.

### Generate Imports

Before running the server or tests, generate the required imports:

```bash
deno task import
```

Or use the build task:

```bash
deno task build
```

## Running the Server

**Important:** Make sure you've run `deno task import` first (see Setup section above).

### Main Application Server

Start the main application server (with concepts and synchronizations):

```bash
deno task start
```

### Concept Server

**Note:** The import step is also required before running the concept server.

Start the concept API server (runs on port 8000 by default):

```bash
deno task concepts
```

You can customize the port and base URL:

```bash
deno task concepts -- --port 3000 --baseUrl /api
```

## Running Tests

Run all tests using Deno's test runner:

```bash
deno test --allow-net --allow-read --allow-write --allow-sys --allow-env
```

To run tests for a specific concept:

```bash
deno test --allow-net --allow-read --allow-write --allow-sys --allow-env src/concepts/LikertSurvey/LikertSurveyConcept.test.ts
```

To run engine tests:

```bash
deno test --allow-net --allow-read --allow-write --allow-sys --allow-env src/engine/test/run.ts
```
