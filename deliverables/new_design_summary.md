## Design Evolution Summary

Date: 2025-12-09

### From initial idea to now

1. Vision scope
	- Then: A broad “Hugging Face for backend concepts,” loosely defined modules and patterns.
	- Now: Only Concepts listings right now

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
	- Now: Defined verbs and flows: `install`, `upload`, `test`, `list`, `search`; scaffold and testing integrated; aligns with Requesting and sync lifecycles.

6. Repo layout & documentation
	- Then: Unstructured concept packaging.
	- Now: Standard repo schema (concept/test specs and code, README with canonical description/usage/limits, meta.yaml with license/tags/resources/privacy). LLM-assisted docs with human oversight.

7. Ethics & risk posture
	- Then: Risks acknowledged informally.
	- Now: Explicit mitigations: supply chain disclosures, moderation & review badge, accessibility baseline, deskilling guardrails, interoperability, data sovereignty, ranking beyond stars, sustainability metadata.

8. Unresolveds & policies
	- Then: Many open questions.
	- Now: Tracked unknowns (review/badging criteria, ranking formula, default sync set, policy enforcement, a11y baseline, telemetry posture) with near-term next steps defined.

### Key changes (changelog style)

- Introduced strict Concepts vs Syncs separation; syncs as the only composition mechanism.
- Added core concept list and lifecycles (UserAuthenticating, UserSessioning, UserRequesting, UserProfileDisplaying, ConceptRegistering, DownloadAnalyzing, Liking, SimpleNaming).
- Defined registry actions and owner gating in `where`; added discoverability signals (downloads, likes).
- Established Conceptual CLI verbs and flows tied to ConceptHub:
	- `conceptual init`
	- `conceptual list`
	- `conceptual login`
	- `conceptual install {USERNAME}/{CONCEPT_NAME}@{VERSION}` (version optional)
	- `conceptual publish {CONCEPT_NAME}`
- Standardized concept repo layout and metadata (`meta.yaml`).
- Embedded ethics mitigations and community review processes.
- Documented open questions with action items and timelines.

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
