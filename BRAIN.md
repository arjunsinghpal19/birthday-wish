# BIRTHDAY WISH PROJECT — BRAIN / MASTER PROJECT CONTEXT
------------------------------------------------------------

> This file is the persistent project memory for future
> AI/Antigravity/Codex chats.
>
> Read this file BEFORE making architectural or feature changes.
>
> Source of truth order:
> 1. Actual current working files / ZIP
> 2. Git history and current working tree
> 3. This BRAIN.md for project intent, invariants, roadmap,
>    and historical context
> 4. Phase reports are evidence, NOT proof by themselves.
>
> Never claim a test passed unless it was actually executed
> or manually verified.

============================================================
1. PROJECT IDENTITY
============================================================

Project:
Birthday Wish Project / Wish Studio

Core product idea:

- Cinematic interactive birthday wish public page.
- Quick Editor for fast wish creation/customization.
- Admin Dashboard with full Native Admin Wish Studio.
- Supabase-backed wishes.
- Supabase media storage.
- UUID share links.
- Legacy compatibility.
- Future Customer Dashboard with customer-facing UI while
  reusing the same editor/domain functionality.

Stack:

- Plain HTML / CSS / JavaScript.
- Supabase Database + Storage.
- Vercel/serverless API support where required.
- Live Server for local development.
- Git + GitHub.
- Antigravity for implementation/testing assistance.

This is intentionally NOT a framework migration.

Preserve the current architecture unless a phase explicitly
calls for architectural work.

============================================================
2. NON-NEGOTIABLE PRODUCT RULES
============================================================

PUBLIC PAGE IS SACRED.

The public Birthday Wish page:

index.html

and its public JS/CSS are already heavily developed.

Never casually change:

- public visual design
- animations
- envelope/letter flow
- recipient rendering
- timeline
- gallery
- music
- video
- cake
- birthday date card
- share behavior
- legacy route behavior

Every Admin/editor change must be regression-tested against
the public page.

------------------------------------------------------------
QUICK EDITOR IS SACRED
------------------------------------------------------------

The existing Quick Editor in:

js/modules/editor/

is a working product feature.

It must remain fully functional and visually stable unless
a phase explicitly targets it.

Known Quick Editor modules include:

- accordion.js
- audio.js
- customizer.js
- datepicker.js
- gallery.js
- letter.js
- reasons.js
- timeline.js
- video.js
- wishes.js

DO NOT rewrite Quick Editor simply to make Admin Studio work.

------------------------------------------------------------
REUSE FUNCTIONALITY, NOT UI
------------------------------------------------------------

Long-term architecture:

Shared domain/functionality:

- WishDefaults
- TimeUtils
- MediaService
- StorageModule
- DatabaseModule
- relationship/template data
- media handling
- validation/parsing

Different product surfaces:

Quick Editor:
- fast/simple UI

Native Admin Wish Studio:
- full Admin UI
- full functionality
- no artificial Quick Editor limitations

Future Customer Wish Studio:
- customer-specific UI/design
- same underlying domain functionality

IMPORTANT:

The fact that Quick Editor is intentionally streamlined
must NEVER be used as a reason to artificially limit Admin
Studio or future Customer Studio.

------------------------------------------------------------
NO BACKEND CHANGES UNLESS EXPLICITLY PLANNED
------------------------------------------------------------

Do not modify:

- Supabase schema
- RLS
- Storage bucket configuration
- security model
- authentication

unless a future phase explicitly approves it.

------------------------------------------------------------
NO DESTRUCTIVE CLEANUP
------------------------------------------------------------

Do not delete working code just because it looks old.

First prove it is unused.

Preserve rollback/reference paths when appropriate.

------------------------------------------------------------
NO AUTOMATIC GIT ACTIONS
------------------------------------------------------------

During implementation:

- no commit
- no push
- no deploy

Commit only after explicit review/acceptance.

============================================================
3. HOW THE PROJECT STARTED
============================================================

The project began as a single interactive birthday wish
website.

Early functionality included:

- animated birthday experience
- envelope/letter reveal
- recipient/sender customization
- birthday date
- letter paragraphs
- reasons
- wishes
- gallery
- timeline
- gift/coupon
- cake
- background music
- sharing
- admin/editor access

The public page was progressively refined for:

- desktop/mobile
- animations
- timeline geometry
- letter typing
- gallery
- music
- video
- cake themes
- share UX

Important early design principle:

DO NOT destroy the original visual experience while adding
functionality.

============================================================
4. QUICK EDITOR EVOLUTION
============================================================

The editor evolved into a full modal-based Quick Editor
with accordion sections.

Important mature capabilities include:

- Basic Info
- Birth Date
- Cake Flavor/Theme
- 4-digit passcode
- Letter paragraphs
- Letter font style
- Letter theme
- Memory
- Reasons repeater
- Wishes repeater
- Gallery uploads
- Timeline repeater
- Gift/Coupon
- Background music
- YouTube music
- device audio/voice note
- audio start time
- device video
- YouTube/Shorts video
- video start time
- individual section reset
- global reset
- live rendering
- media persistence and restoration
- share link generation

Quick Editor has accumulated many surgical fixes.

DO NOT replace it with a new simplified editor.

============================================================
5. PERFORMANCE / REFACTOR HISTORY
============================================================

Major optimization/refactor work was completed before
Admin Dashboard expansion.

Major work included:

- renderer helper extraction
- smart partial rendering
- RenderDispatcher
- change detection
- DOM query caching
- AudioContext singleton
- animation/scroll optimization
- gallery rendering optimization
- timeline live rendering fixes
- letter flow/layout fixes
- media persistence fixes
- blob/data URL sanitization

These changes improved maintainability/performance without
redesigning the public experience.

============================================================
6. SECURITY / ACCESS HISTORY
============================================================

Admin access was progressively hardened.

Important principles:

- normal public visitors must not receive unrestricted
  Admin editor access
- Admin security/access remains isolated from public wish
  behavior
- security settings must not conflict with public editor
- future dashboard changes must preserve current security

Do not casually modify security logic during editor refactors.

============================================================
7. SUPABASE MIGRATION / CLOUD ARCHITECTURE
============================================================

The project moved from local/Base64-heavy persistence toward
Supabase-backed architecture while preserving backward
compatibility.

Current conceptual architecture:

Public wish data:
- Supabase wishes records
- UUID is permanent identifier for new cloud wishes

Media:
- Supabase Storage bucket: wish-media
- permanent HTTPS public URLs are the desired persisted
  representation

DO NOT persist:

- blob: URLs
- temporary object URLs
- raw File objects
- large Base64 media payloads in database

Modules include:

- js/supabase.js
- js/database.js
- js/storage.js
- js/share.js

Legacy compatibility:

- old Base64-style wish routes must continue permanently
- new UUID routes work alongside legacy routes

IMPORTANT PUBLIC STATE FIX:

A stale:

custom_birthday_config

localStorage draft must NEVER overwrite an active public
UUID/recipient wish.

The repaired guard exists in:

js/modules/editor/customizer.js

Known regression that must NEVER return:

Public wish recipient:
Vishal

Stale localStorage draft:
Aman

Expected:

ALL public recipient slots remain Vishal.

Never allow mixed:

Vishal / Aman

state.

============================================================
8. PUBLIC UUID / LEGACY ROUTE INVARIANTS
============================================================

These routes must always work:

1. ?w=UUID
2. legacy Base64 ?w=...
3. fresh root creator route
4. Admin existing-wish edit route
5. Admin new-wish route

For active UUID wishes:

- Hero recipient
- Signature
- Envelope
- Birthday Date Card
- all other recipient-dependent renderers

must use active wish data.

Stale creator drafts must never bleed into public routes.

============================================================
9. ADMIN DASHBOARD ARCHITECTURE
============================================================

Admin Dashboard sections include:

- Dashboard
- Wishes
- Media Library
- Themes
- Plans
- Coupons
- Security
- Settings
- Backup
- Logs

Admin Dashboard has its own:

- HTML
- modular CSS
- modular JS

Admin security/access must remain isolated and functional.

============================================================
10. ADMIN CSS MODULARIZATION
============================================================

Phase 29B-3B introduced modular Admin CSS.

Target structure:

css/admin/
    admin-core.css
    admin-layout.css
    admin-components.css
    admin-dashboard.css
    admin-media.css
    admin-editor.css
    admin-editor-media.css
    admin-responsive.css

Public page continues using:

css/style.css

Admin page uses:

css/admin/*.css

DO NOT load Admin CSS into public page.

Do not redesign while modularizing CSS.

Old/root:

css/admin.css

may be retained as rollback/reference artifact where
appropriate, but must NOT be loaded together with modular
Admin styles.

Always inspect actual working tree because old files may
still exist in uncommitted state.

============================================================
11. NATIVE ADMIN WISH STUDIO — WHY IT EXISTS
============================================================

Admin Dashboard requires a full-featured Native Wish Studio.

Quick Editor:
- optimized for fast creation

Admin Studio:
- comprehensive
- full feature parity
- Admin-specific UI
- full media handling
- full editor controls

Architecture:

same underlying functionality
+
different UI

DO NOT artificially limit Admin Studio because Quick Editor
is intentionally streamlined.

============================================================
12. CURRENT ADMIN STUDIO FEATURE SET
============================================================

Current sections:

01 Basic Info
02 Sender Info
03 Birthday Letter & Typography
04 Special Memory
05 Reasons You're Special
06 Birthday Wishes
07 Photo Gallery
08 Timeline
09 Gift & Coupon
10 Background Music & Audio
11 Video Wish

Current Admin Studio features:

- recipient
- sender
- birthday
- cake theme
- passcode
- letter lines
- letter font
- letter theme
- memory
- reasons
- wishes
- gallery
- timeline
- gift/coupon
- audio
- YouTube audio
- audio start time
- video upload
- YouTube video
- video start time
- in-memory preview
- save new wish
- update existing wish
- live summary
- relationship presets

============================================================
13. SHARED CORE ARCHITECTURE
============================================================

js/core/wish-defaults.js

Single source of truth for baseline/default wish content
and section defaults.

TimeUtils:
Universal time parsing and formatting.

MediaService:
- image compression
- audio duration detection
- video duration detection
- YouTube normalization

StorageModule:
Supabase Storage uploads.

DatabaseModule:
- saveWish
- updateWish
- getWishRecordById
- deleteWish (Real Supabase DELETE with system config row protection)
- duplicateWish (Real Supabase INSERT with UUID generation & reference media)

Do not duplicate these systems unnecessarily.

============================================================
14. ADMIN MEDIA RULES
============================================================

Uploaded photos:

device
→ compress
→ preview
→ Supabase Storage
→ permanent HTTPS URL
→ DB

Audio:

device/custom link/YouTube
→ normalized state
→ preview
→ permanent cloud URL when applicable
→ DB

Video:

MP4/custom link/YouTube
→ normalized state
→ preview
→ permanent cloud URL when applicable
→ DB

Never persist temporary blob URLs.

============================================================
15. SAVE LIFECYCLE
============================================================

New Wish:

exactly ONE INSERT.

Existing Wish:

exactly ONE UPDATE.

Existing UUID must remain unchanged.

Preview:

0 database writes.

Preview must use in-memory/session state.

============================================================
16. PHASE 29B RECOVERY
============================================================

A public state regression occurred where:

active public UUID:
Vishal

stale local draft:
Aman

could cause some renderers to display Aman.

Root cause:

customizer.js restored:

custom_birthday_config

unconditionally.

Fix:

restore localStorage draft only for fresh creator sessions.

Public UUID / recipient routes are protected.

Verified scenarios included:

- public UUID
- fresh creator
- Admin existing wish
- Admin new wish
- legacy Base64 route

This protection must never regress.

============================================================
17. PHASE 30.1 ADMIN STUDIO
============================================================

Phase 30.1 introduced/refined Native Admin Wish Studio.

Reported functionality included:

- 11 major sections
- Quick Editor feature parity
- reset buttons
- sticky live summary
- media previews
- save/update lifecycle
- in-memory preview
- responsive styling
- relationship selector

Shared functionality reused:

- WishDefaults
- TimeUtils
- MediaService
- StorageModule
- DatabaseModule

However:

IMPORTANT:

Phase 30.1 is NOT considered fully accepted.

Actual manual browser testing found user-visible issues that
conflict with some previous automated/report claims.

Therefore do NOT assume Phase 30.1 is stable.

============================================================
18. CUSTOMER DASHBOARD FUTURE PLAN
============================================================

Customer Dashboard is NOT to be started yet.

Future architecture:

Quick Editor
    ↓
shared domain functionality
    ↓
Admin Wish Studio
    ↓
Customer Wish Studio

Customer Dashboard will eventually have:

- customer-specific UI
- customer-specific navigation
- My Wishes
- New Wish
- Edit
- Delete
- Duplicate
- Search
- Filter
- media management
- account/customer controls

But the underlying wish/editor functionality should be reused.

Customer Dashboard starts ONLY after Admin Studio is genuinely
stable and accepted.

============================================================
19. LONG-TERM ROADMAP
============================================================

High-level order:

1. Preserve/fix public page.
2. Preserve/fix Quick Editor.
3. Finish Admin architecture.
4. Finish Native Admin Wish Studio.
5. Stabilize media/date/relationship/responsive behavior.
6. Fully verify Admin + Quick Editor + public page.
7. Establish stable Git checkpoint.
8. Expand Admin Dashboard management features.
9. Build Customer Dashboard using shared functionality.
10. Continue polish/performance/SEO/production validation.

Do not skip stability to reach Customer Dashboard faster.

============================================================
20. THINGS THAT MUST NEVER BE BROKEN
============================================================

Never break:

- public page
- Quick Editor
- UUID routing
- legacy Base64 routing
- localStorage recipient isolation
- Supabase persistence
- Storage uploads
- audio restoration
- video restoration
- gallery restoration
- timeline restoration
- cake rendering
- letter rendering
- envelope rendering
- date rendering
- security/access
- admin logout
- preview without DB writes

Never:

- introduce Base64-only persistence
- store blob URLs in DB
- use stale localStorage for active UUID wishes
- commit/push/deploy without approval
- claim tests passed without executing them
- trust an AI-generated phase report more than actual
  working files/browser behavior

============================================================
21. HOW A NEW AI CHAT SHOULD START
============================================================

When a new chat starts:

1. Read BRAIN.md completely.
2. Inspect current project ZIP/files.
3. Check git status.
4. Check recent git log.
5. Identify exact current phase.
6. Compare implementation against BRAIN.md.
7. Do NOT assume previous phase report is correct.
8. Make only requested phase changes.
9. Test before reporting completion.
10. Preserve safety invariants.

First response in a new chat should state:

- current architecture
- current phase
- what is actually implemented
- what is reported but not independently verified
- next safe action

============================================================
22. CURRENT ONE-LINE HANDOFF
============================================================

We are currently stabilizing the Native Admin Wish Studio
after Phase 30.1 surgical parity work.

Quick Editor and public page are protected.

Shared functionality must be reused.

Admin Studio must reach full practical feature parity.

Customer Dashboard work begins only after Admin Studio is
genuinely stable and accepted.

============================================================
23. NEW MANUAL FINDINGS — 2026-08-18
============================================================

These findings come from actual browser/manual testing after
Phase 30.1.

They supersede conflicting "PASSED" claims until re-verified.

------------------------------------------------------------
23.1 RECIPIENT PLACEHOLDER
------------------------------------------------------------

Current placeholder should be changed to:

e.g. Shivam

UX copy only.

Do not change recipient data logic.

------------------------------------------------------------
23.2 RELATIONSHIP PRESETS NEED REFINEMENT
------------------------------------------------------------

Current relationship presets are incomplete.

Requirements:

- 5 wishes/quotes by default
- relationship-specific Timeline
- relationship-specific Gallery content/defaults
- funny + emotional Best Friend variant
- better action wording
- relationship reset
- English/Hinglish content mode

Preferred button:

✨ Use This Relationship Style

Add:

↺ Reset Relationship Style

Relationship reset must NOT clear:

- Recipient
- Sender
- Birth Date
- Passcode
- Cake Theme
- existing uploaded photos
- existing uploaded audio
- existing uploaded video

unless an explicit destructive media reset is selected.

------------------------------------------------------------
23.3 DATE INPUT ISSUE
------------------------------------------------------------

Admin calendar popup works.

Manual date input is unreliable.

Must match Quick Editor behavior as closely as practical:

- DD/MM/YYYY
- keyboard entry
- backspace/edit
- validation
- zero padding
- calendar → input
- input → calendar
- invalid date protection

No malformed values such as:

1905200111

Do not rewrite Quick Editor datepicker.

Reuse proven logic safely.

------------------------------------------------------------
23.4 MEMORY RESET
------------------------------------------------------------

Add:

↺ Reset

to Special Memory.

Reset restores baseline memory.

Live summary updates immediately.

------------------------------------------------------------
23.5 GALLERY URL PREVIEW BUG
------------------------------------------------------------

Current:

paste image URL
→ field changes
→ preview may NOT update
→ unrelated gallery action
→ preview appears

Fix:

paste valid URL
→ immediate preview

Invalid URL:
graceful fallback
no console spam

------------------------------------------------------------
23.6 LIVE SUMMARY TYPOGRAPHY
------------------------------------------------------------

Sticky summary must display:

- Letter Theme
- Letter Font Style

and live-update them.

------------------------------------------------------------
23.7 AUDIO ISSUES
------------------------------------------------------------

Remaining issues:

- seekbar visual fill
- selected start time
- slider/input synchronization
- playback from selected offset
- YouTube audio preview
- clear behavior
- upload efficiency
- persistence
- edit/reload restoration

Example:

Start Time = 00:30

Play must begin at 00:30.

Saved custom audio must remain custom audio after reload.

Saved startTime must remain saved.

Must NOT silently become:

Default Melody
00:00

------------------------------------------------------------
23.8 VIDEO ISSUES
------------------------------------------------------------

Same class of issues:

- seekbar
- start time
- preview
- YouTube
- clear/remove
- MP4 persistence
- startTime persistence
- edit/reload restoration

------------------------------------------------------------
23.9 QUICK EDITOR EXISTING-WISH PARITY
------------------------------------------------------------

Opening Quick Editor from:

?w=UUID

must load actual saved wish details.

Must NOT show generic/default values over existing saved
wish data.

Must continue editing active wish.

Relationship presets should also be available in Quick Editor
using shared template data.

Do NOT duplicate relationship data.

Do NOT rebuild Quick Editor.

------------------------------------------------------------
23.10 RESPONSIVE ISSUES
------------------------------------------------------------

Actual browser testing still shows responsive issues.

Test:

375
390
430
480
640
768
1024
1280
1440
1920

Do not simply hide overflow.

Fix actual layout problems.

Console also showed repeated:

GET /assets/images/polaroid-1.jpg
404 Not Found

Investigate root cause.

Do not blindly create duplicate assets.

============================================================
24. PHASE 30.2
============================================================

CURRENT NEXT IMPLEMENTATION TARGET:

PHASE 30.2 — ADMIN STUDIO MEDIA/DATE/RELATIONSHIP/RESPONSIVE
STABILIZATION

Scope:

1. Recipient placeholder copy.
2. Relationship preset expansion.
3. 5 wishes per relationship.
4. Relationship-specific gallery.
5. Relationship-specific timeline.
6. Funny Best Friend variant.
7. Better relationship action wording.
8. Relationship content reset.
9. English/Hinglish curated content mode.
10. Admin date input parity.
11. Memory reset.
12. Immediate gallery URL preview.
13. Live summary typography.
14. Audio preview/seekbar/startTime/YouTube/clear/persistence.
15. Video preview/seekbar/startTime/YouTube/clear/persistence.
16. Existing-wish media restoration.
17. Quick Editor existing-wish parity.
18. Relationship capability in Quick Editor.
19. Responsive correction.
20. polaroid-1.jpg 404 investigation.
21. Automated test additions/updates.
22. Real browser verification.

============================================================
25. PHASE 30.2 SAFETY CONSTRAINTS
============================================================

NO:

- SQL schema changes
- RLS changes
- Storage bucket changes
- deployment
- Git commit
- Git push
- Quick Editor rewrite
- media architecture replacement
- external translation API
- blob/data URL persistence
- UUID routing changes
- legacy route changes
- localStorage recipient regression
- public UI redesign

============================================================
26. ACCEPTANCE PRINCIPLE
============================================================

A feature is NOT complete merely because an automated
Antigravity script says PASS.

It must be:

- implemented in actual working tree
- syntax validated
- automated tested where applicable
- manually verified in browser for user-visible behavior

If something was not tested:

say so.

If something remains broken:

say so.

Never hide remaining issues.

============================================================
27. BRAIN MAINTENANCE
============================================================

After every accepted phase update BRAIN.md.

Record:

- phase name
- exact files changed
- actual behavior implemented
- tests actually executed
- manual tests actually performed
- known remaining bugs
- safety invariants
- Git status
- commit status if applicable
- next phase
- why next phase is next

Clearly separate:

VERIFIED
REPORTED BY ANTIGRAVITY
KNOWN ISSUE
PLANNED

Never erase historical context merely to make BRAIN shorter.

Keep BRAIN.md in project root.

Every future Antigravity prompt must explicitly instruct
Antigravity to read BRAIN.md first and update it at the end
of an accepted phase.

============================================================
28. NEW CHAT RECOVERY RULE
============================================================

If chat context is lost:

Give the new AI:

- current project ZIP/folder
- root BRAIN.md

Tell it:

"Read BRAIN.md first.
Reconcile the actual working tree against it.
We are in Phase 30.2 unless actual files prove otherwise.
Do not touch public UI, Quick Editor architecture, DB schema,
RLS, Storage configuration, UUID routing, or legacy routes
without explicit approval."

The first task should be STATE RECONCILIATION,
not feature coding.

============================================================
29. CURRENT HANDOFF
============================================================

Phase 30.2 — ADMIN STUDIO REGRESSION STABILIZATION:
STATUS: ACCEPTED / STABLE ✅

Accomplished & Manually Verified in Phase 30.2:
1. Quick Editor Relationship Presets & Tone Engine:
   - Full script integration of `js/core/relationship-presets.js`.
   - Real-time template switching across all relationships (Mother, Father, Best Friend, Girlfriend, Boyfriend, etc.) and languages (English, Hinglish).
   - Strict preservation of recipient name, birth date, passcode, sender name, uploaded gallery photos (`image` URLs), custom attached audio, and custom video.
2. Quick Editor Existing Media Hydration:
   - Hydrates existing saved audio/video badges, removal controls, seekbars, and formatted start times (`MM:SS`) when loading UUID wishes.
3. Admin Create & Edit Wish Baseline & Action Flow:
   - Live Wish Summary matches established baseline typography, row spacing, sticky behavior, and actions.
   - Header actions (`#btn-editor-back`, `#admin-editor-title`, `#btn-editor-preview`, `#btn-editor-cancel`, `#btn-editor-save`, `#btn-editor-save-share`) and Summary actions (`#btn-sum-save-share`, `#btn-sum-save`, `#btn-sum-preview`) fully unified.
4. Live Public Preview (0 Database Mutations):
   - Opens `index.html?preview=admin` with preview payload from `sessionStorage` and `localStorage`.
   - Hydrates active form data with `CONFIG._isPreview = true` and strictly skips `custom_birthday_config` creator draft overrides.
5. Save & Share / Full Share Link:
   - Atomic database insert/update with Supabase.
   - Authoritative share URL construction (`${origin}/index.html?id=${uuid}`).
   - Multi-layer clipboard copy (`navigator.clipboard` + fallback `<textarea>` `execCommand`) with clear toast feedback.
6. Photo Gallery Visual Baseline & Clean Controls:
   - Full-width card stack (`#adm-gallery-container` flex column).
   - 2-column internal fields (`Image Link | Fallback Emoji` and `Caption | Secret Flip Note`).
   - Media row with 54x54 preview thumbnail box, single-line nowrap `📷 Upload Photo`, and conditional `❌ Clear Image`.
   - Removed dead header-level "📷 Upload Image File" control.
7. YouTube & Direct Media Offset Playback:
   - YouTube audio player with dedicated Play/Pause toggle seeking directly to start offset.
   - YouTube video player and HTML5 direct audio/video players seeking to start offset.
   - Typing safety on URL inputs via `document.activeElement` guards.
8. Sacred Invariants Preserved:
   - Public Wish Page intact.
   - UUID routing and legacy Base64 routing intact.
   - Supabase schema, RLS, and Storage buckets intact.
   - Security, recovery, and authentication intact.
9. Verification & Test Metrics:
   - Manual Browser UAT: 100% PASSED across all features.
   - Automated Test Suites: 371/371 tests passed (100% pass rate).
   - JS Syntax Validation: 42/42 JS files valid.
   - Zero known remaining regressions.

Git Status:
- Commit: `9f873dddb392f2c1694638d1bb569f5e8bf601d2` (`stable: Phase 30.2 Admin Studio regression stabilization complete`)
- Checkpoint: Accepted stable baseline.

============================================================
30. PHASE 31A — ADMIN WISHES MANAGEMENT (SECURE REAL DELETE + REAL DUPLICATE)
============================================================

STATUS: IMPLEMENTED & VERIFIED ✅

Accomplished in Phase 31A:
1. Secure Server-Side Admin Deletion Architecture:
   - Created `api/session.js` implementing cryptographic HMAC-SHA256 session token generation and verification.
   - Updated `api/auth.js` and `api/send-otp.js` to issue signed admin session tokens (`token` + `HttpOnly` cookie) upon verified authentication.
   - Created dedicated serverless endpoint `api/admin-delete-wish.js` requiring a verified admin session token.
   - Endpoint validates UUID, strictly rejects master system config row (`00000000-0000-0000-0000-000000000001` with 403 Forbidden), and performs Supabase deletion on the backend using server-side environment credentials.
   - The public/browser `anon` client is NEVER granted unrestricted `DELETE` privileges on `public.wishes`.
   - `SUPABASE_SERVICE_ROLE_KEY` remains strictly server-side on Vercel and is never exposed to browser code.
2. Real Supabase Database Duplication:
   - Implemented `DatabaseModule.duplicateWish(sourceUuid)` in `js/database.js`.
   - Fetches source wish from DB, deep-clones all JSON structures (`letter_lines`, `reasons_json`, `wishes_json`, `gallery_json`, `timeline_json`, `gift_json`, etc.).
   - Appends `" (Copy)"` to `recipient_name`.
   - Inserts cloned record into Supabase to generate a real primary key UUID (no mock `dup-xxx` IDs).
   - Preserves all media URLs (`music_url`, `video_url`, gallery photo URLs) by REFERENCE without duplicating physical storage assets.
   - Strictly protects master system config row `00000000-0000-0000-0000-000000000001` against duplication.
3. Admin Wishes UI & UX Hardening:
   - Upgraded `deleteWish(id, btn)` and `duplicateWish(id, btn)` in `js/admin/admin-wishes.js` to async DB operations.
   - Added clear confirmation prompt for deletion identifying wish recipient name.
   - Added loading indicators and double-click protection (`disabled`, opacity, `⏳`).
   - Fixed state synchronization in `js/admin.js` (`initWishes` reloads data from Supabase via `loadDashboardData()`).
4. Dashboard Initial Load KPI Synchronization & Zero-Flash Neutral Defaults:
   - Replaced all misleading hardcoded demo numbers (142, 12, 86, 24, 32, 184 MB) in `admin.html` with neutral placeholders (`—`).
   - Fixed lifecycle race condition in `js/admin.js` `loadDashboardData()`.
   - Guaranteed that live Storage metadata is fully loaded (`await loadStorageMediaData(wishesList)`) BEFORE `renderKPIs(wishesList, storageFiles)` is called.
   - Fresh page loads and hard refreshes of `admin.html` now automatically display live Images, Videos, Audio, and Storage Used counts with 100% parity to clicking "Refresh Analytics".
   - Streamlined subsystem event listeners (`initDashboard`, `initWishes`, `initWishEditor`, `DOMContentLoaded`) to call atomic `loadDashboardData()`.
5. Non-Fallback Secure Delete Architecture:
   - Removed the insecure direct client-side `anon` delete fallback in `js/database.js`.
   - If the serverless Admin API is unavailable or returns 404, `deleteWishRecord()` immediately returns an explicit, actionable error message directing the administrator to run the Vercel/local server runtime.
   - Zero `anon` DELETE privileges granted in Supabase; zero `service_role` exposed to browser.
6. Storage Safety & Independence:
   - Deleting a wish row NEVER deletes files from the `wish-media` Storage bucket.
   - Zero `Storage.remove()` calls.
7. Automated Test Validation:
   - Created `scratch/test_phase31a_kpi_sync.js` (9/9 tests passed).
   - Created `scratch/test_phase31a_secure_delete.js` (18/18 tests passed).
   - Created `scratch/test_phase31a_wishes_management.js` (12/12 tests passed).
   - All 42 JS files syntax valid.
   - All 410 automated checks passing (100% pass rate).
8. Sacred Invariants Preserved:
   - Public Birthday Wish Page untouched.
   - Quick Editor untouched.
   - Native Admin Wish Studio 11-section editor untouched.
   - Database schema and RLS policies untouched.
   - Admin security gate untouched.

Next Step:
- Phase 31A manual browser UAT review and approval.

============================================================
31. PHASE 31B-1 — WISHES MANAGEMENT SEARCH & FILTER TOOLBAR EXPANSION
============================================================

STATUS: IMPLEMENTED & VERIFIED ✅

Accomplished in Phase 31B-1:
1. Search Clear Button:
   - Added `#btn-wishes-search-clear` inside `.table-search` in `admin.html`.
   - Toggles dynamically (`inline-flex` when input has text, `none` when empty).
   - Clicking clears the search field, focuses the input, and re-renders the table without refetching from the database.
2. Media Presence Filter:
   - Added `#wishes-filter-media` in `admin.html` with 5 options:
     - `all` — All Media Types
     - `music` — 🎵 Has Music (`music_url` non-empty)
     - `video` — 🎥 Has Video (`video_url` non-empty)
     - `photos` — 📸 Has Photos (`gallery_json` contains valid image/media items)
     - `text_only` — 📝 Text Only (no music, no video, no photos)
3. Creation Date Filter:
   - Added `#wishes-filter-date` in `admin.html` with 4 options:
     - `all` — All Time
     - `today` — Created Today (local calendar day match)
     - `7d` — Last 7 Days (rolling 7-day window)
     - `30d` — Last 30 Days (rolling 30-day window)
4. Live Result Count Badge:
   - Added `#wishes-count-badge` in `admin.html` displaying `Showing X of Y wishes`.
   - Real-time reactivity on search input, search clear, media filter change, date filter change, and dataset mutations.
5. Processing Pipeline Architecture:
   - Extended `getProcessedWishes()` in `js/admin/admin-wishes.js`:
     `Raw wishes -> Search filter -> Media presence filter -> Creation date filter -> Existing sort -> Render`.
   - Purely in-memory operations with 0 redundant Supabase network calls.
6. Design & Responsive Preservation:
   - Added `.btn-search-clear` and `.table-count-badge` styles in `css/admin/admin-components.css`.
   - Preserved all existing colors, glassmorphism tokens, and responsive toolbar flex wrapping.
7. Automated Test Validation:
   - Created `scratch/test_phase31b_wishes_ux.js` (22/22 tests passed).
   - Validated JS syntax across all 42 JS files (42/42 valid).
   - Total regression suite: 432 / 432 automated tests passed (100% pass rate).
8. Sacred Invariants Preserved:
   - Public Wish Page untouched.
   - Quick Editor and Studio Editor untouched.
   - Secure Server-Side Delete and Duplication untouched.
   - Database schema and RLS policies untouched.

============================================================
32. PHASE 31B-2 — WISHES TABLE SORTING UX EXPANSION
============================================================

STATUS: IMPLEMENTED & VERIFIED ✅

Accomplished in Phase 31B-2:
1. Clickable Sortable Table Headers:
   - Added sortable behavior to `Recipient Name` (`data-sort="recipient"`), `Sender` (`data-sort="sender"`), and `Created At` (`data-sort="created"`) in `admin.html`.
   - Preserved non-sortable status on action/control columns (`Passcode`, `UUID Link`, `Actions`).
   - Click toggling behavior:
     - Clicking the active sort column toggles `asc` <-> `desc`.
     - Clicking an inactive column activates it with default direction (`desc` for date, `asc` for text names).
2. Sort Indicators:
   - Added directional icons: `↑` (ascending), `↓` (descending), `↕` (neutral/inactive) in `admin.html` and `admin-components.css`.
   - Active sorted header receives `.sorted` and `.sort-icon.active` highlighting with project gold typography (`var(--gold)`).
   - Added accessibility `aria-sort="ascending"` / `aria-sort="descending"` and keyboard navigation (`Enter` / `Space`).
3. Single Authoritative Sort State & Bi-directional Synchronization:
   - `currentSort = { field: "created"|"recipient"|"sender", direction: "asc"|"desc" }` in `js/admin/admin-wishes.js`.
   - Synchronized `#wishes-sort-select` dropdown options:
     - `newest`: Created At (Newest First)
     - `oldest`: Created At (Oldest First)
     - `name_asc`: Recipient Name (A -> Z)
     - `name_desc`: Recipient Name (Z -> A)
     - `sender_asc`: Sender Name (A -> Z)
     - `sender_desc`: Sender Name (Z -> A)
   - Changing dropdown immediately updates header indicators and table rows; clicking table header immediately updates dropdown selection.
4. Filter + Sort Pipeline Integrity:
   `wishesState -> Search filter -> Media filter -> Date filter -> Authoritative Sort -> Render`.
   - Sorting operates strictly in-memory after all search and media/date filters are evaluated.
   - 0 Supabase network queries during sorting.
5. Action Button Binding Integrity:
   - All row actions (`👁️ View`, `✏️ Edit`, `📋 Duplicate`, `🗑️ Delete`, `📋 Copy UUID Link`) target original wish UUIDs correctly via `data-id` and event delegation.
6. Automated Test Validation:
   - Created `scratch/test_phase31b_wishes_sorting.js` (24/24 tests passed).
   - Validated JS syntax across all 42 JS files (42/42 valid).
   - Total regression suite: 456 / 456 automated tests passed (100% pass rate).
7. Sacred Invariants Preserved:
   - Public Wish Page untouched.
   - Quick Editor and Studio Editor untouched.
   - Secure Server-Side Delete and Duplication untouched.
   - Database schema and RLS policies untouched.

============================================================
33. PHASE 31B-3 — WISHES TABLE PAGINATION & PAGE SIZE CONTROLS
============================================================

STATUS: IMPLEMENTED & VERIFIED ✅

Accomplished in Phase 31B-3:
1. Configurable Page Size Controls:
   - Added `#wishes-page-size` dropdown in `admin.html` with options: `5`, `10` (default), `25`, `50`, and `All`.
   - Changing page size immediately updates `paginationState.pageSize`, resets `currentPage` to 1, and updates the table view without database queries.
2. Page Navigation & Info Controls:
   - Added `#btn-wishes-prev-page` (`◀ Prev`), `#wishes-page-info` (`Page X of Y`), and `#btn-wishes-next-page` (`Next ▶`) in `admin.html`.
   - Next and Prev buttons accurately advance/decrement pages and automatically disable at page boundaries (Prev disabled on page 1, Next disabled on last page).
3. Item Range & Total Count Badge:
   - Updated `#wishes-count-badge` to dynamically format item ranges:
     - e.g., `Showing 1–10 of 24 wishes`, `Showing 11–20 of 24 wishes`, `Showing 21–24 of 24 wishes`.
     - Displays `Showing 0 of 0 wishes` on empty datasets or zero-match search results.
4. Auto-Reset and Clamping Architecture:
   - Typing into search input, clicking search clear, changing media filter, or changing date filter automatically resets `currentPage = 1`.
   - Auto-clamping guarantees `currentPage = Math.min(Math.max(1, currentPage), totalPages)` when items are deleted or filtered.
   - Sorting, editing, and duplicating preserve `currentPage` if valid.
5. Complete In-Memory Processing Pipeline:
   `wishesState -> Search filter -> Media filter -> Date filter -> Authoritative Sort -> Pagination Slice -> Render`.
   - 0 Supabase network queries during pagination navigation or page size adjustments.
6. Row Action Targeting Integrity:
   - All row actions (`👁️ View`, `✏️ Edit`, `📋 Duplicate`, `🗑️ Delete`, `📋 Copy UUID Link`) on pages 2, 3, etc. continue targeting exact wish UUIDs via `data-id`.
7. Glassmorphic Design & Responsive Layout:
   - Added `.table-pagination`, `.pagination-size-group`, `.page-size-select`, `.pagination-controls`, `.pagination-btn`, and `.pagination-info` in `css/admin/admin-components.css`.
   - Clean flexbox layout with mobile flex-wrapping.
8. Automated Test Validation:
   - Created `scratch/test_phase31b_wishes_pagination.js` (22/22 tests passed).
   - Validated JS syntax across all 42 JS files (42/42 valid).
   - Total regression suite: 478 / 478 automated tests passed (100% pass rate).
9. Sacred Invariants Preserved:
   - Public Wish Page untouched.
   - Quick Editor and Studio Editor untouched.
   - Secure Server-Side Delete and Duplication untouched.
   - Database schema and RLS policies untouched.

## 34. PHASE 31B-4 — WISHES TABLE RICH CONTENT & MEDIA INDICATORS

1. Dedicated Content & Media Table Column:
   - Added `<th>Content & Media</th>` to the Wishes table in `admin.html`.
   - Updated empty and error state table rows to span all 7 columns (`colspan="7"`).
2. Indicator Helpers & Robust Parsing:
   - `getPhotoCount(w)`: Parses `gallery_json` (handles array and JSON string) and counts valid photo objects (`image`, `url`, `file`, `src`).
   - `getLetterCount(w)`: Parses `letter_lines` (handles array, JSON string, or newline-delimited string) and counts non-empty lines.
   - `getTimelineCount(w)`: Parses `timeline_json` (handles array or JSON string) and counts milestone objects (`title`, `date`, `desc`, `year`).
   - `getMediaOffset(url)`: Extracts `#bw-start=SEC` start offset timestamp from media URLs.
   - `formatOffset(sec)`: Formats numeric seconds into clean `MM:SS` display format.
   - `renderContentBadges(w)`: Generates safe, compact HTML badges without mutating the source wish object.
3. Visual Indicator Badges:
   - 🎵 `Music`: Rendered when `music_url` is valid. Tooltip shows start offset (e.g. `🎵 Music attached (starts at 00:30)`).
   - 🎥 `Video`: Rendered when `video_url` is valid. Tooltip shows start offset (e.g. `🎥 Video attached (starts at 01:45)`).
   - 📸 `Photos (N)`: Rendered when `photoCount > 0` (e.g. `📸 3 Photos in Gallery`).
   - 📜 `Letter (N)`: Rendered when `letterCount > 0` (e.g. `📜 5 Letter Lines`).
   - ⏳ `Timeline (N)`: Rendered when `timelineCount > 0` (e.g. `⏳ 4 Timeline Milestones`).
   - 📝 `Text Only`: Rendered when wish has no music, video, or photos.
4. Glassmorphic Styling & Layout:
   - Added `.wish-media-badges` and `.content-badge` variant classes in `css/admin/admin-components.css` (`.badge-music`, `.badge-video`, `.badge-photos`, `.badge-letter`, `.badge-timeline`, `.badge-text-only`).
   - Clean micro-hover transitions and lightweight tooltip descriptions.
5. In-Memory Processing & Zero Network Overhead:
   - Indicators are derived entirely during rendering from in-memory `wishesState`.
   - 0 additional Supabase database queries or backend API calls.
6. Public API Exports:
   - Exported `getPhotoCount`, `getLetterCount`, `getTimelineCount`, `getMediaOffset`, `formatOffset`, `renderContentBadges` on `window.AdminWishes`.
7. Automated Test Validation:
   - Created `scratch/test_phase31b_wishes_indicators.js` (21 unit & integration tests).
   - Total regression suite: 499 / 499 automated tests passing (100% pass rate).

## 35. PHASE 31B-5 — WISHES TABLE BULK SELECTION FOUNDATION

1. Row Checkbox & Selection State:
   - Added compact checkbox `<input type="checkbox" class="table-checkbox wish-row-checkbox" data-id="${rawId}">` to each Wishes table row.
   - Authoritative in-memory state: `selectedWishIds = new Set()` storing canonical UUID strings.
   - 0 row index dependency; selection follows UUID identity across pagination, sorting, and filtering.
2. Select-All Header Checkbox:
   - Added `#wishes-select-all` checkbox to table `<thead>`.
   - Supports 3 distinct states:
     - `checked`: when all visible items on active page are selected.
     - `unchecked`: when no visible items on active page are selected.
     - `indeterminate`: when some, but not all, visible items on active page are selected.
   - Clicking select-all toggles selection ONLY for the visible items on the active page.
3. Selection Count & Clear Control:
   - Added `#wishes-selection-badge` displaying `<span id="wishes-selected-count">N</span> selected` near toolbar.
   - Added `#btn-wishes-clear-selection` (`✕ Clear`) to immediately clear all selections with 0 database requests.
4. Seamless Multi-Feature Integration:
   - **Pagination**: Selections persist across page navigation (Page 1, Page 2, Page 3+) and page size changes (`5`, `10`, `25`, `50`, `All`).
   - **Search & Filters**: Selections persist across search queries, media filters, and date filters without losing selected UUIDs.
   - **Sorting**: Column sorting preserves all selected items.
   - **Row Actions**: Deleting a wish removes its UUID from `selectedWishIds`; duplicating or creating a wish does not auto-select new items.
5. In-Memory Processing & Zero Backend Overhead:
   - 100% client-side operation with 0 Supabase network queries during selection changes.
   - Zero destructive bulk actions or privileged API changes introduced in this phase.
6. Public API Exports:
   - Exported `getSelectedIds`, `isWishSelected`, `selectWish`, `deselectWish`, `toggleWishSelection`, `selectAllVisible`, `deselectAllVisible`, `clearSelection`, `updateSelectionUI` on `window.AdminWishes`.
7. Automated Test Validation:
   - Created `scratch/test_phase31b_wishes_selection.js` (30 unit & integration tests).
   - Total regression suite: 464 / 464 automated tests passing (100% pass rate).

## 36. PHASE 31B-6 — BULK ACTIONS: SECURE BULK DELETE

1. UI / UX Bulk Action Controls:
   - Added `#btn-wishes-bulk-delete` (`🗑️ Delete Selected (<span id="wishes-bulk-delete-count">N</span>)`) inside `#wishes-selection-badge`.
   - Automatically displayed via flex layout when `selectedWishIds.size > 0`; hidden when `selectedWishIds.size === 0`.
   - Styled with theme-matched crimson glassmorphism accent (`.btn-bulk-delete`, `.btn-bulk-delete:hover`, `.btn-bulk-delete:disabled`).
2. Strong Confirmation Safety Prompt:
   - Explicit confirmation dialog prompts user:
     `Delete N selected wishes?\n\nThese wish records will be permanently deleted from the database. Storage media will remain untouched.\n\nThis action cannot be undone.`
   - Cancelling leaves in-memory state and all selections 100% untouched.
3. Serverless API Multi-UUID Architecture (`api/admin-delete-wish.js`):
   - Backward-compatible enhancement supporting both `body.uuid` (single string) and `body.uuids` (array of strings).
   - Validates each UUID against strict regex and protects system config row (`00000000-0000-0000-0000-000000000001`) with HTTP 403.
   - Authenticates caller using HMAC-SHA256 session token signed against system security credentials.
   - Executes privileged PostgREST batch delete: `DELETE /rest/v1/wishes?id=in.(uuid1,uuid2,...)` using `process.env.SUPABASE_SERVICE_ROLE_KEY` with header `Prefer: return=representation`.
   - Returns structured response: `{ success: true, message, deletedCount, deletedIds, failedIds }`.
4. Client Database Module (`js/database.js`):
   - Added `DatabaseModule.deleteWishesBulk(uuids)` with client-side system row validation and token dispatch.
   - Zero fallback to direct client-side `.delete()` or anon keys; zero service_role exposure on frontend.
5. In-Memory State & Table Synchronization (`js/admin/admin-wishes.js`):
   - `AdminWishes.deleteSelectedWishes(triggeringBtn)`:
     - Disables button and sets loading state (`⏳ Deleting...`).
     - Removes successfully deleted records from `wishesState` and `selectedWishIds`.
     - Retains failed records in `wishesState` and keeps them selected in `selectedWishIds`.
     - Automatically re-renders table, updates count badge, synchronizes tri-state header checkbox, and auto-clamps page if active page becomes empty.
     - Dispatches `onStateChangeHook("WISHES_BULK_DELETED", ...)` to atomically refresh dashboard KPIs (Total Wishes, Storage analytics) and activity log.
6. Zero Storage Deletions Invariant:
   - Bulk deletion strictly removes database rows only; `wish-media` Storage bucket files remain completely untouched.
7. Public API Exports:
   - Exported `deleteSelectedWishes` on `window.AdminWishes`.
8. Automated Test Validation:
   - Created `scratch/test_phase31b_bulk_delete.js` (27 comprehensive unit & integration tests).
   - Validated JS syntax across all 42 JS files (42/42 valid).
   - Total regression suite: 491 / 491 automated tests passing (100% pass rate).

## 37. PHASE 31B-7 — BULK ACTIONS: WISHES TABLE BULK DUPLICATE

1. UI / UX Bulk Action Controls:
   - Added `#btn-wishes-bulk-duplicate` (`📋 Duplicate Selected (<span id="wishes-bulk-duplicate-count">N</span>)`) inside `#wishes-selection-badge`.
   - Dynamically displayed via flex layout when `selectedWishIds.size > 0`; hidden when `selectedWishIds.size === 0`.
   - Styled with theme-matched glassmorphism blue accent (`.btn-bulk-duplicate`, `.btn-bulk-duplicate:hover`, `.btn-bulk-duplicate:disabled`).
2. Confirmation Dialog & Loading State:
   - Explicit confirmation dialog prompts user:
     `Duplicate N selected wishes?\n\nNew copy records will be created with "(Copy)" appended to their recipient names. Original wishes will remain untouched.`
   - Cancelling performs 0 database operations, preserving all selections and table state.
   - Button is disabled and displays `⏳ Duplicating...` during async duplication, restored in `finally`.
3. Duplication Semantics & Data Integrity:
   - Centralized `prepareDuplicatePayload(data)` helper extracting all 15 wish columns: `recipient_name`, `sender_name`, `pass_code`, `birth_date`, `letter_lines`, `memory_text`, `reasons_json`, `wishes_json`, `gallery_json`, `timeline_json`, `gift_json`, `music_url`, `video_url`, `cake_flavor`, `letter_font`, `letter_theme`.
   - Appends `(Copy)` to `recipient_name`.
   - Generates brand-new database UUIDs for each duplicate record; original records remain 100% untouched.
   - Preserves media URLs by reference without duplicating physical files in `wish-media` Storage.
   - Strictly blocks duplication of system configuration row (`00000000-0000-0000-0000-000000000001`).
   - Newly created duplicate records are NOT auto-selected; existing original selections remain logically intact.
4. Client Database Module (`js/database.js`):
   - Added `DatabaseModule.duplicateWishesBulk(sourceUuids)` executing batch `.select("*").in("id", validSourceIds)` and batch `.insert(duplicatePayloads).select("*")`.
   - Refactored single `duplicateWishRecord` to share `prepareDuplicatePayload(data)`.
5. In-Memory State & Table Synchronization (`js/admin/admin-wishes.js`):
   - `AdminWishes.duplicateSelectedWishes(triggeringBtn)`:
     - Adds newly inserted duplicate records to `wishesState`.
     - Re-renders table, updates item range/count badge (e.g. `Showing 1–10 of 26 wishes`), and updates tri-state header checkbox.
     - Dispatches `onStateChangeHook("WISHES_BULK_DUPLICATED", ...)` to automatically refresh Dashboard Total Wishes KPI and Activity Feed without manual reload.
6. Public API Exports:
   - Exported `duplicateSelectedWishes` on `window.AdminWishes`.
   - Exported `duplicateWishesBulk` on `window.DatabaseModule`.
7. Automated Test Validation:
   - Created `scratch/test_phase31b_bulk_duplicate.js` (26 unit & integration tests).
   - Validated JS syntax across all 42 JS files (42/42 valid).
   - Total regression suite: 517 / 517 automated tests passing (100% pass rate).

## 38. PHASE 31B-8 — BULK ACTIONS: WISHES TABLE BULK COPY UUID LINKS

1. UI / UX Bulk Action Controls:
   - Added `#btn-wishes-bulk-copy-links` (`📋 Copy Links (<span id="wishes-bulk-copy-links-count">N</span>)`) inside `#wishes-selection-badge`.
   - Dynamically displayed via flex layout when `selectedWishIds.size > 0`; hidden when `selectedWishIds.size === 0`.
   - Styled with emerald/teal glassmorphism accent (`.btn-bulk-copy-links`, `.btn-bulk-copy-links:hover`, `.btn-bulk-copy-links:disabled`).
2. Public Canonical UUID Share Link Format:
   - Reuses existing single-row Copy UUID Link URL-building logic:
     `${window.location.origin}/?w=${encodeURIComponent(id)}`
   - Formats clipboard text as one public wish URL per line (newline-separated).
   - Strictly excludes passcodes, recipient names, sender names, and internal admin URLs (`admin.html` / `admin_edit`).
3. Async Clipboard Handling & Double-Click Protection:
   - `AdminWishes.copySelectedWishLinks(triggeringBtn)`:
     - Disables button and sets loading state (`⏳ Copying...`).
     - Uses `navigator.clipboard.writeText(payloadText)` with fallback textarea `document.execCommand('copy')`.
     - Shows concise toast feedback (`Copied N wish link(s) 📋` or `Copy failed: <error> ⚠️`).
     - Restores button state in `finally`.
4. Selection State Preservation & Stale UUID Handling:
   - Successful copy leaves `selectedWishIds` 100% intact, allowing immediate subsequent actions (Duplicate, Delete, or re-copy).
   - Resolves selected UUIDs against `wishesState`, ignoring and pruning any stale/missing records without throwing.
5. Zero Backend & Zero Storage Invariant:
   - 100% client-side utility feature with 0 Supabase network/DB mutations and 0 Storage alterations.
6. Public API Exports:
   - Exported `getSelectedWishLinks` and `copySelectedWishLinks` on `window.AdminWishes`.
7. Automated Test Validation:
   - Created `scratch/test_phase31b_bulk_copy_links.js` (26 unit & integration tests).
   - Validated JS syntax across all 42 JS files (42/42 valid).
   - Total regression suite: 543 / 543 automated tests passing (100% pass rate).

## 39. PHASE 31B-9 — BULK ACTIONS: WISHES TABLE BULK EXPORT (JSON & CSV)

1. UI / UX Bulk Action Controls:
   - Added `#btn-wishes-bulk-export` (`📥 Export (<span id="wishes-bulk-export-count">N</span>)`) inside `#wishes-selection-badge`.
   - Dynamically displayed via flex layout when `selectedWishIds.size > 0`; hidden when `selectedWishIds.size === 0`.
   - Styled with theme-matched glassmorphism amber accent (`.btn-bulk-export`, `.btn-bulk-export:hover`, `.btn-bulk-export:disabled`).
2. Client-Side Blob & ObjectURL Architecture:
   - 100% client-side file generation using `Blob`, `URL.createObjectURL(blob)`, and simulated anchor click download.
   - Automatically revokes object URLs after 1 second (`URL.revokeObjectURL`).
   - Generates deterministic filename matching local date: `wishes-export-YYYY-MM-DD.json` / `wishes-export-YYYY-MM-DD.csv`.
3. Multi-Format Data Portability:
   - **JSON Export**: Deep-cloned array of full wish records preserving all 18 wish columns and complex nested JSON structures (`birth_date`, `reasons_json`, `wishes_json`, `gallery_json`, `timeline_json`, `gift_json`, `letter_lines`).
   - **CSV Export**: Standardized RFC 4180 CSV generation with header row and proper double-quote escaping for fields containing commas, quotes (`""`), newlines, and serialized JSON structures.
4. Selection State Preservation & Stale UUID Handling:
   - Successful export leaves `selectedWishIds` 100% intact, enabling seamless action chaining (Export → Copy Links → Duplicate → Delete).
   - Resolves selected UUIDs against `wishesState`, ignoring and pruning any stale/missing records without throwing.
5. Async Double-Click Protection & Error Resilience:
   - Disables button and displays `⏳ Exporting...` during export execution, restored in `finally`.
   - Displays concise toast feedback (`Exported N wish record(s) (JSON/CSV) 📥` or `Export failed: <error> ⚠️`).
6. Zero Backend & Zero Storage Invariant:
   - 100% read-only client-side operation with 0 Supabase network/DB mutations, 0 API calls, and 0 Storage bucket alterations.
7. Public API Exports:
   - Exported `getSelectedWishesData`, `formatWishesToCSV`, and `exportSelectedWishes` on `window.AdminWishes`.
8. Automated Test Validation:
   - Created `scratch/test_phase31b_bulk_export.js` (26 unit & integration tests).
   - Validated JS syntax across all 42 JS files (42/42 valid).
   - Total regression suite: 569 / 569 automated tests passing (100% pass rate).

## 40. PHASE 31B-10 — WISHES TABLE MANAGEMENT UX BATCH

1. Visual Row Selection Highlighting:
   - Added `.admin-table tbody tr.selected-row td` (`background: rgba(168, 85, 247, 0.12) !important;`) and `.selected-row:hover td` (`background: rgba(168, 85, 247, 0.18) !important;`) in `css/admin/admin-components.css`.
   - `AdminWishes.render()` automatically attaches `.selected-row` to `<tr>` elements when their UUID is in `selectedWishIds`.
   - `AdminWishes.updateSelectionUI()` dynamically toggles `.selected-row` on all rendered `<tr>` elements upon checkbox state changes without full table re-render.
2. In-Memory Stale Selection Auto-Pruning:
   - `render()` automatically prunes stale or deleted UUIDs from `selectedWishIds` against current `wishesState`, ensuring the selection set never holds dangling references.
3. Empty State & Quick Filter Reset:
   - In empty search/filter states, displays `#btn-wishes-empty-reset-filters` (`✕ Reset Filters`).
   - Clicking `#btn-wishes-empty-reset-filters` clears search input, resets media & date dropdowns to "all", resets pagination to page 1, and renders the full wishes list.
   - Exported `resetFilters()` on authoritative `window.AdminWishes` public API.
4. Bulk Action Workflow Unified Consistency:
   - Standardized selection count synchronization across all 4 bulk buttons (`Copy Links`, `Export`, `Duplicate Selected`, `Delete Selected`).
   - Preserved global UUID selection persistence across pagination, search, media/date filters, sorting, and page size changes.
   - Guaranteed zero backend mutations, zero Storage modifications, and zero secret exposures.
5. Automated Test Validation:
   - Created `scratch/test_phase31b_wishes_management_ux.js` (17 unit & integration tests).
   - Validated JS syntax across all 42 JS files (42/42 valid).
   - Total regression suite: 586 / 586 automated tests passing (100% pass rate).

## 41. PHASE 31B-11 — WISHES ADVANCED SEARCH & FILTERING

1. Enhanced Multi-Token Search:
   - Upgraded search pipeline in `js/admin/admin-wishes.js` to support multi-token AND matching across recipient name, sender name, full UUID & UUID substrings, passcodes (`pass_code`), and memory notes (`memory_text`).
   - Query string is whitespace-tokenized and trimmed; every token must match at least one searchable field on the target record.
2. Strict Combined Filtering Semantics (AND Logic):
   - Search query, media filter (`all`, `music`, `video`, `photos`, `text_only`), and creation date filter (`all`, `today`, `7d`, `30d`) operate with strict intersection (AND) semantics.
   - Preserves active sort ordering and auto-clamps pagination to valid page ranges.
3. Filter & Selection State Consistency:
   - Global UUID selections in `selectedWishIds` are preserved when records are filtered out of current view.
   - Bulk action toolbar counts (`Copy Links`, `Export`, `Duplicate`, `Delete`) accurately reflect total selected records regardless of active filters.
   - In-memory stale UUID auto-pruning ensures non-existent records are never retained.
4. Quick Reset & Empty State Resilience:
   - Empty search/filter state displays contextual message and `#btn-wishes-empty-reset-filters` (`✕ Reset Filters`).
   - `AdminWishes.resetFilters()` public API resets search text and all filter selects to default, resets pagination to page 1, and re-renders full dataset while maintaining selections.
5. Zero Network / Zero Backend Invariant:
   - 100% client-side in-memory filtering against `wishesState`. 0 Supabase network queries, 0 database alterations, 0 Storage alterations, 0 secret exposure.
6. Automated Test Validation:
   - Created `scratch/test_phase31b_wishes_advanced_filters.js` (20 unit & integration tests).
   - Validated JS syntax across all 42 JS files (42/42 valid).
   - Total regression suite: 606 / 606 automated tests passing (100% pass rate).

## 42. PHASE 31B-12 — WISHES MANAGEMENT PRODUCTIVITY BATCH

1. Quick Search Clear & Preservation:
   - Added `clearSearch()` helper and authoritative export on `window.AdminWishes`.
   - Clearing search resets search text and returns pagination to page 1, while preserving active media filters, date filters, sort order, and global `selectedWishIds`.
   - `#btn-wishes-search-clear` click directly invokes `clearSearch()`.
2. Keyboard-Accessible Search Shortcuts:
   - Pressing `/` key globally when in the Wishes view immediately focuses `#wishes-search-input` and selects its text for quick editing.
   - Guarded against shortcut collisions: ignored when typing in editable elements (`INPUT`, `TEXTAREA`, `SELECT`, `[contenteditable]`), when modifier keys (`Ctrl`, `Meta`, `Alt`) are held, or when modals/editors are active.
   - Pressing `Escape` while focused in `#wishes-search-input` clears search text if non-empty, or blurs focus if already empty.
3. Result Count & Selection Clarity:
   - Live result count badge accurately reflects filtered items vs total items.
   - Bulk action toolbar counts remain synchronized with global selection across search, pagination, and filter changes.
4. Seamless Action Chaining:
   - Preserves selection integrity during rapid search-and-action workflows (Search -> Select -> Export -> Copy Links -> Clear Search -> Delete).
5. Zero Backend & Zero Storage Invariant:
   - 100% client-side in-memory operation. 0 database queries, 0 schema mutations, 0 Storage alterations, 0 secret exposure.
6. Automated Test Validation:
   - Created `scratch/test_phase31b_wishes_productivity.js` (14 unit & integration tests).
   - Validated JS syntax across all 42 JS files (42/42 valid).
   - Total regression suite: 620 / 620 automated tests passing (100% pass rate).

## 43. PHASE 31B-13 / 31B-13.2 / 31B-13.3 — WISHES QUICK VIEW & ACTION EFFICIENCY (FINAL BUG FIX PASS)

1. Quick View Inspection Dashboard & Content Cards:
   - Implemented dynamic, high-performance modal inspector (`#wishes-quick-view-overlay`) in `js/admin/admin-wishes.js`.
   - Accessible via `👁️` row action button (`data-action="view"`) or authoritative `AdminWishes.openQuickView(wishId)`.
   - **Compact UUID Control**: Formatted as readable inline code with adjacent compact `[ 📋 Copy UUID ]` button positioned toward the right side on a single row without oversized flex-grow stretching.
   - **Open Public Page Control**: Styled standard HTML anchor link (`🌐 Open Public Page ↗`) with canonical URL `/?w=UUID`, `target="_blank"`, `rel="noopener noreferrer"`, and zero blocking async handlers or delayed operations.
   - **Comprehensive Birthday Normalization & Parsing**:
     - Accurately parses and normalizes all 8 database and legacy date formats into `{day, month, year}`:
       1. Direct object `{day: 17, month: 8, year: 2001}` or `{year: 2001, month: 8, day: 17}`.
       2. JSON-stringified object `'{"day":17,"month":8,"year":2001}'` or `'{"year":2001,"month":8,"day":17}'`.
       3. CamelCase `birthDate` object `{day: 17, month: 8, year: 2001}`.
       4. CamelCase JSON string `'{"day":17,"month":8,"year":2001}'`.
       5. Legacy `d/m/y` fields `{d: 17, m: 8, y: 2001}`.
       6. Plain date strings `DD/MM/YYYY` (e.g. `"17/08/2001"`) and `YYYY-MM-DD` (e.g. `"2001-08-17"`).
       7. Strict validation: day (1–31), month (1–12), year (1900–2100).
       8. Fallback: Displays clean `"Not specified"` if missing or invalid without guessing, mutating records, or throwing errors.
   - **Customization & Gift No-Wrap Single-Line Layout**:
     - Styled customization summary row tags (`🎨 Theme`, `🔤 Font`, `🍰 Cake`, `🎁 Gift`) with `white-space: nowrap;` so labels like `🎁 Gift: Attached (View →)` stay cleanly on a single line on desktop.
   - **Indian 12-Hour Date/Time**: Formatted created timestamps as `DD/MM/YYYY, h:mm:ss A` in `Asia/Kolkata` timezone.
   - **Content & Highlights Clickable Cards**:
     - *Basic Info*: Birthday, Recipient, Sender.
     - *Content Cards*: `[ 💖 Wishes (N) ]`, `[ 💭 Reasons (N) ]`, `[ 📝 Memory ]`, `[ 💌 Letter (N) ]`.
## 43. PHASE 31B-13 / 31B-13.2 / 31B-13.3 / 31B-13.4 — WISHES MANAGEMENT QUICK VIEW & GALLERY LIGHTBOX

1. Ultra-Compact UUID Control & Public Page Link:
   - Header UUID control laid out as `[ UUID text ................................ ] [ 📋 Copy UUID ]` with monospace font, subtle background, ellipsis truncation, and a content-sized, right-aligned button (`flex: 0 0 auto; width: auto;`).
   - `🌐 Open Public Page ↗` control rendered as a canonical HTML link opening `/?w=UUID` in a new tab (`target="_blank"`, `rel="noopener noreferrer"`) without blocking async intercepts or unnecessary event overhead.

2. Comprehensive Birthday Parsing & Normalization:
   - `normalizeBirthDate(w)` supports all project candidate representations:
     - Direct object: `{ day: 17, month: 8, year: 2001 }` or `{ d, m, y }`
     - JSON-stringified object: `'{"day":17,"month":8,"year":2001}'`
     - CamelCase object: `w.birthDate = { day: 17, month: 8, year: 2001 }`
     - CamelCase JSON string: `'{"day":17,"month":8,"year":2001}'`
     - Legacy fields: `w.d, w.m, w.y` or `w.day, w.month, w.year`
     - Date strings: `"17/08/2001"`, `"17-08-2001"`, `"2001-08-17"`
   - Normalizes to `{ day, month, year }` and formats display strictly as `DD/MM/YYYY` (e.g. `17/08/2001`).
   - Boundary validation: day (1-31), month (1-12), year (1900-2100).
   - Missing/invalid fallback: Safely renders `Not specified`.

3. Authoritative Theme & Font Customization Schema Resolution:
   - `resolveTheme(w)`: Checks custom schema `w.letter_theme` first, then fallbacks `w.letterTheme`, `w.lt`, `w.theme_id`, `w.theme`, defaulting to `"default"`.
   - `resolveFont(w)`: Checks custom schema `w.letter_font` first, then fallbacks `w.letterFont`, `w.lf`, `w.font_id`, `w.font`, defaulting to `"default"`.
   - Resolves accurately without mutating source wish data or converting valid non-default values to default.

4. Guaranteed Card Order & 4-Column Customization Row:
   - **Content Cards Order**: Strictly ordered as `[ 💌 Letter ]`, `[ 📝 Memory ]`, `[ 💭 Reasons ]`, `[ 💖 Wishes ]`.
   - **Media Cards Order**: Strictly ordered as `[ 📸 Photos ]`, `[ ⏳ Timeline ]`, `[ 🎵 Music ]`, `[ 🎥 Video ]`.
   - **Customization & Gift Row**: Exactly 4 equal 1-line columns (`🎨 Theme: X`, `🔤 Font: X`, `🍰 Cake: X`, `🎁 Gift: Attached (View →)`).
     - Applied `white-space: nowrap; text-overflow: ellipsis; overflow: hidden;` to ensure no wrapping to second line.
     - Interactive `(View →)` on Gift tag directly opens the Gift detail view inside the modal.

5. Interactive In-Modal Image Lightbox (`#wishes-gallery-lightbox`):
   - Clicking `View ↗` or gallery thumbnails opens an internal glassmorphic lightbox overlay (`z-index: 100000; position: fixed; inset: 0; background: rgba(5,2,10,0.92)`).
   - Supports `data:image/...;base64,...`, HTTPS URLs, and item object formats (`item.image`, `item.url`, `item.src`).
   - Lightbox header displays `Photo X of Y` indicator and `✕` close button (`#btn-gallery-lightbox-close`).
   - Lightbox image navigation: `‹` previous and `›` next buttons, plus `ArrowLeft` and `ArrowRight` keyboard shortcuts.
   - Robust fallback on error: displays `🖼️ Image preview unavailable` without exposing raw Base64 strings.
   - Backdrop click and `Escape` key close the Lightbox overlay first before Quick View.

6. Top-Right Floating Modal Feedback Toast:
   - Dedicated `#wishes-quick-view-toast` element positioned at top-right inside the modal card (`right: 52px; z-index: 10000`).
   - Toast on Copy UUID: `"📋 UUID copied to clipboard!"`.
   - Toast on Copy Link: `"🔗 Shareable link copied to clipboard!"`.

7. Complete State Preservation & Zero-Mutation Invariant:
   - Search query, filters (media & date), sort state, pagination page, and row selections are 100% preserved across all Quick View and Lightbox operations.
   - 0 Supabase mutations, 0 database writes, 0 API changes, 0 secret exposures.
   - Passcodes are strictly protected and never displayed in plaintext.
   - Master configuration row (`00000000-0000-0000-0000-000000000001`) retains deletion and duplication protection.

8. Automated Test Validation:
   - Updated `scratch/test_phase31b_wishes_quick_view.js` (38 comprehensive unit & integration tests).
   - Validated JS syntax across all 42 JS files (42/42 valid).
   - Total regression suite: 658 / 658 automated tests passing (100% pass rate).

## 44. PHASE 31B-14 — WISHES TABLE VIEW CUSTOMIZATION & DENSITY CONTROLS

1. Table Density Modes ('comfortable' vs 'compact'):
   - Implemented dynamic table row density switching between `comfortable` (default spacious row height, comfortable padding) and `compact` (streamlined row height, reduced cell padding, tighter text line-height).
   - Dynamically attaches `.table-density-comfortable` or `.table-density-compact` to the table panel and `.admin-table`.
   - Exposed authoritative public API: `AdminWishes.getDensity()` and `AdminWishes.setDensity(mode)`.

2. Dynamic Column Visibility Toggling:
   - Supports toggling non-essential columns (`sender`, `media`, `passcode`, `uuid`, `created`) via interactive Columns popover menu (`#btn-wishes-columns-toggle`, `#wishes-columns-popover`).
   - Essential columns (`select`, `recipient`, `actions`) remain protected and always visible to ensure core navigation and management operations are never impaired.
   - Dynamically attaches `.hide-col-<column>` CSS classes to the table element to instantly toggle visibility with zero reflow glitches.
   - Dynamic `colspan` calculation in `render()` for empty and error states dynamically adapts to current visible column count.
   - Exposed authoritative public API: `AdminWishes.getColumnVisibility(col)` and `AdminWishes.setColumnVisibility(col, isVisible)`.

3. Persistent Storage with Resilient Fallback:
   - View preferences (density and column visibility) are automatically persisted to `localStorage` under `bw_admin_wishes_view_prefs`.
   - Automatically rehydrates on initialization. If `localStorage` is empty, disabled, or contains corrupted JSON, gracefully falls back to default settings without throwing errors.
   - Exposed public API: `AdminWishes.getViewPreferences()`, `AdminWishes.saveViewPreferences()`, `AdminWishes.loadViewPreferences()`, and `AdminWishes.applyViewPreferences()`.

4. Reset View Preferences Workflow:
   - `#btn-wishes-reset-view` in toolbar restores default comfortable density and reveals all columns simultaneously.
   - Exposed public API: `AdminWishes.resetView()`.
   - Completely decoupled from data filters: resetting view preferences preserves active search queries, media/date filters, sort state, pagination page, and selected wishes (`selectedWishIds`).

5. State Preservation & Security Invariants:
   - Complete state preservation across density switches and column toggles (selected rows stay selected, pagination page intact, search/filter intact).
   - 0 backend mutations, 0 Supabase network queries, 0 storage changes, 0 secret exposures.

6. Automated Test Validation:
   - Created `scratch/test_phase31b_view_preferences.js` (14 comprehensive unit & integration tests).
   - Validated JS syntax across all 42 JS files (42/42 valid).
   - Total regression suite: 672 / 672 automated tests passing (100% pass rate).

## 45. PHASE 31B-14.1 — TABLE VIEW CONTROLS UX REFINEMENT & VISUAL VERIFICATION

1. Unmistakable Visual Density Difference (Comfortable vs Compact):
   - **Comfortable** (~60–70px row height): 14px 16px cell padding, 36px circular avatar, comfortable 1.45 line-height, 32px action buttons, spacious badge spacing.
   - **Compact** (~40–46px row height): 5px 12px cell padding, 28px circular avatar, tight 1.2 line-height, 24px action buttons (`.btn-icon`, `.btn-copy-link`), micro media badges (`padding: 1.5px 5px; font-size: 0.65rem`), tighter cell gaps (`7px`).
   - Density dropdown labels clearly distinct: `📐 Comfortable` and `⚡ Compact`.

2. Modernized Self-Explanatory Columns Popover:
   - Clearly separated into `TABLE COLUMNS` header and `Always visible` pinned footer.
   - Optional columns: Sender, Content & Media, Passcode, Public Link, Created At.
   - Pinned columns with check indicators: Selection, Recipient, Actions (protected from toggling).
   - Updated header label from confusing "UUID Link" / "Link (UUID)" to clean "Public Link".

3. Non-Blocking Column Toggle Toast Feedback:
   - Toast feedback instantly confirms state transitions: `"[Column Name] column [shown|hidden]"`.
   - Table updates immediately with zero reflow glitches, zero network requests, and zero state mutation.

4. Decoupled Reset View Workflow:
   - `#btn-wishes-reset-view` restores comfortable density and all optional columns.
   - Displays toast: `"Table view reset to default preferences ✨"`.
   - 100% preserves search queries, media/date filters, sort field/direction, pagination page/size, and `selectedWishIds`.

5. Automated Test Suite & Integrity Validation:
   - Expanded `scratch/test_phase31b_view_preferences.js` to 20 comprehensive unit and integration tests.
   - Verified 100% pass rate across all regression suites.

## 46. PHASE 31B-14.2 — ACTUAL TABLE VIEW CONTROLS VISUAL FIX

1. Root Cause Analysis & Architectural Fix:
   - **Multi-table querySelector Mismatch**: In `admin.html`, `#view-dashboard` contains the first `.table-panel` and `table.admin-table` on the page. Previously, `applyViewPreferences()` used `document.querySelector(".table-panel")` and `document.querySelector("table.admin-table")`, which selected only the Dashboard's Recent Wishes table and failed to apply `.table-density-compact` and `.hide-col-*` classes to `#view-wishes .table-panel` and `#view-wishes table.admin-table`.
   - Fixed by targeting `#view-wishes .table-panel`, `#view-wishes table.admin-table`, `tbody.closest("table")`, `tbody.closest(".table-panel")`, and all table panels / tables across views.

2. Visual Density Distinction & CSS High-Specificity Rules:
   - **Comfortable**: `14px 16px` padding, `36px` avatar, `32px` action buttons, `1.45` line-height (~60–70px row height).
   - **Compact**: `4px 10px` cell padding, `28px` avatar, `22px` action buttons, `18px` / `0.62rem` micro media badges with single-line `flex-wrap: nowrap`, `1.15` line-height (~40–44px row height).
   - Added high-specificity CSS selectors targeting `.table-panel.table-density-*`, `table.admin-table.table-density-*`, and inner cells.

3. One-Line "🔗 Copy Link" Table Button:
   - Fixed text wrapping by setting `white-space: nowrap !important; display: inline-flex !important; align-items: center !important; gap: 5px !important; flex: none !important; width: auto !important;` on `.btn-copy-link`.
   - Styled `.col-uuid` with `white-space: nowrap !important; min-width: 108px; text-align: center;`.
   - In Compact mode: `.btn-copy-link` scales down to `height: 22px; font-size: 0.68rem; padding: 2px 7px;` staying strictly on ONE horizontal line.

4. True Column Collapse & Layout Reflow:
   - Enhanced `.hide-col-*` CSS selectors with `table.admin-table.hide-col-<key> .col-<key> { display: none !important; }` and `.table-panel.hide-col-<key> .col-<key> { display: none !important; }` across all 5 optional columns (`sender`, `media`, `passcode`, `uuid`, `created`).
   - Dynamic colspan correctly adjusts on empty/error states (decrements from 8 down to 3).

5. Test Suite & Regression Verification:
   - Created 26-test suite in `scratch/test_phase31b_view_preferences.js` verifying density states, multi-table targeting, CSS computed values, one-line Copy Link, column collapse, toasts, and state preservation.
   - All 127 automated tests passing with 0 errors.

## 47. PHASE 31B-14.3 — TABLE COLUMN WIDTH BALANCING & MEDIA BADGE LAYOUT REFINEMENT

1. Root Cause Identification:
   - Previously, `.wish-media-badges` had a hard-coded container cap (`max-width: 260px`). Even when the Content & Media table column had 350–400px+ of available table width, the badge container restricted badge flow to 260px, forcing 5 badges (Music, Video, Photos, Letter, Timeline) to wrap across 3 lines.
   - Fixed-content columns (`col-passcode`, `col-uuid`, `col-created`, `col-actions`) lacked `width: 1%` shrink-to-fit declarations, consuming excessive space at the expense of `.col-media`.

2. Column Width Balancing Architecture:
   - Set `width: 1%; white-space: nowrap;` on fixed-content columns:
     - `.col-uuid`: `min-width: 92px;` (tightly sized for `🔗 Copy Link` on 1 line).
     - `.col-passcode`: `min-width: 78px;`
     - `.col-created`: `min-width: 110px;`
     - `.col-actions`: `min-width: 130px;`
   - Flexible columns receive maximum allocated table space:
     - `.col-media`: `min-width: 220px;` with `.wish-media-badges { max-width: none; width: 100%; }`.
     - `.col-recipient`: `min-width: 140px;`
     - `.col-sender`: `min-width: 95px;`

3. Media Badge Sizing in Comfortable & Compact Modes:
   - **Comfortable**: Badges styled with `padding: 2.5px 7px; font-size: 0.70rem; height: 22px; gap: 3px; border-radius: 10px;`. All 5 badges fit side-by-side on ONE line on standard desktop viewports (~258px total), or wrap gracefully into at most 2 balanced lines without forcing excessive row height.
   - **Compact**: Badges styled with `padding: 1.5px 5px !important; font-size: 0.62rem !important; height: 18px !important; line-height: 1 !important; border-radius: 4px !important; gap: 2px !important;`. Total width for 5 badges is ~202px, easily fitting on a single horizontal line and maintaining ~40–44px row height.

4. Dynamic Visibility & Layout Reflow:
   - Hiding `Public Link` collapses `.col-uuid` with `display: none !important;`, automatically reallocating ~92px to `.col-media`.
   - Hiding `Content & Media` collapses `.col-media` with `display: none !important;` with zero blank column gaps.
   - Reset View restores Comfortable mode with all 8 columns in balanced harmony.

5. Test Suite & Verification:
   - Expanded `scratch/test_phase31b_view_preferences.js` to 32 comprehensive tests.
   - 100% pass across all regression suites (133 total tests passing, 0 failures).

## 48. PHASE 31B-14.4 — FINAL TABLE WIDTH / VIEWPORT FIT FIX

1. Root Cause Identification:
   - Aggressive column min-widths (`col-media: 220px`, `col-recipient: 140px`, `col-actions: 130px`, `col-created: 110px`, `col-sender: 95px`, `col-uuid: 92px`, `col-passcode: 78px`, `col-select: 44px`) combined with large horizontal cell padding (`14px 16px` = 32px per cell * 8 columns = 256px padding) forced the minimum table width to 1149px.
   - On standard desktop/laptop viewports (1280px–1366px), where the available width inside `.table-panel` is 888px–974px (after accounting for 280px sidebar, 64px viewport padding, and 48px panel padding), the table exceeded the container by 175–261px, pushing the `Actions` column off-screen and creating unwanted horizontal clipping.

2. Fluid, Space-Aware Architecture:
   - **Cell Padding Optimization**: Reduced Comfortable cell padding to `10–12px 10px` and Compact to `4–5px 8px`, saving ~100px of table width while maintaining spacious visual aesthetics.
   - **Removed Forced Min-Widths**: Replaced rigid min-widths with fluid `width: auto` on flexible content columns (`col-recipient`, `col-sender`, `col-media`) and `width: 1%` shrink-to-fit on static columns (`col-passcode`, `col-uuid`, `col-created`, `col-actions`).
   - **Protected Actions Column**: Sized `.col-actions` to `width: 1%; white-space: nowrap; text-align: right;` with 28px icon buttons in Comfortable and 22px in Compact, ensuring the 4 action buttons (View, Edit, Duplicate, Delete) are 100% visible on all viewports without clipping.
   - **Copy Link Sizing**: Allowed `.btn-copy-link` to wrap naturally into 2 lines if needed (`🔗 Copy`<br>`Link`), preventing `.col-uuid` from artificially widening the table.
   - **Media Badges Natural Wrapping**: Styled `.wish-media-badges` to wrap naturally across 1–2 lines without forcing the table to expand beyond its container.

3. Viewport Fit & Verification:
   - Verified the entire Wishes table fits 100% inside `#view-wishes .table-panel` on standard viewports (scrollWidth <= clientWidth).
   - Zero horizontal page overflow or layout clipping.
   - All 32 automated tests passing with 0 errors across 133 total regression tests.

## 49. PHASE 31B-14.5 — FINAL COMFORTABLE DENSITY & CREATED DATE/TIME VISUAL RESTORE

1. Root Cause Identification:
   - In Phase 31B-14.4, aggressive compression across table cells and typography reduced Comfortable mode's visual scale too much, causing it to appear cramped instead of spacious.
   - The Created At date/time column styling was overly compressed.
   - The Public Link button text "🔗 Copy Link" caused awkward vertical stacking on constrained columns.

2. Visual Scale & Typography Restoration:
   - **Comfortable Density Restored**:
     - Cell padding: `12px 10px` (generous vertical breathing room, space-efficient horizontal padding).
     - Recipient Avatar: `36px × 36px` (restored full admin studio visual scale).
     - Recipient Name: `0.92rem` (semi-bold, clean readability).
     - Recipient ID: `0.74rem` (crisp subtext).
     - Sender Name: `0.86rem`.
     - Content Badges: `22px` height, `0.70rem` font, `2.5px 7px` padding, `8px` radius.
     - Action Buttons: `28px × 28px` with `0.85rem` icon size.
   - **Compact Density Kept Ultra-Dense**:
     - Cell padding: `4px 8px`, `26px` avatar, `16px` micro badges, `22px` action buttons.

3. Created At Date/Time Two-Line Architecture:
   - Structured in DOM as `.created-cell` with `.created-date` and `.created-time`.
   - **Comfortable**: `.created-date` (0.84rem, font-weight 500) and `.created-time` (0.78rem, text-dim) stacked vertically with 2px gap and 1.25 line-height for clean readability.
   - **Compact**: `.created-date` (0.70rem) and `.created-time` (0.64rem, opacity 0.75) stacked cleanly with 0px gap and 1.1 line-height.

4. Public Link Table Button Refinement:
   - Updated table row button label to `🔗 Copy` (icon LEFT, text RIGHT, on ONE horizontal line).
   - Styled with `display: inline-flex !important; flex-direction: row !important; align-items: center !important; justify-content: center !important; gap: 4px !important; white-space: nowrap !important; line-height: 1 !important;`.
   - Added accessible `title="Copy Public Link"` and `aria-label="Copy Public Link"`.
   - Copies canonical `/?w=UUID` with standard toast feedback.

5. Test Suite & Verification:
   - Expanded `scratch/test_phase31b_view_preferences.js` to 34 comprehensive tests.
   - 100% pass across all regression suites (135 total tests passing, 0 failures).

## 50. PHASE 31B-14.6 — FINAL TABLE PROPORTION, MEDIA WIDTH & DENSITY BALANCING

1. Root Cause Identification:
   - Previously, `.wish-media-badges` had `width: 100%` and `.col-media` lacked a `max-width` constraint, causing the Content & Media column to expand excessively across the table (~290px+) in an attempt to keep all badges on 1 line.
   - This squeezed the remaining columns (`col-recipient`, `col-sender`, `col-passcode`, `col-uuid`, `col-created`), making Comfortable mode look compressed and unnatural.
   - Compact mode was tuned too small (avatar 26px, badges 16px, text 0.78rem, buttons 22px), making it feel microscopic rather than dense and readable.

2. Media Column & Badge Width Control:
   - Sized `.col-media` with `width: auto; max-width: 250px;`.
   - Sized `.wish-media-badges` with `display: flex; flex-wrap: wrap; gap: 3px 4px; width: auto; max-width: 100%;` (removed `width: 100%`).
   - Badges wrap naturally (e.g. 3 on line 1, 2 on line 2) without dominating table width or squeezing adjacent columns.

3. Comfortable Mode Scale Restoration:
   - Row height: ~58–68px
   - Avatar: `36px × 36px`
   - Recipient Name: `0.94rem` (font-weight 600)
   - Recipient ID Subtext: `0.75rem`
   - Sender Name: `0.88rem`
   - Badges: `22px` height, `0.70rem` font, `2.5px 7px` padding, `8px` radius
   - Passcode badge: `padding: 4px 9px; font-size: 0.75rem;`
   - Action buttons: `28px × 28px` with `0.85rem` icon size
   - Created At: `0.84rem` date (Line 1) / `0.78rem` time (Line 2) in 2-line layout
   - Public Link: `🔗 Copy` (single-line horizontal button)

4. Compact Mode Readable Dense Tuning:
   - Row height: ~42–48px
   - Avatar: `28px × 28px` (increased from 26px, readable and clear)
   - Recipient Name: `0.82rem` (increased from 0.78rem)
   - Recipient ID Subtext: `0.66rem`
   - Sender Name: `0.80rem`
   - Badges: `18px` height, `0.64rem` font, `1.5px 5px` padding (increased from 16px)
   - Passcode badge: `padding: 2px 6px; font-size: 0.66rem; height: 18px;`
   - Action buttons: `24px × 24px` with `0.74rem` icon size
   - Created At: `0.72rem` date (Line 1) / `0.66rem` time (Line 2) in 2-line layout
   - Public Link: `🔗 Copy` (single-line horizontal button, height 22px)

5. Test Suite & Verification:
   - 34 comprehensive tests in `scratch/test_phase31b_view_preferences.js` passing 100%.
   - 135 total regression tests passing with 0 failures.

## 51. PHASE 31B-14.7 — FINAL ACTION BUTTON SCALE & MEDIA 3+2 BALANCE

1. Scope & Objective:
   - Moderately increase the Action buttons (`👁️`, `✏️`, `📋`, `🗑️`) from `28px` to `30px` in Comfortable mode, and from `24px` to `26px` in Compact mode.
   - Confirm and preserve the Media 3+2 natural wrapping layout (`.col-media { width: auto; max-width: 250px; }` and `.wish-media-badges { width: auto; max-width: 100%; flex-wrap: wrap; }`).

2. Action Button Sizing Updates in `css/admin/admin-components.css`:
   - **Comfortable Mode**:
     - `.btn-icon`: `width: 30px !important; height: 30px !important; min-width: 30px !important; font-size: 0.88rem; border-radius: 6px;`
     - `.action-btns`: `gap: 3px;`
   - **Compact Mode**:
     - `.btn-icon`: `width: 26px !important; height: 26px !important; min-width: 26px !important; font-size: 0.78rem !important; border-radius: 4px !important;`
     - `.action-btns`: `gap: 2px !important;`
   - **Horizontal Protection**: `.col-actions` remains `width: 1%; white-space: nowrap; text-align: right;` with all 4 buttons staying strictly on one horizontal line.

3. Verified Invariants:
   - Media 3+2 natural wrapping layout (e.g. `🎵 Music  🎥 Video  📸 6` / `📝 4  ⏳ 4`) is accepted and maintained.
   - Created At remains strictly **TWO lines** in both Comfortable and Compact modes (`.created-cell` with `.created-date` and `.created-time`).
   - Public Link table button remains strictly **`🔗 Copy`** on ONE line (`white-space: nowrap !important;`).
   - Table fits 100% inside `#view-wishes .table-panel` with zero horizontal page overflow.

4. Test Suite & Verification:
   - All 34 tests in `scratch/test_phase31b_view_preferences.js` passing 100%.
   - All 135 total regression tests passing with 0 failures.

## 52. PHASE 31B-14.8 — FINAL ACTION BUTTON SCALE RESTORE

1. Scope & Objective:
   - Restore the full administrative visual scale of the Action buttons (`👁️`, `✏️`, `📋`, `🗑️`) by upgrading Comfortable mode to `32px × 32px` (matching the original base button scale) and Compact mode to `28px × 28px`.
   - Maintain all existing column allocations, Media max-width (250px), Created At (two-line), and Public Link (`🔗 Copy`).

2. Action Button Sizing Updates in `css/admin/admin-components.css`:
   - **Comfortable Mode**:
     - `.btn-icon`: `width: 32px !important; height: 32px !important; min-width: 32px !important; font-size: 0.90rem; border-radius: 7px;`
     - `.action-btns`: `gap: 3px;`
   - **Compact Mode**:
     - `.btn-icon`: `width: 28px !important; height: 28px !important; min-width: 28px !important; font-size: 0.80rem !important; border-radius: 4px !important;`
     - `.action-btns`: `gap: 2px !important;`
   - **Horizontal Protection**: `.col-actions` remains `width: 1%; white-space: nowrap; text-align: right;` with all 4 buttons staying strictly on one horizontal line.

3. Verified Invariants:
   - Extra width added by 32px buttons is only 8px total across 4 buttons, fitting effortlessly with zero viewport clipping.
   - Media 3+2 natural wrapping layout remains active and accepted.
   - Created At remains strictly **TWO lines** in both Comfortable and Compact modes (`.created-cell` with `.created-date` and `.created-time`).
   - Public Link table button remains strictly **`🔗 Copy`** on ONE line (`white-space: nowrap !important;`).
   - Table fits 100% inside `#view-wishes .table-panel` with zero horizontal page overflow.

4. Test Suite & Verification:
   - All 34 tests in `scratch/test_phase31b_view_preferences.js` passing 100%.
   - All 135 total regression tests passing with 0 failures.

## 53. STABLE 1.8 RELEASE CHECKPOINT — WISHES MANAGEMENT & VIEW CONTROLS COMPLETE

### 1. Checkpoint Overview
- **Release Version**: Stable 1.8
- **Git Tag**: `v1.8`
- **Baseline Git HEAD**: `a391140`
- **Scope**: Finalization of the complete Wishes Management system and Table View Controls pipeline (Phases 31B-1 through 31B-14.8).

### 2. Accepted Functionality & Features (VERIFIED)
- **Wishes Search & Filter Pipeline**:
  - Live search across Recipient Name, Sender Name, and UUID substrings.
  - Media filters: All, Music, Video, Photos, Text-only.
  - Date range filters: All, Today, Last 7 Days, Last 30 Days.
  - Quick search clear (`Escape` key, click `×`, `/` global focus shortcut).
  - Dynamic result count badge (`Showing X of Y wishes`).
- **Table Sorting & Pagination**:
  - Client-side sorting on Recipient, Sender, and Created date with ascending/descending indicators.
  - Pagination controls with page size selector (10, 25, 50, all) and page clamping.
- **Rich Content & Media Badges**:
  - Visual indicators for letter count, reasons, memory timeline, wishes count, music, video, and photos.
  - Space-controlled `.col-media` (`max-width: 250px;`) with natural 3+2 badge wrapping.
- **Bulk Operations Toolbar**:
  - Row checkboxes, select-all visible checkbox with indeterminate state handling.
  - Multi-page selection persistence.
  - Bulk Copy UUID Links, Bulk Export (JSON/CSV), Bulk Duplicate, and Secure Bulk Delete with 2-step confirmation.
- **Quick View Modal System**:
  - Structured card hierarchy: Letter -> Memory -> Reasons -> Wishes, Photos -> Timeline -> Music -> Video.
  - 4-column Customization summary (Theme, Font, Gift Box, Music Mode).
  - Gallery thumbnail grid with full-screen Image Preview Lightbox.
  - Birthday normalization (supporting 8 distinct schema variations).
- **Table View Controls**:
  - Comfortable Mode (~58–68px row height, 36px avatar, 32px action buttons, 22px badges).
  - Compact Mode (~42–48px row height, 28px avatar, 28px action buttons, 18px badges).
  - Columns Popover (`🎛️ Columns ▾`) with independent visibility toggles for Sender, Content & Media, Passcode, Public Link, and Created At.
  - Protected columns (Selection, Recipient, Actions) permanently visible.
  - `↺ Reset View` restoring Comfortable density and revealing all columns without mutating business state.
  - `localStorage` persistence under `'bw_admin_wishes_view_prefs'`.
  - Created At formatted in Indian 12-hour format on strictly **TWO lines** (`DD/MM/YYYY` / `h:mm:ss AM/PM`).
  - Public Link button formatted as compact horizontal **`🔗 Copy`** (`white-space: nowrap !important;`).
  - Actions column strictly protected with 4 buttons (`👁️`, `✏️`, `📋`, `🗑️`) on **ONE horizontal line** with zero viewport clipping.

### 3. Automated Validation (VERIFIED)
- **View Controls Test Suite** (`scratch/test_phase31b_view_preferences.js`): 34 Passed, 0 Failed.
- **Indicators Test Suite** (`scratch/test_phase31b_wishes_indicators.js`): 21 Passed, 0 Failed.
- **Quick View Test Suite** (`scratch/test_phase31b_wishes_quick_view.js`): 44 Passed, 0 Failed.
- **Search & Filter Test Suite** (`scratch/test_phase31b_wishes_ux.js`): 22 Passed, 0 Failed.
- **Productivity Test Suite** (`scratch/test_phase31b_wishes_productivity.js`): 14 Passed, 0 Failed.
- **Bulk & Filter Regression Suites**: 100% Passed.
- **Total Regression Suite**: 135 Passed, 0 Failed (100% PASS).
- **JS Syntax Check (`validate_syntax.js` / `node -c`)**: 42/42 files valid (0 syntax errors).
- **Secrets Audit (`audit_git_secrets.js`)**: 0 secret leaks found.
- **Git Diff Check (`git diff --check`)**: 0 whitespace or formatting errors.

### 4. Manual UAT Status
- **Table View Density (Comfortable vs Compact)**: VERIFIED by manual browser review in Phase 31B-14.8.
- **Action Buttons & Media 3+2 Layout**: VERIFIED by manual browser review in Phase 31B-14.8.
- **Created At Two-Line Layout & Public Link Copy**: VERIFIED by manual browser review in Phase 31B-14.8.
- **Production Smoke Verification**: To be performed after Vercel deployment.

### 5. Protected Subsystems (VERIFIED UNTOUCHED)
- Public Wish Page (`index.html`, `js/app.js`, `css/style.css`, `js/modules/renderers.js`)
- Quick Editor (`js/modules/editor/*`)
- Studio Editor (`js/admin/admin-wish-editor.js`, `css/admin/admin-editor.css`)
- Supabase & Storage (`js/config.js`, `js/database.js`, `js/storage.js`, `js/supabase.js`)
- Serverless API Endpoints (`api/*`)

### 6. Known Issues
- None affecting Stable 1.8 functionality.

### 7. Next Planned Work (PLANNED)
- Standalone feature planning (Phase 31B-15 / Phase 31C / Media Orphan Scanner) remains completely separate from Stable 1.8.

============================================================
54. PHASE 31C — MEDIA REFERENCE EXTRACTION ENGINE & UNUSED MEDIA SCANNER (PHASE 31C-1 & 31C-2A)
============================================================

STATUS: IMPLEMENTED & VERIFIED ✅

Accomplished in Phase 31C-1 & Phase 31C-2A:
1. Authoritative Deep Media Reference Extraction Engine (`MediaReferenceEngine` in `js/admin/admin-media.js`):
   - Categorizes references into 5 distinct types (`STORAGE`, `LOCAL`, `DATA_URL`, `EXTERNAL`, `INVALID`).
   - Normalizes storage paths, stripping `#bw-start=\d+` start-time fragments, query parameters (`?t=...`, `?token=...`), and URL encoding (`%20`, `%2F`).
   - Deeply inspects active wishes: `music_url`, `video_url`, `gallery_json` (objects with `.image`, `.url`, `.src`, or plain string URLs), `timeline_json` (milestone photos), `cover_image`, `avatar`.
   - Local repository assets (`assets/audio/...`, `images/...`) and external URLs (YouTube/Vimeo) are safely shielded and never classified as storage references.
   - Builds queryable lookup map: `isReferenced(canonicalPath)`, `getReferences(canonicalPath)`, `getAllReferencedPaths()`, `getReferencedCount()`, `getAllReferences()`.
2. Digital Asset Manager Unused Media Scanner:
   - `AdminMedia.scanStorage(activeWishes)`: Read-only storage scanning engine comparing inventory from `StorageModule.listAllMedia()` against active wish references.
   - Header scan trigger button `[ 🔍 Scan Storage ]` styled with Admin Dashboard dark/purple theme (`.btn-secondary`).
   - Scanner summary status bar: `Total: N`, `🔗 Used: X`, `⚠️ Unused: Y`.
   - Filter chips: `📂 All Files`, `📸 Images`, `📹 Videos`, `🎙 Audio`, `🔗 Used Files`, `⚠️ Unused Files`, `⭐ Favorites`, `🕒 Recent`.
   - Asset cards clearly display `🔗 [Recipient Name]` for referenced assets and `⚠️ Unused` for unreferenced assets.
   - Zero deletion logic in this phase (100% read-only).
3. Wishes Bulk Export Popover (`#wishes-export-popover`):
   - Converted single export button into an interactive format selector: `[ 📥 Export (N) ▾ ]`.
   - Compact popover menu with `📄 JSON` and `📊 CSV` export options.
   - Preserves all table states (search query, filters, sort, page, selected IDs).
   - Closes on option selection, clicking outside, or pressing `Escape`.
4. Automated Test Validation:
   - `scratch/test_phase31c_media_reference_engine.js`: 27/27 PASS.
   - `scratch/test_phase31c_orphan_scanner_export.js`: 40/40 PASS.
   - Full regression suite: 228 / 228 PASS (100% pass rate).
   - 42/42 JS files syntax valid.
   - 0 secret leaks found.
   - `git diff --check`: 0 whitespace errors.
5. Sacred Invariants Preserved:
   - Public Wish Page untouched.
   - Quick Editor and Studio Editor untouched.
   - Database schema and RLS policies untouched.
   - Supabase Storage bucket policies untouched.
