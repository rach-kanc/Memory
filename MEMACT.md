# Memact — Memory

Memact is open identity infrastructure.

Users own an identity address. Apps contribute observations. The identity provider stores what users have approved.

## What Memory Does

Memory is the **identity data store** — the durable, intelligent storage layer for user-approved identity context.

Memory stores:
- **User-approved context** — observations that have passed the user's review
- **Evidence chains** — which apps contributed what, with what confidence
- **Temporal state** — how fresh or stale each piece of context is
- **Approval history** — full audit trail of what users accepted, edited, or rejected

## Intelligence in Memory

Memory implements the context intelligence that the protocol exposes through CAP responses:

| Intelligence Feature | What It Means |
|---|---|
| **Confidence scoring** | Evidence-weighted confidence (0.0–1.0) for each context entry |
| **Temporal decay** | Context freshness status: `current`, `aging`, `stale`, `expired` |
| **Evidence links** | Which observations support each context entry |
| **Negative evidence** | How contradicting observations reduce confidence |
| **Competing origins** | How conflicts between app contributions are resolved |

These are exposed through CAP responses as `confidence`, `decay_status`, and `evidence_count` fields.

## User Ownership

Memory never promotes unapproved context to approved status. Every observation from an app is pending until the user explicitly approves, partially approves, or edits it in Notebook.

Approval states:

| State | Meaning |
|---|---|
| `pending` | Contributed by an app, awaiting user review |
| `approved` | User reviewed and accepted |
| `user_verified` | User confirmed or edited the value |
| `rejected` | User reviewed and declined (kept for audit trail) |
| `forgotten` | User requested removal (GDPR right to erasure) |

## Provider Portability

User-approved context can be exported in a portable format, enabling users to migrate from one identity provider to another without losing their approved context history.

## License

Apache 2.0.
