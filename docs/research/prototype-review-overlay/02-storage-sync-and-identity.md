# Where Review Comments, Grades, and Context Live: Storage, Sync, and Identity for a Prototype Review Overlay (2026)

**Scope.** This document answers one question for the prototype-review-overlay stream: where do the overlay's comments, grades, and generation-context records live, how do a small team's reviewers see each other's, and who is the reviewer — weighing the owner's three options: save locally, save to GitHub as a sibling document next to the prototype, or save elsewhere. The overlay must drop into (a) single-file HTML artifacts with no build step, including Claude Code artifacts under their CSP, and (b) Vite/React/Next dev apps. Out of scope: the overlay UI itself, the hosted comment surfaces (Vercel, Netlify, Lovable, Claude Design) already covered in [02 — Feedback on code prototypes and flows](../design-sdlc/02-feedback-on-code-prototypes-and-flows.md) and [skill-resources/review-and-feedback.md](../../../skill-resources/review-and-feedback.md), and the tuning loop that consumes grades. The sibling document designed here feeds the prototype ledger row in [skill-resources/prototype-governance.md](../../../skill-resources/prototype-governance.md). Every vendor claim was checked against the live page on 2 September 2026 and is marked **fetched OK** or **search-verified only**; Claude artifact runtime facts come from the runtime contract's type definitions as served to this session (contract 0.2.39), which the public docs page does not cover. Free-tier limits are snapshots.

---

## Table of Contents

1. [The local-only tier](#1-the-local-only-tier)
2. [GitHub as the backend](#2-github-as-the-backend)
3. [Hosted lightweight backends](#3-hosted-lightweight-backends)
4. [Local-first and CRDT sync](#4-local-first-and-crdt-sync)
5. [Identity for a small team without an auth server](#5-identity-for-a-small-team-without-an-auth-server)
6. [Data model and conflict handling](#6-data-model-and-conflict-handling)
7. [Privacy and security](#7-privacy-and-security)
8. [Cross-cutting themes](#8-cross-cutting-themes)
9. [Recommendations](#9-recommendations)
10. [Templates](#10-templates)
11. [Candidate picks for skill-resources](#11-candidate-picks-for-skill-resources)
12. [Sources](#12-sources)

---

## 1. The local-only tier

### What it is
What the overlay can do with no network: browser storage (localStorage, IndexedDB, OPFS), the File System Access API for writing a real file beside the prototype, download fallbacks, the "sidecar file" convention (`page.html` + `page.review.json`), and the specific box a Claude Code artifact puts you in.

### Why it matters
This is the floor every other tier degrades to when a backend is blocked by CSP or paused for inactivity. If the overlay cannot save here, it loses reviews.

### Key findings
- **localStorage is small and, on Safari, temporary.** Web Storage is capped at "10 MiB" per origin ("up to 5 MiB for localStorage"); IndexedDB/OPFS quotas are large (Chromium "up to 60% of total disk size") but best-effort unless `navigator.storage.persist()` is granted, and eviction removes an origin's data "all at once." Safari's ITP rule: if an origin "has no user interaction (click/tap) in last 7 days of browser use, its script-created data is deleted" ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria), fetched OK). Browser storage is a write-ahead buffer, not a record.
- **The File System Access API is Chromium-only.** `showSaveFilePicker` is supported in Chrome/Edge 86+ and "Not supported" in every Firefox and Safari version; 75.07% global usage ([caniuse](https://caniuse.com/mdn-api_window_showsavefilepicker), fetched OK). It throws `SecurityError` without transient user activation ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/showSaveFilePicker), fetched OK). Handles "can also be serialized into an IndexedDB database instance" ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API), fetched OK), and since Chrome 122 a stored handle can be re-granted with "Allow on every visit" ([Chrome blog](https://developer.chrome.com/blog/persistent-permissions-for-the-file-system-access-api), fetched OK). So on Chrome the overlay can remember the prototype's directory and write `page.review.json` next to `page.html`; elsewhere the fallback is a download.
- **OPFS is cross-browser but invisible** — "private to the origin of the page and not visible to the user," Baseline since March 2023 ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system), fetched OK). A good buffer for a JSONL log; still has to be exported.
- **Downloads are blocked inside a sandbox** without `allow-downloads` ([MDN iframe](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe), fetched OK), which matters because Claude artifacts render in a sandboxed `*.claudeusercontent.com` frame.
- **Sidecar files break when moved:** "most operating systems and file managers have no knowledge of these relationships" ([Wikipedia](https://en.wikipedia.org/wiki/Sidecar_file), fetched OK). Copy the XMP convention (same basename) and put the `PROTO-` ledger id plus a content hash *inside* the sidecar so an orphan can be re-associated.
- **What a Claude Code artifact can and cannot do.** Public docs: the CSP "lets `fetch`, XHR, and WebSocket calls reach only the page's own origin and the Google Fonts hosts," scripts load only from cdnjs, jsDelivr `/npm/`, Tailwind, and jQuery CDNs, and "An artifact is a static page. It can't store data submitted through a form or authenticate viewers itself"; relative links "do not resolve" ([artifacts docs](https://code.claude.com/docs/en/artifacts), fetched OK). So no third-party API and no sibling file. The undocumented layer is the runtime contract (0.2.39, read from `claude.d.ts`, `db.d.ts`, `downloads.d.ts`): this account's roster is `artifact, db, downloads, mcp, room, sample, self`, reached via `await claude.use(name)` (resolves `null` when unavailable):

| Capability | What it gives the overlay | Contract limits |
|---|---|---|
| `db` | "A persistent, realtime document store for this artifact, shared by its viewers" — JSON docs, `get/set/update/delete`, `where/orderBy/limit`, live `onSnapshot` | "at most 5,000 documents"; "256 KiB" per doc; "last-writer-wins; there are no transactions"; queries scan |
| `downloads` | `save({filename, data})`; "The viewer sees a confirmation and may decline" | allowlist includes `json md html csv txt`; 16 MiB cap |
| `artifact` (ex-`self`) | `artifact.publish(html)` republishes the page; every open view reloads | conflict is "routine… no retry" |

A `db`-declaring artifact "is organization-internal and cannot be shared publicly, so every reader and writer is a signed-in member of the owner's organization." A `user` capability (`Claude.user.id`, `canEdit()`, `isOwner()`, private `data/users/{self}`) is referenced by the `db` contract but **is not in this account's roster** — per-viewer identity exists on the platform but was not verifiable as available.

### Open questions
- Will the `db`/`downloads` runtime and the `user` capability be documented and reach Team plans?
- Is a Chrome-only write-beside-file path acceptable for a Safari-heavy design team? Design the download path first.

---

## 2. GitHub as the backend

### What it is
Using the prototype's repository as the review store: committing a sibling doc from the browser (Contents/Git Data API, Octokit) or via the agent; threads in Issues, Discussions (giscus/utterances), PR review comments, or git notes; and the auth paths that need no server.

### Why it matters
The prototype, the ledger, and the tuning data already live in GitHub, and the agent already has write access. The question is whether the *browser* should also write, because every browser-writes path costs a token or a proxy.

### Key findings
- **REST is CORS-open; the OAuth endpoints are not.** "The REST API supports cross-origin resource sharing (CORS) for AJAX requests from any origin" ([GitHub docs](https://docs.github.com/en/rest/using-the-rest-api/using-cors-and-jsonp-to-make-cross-origin-requests), fetched OK), so a browser with a token can `PUT /repos/{owner}/{repo}/contents/{path}` (`message`, base64 `content`, `sha` on update; "1 MB or smaller" for full functionality; parallel writes conflict — "You must use these endpoints serially") ([Contents API](https://docs.github.com/en/rest/repos/contents?apiVersion=2022-11-28#create-or-update-file-contents), fetched OK). Multi-file commits use trees with `base_tree` and `tree[]` entries, then "commit the tree and then update a branch" ([Trees API](https://docs.github.com/en/rest/git/trees?apiVersion=2022-11-28#create-a-tree), fetched OK). Octokit runs in the browser from `esm.sh` but "You must not expose your app's client secret" ([octokit.js](https://github.com/octokit/octokit.js), fetched OK). esm.sh is not on the artifact CDN allowlist and the artifact CSP blocks `api.github.com` anyway — **browser-writes-to-GitHub is a Vite/static-mockup path, never an artifact path.**
- **Getting the token is the whole problem.** The web flow's token exchange requires "The client secret" ([Authorizing OAuth apps](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps), fetched OK); `login/oauth/access_token` reportedly lacks CORS ([isaacs/github #330](https://github.com/isaacs/github/issues/330), search-verified only). The device flow needs no secret, GitHub Apps can enable it, tokens expire "after 8 hours" with 6-month refresh tokens ([GitHub App user tokens](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app), fetched OK) — but GitHub positions it for "headless apps, such as CLI tools," and no evidence of CORS on the `github.com` device endpoints was found. Treat device flow as unusable from a page without a proxy (not verified positively).
- **Fine-grained PATs in localStorage: zero infrastructure, documented risk.** GitHub "recommends… fine-grained personal access tokens," scoped to specific repos and permissions, 30-day default expiry, org approval available ([Managing PATs](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens), fetched OK). OWASP: "A single Cross Site Scripting can be used to steal all the data in these objects" ([OWASP](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html), fetched OK). A prototype is untrusted generated code loading CDN scripts; a PAT there is tolerable only on a review-only repo.
- **The one-file OAuth proxy is a solved pattern.** Decap: "Because GitHub requires a server for authentication" ([Decap](https://decapcms.org/docs/github-backend/), fetched OK). [sveltia-cms-auth](https://github.com/sveltia/sveltia-cms-auth) (fetched OK) is "a simple Cloudflare Workers script" doing the exchange with `GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET` and an `ALLOWED_DOMAINS` guard. Netlify's Git Gateway is "deprecated… new Git Gateway configurations are not recommended" ([Netlify](https://docs.netlify.com/manage/security/secure-access-to-sites/git-gateway/), fetched OK).
- **giscus is the right model with the wrong requirements.** Comments live in Discussions ("No database needed"), a page maps by pathname, URL, title, `og:title`, "a specific term," or number, and the bot "will automatically create a discussion the first time someone leaves a comment"; it requires "The repository is public" ([giscus](https://github.com/giscus/giscus), [giscus.app](https://giscus.app/), fetched OK). utterances does the same on Issues ([utterances](https://github.com/utterance/utterances), fetched OK). What transfers: one discussion per prototype keyed by the `PROTO-` id (not pathname — deployments move), comments via `addDiscussionComment` with `replyToId` ([Discussions GraphQL](https://docs.github.com/en/graphql/guides/using-the-graphql-api-for-discussions), fetched OK), GitHub identity for free. What does not: the public-repo requirement; a private repo needs an authenticated writer — the agent.
- **PR review comments are line-anchored** (`commit_id`, `path`, `line`, `side`, `subject_type: file`; "Not using the latest commit SHA may render your comment outdated") ([PR comments API](https://docs.github.com/en/rest/pulls/comments?apiVersion=2022-11-28#create-a-review-comment-for-a-pull-request), fetched OK) — a destination for a grade, not the store.
- **git notes are invisible.** "notes are not shared automatically… until you explicitly push them," and "GitHub, GitLab, Bitbucket, and Azure DevOps don't show notes" ([Ken Muse](https://www.kenmuse.com/blog/storing-data-in-git-objects-with-notes/), fetched OK; [git-notes](https://git-scm.com/docs/git-notes), fetched OK). Rejected.
- **The agent is already a first-class writer.** The GitHub MCP server exposes `create_or_update_file`, `push_files`, `issue_write`, `discussion_comment_write`, `pull_request_review_write` ([github-mcp-server](https://github.com/github/github-mcp-server), fetched OK); `gh api` sends `-F key=@file` and `--input` bodies ([gh api](https://cli.github.com/manual/gh_api), fetched OK).

| | Browser → GitHub | Browser → file/clipboard → agent → GitHub |
|---|---|---|
| Works in a Claude artifact | No (CSP) | Yes (`downloads` or copy-as-prompt) |
| Works in Vite/Next | Yes | Yes |
| Credential in the page | PAT or Worker-issued OAuth token | None |
| Multi-reviewer conflict | Contents API 409 on stale `sha` | Agent merges per-reviewer files |
| Teammate visibility | After push | After the agent's next commit |

The second column wins on every row but latency; latency is solved by the artifact `db` or a hosted backend when it matters.

### Open questions
- Is a GitHub App on a dedicated `design-reviews` repo with a Worker minting short-lived tokens small enough to count as "no server"?
- A Discussions-backed widget for private repos with an authenticated proxy: none found.

---

## 3. Hosted lightweight backends

### What it is
Backends a small team can stand up in an hour for live review records: Supabase, PocketBase, Convex, InstantDB, Val Town, Cloudflare Workers + D1/KV/Durable Objects, Deno KV, PartyKit/PartyServer, Firebase.

### Why it matters
In a Vite app a hosted store buys realtime visibility and an identity layer for one project setup. What matters here: idle pausing, whether the browser can write with only a public key safely, and whether the free tier survives a design team's usage.

### Key findings

| Backend | Free tier (vendor page, 2 Sep 2026) | Notes | Verified |
|---|---|---|---|
| [Supabase](https://supabase.com/pricing) | "500 MB database size", "1 GB file storage", "50,000 monthly active users", Realtime "200" peak connections, "Limit of 2 active projects"; Pro "from $25/month" | "Free projects are paused after 1 week of inactivity"; anon key safe only with RLS: "A table in an exposed schema without RLS is readable and writable by any role with a grant on it" ([RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)); Broadcast/Presence/Postgres Changes ([Realtime](https://supabase.com/docs/guides/realtime)) | fetched OK |
| [PocketBase](https://pocketbase.io/docs/) | Open source, self-hosted; v0.40.2 | "NOT recommended for production critical applications yet"; "Only on a single server, aka. vertical"; "10 000+ persistent realtime connections on a cheap $4 Hetzner CAX11 VPS" ([FAQ](https://pocketbase.io/faq/)) | fetched OK |
| [Convex](https://www.convex.dev/pricing) | "Developers (1-6)", "1M" function calls, "0.5 GB" storage; Pro "$25 per developer/month" | Starter allows 20 free projects (search-verified only); idle pause not documented | fetched OK |
| InstantDB | **Sunsetting**: "New signups are closed… On August 31st, 2027, all cloud apps will shut down"; subscriptions "started after July 31st, 2026 will be fully refunded"; "All of Instant is open source" ([announcement](https://www.instantdb.com/essays/instant_team_joins_openai)) | Out | fetched OK |
| [Val Town](https://www.val.town/pricing) | "100,000 runs / day"; Pro "$21/mo"; SQLite "10mb on the free plan" ([docs](https://docs.val.town/std/sqlite/)) | A webhook host, not a store | fetched OK |
| [Cloudflare Workers](https://developers.cloudflare.com/workers/platform/pricing/) | Workers "100,000 per day"; KV "1,000 / day" writes; D1 "100,000 / day" rows written, "5 GB (total)"; Durable Objects on Free with SQLite backend | KV's write budget rules it out for per-comment writes; D1 is ample | fetched OK |
| Deno KV | "still in development… `--unstable-kv`" ([manual](https://docs.deno.com/deploy/kv/manual/)); "Deno Deploy Classic… will be shut down on July 20, 2026"; "existing KV data is not automatically migrated" ([migration](https://docs.deno.com/deploy/migration_guide/)) | Avoid for anything that must last a year | fetched OK |
| PartyKit → [PartyServer](https://github.com/cloudflare/partykit) | Cloudflare repo; Durable-Object rooms; packages include PartyServer, PartySocket, Y-PartyServer; "Work in Progress" | The Yjs backend for section 4 | fetched OK |
| [Firebase](https://firebase.google.com/pricing) Spark | Firestore "1 GiB total", "50K reads/day", "20K writes/day"; RTDB "100" connections; Auth "50K MAUs" | Safe with Security Rules | fetched OK |

- **Supabase is the default hosted pick**: rows, Realtime, Auth with magic links and GitHub, on a free tier a design team will not exceed. Hazards are documented: RLS on every exposed table (the prototype-governance doc's CVE-2025-48757 list is exactly this failure) and the one-week pause, so the overlay must buffer locally and retry.
- **Cloudflare Workers + D1 is the "one file" option** and the same host as the OAuth proxy and Cloudflare Access gate — one Worker can exchange the GitHub code, store reviews, and read the Access identity.
- **PocketBase** fits if a VPS already exists; its docs refuse the word "production" before 1.0.

### Open questions
- Whether Convex pauses idle free projects is not on its page; Supabase and PowerSync both do.

---

## 4. Local-first and CRDT sync

### What it is
Yjs and Automerge with their providers and sync servers, and the hosted sync engines (Liveblocks, Electric, Jazz, Zero, Triplit, PowerSync), plus Replicache's fate.

### Why it matters
Comments and grades are append-mostly, single-author records; most CRDT machinery solves a problem the overlay does not have. It earns its keep only for live co-review on the same page.

### Key findings
- **Yjs: small providers, do not rely on the free signaling.** y-webrtc peers "find each other by connecting to a signaling server"; defaults are `wss://signaling.yjs.dev` plus two `herokuapp.com` URLs; a room password lets you "securely use public / untrusted signaling instances" ([y-webrtc](https://github.com/yjs/y-webrtc), fetched OK; whether the Heroku defaults still respond: not verified). y-websocket's server "was previously included in y-websocket and now lives in a forkable repository," with production pointers to `@y/hub`, hocuspocus, y-sweet ([y-websocket](https://github.com/yjs/y-websocket), fetched OK); y-indexeddb persists locally and "facilitates offline editing" ([y-indexeddb](https://github.com/yjs/y-indexeddb), fetched OK). y-sweet advertises a free managed tier (search-verified only). A `Y.Array` of comment records on Y-PartyServer is the smallest live-co-review stack.
- **Automerge: right model, unsecured reference server.** automerge-repo has IndexedDB and Node-filesystem storage adapters and WebSocket/BroadcastChannel network adapters ([automerge-repo](https://github.com/automerge/automerge-repo), fetched OK); the sync server "is an unsecured Express app," "partly for demonstration purposes" ([sync server](https://github.com/automerge/automerge-repo-sync-server), fetched OK). The filesystem adapter hints at an agent-held replica in the repo — a research project, not an afternoon.
- **Liveblocks Comments can be the whole comment layer.** Free: "200 comments" per month, "3,000 minutes", "10" projects, hard caps that pause; Pro "$30/mo" with comments at "$0.01 per comment" beyond ([pricing](https://liveblocks.io/pricing), fetched OK). Threads carry "custom metadata" and can be queried by it ([docs](https://liveblocks.io/docs/ready-made-features/comments), fetched OK); the Overlay Comments example shows "comments overlaid on any website" ([example](https://liveblocks.io/examples/overlay-comments/nextjs-comments-overlay), fetched OK; x/y-in-metadata mechanics search-verified only). React-shaped, needs your token endpoint, data lives with Liveblocks: a Vite fit, not an artifact fit, and a comment surface rather than the sibling doc.
- **Electric, Jazz, Zero, Triplit, PowerSync are overkill.** Electric (now electric.ax): reads free, "$1 per 1M writes", "Under $5/mo waived", writes through your own API ([pricing](https://electric.ax/pricing), fetched OK). Jazz is in "Jazz v2 alpha" ([jazz.tools](https://jazz.tools/), fetched OK). Zero needs Postgres + `zero-cache`, Hobby "$30/mo" ([zero.rocicorp.dev](https://zero.rocicorp.dev/), fetched OK); Replicache archived June 2026 (search-verified only). Triplit is AGPL and self-hostable ([repo](https://github.com/aspen-cloud/triplit), fetched OK); its cloud status: not verified. PowerSync free: "Up to 50 peak concurrent clients", "deactivated after 1 week of inactivity" ([pricing](https://www.powersync.com/pricing), fetched OK).

### Open questions
- A maintained Yjs-doc-to-git-file bridge so the agent's replica *is* the sibling doc: none found.

---

## 5. Identity for a small team without an auth server

### What it is
How the overlay knows the reviewer: typed name, signed links, Netlify Identity, Clerk/Auth.js, GitHub OAuth via a Worker, Cloudflare Access or Vercel Deployment Protection as the gate, and the Claude artifact viewer.

### Why it matters
A grade with no reviewer is unweighable in a tuning loop; a forgeable one is worse. A full auth stack is disproportionate. Borrow the identity of whatever already gates the page.

### Key findings
- **Name-in-localStorage is a label, not an identity**; store it as the display name alongside a host-provided identity, never as something a rule checks.
- **Signed links are a gate, not an identity.** Vercel Shareable Links grant "external access to specific branch deployments through a secure query parameter"; holders comment only "if… logged in with their Vercel account" ([Vercel](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection), fetched OK).
- **Netlify Identity survived; Git Gateway did not.** "Netlify Identity will continue as a supported authentication option… No required migrations" ([Netlify](https://www.netlify.com/blog/auth0-extension-identity-changes/), fetched OK).
- **Clerk/Auth.js assume an app.** Clerk free "50,000 MRU… per app", Pro "$25/mo" ([Clerk](https://clerk.com/pricing), fetched OK); Auth.js is "Free and open source" ([authjs.dev](https://authjs.dev/), fetched OK) but its GitHub provider needs `AUTH_GITHUB_ID`/`AUTH_GITHUB_SECRET` inside a framework route handler ([provider](https://authjs.dev/getting-started/providers/github), fetched OK) — Next yes, Vite SPA or static file no.
- **GitHub OAuth via the sveltia-style Worker** yields a token; `GET /user` gives login and id — the best identity for a repo-bound team.
- **Cloudflare Access is the cheapest real gate.** One-time PIN needs no IdP: "Cloudflare only sends the email if the user is allowed by an Access policy" ([OTP](https://developers.cloudflare.com/cloudflare-one/identity/one-time-pin/), fetched OK); policies allow emails, domains, GitHub/Google ([policies](https://developers.cloudflare.com/cloudflare-one/policies/access/), fetched OK). Free plan up to 50 users: search-verified only (Cloudflare's own pricing table did not render).
- **Vercel Authentication is on every plan;** Password Protection is a Pro add-on at "$150 per month" ([Vercel](https://vercel.com/docs/deployment-protection), fetched OK).
- **Claude artifact identity is org membership.** Artifact content "is visible only to authenticated members of the publishing organization, unless the artifact is shared publicly"; comments need Team/Enterprise ([artifacts docs](https://code.claude.com/docs/en/artifacts), fetched OK). The `db` contract keys rules on sharing level (`view` < `interact` < `admin` < `owner`); per-viewer `user.id` is behind a capability not in this roster.

| Where the prototype runs | Identity source | Record stores |
|---|---|---|
| Claude Code artifact | claude.ai org membership + sharing level; typed name | `{name, source:"claude-org", level}`; `id` when `user` is available |
| Vite/Next on Vercel preview | Vercel Authentication | Vercel user, `source:"vercel-auth"` |
| Vite/Next behind Cloudflare Access | Access OTP/GitHub/Google | `{email, source:"cf-access"}` verified by the Worker |
| Static mockup, GitHub-grade identity wanted | GitHub OAuth via Worker | `{login, id, source:"github"}` |
| File opened from disk | localStorage name | `{name, source:"local", verified:false}` |

### Open questions
- When `user` reaches Team plans, is it an id only or also a name/email? The contract promises `id`.

---

## 6. Data model and conflict handling

### What it is
Event log versus document, per-reviewer files, JSON versus JSONL versus Markdown with front-matter, what the platforms' thread shapes have in common, and a schema.

### Why it matters
The record is read by a human in a PR, an agent that merges and tunes, and the ledger — and written by several reviewers through a git history that hates concurrent edits to one file.

### Key findings
- **Append events, read a document.** JSON Lines is "a great format for log files" processed "one record at a time" ([jsonlines.org](https://jsonlines.org/), fetched OK). Reviewers append events to their own JSONL; the agent folds them into one `review.json`. In LWW stores (artifact `db`, hosted backends) the same rule: one document per comment or grade with an immutable id, never one big document everyone rewrites; the `db` contract warns against one document per *event* against its 5,000-document cap.
- **Per-reviewer files cannot conflict.** Concurrent edits to one file 409 on the Contents API or conflict in git; `reviews/<proto>/<reviewer>.jsonl` never collides, and the merged file has exactly one writer, the agent.
- **JSON for machines, Markdown for the PR.** Front matter "must be the first thing in the file… valid YAML set between triple-dashed lines" ([Jekyll](https://jekyllrb.com/docs/front-matter/), fetched OK). Generate `page.review.md` from `page.review.json`, never the reverse — the governance doc's "no artifact hand-maintained in two places."
- **Common denominator of platform threads.** Vercel's CLI returns threads with id, author, "page path," messages, filterable by `--page`, `--author`, `--content-id`, with `inspect --context` adding "framework and device details" ([vercel comments](https://vercel.com/docs/cli/comments), fetched OK); Liveblocks threads carry metadata; PR comments anchor to path + line + commit. Shared shape: thread → messages, a page key, a resolve state, some anchor. None carries a pass/fail grade or generation context — the overlay's actual job.
- **Anchor redundantly**: selector, text snippet, bounding box at a recorded viewport, route, state description, so the element can be re-found after regeneration.

### Open questions
- Keep per-reviewer grades and a team verdict? Both: the tuning loop weights reviewers, the ledger wants one outcome.

---

## 7. Privacy and security

### What it is
What the overlay must never ship or store.

### Why it matters
A script with DOM read access, screenshots, and a durable write path is an exfiltration primitive in the wrong build.

### Key findings
- **No credential in the page** beyond a public key that is worthless without server rules (Supabase anon key with RLS, Firebase config with Security Rules, a Liveblocks public key). OWASP: localStorage "is always accessible by JavaScript." Generated prototypes routinely embed app keys; the overlay's DOM capture must not copy them into a record.
- **Dev-only, like Vercel comments and Agentation.** Mount behind `import.meta.env.DEV` or a flag on a protected preview; CI checks the overlay bundle is absent from production.
- **Mask by default.** Sentry Session Replay "will mask all text content with `*` and block all media elements" by default, with `sentry-mask`/`sentry-block` and `mask`/`unmask` selectors ([Sentry](https://docs.sentry.io/platforms/javascript/session-replay/privacy/), fetched OK); rrweb exposes `maskAllInputs`, `maskTextClass`, `blockClass` ([rrweb](https://github.com/rrweb-io/rrweb/blob/master/guide.md), fetched OK). Copy the defaults; let the reviewer unmask deliberately.
- **Capture anchors, not subtrees.** `outerHTML` carries hidden inputs, `data-*` state, and inline JSON; strip `script`, hidden inputs, and secret-shaped strings before anything leaves the page.
- **Shared data is untrusted input** — the `db` contract says "Never store secrets; shared data is untrusted." Comments are prompt-injection vectors when an agent reads them; treat them as data.
- **Residency:** artifact content and `db` documents sit on "Anthropic-operated infrastructure" with org retention and audit events; the agent-commit path is the only one keeping review data in the same place as the prototype.

### Open questions
- A secret-regex list small enough to inline in an overlay: not surveyed.

---

## 8. Cross-cutting themes

1. **The host decides the tier.** An artifact has `db`, `downloads`, and `artifact.publish` and nothing else; a Vite app can do anything. One overlay, two adapters, chosen by `await claude.use("db")`.
2. **Browser storage is a buffer, never the record** (Safari's 7-day eviction, best-effort quotas).
3. **The agent is the best GitHub writer**; every browser path costs a token or a Worker.
4. **Identity is borrowed, not built** — org membership, Vercel Auth, Cloudflare Access, or GitHub OAuth through one Worker.
5. **Append per author, merge once** — no git conflicts, no 409s.
6. **The comment surfaces exist; the grade-and-context record does not** — hence the sibling doc.
7. **Vendors churn; the file does not.** InstantDB sunset, Deploy Classic shutdown, Replicache archived, Git Gateway deprecated, Netlify Identity un-deprecated — all within about a year.

---

## 9. Recommendations

- **Default to Tier 2, "browser writes a file, agent commits."** Works in both hosts, no credential in the page, review data beside the prototype, feeds the ledger, vendor-proof. Latency is acceptable for async review.
- **Add Tier 1, the artifact `db`, for artifact-hosted prototypes on org-sharing plans**: one document per comment and per grade under `reviews/<proto>/…`, `onSnapshot` for live teammates, an "Export review.json" button on `downloads`. Treat `user` as an upgrade path.
- **For Vite/Next apps needing live co-review, add Supabase or Worker + D1 (Tier 4)** behind the existing preview gate; RLS everywhere; buffer against the weekly pause; the agent exports to Tier 2 nightly.
- **Never put a GitHub token in a page.** If reviewers must commit from the browser, deploy the sveltia-cms-auth pattern to a review-only repo — Tier 3, with a server.
- **Liveblocks only for a finished comment UI in a React app**; CRDTs only for simultaneous editing.
- **Dev-only, mask by default, anchors not subtrees, comments are untrusted.**

| Tier | Backend | Auth / identity | Sync | Single-file artifact? | Vite/Next? | When |
|---|---|---|---|---|---|---|
| **0 Local-only** | localStorage/IDB/OPFS buffer → `showSaveFilePicker` (Chromium) or download; artifact `downloads` | Typed name, `verified:false` | None; files by hand | Yes | Yes | Solo/offline; the fallback under every tier |
| **1 Artifact db** | Runtime `db` (LWW, 5,000 docs, realtime) + `downloads` export | claude.ai org + sharing level; `user` id when granted | Realtime in-org | Yes (artifacts only) | No | Artifact-hosted prototypes on Team/Enterprise |
| **2 Sibling doc via agent** | `reviews/<proto>/<reviewer>.jsonl` + agent-merged `<page>.review.json/.md` via `gh`/MCP | Recorded from the host; git author = agent | On commit | Yes (export) | Yes | **Default.** Repo-bound; feeds the ledger; auditable |
| **3 GitHub from browser** | Octokit → Contents/Git Data; sveltia-style Worker | GitHub OAuth (Worker) or PAT (risky) | Poll; 409 on stale `sha` | No (CSP) | Yes | Reviewers must commit without an agent; review-only repo |
| **4 Hosted backend** | Supabase (RLS + anon) / Worker + D1 / PocketBase / Firebase | Supabase Auth, Cloudflare Access OTP, Firebase Auth | Realtime | No | Yes | Many reviewers or live co-review; agent exports to Tier 2 |
| **5 Local-first/CRDT** | Yjs on Y-PartyServer (+ y-indexeddb); Automerge | None built in — gate with Access/Vercel Auth | Realtime, offline | No | Yes | Simultaneous editing; otherwise overkill |
| **Liveblocks Comments** | Hosted threads; free 200/month; Pro $30 | Your token endpoint | Realtime | No | Yes (React) | Finished comment UI; sibling doc still holds grade + context |

---

## 10. Templates

### (a) `page.review.json` — merged sibling document (agent-written)

```json
{
  "schema": "prototype-review/1",
  "prototype": { "id": "PROTO-2026-042", "file": "prototypes/checkout/checkout.html", "contentSha256": "9f2c…",
                 "source": { "kind": "claude-artifact", "url": "https://claude.ai/code/artifact/…", "version": 3 }, "commit": "68a313b" },
  "generation": { "model": "claude-…", "promptSha256": "1b7d…", "promptRef": "prompts/checkout-v3.md",
                  "skills": ["handoff-spec@2026-08"], "ds_version": "design-system@4.7.0", "generatedAt": "2026-09-02T14:05:00Z" },
  "verdict": { "pass": false, "decidedBy": "@designer", "decidedAt": "2026-09-02T17:40:00Z", "note": "Blocker on address error state" },
  "reviews": [ {
    "reviewer": { "name": "Ana", "id": "u_7f3", "source": "claude-org", "level": "admin", "verified": true },
    "grade": { "pass": false, "reasons": ["error-state-missing", "copy-unclear"] },
    "viewport": { "width": 1440, "height": 900, "dpr": 2 },
    "comments": [ {
      "id": "01J6…", "label": "issue", "decoration": "blocking", "severity": "blocker",
      "anchor": { "route": "/checkout/address", "state": "postcode with no matches", "selector": "form[data-step=address] .suggestions",
                  "textSnippet": "No results", "bbox": [412, 318, 560, 44] },
      "body": "Empty suggestions list has no message; user cannot tell whether search is running or failed.",
      "impact": "New users at the first form step.",
      "screenshot": { "path": "reviews/PROTO-2026-042/shots/01J6….png", "masked": true },
      "state": "open", "createdAt": "2026-09-02T15:04:10Z", "replies": []
    } ]
  } ],
  "ledger": { "status": "exploring", "evidence": "review 2026-09-02 (2 reviewers)", "outcome": null }
}
```

`prototype` re-associates an orphaned sidecar; `generation` is what the tuning loop keys on; `verdict` is what the ledger's `outcome`/`evidence` read; per-reviewer `grade` allows weighting. In Tier 1 the same shape is one `db` document per comment (`reviews/<proto>/comments/<ulid>`) and per grade (`reviews/<proto>/grades/<reviewerId>`).

### (b) `page.review.md` — generated for the PR diff

```markdown
---
schema: prototype-review/1
prototype: PROTO-2026-042
file: prototypes/checkout/checkout.html
ds_version: design-system@4.7.0
prompt: prompts/checkout-v3.md (sha256 1b7d…)
verdict: fail
decided_by: "@designer"
reviewers: [Ana (claude-org, admin), Ben (github:benk)]
---
# Review — Checkout address autocomplete (PROTO-2026-042)
**Verdict: FAIL** — Blocker on address error state.

## Ana — grade: fail (error-state-missing, copy-unclear)
- **[Blocker] issue (blocking)** `/checkout/address` · 1440×900 · postcode with no matches · `form[data-step=address] .suggestions`
  Empty suggestions list has no message. _Shot:_ shots/01J6….png (masked)
```

### (c) Per-reviewer layout (Tier 2, conflict-free)

```text
prototypes/checkout/checkout.html          # the prototype (or a pointer file for an artifact URL)
prototypes/checkout/checkout.review.json   # merged — written ONLY by the agent
prototypes/checkout/checkout.review.md     # generated from the JSON
reviews/PROTO-2026-042/ana.jsonl           # append-only events, one reviewer per file
reviews/PROTO-2026-042/benk.jsonl
reviews/PROTO-2026-042/shots/01J6….png      # masked; only when the anchor cannot reproduce the state
```

One JSONL line per event (`comment.add`, `comment.resolve`, `grade.set`). The overlay exports the reviewer's JSONL (download, `downloads.save`, or copy-as-prompt); the agent merges `*.jsonl` → `review.json` → `review.md`, commits all three, and updates the ledger row.

---

## 11. Candidate picks for skill-resources

| Name | URL | What it is | Verified | Suggested category |
|---|---|---|---|---|
| Claude artifact runtime capabilities (`db`, `downloads`, `artifact`) | https://code.claude.com/docs/en/artifacts + runtime contract 0.2.39 types | The only storage/sync/identity an artifact overlay has | contract types read in-session; public page fetched OK (runtime undocumented there) | proposed: review overlay storage adapters |
| GitHub MCP server | https://github.com/github/github-mcp-server | Agent write path (`push_files`, `discussion_comment_write`, …) | fetched OK | mcp-servers |
| `gh api` | https://cli.github.com/manual/gh_api | Agent write path from hooks | fetched OK | hooks (merge-and-commit recipe) |
| GitHub Contents + Git Data API | https://docs.github.com/en/rest/repos/contents · https://docs.github.com/en/rest/git/trees | Commit mechanics; the `sha`/409 rule | fetched OK | reference |
| sveltia-cms-auth | https://github.com/sveltia/sveltia-cms-auth | One-file Worker GitHub OAuth exchange | fetched OK | proposed: storage adapters (Tier 3) |
| giscus | https://github.com/giscus/giscus | Discussions-as-store keyed by a term; the model | fetched OK | proposed: patterns (public-repo only) |
| Supabase (Realtime + RLS) | https://supabase.com/pricing | Default hosted backend | fetched OK | proposed: storage adapters (Tier 4) |
| Cloudflare Workers + D1 | https://developers.cloudflare.com/workers/platform/pricing/ | One-file backend on the proxy's host | fetched OK | proposed: storage adapters (Tier 4) |
| PartyServer / Y-PartyServer | https://github.com/cloudflare/partykit | Rooms + Yjs backend on Workers | fetched OK | proposed: storage adapters (Tier 5) |
| Yjs providers | https://github.com/yjs/y-indexeddb · https://github.com/yjs/y-websocket | Local persistence + sync for co-review | fetched OK | proposed: storage adapters (Tier 5) |
| Liveblocks Comments | https://liveblocks.io/pricing | Finished comment layer, metadata anchoring | fetched OK | proposed: review & feedback tooling |
| Cloudflare Access one-time PIN | https://developers.cloudflare.com/cloudflare-one/identity/one-time-pin/ | Email-code gate, no IdP | fetched OK (seat count search-verified only) | proposed: identity for previews |
| Vercel Deployment Protection | https://vercel.com/docs/deployment-protection | Vercel Auth on all plans | fetched OK | proposed: identity for previews |
| Chrome persistent FS Access permissions | https://developer.chrome.com/blog/persistent-permissions-for-the-file-system-access-api | Write beside the prototype on Chromium | fetched OK | reference (Tier 0) |
| MDN storage quotas | https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria | The Safari 7-day rule | fetched OK | rules |
| Sentry replay privacy defaults | https://docs.sentry.io/platforms/javascript/session-replay/privacy/ | Mask-by-default conventions | fetched OK | rules |
| OWASP HTML5 cheat sheet | https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html | No tokens in localStorage | fetched OK | rules |
| JSON Lines | https://jsonlines.org/ | Per-reviewer event format | fetched OK | proposed: templates |
| Section-10 templates (this doc) | — | `review.json`, `review.md`, layout | authored | proposed: templates |

Evaluated, not picked: InstantDB (sunsetting), Deno KV (unstable, mid-migration), Replicache (archived), git notes (invisible on GitHub), Git Gateway (deprecated), PATs in localStorage (risk), Electric/Zero/PowerSync/Jazz/Triplit (product sync engines; Triplit cloud unverified), Val Town (10 MB), PocketBase (pre-1.0), Automerge (unsecured reference server).

---

## 12. Sources

- https://code.claude.com/docs/en/artifacts
- https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria
- https://developer.mozilla.org/en-US/docs/Web/API/File_System_API
- https://developer.mozilla.org/en-US/docs/Web/API/Window/showSaveFilePicker
- https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system
- https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe
- https://caniuse.com/mdn-api_window_showsavefilepicker
- https://developer.chrome.com/blog/persistent-permissions-for-the-file-system-access-api
- https://en.wikipedia.org/wiki/Sidecar_file
- https://github.com/octokit/octokit.js
- https://docs.github.com/en/rest/using-the-rest-api/using-cors-and-jsonp-to-make-cross-origin-requests
- https://docs.github.com/en/rest/repos/contents?apiVersion=2022-11-28#create-or-update-file-contents
- https://docs.github.com/en/rest/git/trees?apiVersion=2022-11-28#create-a-tree
- https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps
- https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app
- https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens
- https://github.com/isaacs/github/issues/330
- https://github.com/sveltia/sveltia-cms-auth
- https://decapcms.org/docs/github-backend/
- https://docs.netlify.com/manage/security/secure-access-to-sites/git-gateway/
- https://github.com/giscus/giscus
- https://giscus.app/
- https://github.com/utterance/utterances
- https://docs.github.com/en/graphql/guides/using-the-graphql-api-for-discussions
- https://docs.github.com/en/rest/pulls/comments?apiVersion=2022-11-28#create-a-review-comment-for-a-pull-request
- https://git-scm.com/docs/git-notes
- https://www.kenmuse.com/blog/storing-data-in-git-objects-with-notes/
- https://github.com/github/github-mcp-server
- https://cli.github.com/manual/gh_api
- https://supabase.com/pricing
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/realtime
- https://pocketbase.io/docs/
- https://pocketbase.io/faq/
- https://www.convex.dev/pricing
- https://www.instantdb.com/essays/instant_team_joins_openai
- https://www.val.town/pricing
- https://docs.val.town/std/sqlite/
- https://developers.cloudflare.com/workers/platform/pricing/
- https://docs.deno.com/deploy/kv/manual/
- https://docs.deno.com/deploy/migration_guide/
- https://github.com/cloudflare/partykit
- https://firebase.google.com/pricing
- https://github.com/yjs/y-webrtc
- https://github.com/yjs/y-websocket
- https://github.com/yjs/y-indexeddb
- https://github.com/automerge/automerge-repo
- https://github.com/automerge/automerge-repo-sync-server
- https://liveblocks.io/pricing
- https://liveblocks.io/docs/ready-made-features/comments
- https://liveblocks.io/examples/overlay-comments/nextjs-comments-overlay
- https://electric.ax/pricing
- https://jazz.tools/
- https://zero.rocicorp.dev/
- https://github.com/aspen-cloud/triplit
- https://www.powersync.com/pricing
- https://www.netlify.com/blog/auth0-extension-identity-changes/
- https://clerk.com/pricing
- https://authjs.dev/
- https://authjs.dev/getting-started/providers/github
- https://developers.cloudflare.com/cloudflare-one/policies/access/
- https://developers.cloudflare.com/cloudflare-one/identity/one-time-pin/
- https://vercel.com/docs/deployment-protection
- https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection
- https://vercel.com/docs/cli/comments
- https://jsonlines.org/
- https://jekyllrb.com/docs/front-matter/
- https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html
- https://docs.sentry.io/platforms/javascript/session-replay/privacy/
- https://github.com/rrweb-io/rrweb/blob/master/guide.md

*Research conducted 2 September 2026. Claude artifact runtime facts come from runtime contract 0.2.39 type definitions served to this session, not the public docs page. Search-verified only: GitHub OAuth/device endpoints lacking CORS, Cloudflare Zero Trust free seat count (50), Convex Starter project count, y-sweet free tier, Liveblocks overlay-metadata mechanics, Replicache archival date. Not verified: Triplit Cloud status, whether y-webrtc's Heroku signaling defaults still respond, the fine-grained-PAT permission name on the Contents endpoint page.*
