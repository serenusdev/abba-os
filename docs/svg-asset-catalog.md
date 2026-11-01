# SVG Asset Catalog — Pondok OS

**Audit date:** Stage A & B (planning)
**Auditor:** Workflow planning agent
**Total assets in `svg/`:** 34 files (6 Lucide icons + 27 undraw illustrations + 1 `.DS_Store`)
**Total assets already in `public/illustrations/`:** 21 undraw SVGs
**New undraw SVGs found only in `svg/` (not yet in `public/illustrations/`):** 6

---

## Overlap / Duplicate Analysis

The `svg/` directory is a staging collection. All 21 files in `public/illustrations/` have a direct copy in `svg/`. Six undraw files are exclusive to `svg/`:

| Filename in `svg/` | Already in `public/illustrations/`? |
|---|---|
| `undraw_control-panel_s0j2.svg` | No — new |
| `undraw_notify_drs8.svg` | No — new |
| `undraw_server-failure_syqp.svg` | No — new |
| `undraw_system-update_gekm.svg` | No — new |
| `undraw_system-update_pc33.svg` | No — new (near-duplicate of `_gekm`) |
| `undraw_upload-warning_aqma.svg` | No — new |

The 6 Lucide icon SVGs (`bell.svg`, `bell-dot.svg`, `calendar-days.svg`, `check-line.svg`, `settings.svg`, `square-arrow-out-up-right.svg`) are small utility icons (24 × 24 px, `stroke="currentColor"`) — not illustrations. The project already uses Lucide icons through Material Symbols; these are supplemental reference copies and are **not** candidates for `public/illustrations/`.

---

## Color Alignment Notes

The Pondok OS design system primary is `#0b6e6a` (teal). The undraw SVGs from `public/illustrations/` already use `#005451` as their accent color, which is visually close to the design token and intentionally applied by the unDraw customization tool. This is acceptable — the illustrations were already adapted before reaching the project. The secondary color used is `#090814` (near-black) for figure outlines, which is standard unDraw styling.

Six SVGs in `svg/` still use the unDraw default accent `#6c63ff` (violet/indigo): `undraw_control-panel_s0j2.svg`, `undraw_notify_drs8.svg`, `undraw_server-failure_syqp.svg`, `undraw_system-update_gekm.svg`, `undraw_system-update_pc33.svg`, `undraw_upload-warning_aqma.svg`. These need color adaptation before production use if selected.

---

## Asset Catalog Table

### Section 1 — Utility Icons (from `svg/`, 24×24, Lucide)

| Filename | Visual description | Intended UI context | Recommended placement | Max size | Modification needed | Implementation status | Usage category |
|---|---|---|---|---|---|---|---|
| `bell.svg` | Bell outline, `stroke="currentColor"`, Lucide | Notifications icon | Already covered by Material Symbols in layout; do not duplicate | 24 × 24 | No | skip | unused |
| `bell-dot.svg` | Bell with notification dot badge, `stroke="currentColor"` | Unread notification indicator | Already covered by Material Symbols | 24 × 24 | No | skip | unused |
| `calendar-days.svg` | Calendar grid with day dots, `stroke="currentColor"` | Schedule/date pickers | Already covered by Material Symbols | 24 × 24 | No | skip | unused |
| `check-line.svg` | Checkmark line icon, `stroke="currentColor"` | Confirmation/done indicator | Already covered by Material Symbols | 24 × 24 | No | skip | unused |
| `settings.svg` | Gear/cog settings icon, `stroke="currentColor"` | Settings navigation | Already covered by Material Symbols | 24 × 24 | No | skip | unused |
| `square-arrow-out-up-right.svg` | External link arrow, `stroke="currentColor"` | Open-in-new-tab links | Already covered by Material Symbols | 24 × 24 | No | skip | unused |

**Decision:** All 6 Lucide icons are skipped. The project exclusively uses Material Symbols for iconography throughout every page component. Introducing a mixed icon library would create visual inconsistency contrary to `design.md` section 7 ("Use Lucide icons consistently…" — the project has already standardised on Material Symbols instead). These files serve no purpose in the UI.

---

### Section 2 — Undraw Illustrations (already in `public/illustrations/`)

| Filename | viewBox (W×H) | Colors | Visual description | Intended UI context | Recommended placement | Max size / aspect | Modification needed | Implementation status | Usage category |
|---|---|---|---|---|---|---|---|---|---|
| `undraw_action-required_pplo.svg` | 800 × 738 | `#005451`, `#090814`, `#e9f0f2`, `#fff` | Person standing in front of a large alert screen with an exclamation mark | Unauthorised access, permission-blocked state | `src/components/ui/unauthorized-state.tsx` (already used) | 150 × 110 | No — already adapted; colours match design tokens | planned | auth |
| `undraw_blocked_ldel.svg` | 960 × 552 | `#005451`, `#3f3d56`, `#ed9da0`, `#ccc`, `#fff` | Two people blocked by a barrier/wall with a stop symbol | Account suspended, access blocked | `src/app/(app)/unauthorized/page.tsx` — secondary option; currently `action-required` is used | 160 × 92 (wide) | No — colours close enough | planned | auth |
| `undraw_bug-detected_71if.svg` | 960 × 556 | `#005451`, `#2f2e41`, `#ccc`, `#e9f0f2`, `#fff` | Person inspecting a large bug/error on a screen | 404 not-found page, generic error | `src/app/not-found.tsx` (already used) | 160 × 93 | No | planned | error |
| `undraw_connect-the-dots_4p4i.svg` | 960 × 563 | `#005451`, `#3f3d56`, `#ed9da0`, `#e9f0f2` | Person connecting dot nodes in a network diagram | Empty team/people page, no connections yet | `src/app/(app)/tim/page.tsx` — empty state for no team members | 160 × 94 | No | planned | empty state |
| `undraw_connection-failed_obln.svg` | 960 × 775 | `#005451`, `#3f3d56`, `#9f616a`, `#f2f2f2`, `#ff6584` | Person pulling at a broken/disconnected plug | Network error, server unreachable | `src/components/ui/error-state.tsx` (already used as default) | 130 × 105 (tall) | No | planned | error |
| `undraw_document-review_lfir.svg` | 845 × 800 | `#005451`, `#3f3d56`, `#ccc`, `#e9f0f2`, `#fff` | Person reviewing a large document/checklist on a board | Review queue empty state, no pending reports | `src/app/(app)/review/page.tsx` — empty queue state | 130 × 123 (tall) | No | planned | empty state |
| `undraw_done_erdp.svg` | 737 × 800 | `#005451`, `#090814`, `#e9f0f2`, `#ed9da0`, `#fff` | Person celebrating with a large checkmark/done sign | Successful check-in, completed task, submitted report | `src/app/(app)/kehadiran/page.tsx` (already used for post-check-in), `src/app/(app)/tugas/page.tsx` (empty task state, already used) | 70 × 76 (tall) | No | planned | dashboard |
| `undraw_generating-response_y0h5.svg` | 960 × 576 | `#005451`, `#3f3d56`, `#d6ecea`, `#e9f0f2`, `#fff` | Person sitting with a computer generating/loading a response | Loading or processing state, AI/sync in progress | Reserved — not assigned to a specific location; the project uses skeleton loaders | 160 × 96 | No | pending | decorative |
| `undraw_image-files_exha.svg` | 960 × 578 | `#005451`, `#3f3d56`, `#e9f0f2`, `#fff` | Stack of image/photo files | Empty media section, no uploaded files | `src/app/(app)/resources/page.tsx` — potential secondary empty state for photo/media category | 160 × 96 | No | pending | empty state |
| `undraw_in-progress_2mox.svg` | 960 × 501 | `#005451`, `#3f3d56`, `#e9f0f2`, `#ed9da0`, `#fff` | Person working on tasks with a progress meter | Empty projects list, work-in-progress placeholder | `src/app/(app)/tugas/page.tsx` — empty projects tab (already used) | 140 × 73 (wide) | No | planned | empty state |
| `undraw_mail-sent_dagx.svg` | 891 × 800 | `#005451`, `#3f3d56`, `#e9f0f2`, `#fff` | Letter/envelope being sent through the air | Report successfully submitted confirmation | `src/app/(app)/laporan/page.tsx` (already used for submitted state) | 64 × 58 (tall) | No | planned | dashboard |
| `undraw_organizing-work_gmo9.svg` | 960 × 845 | `#005451`, `#2f2e41`, `#3f3d56`, `#cacaca`, `#e9f0f2`, `#ed9da0`, `#fff` | Two people organising tasks on boards/lists | Admin empty review queue, no tasks organised yet | `src/app/(app)/review/page.tsx` — empty "approved" tab state | 130 × 114 (tall) | No | planned | empty state |
| `undraw_photo_1cl2.svg` | 960 × 633 | `#005451`, `#3f3d56`, `#ccc`, `#e9f0f2` | Person with a camera/photo taking | Profile section, no avatar state | `src/app/(app)/tim/page.tsx` — profile photo empty placeholder | 130 × 86 | No | pending | decorative |
| `undraw_private-data_934y.svg` | 854 × 800 | `#005451`, `#090814`, `#ccc`, `#e9f0f2`, `#ed9da0`, `#fff` | Person securing data with a shield/lock on a computer | Private data, secure information notice | `src/app/(auth)/login/page.tsx` — decorative side panel on desktop | 160 × 150 (tall) | No | planned | auth |
| `undraw_profile_9xdn.svg` | 960 × 547 | `#005451`, `#2f2e41`, `#3f3d56`, `#9f616a`, `#e9f0f2`, `#fff` | Person setting up their personal profile/account | Registration / profile setup | `src/app/(auth)/register/page.tsx` — decorative panel on desktop | 160 × 91 | No | planned | auth |
| `undraw_progress-bar_o44f.svg` | 960 × 556 | `#005451`, `#2f2e41`, `#ccc`, `#e9f0f2`, `#fff` | Person next to a large progress/loading bar | Loading states, analytics in progress | Reserved — the project uses LoadingSpinner; would only apply if a skeleton loading page is added | 160 × 93 | No | skip | unused |
| `undraw_protection-enabled_pve7.svg` | 603 × 639 | `#005451`, `#3f3d56`, `#fff` | Large shield icon with a check — security enabled | Auth success, security confirmation | `src/app/(auth)/login/page.tsx` — could reinforce the "verified" message after login; low priority | 120 × 127 (near-square) | No | pending | auth |
| `undraw_reviews_bmgj.svg` | 960 × 665 | `#005451`, `#3f3d56`, `#9f616a`, `#ccc`, `#e9f0f2` | Person giving a star rating / review | Review queue, feedback section | `src/app/(app)/review/page.tsx` — empty "revision_required" or "pending" tab header area | 130 × 90 | No | planned | empty state |
| `undraw_road-to-knowledge_ufma.svg` | 960 × 336 | `#005451`, `#2f2e43`, `#ccc`, `#d6ecea`, `#ed9da0` | Person walking a road toward books/knowledge | Resource library empty search result | `src/app/(app)/resources/page.tsx` (already used for zero-results empty state) | 140 × 49 (very wide) | No | planned | empty state |
| `undraw_status-page_46km.svg` | 960 × 556 | `#005451`, `#2f2e41`, `#ccc`, `#e9f0f2`, `#ff6584`, `#fff` | Person checking a dashboard/status board with indicators | Admin dashboard, system status overview | `src/app/(app)/admin/audit/page.tsx` — empty audit log state | 160 × 93 | No | planned | dashboard |
| `undraw_team-permissions_1lrk.svg` | 960 × 667 | `#005451`, `#2f2e41`, `#8f8f98`, `#9f616a`, `#d6ecea`, `#e9f0f2`, `#ed9da0` | Multiple people with permission/access level badges | Team list, IAM user management | `src/app/(app)/admin/users/page.tsx` — empty user list state | 160 × 111 | No | planned | dashboard |

---

### Section 3 — New Undraw Illustrations (in `svg/` only, not yet in `public/illustrations/`)

| Filename | viewBox (W×H) | Colors (current) | Visual description | Intended UI context | Recommended placement | Max size / aspect | Modification needed | Implementation status | Usage category |
|---|---|---|---|---|---|---|---|---|---|
| `undraw_control-panel_s0j2.svg` | 960 × 716 | `#6c63ff` (violet — needs change), `#090814`, `#d6d6e3`, `#ed9da0`, `#fff` | Person operating a large dashboard/control panel with charts and dials | Admin overview dashboard, analytics panel | `src/app/(app)/page.tsx` — admin hero banner or empty admin metrics state | 160 × 120 | **Yes** — replace `#6c63ff` with `#0b6e6a`; copy to `public/illustrations/adapted/` | planned | dashboard |
| `undraw_notify_drs8.svg` | 955 × 704 | `#6c63ff` (violet — needs change), `#2f2e41`, `#e6e6e6`, `#ffb6b6` | Person receiving a large notification/bell alert | Empty announcements / no notifications state | `src/app/(app)/jadwal/page.tsx` — empty announcements tab | 140 × 103 | **Yes** — replace `#6c63ff` with `#0b6e6a`; copy to `public/illustrations/adapted/` | planned | empty state |
| `undraw_server-failure_syqp.svg` | 720 × 606 | `#6c63ff` (violet — needs change), `#3f3d56`, `#e6e6e6`, `#fff` | Broken server rack with error indicators | Server down / maintenance / critical error state | `src/components/ui/error-state.tsx` — optional alternate for server-specific errors | 130 × 110 | **Yes** — replace `#6c63ff` with `#b42f3a` (destructive red fits better for server failure); copy to `public/illustrations/adapted/` | pending | error |
| `undraw_system-update_gekm.svg` | 960 × 742 | `#6c63ff` (violet — needs change), `#090814`, `#b6b3c5`, `#d6d6e3`, `#e6e6e6`, `#fff` | Person with a laptop receiving a large system update prompt | System maintenance / update in progress | Reserved — no current page needs this; could be used for a future maintenance page | 160 × 124 | **Yes** — replace `#6c63ff` with `#0b6e6a` if used; copy to `public/illustrations/adapted/` | skip | unused |
| `undraw_system-update_pc33.svg` | 398 × 800 | `#6c63ff` (violet — needs change), `#090814`, `#e6e6e6`, `#fff` | Phone screen showing a system update prompt (tall portrait) | Mobile-specific system update screen | Near-duplicate of `_gekm` but portrait crop; no unique placement | 80 × 160 | **Yes** — same as `_gekm` | skip | unused |
| `undraw_upload-warning_aqma.svg` | 884 × 800 | `#6c63ff` (violet — needs change), `#090814`, `#d6d6e3`, `#e6e6e6`, `#fff` | Person uploading a file with a warning triangle overlay | Upload error, file validation failure, import warning | `src/app/(app)/resources/page.tsx` — potential upload-error state if file upload is added in future | 130 × 118 | **Yes** — replace `#6c63ff` with `#f0b94a` (warning amber); copy to `public/illustrations/adapted/` | pending | error |

---

## Summary Counts

| Category | Count |
|---|---|
| Total SVG files audited | 34 |
| Lucide icons (skip) | 6 |
| `.DS_Store` (ignore) | 1 |
| Undraw illustrations audited | 27 |
| **Already in `public/illustrations/`** | 21 |
| **New (only in `svg/`)** | 6 |
| **Selected for use / planned** | 17 |
| **Pending (conditional)** | 5 |
| **Skipped / unused** | 9 |

---

## Proposed Implementation Plan

### Guiding constraints

1. Original files in `svg/` are never modified.
2. Adapted SVGs go to `public/illustrations/adapted/` with the same filename.
3. The `Illustration`, `EmptyState`, and `ErrorState` components in `src/components/ui/` are already implemented and capable — no new components need to be created. The plan extends their usage.
4. No page layout is redesigned. Illustrations slot into existing empty-state and confirmation regions.
5. Illustrations on the login/register pages are desktop-only via responsive classes; they do not appear on mobile to keep the focus on the form.

---

### Priority 1 — Adapt colour-mismatched SVGs (Stage C prerequisite)

These must be done before any new illustration can be placed in the UI. They involve copying from `svg/` to `public/illustrations/adapted/` with hex substitution.

| File | Source path | Destination path | Colour change |
|---|---|---|---|
| `undraw_control-panel_s0j2.svg` | `svg/undraw_control-panel_s0j2.svg` | `public/illustrations/adapted/undraw_control-panel_s0j2.svg` | `#6c63ff` → `#0b6e6a` |
| `undraw_notify_drs8.svg` | `svg/undraw_notify_drs8.svg` | `public/illustrations/adapted/undraw_notify_drs8.svg` | `#6c63ff` → `#0b6e6a` |
| `undraw_server-failure_syqp.svg` | `svg/undraw_server-failure_syqp.svg` | `public/illustrations/adapted/undraw_server-failure_syqp.svg` | `#6c63ff` → `#b42f3a` |
| `undraw_upload-warning_aqma.svg` | `svg/undraw_upload-warning_aqma.svg` | `public/illustrations/adapted/undraw_upload-warning_aqma.svg` | `#6c63ff` → `#f0b94a` |

**Note on `#ffb6b6` in `undraw_notify_drs8.svg`:** This is the unDraw skin-tone pink for figure skin; preserve it. Only the `#6c63ff` accent colour is swapped.

---

### Priority 2 — New empty state illustrations (high impact, zero layout risk)

These add illustrations to existing empty-state regions that currently show only a Material Symbols icon. Each uses the `EmptyState` component's `illustration` prop or the bare `Illustration` component inside an existing conditional block.

#### 2a. Schedule/announcements page — empty announcements tab
- **File:** `/illustrations/adapted/undraw_notify_drs8.svg`
- **Page:** `src/app/(app)/jadwal/page.tsx`
- **Location:** Inside the `announcements.length === 0` conditional block (already has an icon-based empty state); replace icon placeholder with `<Illustration>`.
- **Size:** `width={140}` `height={103}`
- **Accessibility:** `alt="Belum ada pengumuman"`

#### 2b. Admin user management — empty user list
- **File:** `/illustrations/undraw_team-permissions_1lrk.svg`
- **Page:** `src/app/(app)/admin/users/page.tsx`
- **Location:** Inside the empty users list conditional; replace or supplement existing icon.
- **Size:** `width={150}` `height={104}`
- **Accessibility:** `alt="Belum ada pengguna terdaftar"`

#### 2c. Review page — empty review queue tabs
- **Files:**
  - Pending/no-report tab → `/illustrations/undraw_document-review_lfir.svg` (size `width={130}` `height={123}`)
  - Approved tab (all done) → `/illustrations/undraw_organizing-work_gmo9.svg` (size `width={120}` `height={105}`)
  - Revision/feedback tab → `/illustrations/undraw_reviews_bmgj.svg` (size `width={130}` `height={90}`)
- **Page:** `src/app/(app)/review/page.tsx`
- **Location:** Each tab's zero-result conditional block.
- **Accessibility:** `alt` describing each tab's context.

#### 2d. Team/Tim page — empty member list
- **File:** `/illustrations/undraw_connect-the-dots_4p4i.svg`
- **Page:** `src/app/(app)/tim/page.tsx`
- **Location:** `filteredProfiles.length === 0` conditional.
- **Size:** `width={150}` `height={88}`
- **Accessibility:** `alt="Belum ada anggota tim ditemukan"`

---

### Priority 3 — Admin dashboard illustration

#### 3a. Admin dashboard — control panel hero accent
- **File:** `/illustrations/adapted/undraw_control-panel_s0j2.svg`
- **Page:** `src/app/(app)/page.tsx` — admin view only (`isAdminOrPengurus && !previewAsMember`)
- **Location:** Inside the "Pusat Kendali Operasional" header section (`<section className="bg-gradient-to-r …">`), right side of the flex row on desktop (`md:flex-row`). Add as a decorative illustration visible only at `md:` and above (`hidden md:block`). It sits alongside the existing text, not overlapping it. Use absolute max height of `100px` to keep the header compact.
- **Size:** `width={140}` `height={100}` — constrained by the header card height
- **Accessibility:** Decorative — `aria-hidden="true"`, empty `alt=""`
- **Note:** Only show on `md:` screens and above so it does not crowd the mobile header.

---

### Priority 4 — Audit log / analytics empty state

#### 4a. Admin audit page — empty audit log
- **File:** `/illustrations/undraw_status-page_46km.svg`
- **Page:** `src/app/(app)/admin/audit/page.tsx`
- **Location:** `auditLogs.length === 0` conditional block (no existing illustration there).
- **Size:** `width={150}` `height={87}`
- **Accessibility:** `alt="Belum ada log audit tercatat"`

---

### Priority 5 — Auth pages (desktop-only decorative panels)

#### 5a. Login page — decorative side illustration
- **File:** `/illustrations/undraw_private-data_934y.svg`
- **Page:** `src/app/(auth)/login/page.tsx`
- **Location:** Add a right-side decorative column visible only at `lg:` breakpoints. The form stays left. This requires adding a two-column wrapper at `lg:` — only if the login page currently uses a single centered column. If the layout would force a significant structural change, **skip this** and keep the page as-is.
- **Size:** `width={220}` `height={205}`
- **Accessibility:** Decorative — `aria-hidden="true"`, empty `alt=""`
- **Constraint:** Must not affect the mobile layout in any way. Use `hidden lg:flex` on the illustration column.

#### 5b. Register page — decorative side illustration
- **File:** `/illustrations/undraw_profile_9xdn.svg`
- **Page:** `src/app/(auth)/register/page.tsx`
- **Location:** Same pattern as 5a.
- **Size:** `width={220}` `height={125}`
- **Accessibility:** Decorative — `aria-hidden="true"`, empty `alt=""`

---

### Assets explicitly skipped (do not implement)

| Filename | Reason |
|---|---|
| `bell.svg`, `bell-dot.svg`, `calendar-days.svg`, `check-line.svg`, `settings.svg`, `square-arrow-out-up-right.svg` | Duplicate of Material Symbols already used project-wide |
| `undraw_progress-bar_o44f.svg` | Project uses `LoadingSpinner`/skeletons; a progress-bar illustration adds no value |
| `undraw_system-update_gekm.svg` | No maintenance page exists; would require a new page with no current user need |
| `undraw_system-update_pc33.svg` | Near-duplicate of `_gekm`; skip for same reason |
| `undraw_generating-response_y0h5.svg` | Loading/AI-response context does not match Pondok OS operational scope |
| `undraw_photo_1cl2.svg` | The project uses avatar initials rather than photo placeholders; illustration is redundant |
| `undraw_protection-enabled_pve7.svg` | Shield icon adds no information beyond what the existing auth UI already communicates |

---

### Prioritised implementation order

1. **Stage C (Adaptation)** — Create `public/illustrations/adapted/` and produce the 4 colour-adapted SVGs (`control-panel`, `notify`, `server-failure`, `upload-warning`). This is a prerequisite for Priority 2a and Priority 3a.
2. **Priority 2a** — Jadwal page: announcements empty state (`undraw_notify_drs8` adapted).
3. **Priority 2b** — Admin users page: empty user list (`undraw_team-permissions_1lrk`).
4. **Priority 2c** — Review page: three tab empty states (`document-review`, `organizing-work`, `reviews`).
5. **Priority 2d** — Tim page: empty member list (`undraw_connect-the-dots`).
6. **Priority 3a** — Admin dashboard: control panel hero accent (`undraw_control-panel` adapted).
7. **Priority 4a** — Admin audit page: empty log state (`undraw_status-page`).
8. **Priority 5a/b** — Auth pages: decorative side illustrations (`private-data`, `profile`) — only if the layout supports a side column without mobile impact.

---

### Components to create or extend

| Component | Action | Reason |
|---|---|---|
| `src/components/ui/empty-state.tsx` | No changes needed | Already supports `illustration` prop via `Illustration` component |
| `src/components/ui/error-state.tsx` | No changes needed | Already uses `/illustrations/undraw_connection-failed_obln.svg` by default |
| `src/components/ui/illustration.tsx` | No changes needed | Already handles `object-fit: contain`, responsive sizing, `unoptimized` Next.js Image |
| `src/components/ui/unauthorized-state.tsx` | No changes needed | Already uses `/illustrations/undraw_action-required_pplo.svg` |
| New: none required | — | The existing component set covers all planned use cases |

The `EmptyState` component should be used (instead of ad-hoc `Illustration` + `<div>` markup) wherever a new empty state is introduced, for consistency. The `illustration` prop accepts a `/illustrations/…` path.

---

### Accessibility checklist for all new placements

- Decorative SVGs in the admin hero (`control-panel`) and auth pages: `aria-hidden="true"` and `alt=""`.
- All empty-state illustrations convey meaningful context: use descriptive `alt` text in Indonesian.
- The `Illustration` component wraps `next/image` which provides the `alt` to the `<img>` element automatically.
- No animation is introduced. All SVGs are static.
- SVGs do not reference external resources (`xlink:href` to remote URIs). Confirmed — all files use inline path data only.

---

### Performance notes

- All illustrations are served from `public/` (static), so no server round-trip overhead.
- `unoptimized` is already set on the `Illustration` component's `next/image`, which is correct for SVG (no rasterisation needed).
- Illustrations in empty states only render when the list is empty — they are never loaded alongside data.
- The admin dashboard illustration (Priority 3a) is decorative only at `md:` widths; mobile loads skip it via `hidden md:block`.
- No lazy-loading concern: empty-state illustrations are small (2–20 KB) and only appear in place of data, not alongside it.
