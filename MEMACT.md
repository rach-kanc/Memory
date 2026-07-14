# Memact Memory

Memory is the storage layer that keeps the context you have approved.

## What Memory Does

Memory acts as the database for your provider. It stores:
- Your approved context (the facts you accept or edit).
- The evidence chains showing which apps suggested what data and when.
- The age and decay status of each fact.
- Your review history (what you accepted, modified, or rejected).

## Context Intelligence

When apps request your context through CAP, Memory helps resolve conflicting information:
- **Evidence Weighting**: Calculates an overall confidence score (0.0 to 1.0) using source trust levels and record age.
- **Freshness**: Tracks when data is current, aging, stale, or expired.
- **Contradiction Resolution**: Compares contradicting app suggestions, ranks them based on evidence, and returns the strongest active value.

## Your Controls

Memory never automatically accepts app suggestions. Everything stays pending until you decide what to do in Notebook.

You can set records to:
- `pending`: Suggestion from an app waiting for your review.
- `approved`: Accepted by you.
- `user_verified`: Confirmed or edited by you.
- `rejected`: Declined (retained only for logs).
- `forgotten`: Deleted at your request.

## Portability

You can export your approved context at any time, allowing you to move to a different provider without losing your history.

## License

Apache 2.0. Memory is open and free.
