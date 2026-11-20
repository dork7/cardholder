# Work log: search debounce (#52)

- Home and Notes now settle typing after 250 ms before filtering. A new keystroke cancels the pending query, and clearing search restores the full list immediately.
- Document Details (.md) search runs after the shared debounce and still ignores stale async results. While a new query settles, an empty list says "Searching…" instead of showing a no-results message for the previous query.
- Updated Home and Notes screen tests with controlled timers for delay, cancellation, clear, and no-results behavior. The existing tag, person, sort, and view behavior is preserved.
