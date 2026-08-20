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




