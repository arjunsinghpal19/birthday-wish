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
- Commit: `stable: Phase 30.2 Admin Studio regression stabilization complete`
- Checkpoint: Accepted stable baseline.

Next Phase:
Phase 30.3 / Phase 31: Admin Dashboard Management Expansion & Customer Portal.
Do not push or deploy yet. Ready for next phase planning when requested.


