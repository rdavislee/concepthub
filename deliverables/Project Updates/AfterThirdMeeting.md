## Third Meeting

Date: 2025-11-25

### Notes
- Alpha goals:
	- Script to fetch concepts from public repos.

### Alpha TODOs
- Authentication/Sessioning:
	- Not needed for registering users yet.
	- Basic check: presence of a session token; consider renaming to TokenSessioning.
- Concept Registry:
	- Support uploading and downloading.
	- For alpha, link concepts to their GitHub repo.
	- Frontend: concept page links directly to GitHub for now; will change later.
	- Future: store specs and code internally (move away from GitHub reliance).
- Search:
	- Search engine may not be required; allow scrolling through concepts.
- User Journey:
	- Users can discover concepts, download for use, and upload their own.
- Backend ↔ Frontend integration:
	- Generate API spec via LLM using `design/tools/api-extraction-from-code.md` and `design/tools/api-extraction-from-spec.md`.
	- Upload API spec to frontend and have LLM wire backend APIs.
- Deployment:
	- Connect backend to Render using Deno server.
- Syncs to finish:
	- Concept registry, user authentication, and sessioning.
- Optional (defer if needed):
	- User profiling, name displaying, liking, download analysis.
- Deliverable:
	- Screen record alpha user journey.

### TODOS
- Davis & Emilliano: ConceptRegistry concept and syncs.
- Terry: Backend ↔ frontend integration via API endpoints; verify ConceptRegistry; record user journey and submit.

### Accomplishments
- Alpha completed.
- Versioning concept for beta nearly done (key feature).
- UI ready; backend complete; frontend work remains.

### Next Tasks
- Add liking and download counters to frontend.
- Adjust registering to support delete on frontend.
- Update backend as needed.
