## Design Evolution Summary

Date: 2025-12-09

### From initial idea to now

1. Vision scope
	- Then: A broad “Hugging Face for backend concepts,” loosely defined modules and patterns.
	- Now: Only Concepts listings right now, scoped to 6.104 usage

2. Core building blocks
	- Then: Mixed set of features (auth, sessions, registry, downloads, likes, naming) without crisp lifecycles.
	- Now: Codified core concepts (UserAuthenticating, UserSessioning, UserRequesting, UserProfileDisplaying, ConceptRegistering, DownloadAnalyzing, Liking, SimpleNaming) with predictable lifecycles and hygiene (e.g., expire/end sessions, password-change endings).

3. Composition model
	- Then: Implicit coupling between features; unclear boundaries.
	- Now: Sync-driven composition: Auth→Session, request routing, registry owner checks, engagement signals, auto-naming, and hygiene flows defined in `when/where/then`.

4. Registry & discovery
	- Then: Basic idea to post/discover concepts; limited signals.
	- Now: Concrete registry actions (reserve/publish/deprecate/yank), discover via search/tags, with likes and downloads as signals; emphasis on pairing popularity with freshness/maintenance.

5. CLI experience
	- Then: Rough idea of a CLI.
	- Now: Defined verbs and flows: `install`, `login`, `init`, `list`, `publish`; scaffold and testing integrated; aligns with Requesting and sync lifecycles.

6. Repo layout & documentation
	- Then: Unstructured concept packaging.
	- Now: Standard repo schema (concept/test specs and code, README with canonical description/usage/limits, meta.yaml with license/tags/resources/privacy). LLM-assisted docs with human oversight.

7. Concept Versioning
  - Then: No versioning planned
  - Now: Versions can be downloaded and uploaded


### Key changes (changelog style)
- Established Conceptual CLI verbs and flows tied to ConceptHub:
	- `conceptual init`
	- `conceptual list`
	- `conceptual login`
	- `conceptual install {USERNAME}/{CONCEPT_NAME}@{VERSION}` (version optional)
	- `conceptual publish {CONCEPT_NAME}`
- Established LLM generated readmes to help users understand concepts
- Concepts separated by username and concept name to allow for concept name reuse
- Rely on community moderation, down the road admin moderation
- Upload files rather than git links
- Added Sessioning with authentication

### What this enables

- Faster iteration and safer composition via sync contracts.
- Predictable user flows for authentication, publishing, and usage.
- Better discovery and quality signals for concepts.
- Reproducible packaging and compliance-ready disclosures.
- A clear CLI-led workflow using the Conceptual CLI and Deno tasks.

### Exact names and commands (from README)

- Project: ConceptHub
- CLI: Conceptual (`conceptual`)
- Compile CLI:
	- `deno compile -A --output conceptual .conceptual/conceptual.ts`
- CLI commands:
	- `conceptual init`
	- `conceptual list`
	- `conceptual login`
	- `conceptual install {USERNAME}/{CONCEPT_NAME}@{VERSION}`
		- Example: `conceptual install johndoe/MyConcept@1`
	- `conceptual publish {CONCEPT_NAME}`
		- Example: `conceptual publish MyConcept`
- Workspace directories scanned by CLI: `design/concepts/`, `src/concepts/`
- Deno tasks and servers:
	- Generate imports: `deno task import` (alias: `deno task build`)
	- Start full app server: `deno task start`
	- Start concept API server: `deno task concepts` (default port 8000; configurable with `-- --port 3000 --baseUrl /api`)
