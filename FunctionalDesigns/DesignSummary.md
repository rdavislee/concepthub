# Design Summary (Concise)

## What we’re building

A “Hugging Face for backend concepts”: independent **Concepts** (purpose, principle, SSF state, actions) composed only via **Syncs** (when/where/then). Goal: publish, discover, install, and reuse backend behavior with minimal coupling.

## How the pieces work together

* **Core concepts**

  * **UserAuthenticating** → register/login/logout/tokens
  * **UserSessioning** → begin/end/expire sessions
  * **UserRequesting** → record request lifecycle (CLI/HTTP glue)
  * **UserProfileDisplaying** → display name/avatar/bio
  * **ConceptRegistering** → reserve/publish/deprecate/yank versions
  * **DownloadAnalyzing** → record downloads
  * **Liking** → like/unlike items
  * **SimpleNaming** → set/clear display names
* **Key syncs**

  * Auth → Session: `login → beginSession`, `logout → endSession(*)`
  * Request router: request starts → target action → finish/fail
  * Registry owner checks: publish/deprecate/yank gated in `where`
  * Engagement: like/unlike, record download
  * Naming: auto-name on reserve; restore default on clear
  * Hygiene: expire sessions; end sessions on password change

Result: clear separation (reads are queries; only syncs compose), plus predictable lifecycles for auth, publishing, and usage.

## Concept registry (search, download, post)

* **Post**: `reserveName`, `publishVersion`, `deprecate`, `yank` (owner-gated)
* **Discover**: search by name/tags; **downloads** recorded; **likes** as signal
* **Quality signals**: pair popularity with freshness/maintenance (see ethics)

## CLI tool

* `install <name>@<version>` – fetch artifact; scaffold locally
* `upload` – reserve + publish flows
* `test` – run repo tests; emit report/badge
* `list` / `search <q>` – query registry

## Concept repo layout

```
/<concept>/
  concept/
    spec.md   # purpose, principle, SSF state, actions, queries
    code/     # optional reference impl
  test/
    spec.md   # scenarios + invariants
    code/     # runnable tests
  README.md   # high-level summary, canonical description, usage, limits
  meta.yaml   # license, tags, resource needs, data/privacy disclosures
```

(README can be LLM-assisted; still human-edited.)

## Ethics → Design (mitigations, short)

* **Supply-chain risk**: required disclosures in `meta.yaml`; security checklist; “Report issue” → moderation; owner-gated publishing; community review badge.
* **Accessibility**: step-by-step examples; simple language; ARIA-compliant UI; glossaries in READMEs.
* **Deskilling**: “How this works” sections; fundamentals links; code export; label difficulty.
* **Coercion/network effects**: open pattern + export to plain stacks; interoperability by default.
* **Data sovereignty/misuse**: data/privacy metadata; self-hosting docs; ToS forbids rights violations; privacy-focused collections.
* **Monoculture risk**: rank by recency/maintenance/response time alongside stars; “Similar concepts”; “Best used for”.
* **Sustainability**: resource-requirements metadata; minimal/serverless examples; “lightweight” tag.

## What’s still unclear

1. **Review/badging**: criteria, workflow, SLA for “Community Reviewed.”
2. **Ranking formula**: how to weight popularity vs freshness/maintenance.
3. **Default syncs**: which ship in the CLI vs live in app space.
4. **Policy enforcement**: quarantine triggers, appeals, restoration.
5. **Accessibility baseline**: minimum a11y checks for READMEs/specs.
6. **Telemetry posture**: what (if any) usage metrics are collected by default.

## Near-term next steps

* Finalize CLI verbs + wire to Requesting/sync flows.
* Ship 3–5 “gold” concepts (auth, session, registry, naming, likes) with tests.
* Stand up moderation + “Report issue” flow; define review badge rubric.
* Lock `meta.yaml` schema (license, privacy, resources, experience level, badges).
