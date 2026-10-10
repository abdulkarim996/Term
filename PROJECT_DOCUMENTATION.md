# Term (Student Dashboard) — Comprehensive System Documentation
**Version:** 2.1.0  
**Author / Engineering Lead:** Abdulkarim Alfallaj  
**Last Updated:** October 2026  
**Repository:** `abdulkarim996/Term`  
**Production URLs:** 
- [term-app.web.app](https://term-app.web.app) (Firebase Production Hosting)
- [term-ecru.vercel.app](https://term-ecru.vercel.app) (Vercel Serverless Backend & Hosting)

---

## Table of Contents
1. [Core Concept & Vision](#1-core-concept--vision)
2. [UI/UX Design Language & Philosophy](#2-uiux-design-language--philosophy)
3. [Project Overview & Evolution (Git History Analysis)](#3-project-overview--evolution-git-history-analysis)
4. [Tech Stack & Dependencies](#4-tech-stack--dependencies)
5. [Architecture & Directory Structure](#5-architecture--directory-structure)
6. [Granular Features & Modules Breakdown](#6-granular-features--modules-breakdown)
   - 6.1 [Authentication & PIN Gate](#61-authentication--pin-gate)
   - 6.2 [Home Screen & Daily Progress](#62-home-screen--daily-progress)
   - 6.3 [Academic Calendar & TimeGrid](#63-academic-calendar--timegrid)
   - 6.4 [Tasks & Academic Deliverables](#64-tasks--academic-deliverables)
   - 6.5 [Cloud Storage & Google Drive Integration](#65-cloud-storage--google-drive-integration)
   - 6.6 [Study Room (Whiteboard, File Annotator & Scalable Calculator)](#66-study-room-whiteboard-file-annotator--scalable-calculator)
   - 6.7 [Context-Aware AI Assistant (Dynamic Models & Vision)](#67-context-aware-ai-assistant-dynamic-models--vision)
   - 6.8 [More & Preferences](#68-more--preferences)
   - 6.9 [Luxury GPA Hub & Academic Analytics](#69-luxury-gpa-hub--academic-analytics)
   - 6.10 [Super Admin Command Center](#610-super-admin-command-center)
7. [Backend Logic & Infrastructure](#7-backend-logic--infrastructure)
   - 7.1 [Notification Engine Architecture](#71-notification-engine-architecture)
   - 7.2 [Vercel Cron Automation](#72-vercel-cron-automation)
   - 7.3 [On-Demand Same-Day Scheduling Pipeline](#73-on-demand-same-day-scheduling-pipeline)
   - 7.4 [Deduplication & Timezone Safeguards](#74-deduplication--timezone-safeguards)
   - 7.5 [Smart Lecture Validity Check & Webhook Verification](#75-smart-lecture-validity-check--webhook-verification)
8. [Data Models & State Management](#8-data-models--state-management)
   - 8.1 [Firestore Database Schema](#81-firestore-database-schema)
   - 8.2 [Global Client State (Zustand Stores)](#82-global-client-state-zustand-stores)
9. [Localization (i18n) & Accessibility](#9-localization-i18n--accessibility)

---

## 1. Core Concept & Vision

### 1.1 The Problem
University students face extreme fragmentation across their daily academic toolset. At any given moment, a student must juggle:
1. **Academic Portals:** Checking registration portals (e.g., Banner / Student Self-Service) and learning management systems (e.g., Blackboard).
2. **Class Timetables:** Memorizing rotating weekly lectures, finding lecture room numbers, and navigating schedule gaps.
3. **Deadlines & Deliverables:** Tracking assignments, project milestones, and upcoming midterm/final exams across diverse courses.
4. **Course Materials & Notes:** Viewing syllabus documents, annotating lecture slides (PDFs), and sketching technical diagrams.
5. **Study Focus & Math Tools:** Managing study sessions without phone distractions, needing scientific calculators for engineering and science problem sets.
6. **Academic Inquiries & Academic Standing:** Wondering what to study, asking AI questions about slides, and calculating how semester grades impact graduation GPA and Honours standing.

Traditional apps provide point solutions (a generic calendar app, a todo list app, a separate PDF reader, a standalone Pomodoro timer, a physical calculator). This fragmentation causes missed deadlines, forgotten lecture halls, and lost academic productivity.

### 1.2 The Solution: "Term" (v2.1.0)
**Term** is an integrated, progressive web operating system built specifically for university students. It combines:
- Timetable automation with smart lecture push notifications.
- Task, exam, and deliverable tracking with real-time completion progress.
- Native cloud document annotation and an Excalidraw whiteboarding canvas.
- An interactive, resizable study workspace with an integrated, freely scalable scientific calculator.
- A high-capacity slide deck reader capable of processing 180+ slide PDFs with targeted page extraction.
- A multimodal Google Gemini AI assistant with dynamic model discovery, vision support, and study file awareness.
- A luxury GPA Hub with historical trend graphs, what-if simulators, and target GPA goal solvers.
- An executive Super Admin Command Center with live presence tracking, broadcast announcements, emergency moderation, and iOS push dispatching.

### 1.3 Target Audience
- University and college students (tailored specifically for Saudi universities such as Northern Border University - NBU, while being fully adaptable globally).
- Students enrolled in complex technical, engineering, medical, or humanities majors who need a single command center for their semester.

---

## 2. UI/UX Design Language & Philosophy (Unified Design System)

Term v2.1.0 adheres to a unified, production-grade **Design System** engineered for visual harmony, high information density, and low-strain readability across mobile, tablet (iPad), and desktop viewports.

### 2.1 Semantic Color System & Design Tokens
All interface surfaces and interactions are bound to CSS variables and Tailwind semantic tokens:

| Token | Light Value | Dark Value (Default) | Semantic Role |
|---|---|---|---|
| `--bg-surface` | `#f3f4f6` | `#0f0f10` | Canvas foundation, main application viewport background |
| `--bg-surface-elevated`| `#ffffff` | `#1a1a1e` | Toolbars, segmented controls, input fields, dropdown menus |
| `--bg-surface-card` | `#ffffff` | `#1e1e24` | Primary content cards, event cards, modal containers |
| `--bg-surface-hover` | `#e5e7eb` | `#252530` | Interactive hover states, secondary button backgrounds |
| `--border-surface` | `#d1d5db` | `#2a2a32` | Subtle 1px structural boundaries preventing visual bleed |
| `--text-primary` | `#111827` | `#e8e8f0` | High-emphasis headings, titles, active tab markers |
| `--text-secondary` | `#4b5563` | `#9595a8` | Body descriptions, task notes, secondary metadata |
| `--text-muted` | `#9ca3af` | `#5a5a6e` | Timestamps, inactive states, placeholder text |

#### Accent Color Palette
- **`accent-blue` (`#4f8ef7`):** Primary brand accent, lectures, active navigation, focused outlines.
- **`accent-purple` (`#9b7bea`):** AI Assistant capabilities, study room sessions, whiteboard markers.
- **`accent-green` (`#52d98b`):** Task completions, success feedback, Excel imports, safe academic standing.
- **`accent-yellow` (`#f5c842`):** Medium priority deliverables, upcoming exams warnings, calendar events.
- **`accent-red` (`#f2564a`):** Urgent deadlines, exam classification, denial (DN) risks, destructive actions.
- **`accent-cyan` (`#4ecdc4`):** External portal links, internationalization tags.
- **`accent-amber` (`#f59e0b`):** Super Admin privileges, maintenance alerts, honors tiers.

---

### 2.2 Typography Scale & Bilingual Hierarchy
- **Primary Latin Font:** `Inter`, `system-ui`, `sans-serif`.
- **Primary Arabic Font:** `IBM Plex Sans Arabic`, `system-ui`, `sans-serif`.
- **Typographic Scale:**
  - **Hero / Page Titles:** `text-2xl font-bold tracking-tight text-text-primary` (24px / 1.5rem).
  - **Section Titles:** `text-base font-semibold text-text-primary` (16px / 1rem).
  - **Body Text:** `text-sm text-text-secondary leading-relaxed` (14px / 0.875rem).
  - **Subtitles & Badges:** `text-xs md:text-sm text-text-muted font-medium` (12px / 0.75rem).
  - **Micro Metadata / Tags:** `text-[10px] uppercase font-bold tracking-wider` (10px / 0.625rem).

---

### 2.3 Layout Architecture & Responsive Containers
Every primary screen adheres to a standardized structural rhythm:
1. **Unified Page Container (`.page-container`):**
   ```css
   .page-container {
     padding: 1.25rem 1rem 1.5rem 1rem;
     max-width: 56rem; /* 896px max-w-4xl for tablet/desktop balance */
     margin: 0 auto;
     display: flex;
     flex-direction: column;
     gap: 1.5rem;
   }
   ```
2. **Standardized Page Header (`.page-header`):**
   - Left side: Page Title (`.page-title`) and descriptive Subtitle (`.page-subtitle`).
   - Right side: Action Button Group (`.icon-btn`, `.icon-btn-primary`).
3. **Viewport Safe-Area Padding:**
   - Bottom: `padding-bottom: calc(var(--nav-height) + env(safe-area-inset-bottom, 0px))`.
   - Top: `padding-top: max(env(safe-area-inset-top, 0px), 12px)`.

---

### 2.4 Component Library & Reusable Patterns

#### A. Glassmorphic Card Engine (`.glass-card`)
Cards utilize a dual-layer glassmorphic appearance with subtle inset border illumination:
```css
.glass-card {
  background-color: var(--bg-surface-card);
  border: 1px solid var(--border-surface);
  border-radius: 1rem;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.25);
  background-image: linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 100%);
  transition: all 0.2s ease;
}
.dark .glass-card {
  box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.05), 0 2px 12px rgba(0, 0, 0, 0.25);
}
.glass-card:hover {
  border-color: rgba(79, 142, 247, 0.35); /* Subtle accent-blue border highlight */
}
```

#### B. Unified Segmented Controls (`.segmented-container` & `.segmented-tab`)
Replaces mismatched buttons across Calendar view modes (Day/Week/Month), Task filters (All/Pending/Completed/Study), and Settings:
- **Container:** Rounded pill container with `bg-surface-elevated/80 border border-surface-border/70 backdrop-blur-md p-1`.
- **Active Tab:** `bg-accent-blue text-white shadow-sm font-semibold`.
- **Inactive Tab:** `text-text-muted hover:text-text-primary`.

#### C. Standardized Action Buttons
- **`.icon-btn-primary`:** `w-9 h-9 rounded-xl bg-accent-blue/10 border border-accent-blue/20 text-accent-blue hover:bg-accent-blue/20 active:scale-95`.
- **`.icon-btn`:** `w-9 h-9 rounded-xl bg-surface-card border border-surface-border text-text-muted hover:text-accent-blue active:scale-95`.
- **`.btn-primary`:** Rounded button with `bg-accent-blue text-white shadow-sm shadow-accent-blue/20 active:scale-95`.
- **`.btn-ghost`:** Secondary neutral button with `text-text-secondary hover:bg-surface-hover`.

#### D. Bottom Navigation Bar (`.nav-item`)
- Fixed bottom dock pinned with `backdrop-blur-2xl` and semi-transparent elevation (`bg-surface-elevated/90`).
- Active items feature scaled icons (`scale-110`) with an animated glowing dot indicator positioned directly underneath.

#### E. Micro-Interactions & Gestures
1. **Tactile Touch Pull-to-Refresh:** Physics hook with rotational spinner and post-refresh success toast.
2. **Drag-to-Resize Dividers:** Smooth 60fps divider tracking in Study Room with RTL/LTR inverted delta arithmetic.
3. **Animated Wave Greeting:** Smooth 2.5s rotational keyframe wave on user greetings (`.animate-wave`).
4. **Instant Task Completion:** Tactile circular checkboxes with instant strike-through transitions and optimistic UI updates.

---

## 3. Project Overview & Evolution (Git History Analysis)

The project evolved from an initial prototype into a hardened, production-grade academic operating system:

| Commit | Date | Milestone Description |
|---|---|---|
| `386ded3` – `1f3be1b` | 2026-08-30 | Initial project initialization, Vercel serverless configuration, and secure environment setup. |
| `e99aa75` – `8cb55dd` | 2026-08-30 | Integration of university dynamic shortcuts (Banner/Blackboard), custom touch pull-to-refresh UX with feedback toast. |
| `eeb4630` – `7a0d3fe` | 2026-08-30 | Migration of push notifications to Upstash QStash; resolved Firebase Private Key newline formatting and Arabic UTF-8 encoding. |
| `5e0a554` – `bcfc4ae` | 2026-09-01 | Desktop & mobile modal layout refactor: resolved viewport clipping, sticky action buttons, non-scrolling backdrops. |
| `8e223ed` – `1e6f4a5` | 2026-09-02 | Dual Vercel Cron pipeline (7:30 AM lectures & 6:00 PM task summaries) eliminating standing QStash schedule limits. |
| `66573d2` – `33e8982` | 2026-09-02 | Resolution of UI/UX bugs (RTL AI drawer, break label midpoint calculations, text truncation) and JavaScript TDZ hoisting error. |
| `a430a1d` – `bc8fd69` | 2026-09-03 | Real-time on-demand notification scheduling with QStash deduplication headers for same-day schedule updates. |
| `fdac305` – `e1da832` | 2026-09-03 | **v2.0.1 Release:** Preferences consolidation, API keys inside Settings, destructive Logout, iOS Segmented Controls. |
| `8d454c3` – `89c3a57` | 2026-10-07 | Direct morning lecture push notifications via Firebase Admin, robust QStash webhook URL verification, desktop mouse wheel slide scrolling with callback ref and transformRef. |
| `891d31b` – `23798a3` | 2026-10-08 | Daily task progress bar calculation fixes, circular tactile checkboxes with instant completion, smart lecture validity check (auto-suppressing stale/rescheduled notifications). |
| `9f261d6` – `1b7aed2` | 2026-10-08 | **v2.0.5 — Luxury GPA Hub:** Interactive GPA trend chart, real-time GPA Simulator, Target GPA Goal Solver, Honours Class estimation, Home widget, and bilingual localization. |
| `1832a33` – `eb20557` | 2026-10-09 | **v2.0.8 — Super Admin Command Center:** Online presence tracker, kick/ban enforcer, Emergency Kick All, Maintenance mode, 20s auto-dismiss announcement banner, iOS push dispatcher. |
| `24af2c9` – `adae65a` | 2026-10-09 | **AI Assistant Revolution:** Dynamic Google API model discovery (Gemini 2.5 / 1.5 Flash), multimodal vision image upload & Ctrl+V clipboard paste, active study doc awareness, 180-page slide deck extractor, smart outline generator, stop streaming controls. |
| `16eeca4` | 2026-10-10 | **v2.1.0 Release — Interactive Resizable Workspace:** Drag-to-resize AI sidebar with Compact/Standard/Wide presets, freely scalable scientific calculator widget (65%-135%) with corner resize and localStorage persistence. |

---

## 4. Tech Stack & Dependencies

### 4.1 Core Frameworks & Build Tools
- **React 19 (`^19.1.0`):** Modern component architecture utilizing hooks, concurrent features, and performance optimizations.
- **Vite 6 (`^6.4.3`):** Ultra-fast Hot Module Replacement (HMR) and optimized rollup production bundles.
- **TypeScript (`~5.8.3`):** Strict static typing across models, API contracts, and components.
- **Tailwind CSS (`^3.4.17`):** Utility-first styling with custom CSS variables, keyframe animations, and dark mode class strategy.

### 4.2 Cloud Infrastructure, Authentication & Database
- **Firebase Web SDK (`^12.18.0`):**
  - `firebase/auth`: Google OAuth2 authentication with persistent local browser session storage (`browserLocalPersistence`).
  - `firebase/firestore`: Multi-tab persistent caching (`persistentLocalCache` with `persistentMultipleTabManager`) enabling instant local reads and offline resilience.
  - `firebase/messaging`: Push notification registration and FCM token generation.
- **Firebase Hosting:** Fast edge hosting served at `https://term-app.web.app`.
- **Firebase Admin SDK (`^14.3.0`):** Executed inside Vercel Serverless Functions to query Firestore and dispatch Web Push messages.
- **Upstash QStash (`^2.11.3`):** Serverless, HTTP-based message broker used for delay scheduling (`notBefore`), deduplication (`Upstash-Deduplication-Id`), and signed webhooks.
- **Vercel Serverless & Cron:** Cloud hosting executing automatic cron triggers at `04:30 UTC` (7:30 AM KSA) and `15:00 UTC` (6:00 PM KSA).

### 4.3 Specialty Academic & Media Libraries
- **`@excalidraw/excalidraw` (`^0.18.1`):** Vector whiteboard embedded inside the Study Room supporting hand-drawn diagrams, shapes, text, and local persistence.
- **`react-pdf` (`^10.5.0`) & `pdfjs-dist` (`^5.4.296`):** Client-side PDF rendering powered by a dedicated web worker (`/pdf.worker.min.mjs`).
- **`pdf-lib` (`^1.17.1`):** Programmatic PDF mutation engine used to bake freehand strokes, highlights, geometric shapes, and text directly into PDF bytes for re-saving to Google Drive.
- **`@google/generative-ai` (`^0.24.1`):** Google Gemini SDK providing streaming natural language responses and multimodal vision evaluation.
- **`react-rnd` (`^10.5.3`):** Resizable, draggable floating window container for the floating scientific calculator.
- **`nerdamer` (`^1.1.13`):** Symbolic algebra and mathematical equation evaluator.
- **`xlsx` (`^0.18.5`):** Parses student timetable spreadsheets (.xlsx) into structured lecture schedules.
- **`zustand` (`^5.0.5`):** Ultra-lightweight reactive client-side store with JSON storage persistence.
- **`lucide-react` (`^0.511.0`):** Consistent vector iconography.

---

## 5. Architecture & Directory Structure

```
StudentDashBoard/
├── api/                                # Vercel Serverless Backend API
│   ├── cron.ts                         # Daily 7:30 AM Cron: Schedules today's lectures & events
│   ├── cron-tasks.ts                   # Daily 6:00 PM Cron: Dispatches tomorrow's task reminders
│   ├── schedule-today-lecture.ts       # On-Demand: Schedules same-day lecture additions/edits
│   ├── schedule-today-event.ts         # On-Demand: Schedules same-day event additions/edits
│   ├── send-push.ts                    # Push Dispatcher: Manual / Admin push notification sender
│   └── tasks/
│       ├── execute.ts                  # QStash Webhook: Sends FCM push notifications with validity check
│       ├── schedule.ts                 # QStash Publisher: Schedules delayed messages
│       └── cancel.ts                   # QStash Deleter: Cancels scheduled messages
├── public/                             # Static Web Assets & Workers
│   ├── firebase-messaging-sw.js        # Background Service Worker for FCM Web Push
│   ├── pdf.worker.min.mjs              # PDF.js Web Worker for high-performance rendering
│   ├── manifest.json                   # PWA Web App Manifest
│   └── apple-touch-icon-v2.png         # iOS Home Screen App Icons
├── src/                                # Client Application Source Code
│   ├── components/
│   │   ├── admin/                      # Super Admin Command Center (kromsa2006@gmail.com)
│   │   ├── ai/                         # Gemini AI Assistant (Multimodal, Dynamic Models, Outlines)
│   │   ├── auth/                       # Google Sign-in & Security PIN Gate
│   │   ├── calendar/                   # TimeGrid, Add/Edit Event Modals, Excel Importer
│   │   ├── gpa/                        # Luxury GPA Hub, Simulator, Goal Solver, Trend Chart
│   │   ├── home/                       # Dashboard Overview, Progress Bar, GPA Widget, Quick Links
│   │   ├── layout/                     # Bottom Navigation Bar
│   │   ├── more/                       # Settings, Subjects Management, Segmented Controls
│   │   ├── storage/                    # Google Drive File Explorer & Quick Review Action
│   │   ├── study/                      # Study Room: Resizable Workspace, Scalable Calculator, FileAnnotator
│   │   ├── tasks/                      # Deliverables, Priority Filters, Add Task/Subject
│   │   └── ui/                         # Modal, CustomPickers, Toast, UpdatePrompt, BroadcastBanner
│   ├── hooks/                          # Custom React Hooks (useTranslation, usePullToRefresh)
│   ├── lib/                            # Infrastructure Utilities (Firebase, Firestore, QStash, Utils)
│   ├── locales/                        # Internationalization Dictionaries (Arabic & English)
│   ├── store/                          # Zustand State Stores (UIStore, SettingsStore, DataStore, TimerStore)
│   ├── App.tsx                         # Root Application Controller, Realtime Sync, Online Presence
│   ├── index.css                       # Global Tailwind Directives & CSS Variable Design Tokens
│   └── main.tsx                        # React DOM Entrypoint
├── firebase.json                       # Firebase Hosting Configuration (term-app.web.app)
├── firestore.rules                     # Cloud Firestore Security Rules (Super Admin & User Isolation)
├── vercel.json                         # Vercel Cron Scheduling Specifications
├── tailwind.config.js                  # Tailwind Theme Configuration
└── package.json                        # Project Metadata & Dependencies
```

---

## 6. Granular Features & Modules Breakdown

### 6.1 Authentication & PIN Gate (`src/components/auth/`)
- **Google OAuth2 Flow:** Handled via `signInWithPopup(auth, googleProvider)`. Persists authenticated credentials in browser local storage.
- **PIN Security Verification:** Upon initial login, `PinSetup.tsx` prompts the student to create a 4-digit numeric PIN. The PIN is hashed using SHA-256 and stored in Firestore under `users/{uid}/settings/security`. On subsequent launches or sensitive actions, the user is locked out until the correct PIN is provided.
- **Super Admin Privilege Escalation:** When authenticated as `kromsa2006@gmail.com`, the user is automatically granted Super Admin credentials, rendering the Admin Control Center icon and bypassing standard user restrictions.

### 6.2 Home Screen & Daily Progress (`src/components/home/HomeScreen.tsx`)
1. **Dynamic Academic Greeting:** Context-aware time greeting ("Good Morning" / "Good Evening") paired with user name and waving animation.
2. **Current Date Display:** Gregorian date localized into Arabic (`ar-SA`) or English (`en-US`).
3. **Daily Task Progress Bar:** Real-time percentage indicator computed accurately via:
   $$\text{Progress} = \frac{\text{Completed Tasks Today}}{\text{Total Tasks Today}} \times 100$$
4. **Tactile Task Checkboxes:** Round, high-visibility checkboxes with hover states allowing instant one-tap completion of tasks directly from the home feed.
5. **Today's Lecture Stream:**
   - Filters subjects to dynamically extract lectures scheduled for the current day of the week.
   - Calculates lecture start/end times and highlights the currently active lecture with a pulsating green `Now` badge.
   - Displays hall/room location, subject code, and assigned course color.
6. **Luxury GPA Summary Card:** Shows the student's cumulative GPA (e.g. `4.82 / 5.00`), honours tier badge, and a direct button to open the full GPA Hub modal.
7. **Urgent Deliverables Card:** Lists top 4 pending tasks sorted by closest due date with relative timing ("Today", "Tomorrow").
8. **Upcoming Exams Banner:** Countdown timer highlighting the next 2 major exams with days-remaining calculation.

### 6.3 Academic Calendar & TimeGrid (`src/components/calendar/`)
1. **View Modes:** Toggle between **Day**, **Week**, and **Month** view.
2. **Excel Schedule Importer:** Students can upload raw university `.xlsx` timetable files. `parseExcelSchedule` extracts course names, section IDs, instructor names, rooms, and weekly timeslots, auto-populating subjects and lectures into Firestore.
3. **Interactive TimeGrid Component (`TimeGrid.tsx`):**
   - Renders a 6:00 AM to 12:00 AM (midnight) continuous time axis (60px per hour).
   - **Real-time Red Line:** An absolute indicator showing the exact current minute of the day with an animated pulse marker.
   - **Collision Detection & Multi-column Layout:** Detects concurrent lectures/events and dynamically allocates percentage widths and offset positions.
   - **Gap & Break Duration Computation:** Analyzes empty intervals between consecutive lectures, computing the exact duration (e.g., "Break 1h 30m") and positioning the label at the vertical midpoint.
4. **Add/Edit Event Modals:** Full support for single-instance events, recurring days, exam classification, locations, and descriptions.

### 6.4 Tasks & Academic Deliverables (`src/components/tasks/`)
1. **Deliverable Filters:** Segment tasks into **All**, **Pending**, **Completed**, or **Study Sessions**.
2. **Subject Filter Pills:** Filter tasks belonging strictly to a specific course.
3. **Dual Sorting Logic:** Sort deliverables by **Due Date** or by **Priority** (High / Medium / Low).
4. **Auto-Generated Exam Study Blocks:** When an exam is registered, `generateStudyBlocksForExam()` automatically calculates the two days preceding the exam and schedules locked study preparation blocks to keep the student on track.
5. **Add/Edit Subject Management:** Add courses with credit hours, course code, instructor name, custom color picker, and multiple weekly lecture timeslots.

### 6.5 Cloud Storage & Google Drive Integration (`src/components/storage/`)
1. **OAuth2 Drive Authorization:** Direct client authorization with Google Drive API scopes (`drive.file` and `drive.readonly`).
2. **File Explorer:** Categorizes synced academic documents into **Lectures**, **Assignments**, **Exams**, **Projects**, and **Other**.
3. **Quick Review Action (`BookOpen`):** Added directly to each document card; clicking it immediately pushes the file into `quickReviewFile` state and transitions the active view straight to the Study Room without manual folder navigation.
4. **MIME Type Detection & Metadata:** Formatted file size in B/KB/MB and last-modified dates.

### 6.6 Study Room (`src/components/study/`)

#### A. Interactive Resizable Workspace & AI Sidebar (`StudyScreen.tsx`)
- **Drag-to-Resize Divider Handle:** Positioned between the workspace (slides/whiteboard) and the AI sidebar.
  - Supports both **mouse drag** and **touch drag** (iPad/tablet gestures).
  - Automatically compensates for document direction (inverted delta for RTL Arabic vs LTR English).
  - Smooth 60fps tracking (`transition: isDragging ? 'none' : 'width 0.3s ease'`).
  - Limits width safely between `260px` and `70%` of viewport width.
  - Remembers chosen width persistently in `localStorage('study_ai_sidebar_width')`.
- **Quick Width Presets:** Toolbar buttons next to the AI toggle:
  - **Compact / صغير:** `280px`
  - **Standard / متوسط:** `360px`
  - **Wide / عريض:** `520px`

#### B. Scalable Scientific Calculator Widget (`CalculatorWidget.tsx`)
- **Interactive Scaling (65% to 135%):**
  - **Zoom In / Zoom Out Controls:** Top-right overlay buttons to step-zoom (+15% / -15%) or tap `[100%]` to instantly reset.
  - **Free Corner & Border Resizing (`react-rnd`):** Drag any corner (`topRight`, `bottomRight`, `bottomLeft`, `topLeft`) or horizontal edge.
  - **Proportional Box Model:** Uses an outer scaled wrapper (`Math.round(360 * scale) × Math.round(contentHeight * scale)`) so hit-testing, mouse clicks, and drag bounds align without empty dead space.
- **Math Engine:**
  - Visual formula input powered by dynamic MathLive `<math-field>`.
  - Symbolic evaluation powered by `nerdamer`.
  - Radians / Degrees (`RAD` / `DEG`) toggle.
  - Remembers scale persistently in `localStorage('study_calc_scale')`.

#### C. High-Capacity Slide Deck Engine (`FileViewer.tsx` / `FileAnnotator.tsx`)
- **180+ Page Slide Support:** Expanded text extraction and rendering pipeline from 40 pages up to **180 pages** for comprehensive university slide decks.
- **Targeted Page-Range Extraction:** Allows extracting specific slide windows (e.g., slides 40–80) to maximize token efficiency when chatting with AI.
- **Smooth Desktop Mouse Wheel Navigation:** Replaced event capture with `callback ref` and live `transformRef` for responsive, unblocked wheel navigation between PDF pages.
- **Direct Canvas Annotations:** Freehand drawing, highlighters, vector shapes, text stamps, selection manipulation, and undo/redo stacks.

#### D. Dynamic Split-Screen & Excalidraw Whiteboard
- Dual-pane layout enabling simultaneous viewing of PDF slides alongside the Excalidraw infinite whiteboard.
- Audio-synthesized Pomodoro timer with musical chime pattern upon session completion.

### 6.7 Context-Aware AI Assistant (`src/components/ai/AIScreen.tsx`)

1. **Dynamic Google API Model Discovery:**
   - Auto-queries the Google Gemini API (`https://generativelanguage.googleapis.com/v1beta/models`) with the user's API key.
   - Filters and selects compatible, high-speed models available on the user's tier.
   - Automatically falls back to stable defaults: `gemini-2.5-flash` and `gemini-1.5-flash`.
2. **Multimodal Vision & Clipboard Paste:**
   - Attach image files directly or paste screenshots directly into the chat prompt via **Ctrl+V**.
   - Encodes images to base64 inline for instant diagram, graph, and homework analysis.
3. **Active Study Document Awareness:**
   - Injects the text and context of the slide deck currently open in the Study Room into the system prompt.
   - The AI knows which course and chapter you are actively reviewing without requiring manual copy-pasting.
4. **Smart Slide Outline Generator & Navigation:**
   - Generates clean chapter outlines and indexes from large slide decks.
   - Provides direct page references so students can jump straight to relevant slides.
5. **Interactive Chat Controls:**
   - **Stop Streaming Button:** Halts token generation immediately.
   - **One-Click Markdown Copy:** Copies the AI's explanation with LaTeX math and code blocks preserved.
   - **Clean Context Header:** Removed cluttered context labels; replaced with a compact, responsive model selector that opens neatly to the right without clipping.

### 6.8 More & Preferences (`src/components/more/MoreScreen.tsx`)
1. **Consolidated Preferences Layout:**
   - **Segmented Control Theme Switcher:** Dual-state iOS-style toggle switching between Dark and Light mode.
   - **Segmented Control Language Switcher:** Dual-state toggle switching between English and Arabic with immediate RTL/LTR document layout updates.
   - **Push Notifications Card:** One-tap toggle to enable/disable Web Push notifications.
   - **Consolidated API Keys:** User override card for Google Gemini API keys.
   - **Quick University Links:** Custom input cards allowing students to specify custom URLs for their university's Banner and Blackboard portals.
2. **Standalone Destructive Logout:** Red border styling with double-confirmation safety.
3. **Data Export & Wipe:** One-tap JSON export of the entire database or complete cloud wipe.

### 6.9 Luxury GPA Hub & Academic Analytics (`src/components/gpa/`)

1. **Academic Analytics Engine:**
   - Full support for Saudi university 5.00 GPA scales (and 4.00 conversions).
   - Formula:
     $$\text{GPA} = \frac{\sum (\text{Course Grade Points} \times \text{Credit Hours})}{\sum \text{Credit Hours}}$$
2. **Interactive Historical Trend Chart:**
   - Visual SVG graph plotting semester-by-semester GPA trajectory with hoverable milestones and average baseline.
3. **Real-Time GPA Simulator ("What-If" Calculator):**
   - Allows students to simulate different grade scenarios for enrolled courses in the current semester.
   - Shows projected cumulative GPA before exams take place.
4. **Target GPA Goal Solver:**
   - Solves the required semester GPA to achieve a desired graduation target GPA:
     $$\text{Required Semester GPA} = \frac{\text{Target Cumulative} \times (\text{Prev Hours} + \text{Curr Hours}) - (\text{Prev GPA} \times \text{Prev Hours})}{\text{Curr Hours}}$$
   - Warns dynamically if the required GPA exceeds the maximum possible 5.00 or indicates guaranteed success.
5. **Honours Tier Estimation:**
   - First Class Honours ($\ge 4.75$) & Second Class Honours ($\ge 4.25$) eligibility with minimum credit hour validation.

### 6.10 Super Admin Command Center (`src/components/admin/`)

1. **Executive Access Control:**
   - Reserved exclusively for `kromsa2006@gmail.com`.
   - Enforced at both the UI router level and Cloud Firestore database rules level.
2. **Real-Time Online Presence Tracking:**
   - Synchronizes active user heartbeats via the `presence` collection.
   - Displays live active student count, device platform, and last active timestamp.
3. **Student Account Management:**
   - Search across all registered student profiles.
   - Inspect academic stats (enrolled subjects, total tasks, GPA configuration).
   - **Kick Session:** Forces immediate logout on the target student's active device.
   - **Ban Enforcer:** Toggles account suspension flags in Firestore.
   - **Emergency Kick All:** One-click emergency command forcing all active non-admin sessions to terminate.
4. **System Maintenance Mode:**
   - Global toggle switching the platform into maintenance mode with a customizable explanation message.
   - Non-admin users are locked to an informative maintenance screen until disabled.
5. **Real-Time Global Announcements:**
   - Send system announcements directly to all active clients.
   - Displays a floating glassmorphic top banner with an animated 20-second countdown auto-dismiss bar.
6. **Mobile / iOS Push Notification Dispatcher:**
   - Send broadcast Web Push notifications to all registered student devices directly from the admin panel.

---

## 7. Backend Logic & Infrastructure

### 7.1 Notification Engine Architecture

```
                    ┌─────────────────────────┐
                    │       Vercel Cron       │
                    │  (7:30 AM / 6:00 PM KSA)│
                    └────────────┬────────────┘
                                 │ HTTP POST
                                 ▼
                    ┌─────────────────────────┐
                    │    api/cron.ts (7:30)   │
                    │ api/cron-tasks.ts (6:00)│
                    └────────────┬────────────┘
                                 │
           ┌─────────────────────┴──────────────────────┐
           │                                            │
           ▼                                            ▼
┌──────────────────────┐                     ┌──────────────────────┐
│  Lectures Schedule   │                     │Calendar Events Today │
│ (10 min before start)│                     │(10 min before start) │
└──────────┬───────────┘                     └──────────┬───────────┘
           │                                            │
           └─────────────────────┬──────────────────────┘
                                 │ publishJSON (with notBefore)
                                 ▼
                    ┌─────────────────────────┐
                    │      Upstash QStash     │
                    │  (Serverless Scheduler) │
                    └────────────┬────────────┘
                                 │ Webhook Callback with Signature
                                 ▼
                    ┌─────────────────────────┐
                    │   api/tasks/execute.ts  │
                    │  (Smart Validity Check) │
                    │   (Firebase Admin FCM)  │
                    └────────────┬────────────┘
                                 │ Push Notification
                                 ▼
                    ┌─────────────────────────┐
                    │   Student Device / PWA  │
                    │   (iOS / Android / Mac) │
                    └─────────────────────────┘
```

### 7.2 Vercel Cron Automation (`vercel.json`)
```json
{
  "crons": [
    { "path": "/api/cron", "schedule": "30 4 * * *" },
    { "path": "/api/cron-tasks", "schedule": "0 15 * * *" }
  ]
}
```
1. **Daily Morning Cron (`/api/cron` at 04:30 UTC / 7:30 AM KSA):**
   - Evaluates current day in Saudi Time (`UTC+3`).
   - Scans Firestore `users/{uid}/subjects` for lectures occurring today.
   - Direct push: Sends a morning lecture overview immediately to each student via Firebase Admin.
   - Queues 10-minute pre-lecture warnings into QStash.
2. **Evening Deliverables Cron (`/api/cron-tasks` at 15:00 UTC / 6:00 PM KSA):**
   - Scans uncompleted deliverables due tomorrow in Saudi Time.
   - Immediately dispatches an FCM push summary with task bullet points.

### 7.3 On-Demand Same-Day Scheduling Pipeline
If a student adds or edits a lecture or calendar event **after** 7:30 AM for the current day:
- **`api/schedule-today-lecture.ts`** and **`api/schedule-today-event.ts`** are triggered on-demand.
- Checks that the scheduled start time is in the future.
- Directly publishes the delayed push task to QStash with unique deduplication IDs.

### 7.4 Deduplication & Timezone Safeguards
- **Deduplication IDs:**
  - For Lectures: `${subjectId}-dow${todayDayOfWeek}-${todayDateStr}`
  - For Events: `event-${eventId}-${todayDateStr}`
- **Saudi Arabia Timezone Formula (Strict UTC+3):**
  ```typescript
  const nowUTC = Date.now();
  const nowSaudiMs = nowUTC + 3 * 60 * 60 * 1000;
  const nowSaudiDate = new Date(nowSaudiMs);
  const todayDayOfWeek = nowSaudiDate.getUTCDay(); // 0=Sun..6=Sat
  const todayDateStr = nowSaudiDate.toISOString().slice(0, 10); // YYYY-MM-DD
  
  const saudiMidnightUTC = new Date(`${todayDateStr}T00:00:00Z`).getTime();
  const lecStartSaudiMs = saudiMidnightUTC + (lecHour * 60 + lecMin) * 60 * 1000;
  const notifyAtSaudiMs = lecStartSaudiMs - 10 * 60 * 1000;
  const notifyAtUTCMs = notifyAtSaudiMs - 3 * 60 * 60 * 1000;
  const notifyAtUnixSec = Math.floor(notifyAtUTCMs / 1000);
  ```

### 7.5 Smart Lecture Validity Check & Webhook Verification
- **Dynamic Endpoint URL Resolution:**
  In `api/tasks/execute.ts`, QStash webhook signature verification uses dynamic URL reconstruction:
  ```typescript
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers.host || '';
  const endpointUrl = `${protocol}://${host}/api/tasks/execute`;
  
  const isValid = await receiver.verify({
    signature: signature as string,
    body: rawBody,
    url: endpointUrl,
  });
  ```
- **Smart Validity Check:**
  Before dispatching the push notification to the student's device, `execute.ts` performs a live check against Firestore:
  1. Verifies that the course still exists.
  2. Verifies that the lecture time has not been modified or rescheduled to a different timeslot.
  3. If the lecture was rescheduled, the obsolete notification is silently dropped, preventing false alarms.

---

## 8. Data Models & State Management

### 8.1 Firestore Database Schema

```
root/
├── presence/{uid}
│   ├── email: string
│   ├── displayName: string
│   ├── lastSeen: timestamp
│   ├── isOnline: boolean
│   └── platform: string
│
├── system_config/
│   ├── maintenance: { enabled: boolean, message: string }
│   └── broadcast: { message: string, timestamp: number }
│
├── announcements/{announcementId}
│   ├── title: string
│   ├── content: string
│   ├── createdAt: timestamp
│   └── active: boolean
│
└── users/{uid}/
    ├── (document root fields)
    │   ├── fcmToken: string              # Device push token
    │   ├── fcmUpdatedAt: timestamp       # Token refresh timestamp
    │   ├── email: string
    │   ├── role: 'admin' | 'student'
    │   └── isBanned: boolean
    │
    ├── subjects/{subjectId}
    │   ├── name: string                  # e.g., "Operations Research"
    │   ├── code: string                  # e.g., "IE-311"
    │   ├── color: string                 # Hex code e.g., "#4f8ef7"
    │   ├── creditHours: number           # e.g., 3
    │   ├── instructor: string            # e.g., "Dr. Mohammed"
    │   ├── lectures: [                   # Array of weekly timeslots
    │   │     {
    │   │       dayOfWeek: number,        # 0=Sunday .. 6=Saturday
    │   │       startTime: string,        # "08:00"
    │   │       endTime: string,          # "09:50"
    │   │       location: string          # "Building 5, Hall 102"
    │   │     }
    │   │   ]
    │   └── createdAt: number
    │
    ├── tasks/{taskId}
    │   ├── title: string                 # Task title
    │   ├── description: string           # Optional notes
    │   ├── subjectId: string             # Associated course ID
    │   ├── priority: 'high'|'medium'|'low'
    │   ├── dueDate: number               # Timestamp in ms
    │   ├── completed: boolean            # Completion status
    │   ├── completedAt: number           # Timestamp when checked
    │   ├── isStudyBlock: boolean         # Auto-generated study block flag
    │   ├── examId: string                # Parent exam event reference
    │   └── createdAt: number
    │
    ├── events/{eventId}
    │   ├── title: string                 # Event title
    │   ├── type: 'lecture'|'exam'|'assignment'|'study'|'other'
    │   ├── startDate: number             # Start timestamp in ms
    │   ├── endDate: number               # End timestamp in ms
    │   ├── subjectId: string             # Associated course ID
    │   ├── location: string              # Room / Building
    │   └── createdAt: number
    │
    ├── driveFiles/{fileId}
    │   ├── driveFileId: string           # Google Drive file ID
    │   ├── name: string                  # File name
    │   ├── mimeType: string              # e.g., "application/pdf"
    │   ├── size: number                  # Bytes
    │   ├── subjectId: string             # Associated course
    │   ├── category: string              # "lectures"|"exams"|etc.
    │   └── syncedAt: number
    │
    ├── chatSessions/{sessionId}
    │   ├── id: string                    # UUID
    │   ├── title: string                 # Conversation title
    │   ├── createdAt: number
    │   └── updatedAt: number
    │
    ├── chatMessages/{messageId}
    │   ├── sessionId: string             # Parent conversation UUID
    │   ├── role: 'user' | 'assistant'
    │   ├── content: string               # Markdown text
    │   ├── imageUris: string[]           # Optional image attachments
    │   └── timestamp: number
    │
    └── settings/
        ├── security                      # { pinHash: string }
        ├── app                           # { geminiApiKey: string }
        └── gpa                           # { currentGpa: number, totalHours: number, targetGpa: number }
```

### 8.2 Global Client State (Zustand Stores)
1. **`useUIStore` (`src/store/index.ts`):** Controls active navigation tab, calendar view mode, selected date, modal states (`showAddTask`, `showAddEvent`, `showAddSubject`, `showGpaModal`, `showAdminPanel`), `quickReviewFile` (auto-opening study files), toast notifications, and user session state.
2. **`useSettingsStore` (`src/store/index.ts`):** Persisted in `localStorage` under `student-dashboard-settings`. Controls language (`ar` / `en`), text direction (`rtl` / `ltr`), dark/light theme, user name, major, semester, university portal URLs, and Google Drive tokens.
3. **`useDataStore` (`src/store/dataStore.ts`):** In-memory cache holding real-time arrays of `subjects`, `tasks`, `events`, `driveFiles`, `chatSessions`, and `messages`. Synchronized automatically with Firestore via `onSnapshot` listeners in `App.tsx`.
4. **`useTimerStore` (`src/store/timerStore.ts`):** Tracks Pomodoro intervals, countdown state, active mode (`pomodoro`, `shortBreak`, `longBreak`, `custom`), and duration preferences.

---

## 9. Localization (i18n) & Accessibility

### 9.1 Bidirectional (RTL / LTR) Architecture
Term provides native, full-fidelity support for both Arabic (Right-to-Left) and English (Left-to-Right):
- **Root Element Binding:** When language changes, `App.tsx` dynamically sets attributes on `document.documentElement`:
  ```typescript
  document.documentElement.setAttribute('dir', dir); // 'rtl' or 'ltr'
  document.documentElement.setAttribute('lang', dir === 'rtl' ? 'ar' : 'en');
  ```
- **CSS Logical Properties & Inverted Resizers:** 
  - Popups, sidebars, and dropdowns employ logical coordinates (`insetInlineStart: 0`) rather than physical coordinates (`left: 0` or `right: 0`).
  - The Study Room resizer automatically flips delta calculations in Arabic:
    ```typescript
    const isRtl = document.documentElement.dir === 'rtl' || language === 'ar';
    const delta = isRtl ? (ev.clientX - startX) : (startX - ev.clientX);
    ```
- **Directional Icon Flipping:** Directional chevrons and back arrows utilize `.rtl-flip` to flip horizontally by 180 degrees in RTL mode.
- **Punctuation Protection:** Arabic descriptions utilize explicit `dir="rtl"` and `text-right` alignment to prevent punctuation marks from jumping to line beginnings.

### 9.2 Translation System (`src/locales/index.ts` & `useTranslation.ts`)
Translations are managed via a key-value dictionary structure supporting dynamic parameter interpolation (e.g., `{{count}}`, `{{lectures}}`, `{{tasks}}`). All UI strings across the Home screen, Calendar, Study Room, GPA Hub, and Super Admin panel are bound through the `useTranslation()` hook.

---

*Term (Student Dashboard) v2.1.0 — Engineered for Academic Excellence.*