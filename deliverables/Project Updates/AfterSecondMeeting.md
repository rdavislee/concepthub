## Second Meeting

Date: 2025-11-18 (Tue)

### Feedback (Eagon)
- Good pitch: balanced vision and detail; generated excitement.
- Narrow scope and prioritize.
- Key questions:
	- How to integrate with existing backends?
	- Download: separate registry vs. download concepts.
	- Separate download files vs. tracking/ranking; ensure clear naming (e.g., “DownloadAnalytics”).
	- When exploring different scopes, keep multiple versions in the catalog rather than modifying.
- Like vs. Download:
	- Likes require authentication; downloads can be anonymous → separate concepts.
- Version control:
	- Prefer append-only immutability over updates.
	- GitHub commit URL can serve as a specific version ID.
	- Consider parent node state.
- Developer experience:
	- Reduce iteration friction; concepts should be cheap and fast to iterate.

### User Journey & Tools
- Concept registry: search, download, post custom concepts.
- CLI tool:
	- install
	- upload
	- test
	- list concepts
- Deno subhosting: platform to test code.
- Testing/iteration loop: streamline for speed.

### Pain Points
- Early discovery: many similar concepts without downloads/likes data.
- Onboarding newcomers to concepts.
- Setting up directories/specifications for agentic AI.

### Concept Contents
- Concept = code + specification (consider JSON format).
- Tests = code + specification.
- README:
	- Human-readable summary, purpose, canonical description.
	- LLM-generated; include example usage.

### Accomplishments
- Finalizing concepts and syncs; adjusted specs.
- Direction set; execution in progress.
- MongoDB set up; frontend on Render; backend pending completion.

### Next Tasks
- Finish syncs and concepts.
- Create APIs and connect to frontend.
- Deploy backend on Render.
- Alpha: minimal functionality—liking and download counters; basic concept registry.
