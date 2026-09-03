# Term (Student Dashboard) — Comprehensive System Documentation
**Version:** 2.0.1  
**Author / Engineering Lead:** Abdulkarim Alfallaj  
**Last Updated:** September 2026  
**Repository:** `abdulkarim996/Term`  
**Production URL:** [term-ecru.vercel.app](https://term-ecru.vercel.app)

---

## Table of Contents
1. [Core Concept & Vision](#1-core-concept--vision)
2. [UI/UX Design Language & Philosophy](#2-uiux-design-language--philosophy)
3. [Project Overview & Evolution (Git History Analysis)](#3-project-overview--evolution-git-history-analysis)
4. [Tech Stack & Dependencies](#4-tech-stack--dependencies)
5. [Architecture & Directory Structure](#5-architecture--directory-structure)
6. [Granular Features & Modules Breakdown](#6-granular-features--modules-breakdown)
   - 6.1 [Authentication & PIN Gate](#61-authentication--pin-gate)
   - 6.2 [Home Screen](#62-home-screen)
   - 6.3 [Academic Calendar & TimeGrid](#63-academic-calendar--timegrid)
   - 6.4 [Tasks & Academic Deliverables](#64-tasks--academic-deliverables)
   - 6.5 [Cloud Storage & Google Drive Integration](#65-cloud-storage--google-drive-integration)
   - 6.6 [Study Room (Whiteboard, File Annotator & Pomodoro)](#66-study-room-whiteboard-file-annotator--pomodoro)
   - 6.7 [Context-Aware AI Assistant (Gemini)](#67-context-aware-ai-assistant-gemini)
   - 6.8 [More & Preferences (v2.0.1 Refinement)](#68-more--preferences-v201-refinement)
7. [Backend Logic & Infrastructure](#7-backend-logic--infrastructure)
   - 7.1 [Notification Engine Architecture](#71-notification-engine-architecture)
   - 7.2 [Vercel Cron Automation](#72-vercel-cron-automation)
   - 7.3 [On-Demand Same-Day Scheduling Pipeline](#73-on-demand-same-day-scheduling-pipeline)
   - 7.4 [Deduplication & Timezone Safeguards](#74-deduplication--timezone-safeguards)
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
5. **Study Focus:** Managing study sessions without phone distractions using Pomodoro intervals.
6. **Academic Inquiries:** Searching through files and deadlines to determine what to study next.

Traditional apps provide point solutions (a generic calendar app, a todo list app, a separate PDF reader, a standalone Pomodoro timer). This fragmentation causes missed deadlines, forgotten lecture halls, and lost academic productivity.

### 1.2 The Solution: "Term"
**Term** is an integrated, progressive web operating system built specifically for university students. It combines timetable automation, task and exam tracking, native cloud document annotation, an Excalidraw whiteboarding canvas, audio-synthesized Pomodoro timers, and an AI copilot that possesses full contextual awareness of the student's enrolled subjects, pending assignments, and uploaded files.

### 1.3 Target Audience
- University and college students (tailored specifically for Saudi universities such as Northern Border University - NBU, while being fully adaptable globally).
- Students enrolled in complex technical, engineering, medical, or humanities majors who need a single command center for their semester.

---

## 2. UI/UX Design Language & Philosophy

### 2.1 Dark-First Glassmorphism Aesthetic
Term is engineered around an immersive, low-strain dark palette designed for late-night study sessions and high-efficiency readability:
- **Base Background:** `#0f0f10` (Surface) with elevated cards at `#1a1a1e` and `#1e1e24`.
- **Border Accents:** `#2a2a32` (Subtle 1px boundaries preventing visual fatigue).
- **Glass Card System:** Built with custom Tailwind utility `.glass-card`:
  ```css
  .glass-card {
    background-color: var(--bg-surface-card);
    border: 1px solid var(--border-surface);
    border-radius: 1rem;
    box-shadow: 0 2px 12px rgba(0,0,0,0.4);
    background-image: linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 100%);
    transition: all 0.3s ease;
  }
  ```
- **Semantic Accent Colors:**
  - `accent-blue`: `#4f8ef7` (Primary actions, active navigation, lectures)
  - `accent-purple`: `#9b7bea` (AI capabilities, study sessions, focus mode)
  - `accent-red`: `#f2564a` (Urgent priorities, exams, destructive actions)
  - `accent-yellow`: `#f5c842` (Assignments, pending tasks, medium priority)
  - `accent-green`: `#52d98b` (Completed tasks, success indicators, low priority)
  - `accent-cyan`: `#4ecdc4` (Internationalization, links)

### 2.2 Micro-Interactions & iOS-Style Touch Patterns
1. **Segmented Controls:** Modern, tactile dual-state pill switches with 200ms easing transitions for theme switching (`Dark` vs `Light`) and language selection (`English` vs `عربي`).
2. **Physics-Driven Pull-to-Refresh:** Custom touch hook (`usePullToRefresh`) monitoring `touchstart`, `touchmove`, and `touchend`. Includes dynamic rotation based on pull distance, a spinning loader at peak resistance, and automatic page reload followed by a success toast.
3. **Adaptive Bottom Navigation Bar:** Pinned to the screen bottom with viewport safe-area padding (`env(safe-area-inset-bottom)`), active glowing pill markers, and backdrop blur (`backdrop-blur-xl`).
4. **Native Input Pickers:** Clean native browser pickers (`<input type="time">` and `<input type="datetime-local">`) with forced `[color-scheme:dark]` for fluid OS-native picker sheets on iOS and Android.

---

## 3. Project Overview & Evolution (Git History Analysis)

The project evolved through 38 distinct engineering milestones, transitioning from an initial prototype to a hardened, event-driven academic system:

| Commit | Date | Milestone Description |
|---|---|---|
| `386ded3` – `1f3be1b` | 2026-08-30 | Initial project initialization, Vercel serverless configuration, and secure environment setup. |
| `e99aa75` – `8cb55dd` | 2026-08-30 | Integration of university dynamic shortcuts (Banner/Blackboard), custom touch pull-to-refresh UX with feedback toast. |
| `eeb4630` – `7a0d3fe` | 2026-08-30 | Architectural overhaul: migration of push notifications to Upstash QStash event-driven architecture; debugging Firebase Private Key line-break parsing and Arabic UTF-8 payload encoding. |
| `5e0a554` – `bcfc4ae` | 2026-09-01 | Desktop & mobile modal layout refactor: resolving viewport clipping, sticking action buttons, and implementing non-scrolling overlay backdrops. |
| `8e223ed` – `1e6f4a5` | 2026-09-02 | Elimination of standing QStash schedule limits; implementation of the dual Vercel Cron pipeline (7:30 AM lectures & 6:00 PM task summaries). |
| `66573d2` – `33e8982` | 2026-09-02 | Resolution of 7 major UI/UX bugs (RTL AI drawer, break label midpoint calculations, text truncation, lecturer fields, native pickers) and resolution of a JavaScript Temporal Dead Zone (TDZ) hoisting error. |
| `a430a1d` – `bc8fd69` | 2026-09-03 | Implementation of real-time on-demand notification scheduling with QStash deduplication headers for lectures and calendar events added after morning cron execution. |
| `fdac305` – `e1da832` | 2026-09-03 | **Version 2.0.1 Release:** Removal of deprecated Smart Scheduling, consolidation of API keys inside Preferences, standalone destructive Logout button, iOS-style Segmented Controls, and clean URL inputs. |

---

## 4. Tech Stack & Dependencies

### 4.1 Core Frameworks & Build Tools
- **React 19 (`^19.1.0`):** Modern component architecture utilizing hooks, concurrent features, and performance optimizations.
- **Vite 6 (`^6.3.5`):** Ultra-fast Hot Module Replacement (HMR) and optimized rollup production bundles.
- **TypeScript (`~5.8.3`):** Strict static typing across models, API contracts, and components.
- **Tailwind CSS (`^3.4.17`):** Utility-first styling with custom CSS variables, keyframe animations, and dark mode class strategy.

### 4.2 Cloud Infrastructure, Authentication & Database
- **Firebase Web SDK (`^12.18.0`):**
  - `firebase/auth`: Google OAuth2 authentication with persistent local browser session storage (`browserLocalPersistence`).
  - `firebase/firestore`: Multi-tab persistent caching (`persistentLocalCache` with `persistentMultipleTabManager`) enabling instant local reads and offline resilience.
  - `firebase/messaging`: Push notification registration and FCM token generation.
- **Firebase Admin SDK (`^14.3.0`):** Executed inside Vercel Serverless Functions to securely query Firestore and dispatch FCM push messages.
- **Upstash QStash (`^2.11.3`):** Serverless, HTTP-based message broker used for delay scheduling (`notBefore`) and deduplication (`Upstash-Deduplication-Id`).
- **Vercel Serverless & Cron:** Cloud hosting executing automatic cron triggers at `04:30 UTC` (7:30 AM KSA) and `15:00 UTC` (6:00 PM KSA).

### 4.3 Specialty Academic & Media Libraries
- **`@excalidraw/excalidraw` (`^0.18.1`):** Vector whiteboard embedded inside the Study Room supporting hand-drawn diagrams, shapes, text, and local persistence.
- **`react-pdf` (`^10.5.0`) & `pdfjs-dist` (`^5.4.296`):** Client-side PDF rendering powered by a dedicated web worker (`/pdf.worker.min.mjs`).
- **`pdf-lib` (`^1.17.1`):** Programmatic PDF mutation engine used to bake freehand strokes, highlights, geometric shapes, and text directly into PDF bytes for re-saving to Google Drive.
- **`@google/generative-ai` (`^0.24.1`):** Google Gemini SDK providing streaming natural language responses based on injected student context.
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
│   └── tasks/
│       ├── execute.ts                  # QStash Webhook: Sends FCM push notifications
│       ├── schedule.ts                 # QStash Publisher: Schedules delayed messages
│       └── cancel.ts                   # QStash Deleter: Cancels scheduled messages
├── public/                             # Static Web Assets & Workers
│   ├── firebase-messaging-sw.js        # Background Service Worker for FCM Web Push
│   ├── pdf.worker.min.mjs              # PDF.js Web Worker for high-performance rendering
│   ├── manifest.json                   # PWA Web App Manifest
│   └── apple-touch-icon-v2.png         # iOS Home Screen App Icons
├── src/                                # Client Application Source Code
│   ├── components/
│   │   ├── ai/                         # Gemini AI Assistant Screen & Model Selectors
│   │   ├── auth/                       # Google Sign-in & Security PIN Gate
│   │   ├── calendar/                   # TimeGrid, Add/Edit Event Modals, Excel Importer
│   │   ├── home/                       # Dashboard Overview, Progress Bar, Quick Links
│   │   ├── layout/                     # Bottom Navigation Bar
│   │   ├── more/                       # Settings, Subjects Management, Segmented Controls
│   │   ├── storage/                    # Google Drive File Explorer & Sync
│   │   ├── study/                      # Study Room: Excalidraw, FileAnnotator, MiniTimer
│   │   ├── tasks/                      # Deliverables, Priority Filters, Add Task/Subject
│   │   └── ui/                         # Modal, CustomPickers, Toast, UpdatePrompt
│   ├── hooks/                          # Custom React Hooks (useTranslation, usePullToRefresh)
│   ├── lib/                            # Infrastructure Utilities (Firebase, Firestore, QStash, Utils)
│   ├── locales/                        # Internationalization Dictionaries (Arabic & English)
│   ├── store/                          # Zustand State Stores (UIStore, SettingsStore, DataStore, TimerStore)
│   ├── App.tsx                         # Root Application Controller & Realtime Sync Listeners
│   ├── index.css                       # Global Tailwind Directives & CSS Variable Design Tokens
│   └── main.tsx                        # React DOM Entrypoint
├── vercel.json                         # Vercel Cron Scheduling Specifications
├── tailwind.config.js                  # Tailwind Theme Configuration
└── package.json                        # Project Metadata & Dependencies
```

---

## 6. Granular Features & Modules Breakdown

### 6.1 Authentication & PIN Gate (`src/components/auth/`)
- **Google OAuth2 Flow:** Handled via `signInWithPopup(auth, googleProvider)`. Persists authenticated credentials in browser local storage.
- **PIN Security Verification:** Upon initial login, `PinSetup.tsx` prompts the student to create a 4-digit numeric PIN. The PIN is hashed using a SHA-256 equivalent and stored in Firestore under `users/{uid}/settings/security`. On subsequent launches or sensitive actions, the user is locked out until the correct PIN is provided.

### 6.2 Home Screen (`src/components/home/HomeScreen.tsx`)
1. **Dynamic Academic Greeting:** Context-aware time greeting ("Good Morning" / "Good Evening" / "Good Night") paired with user name and waving animation.
2. **Current Date Display:** Gregorian date localized into Arabic (`ar-SA`) or English (`en-US`).
3. **Academic Summary Counter:** Real-time badges indicating how many lectures occur today and how many tasks are due.
4. **Quick Portal Shortcuts:** Customizable university links (defaulting to Northern Border University Banner and Blackboard) opening in external secure tabs.
5. **Daily Progress Tracker:** Visual percentage bar showing `(Completed Tasks / Total Tasks) * 100` alongside counters for completed items, remaining tasks, and today's lectures.
6. **Today's Lecture Stream:**
   - Filters subjects to dynamically extract lectures scheduled for the current day of the week.
   - Calculates lecture start/end times and highlights the currently active lecture with a pulsating green `Now` badge.
   - Displays hall/room location, subject code, and assigned course color.
7. **Urgent Deliverables Card:** Lists the top 4 pending tasks sorted by closest due date with relative timing ("Today", "Tomorrow", "After X days").
8. **Upcoming Exams Banner:** Countdown timer highlighting the next 2 major exams with days-remaining calculation.
9. **Quick AI Prompt:** One-tap navigation card directing straight into the AI Assistant.

### 6.3 Academic Calendar & TimeGrid (`src/components/calendar/`)
1. **View Modes:** Toggle between **Day**, **Week**, and **Month** view.
2. **Excel Schedule Importer:** Students can upload raw university `.xlsx` timetable files. `parseExcelSchedule` extracts course names, section IDs, instructor names, rooms, and weekly timeslots, auto-populating subjects and lectures into Firestore.
3. **Interactive TimeGrid Component (`TimeGrid.tsx`):**
   - Renders a 6:00 AM to 12:00 AM (midnight) continuous time axis (60px per hour).
   - **Real-time Red Line:** An absolute indicator showing the exact current minute of the day with an animated pulse marker.
   - **Collision Detection & Multi-column Layout:** Detects concurrent lectures/events and dynamically allocates percentage widths (`width = 100% / concurrentCount`) and offset positions (`left = colIdx * width`).
   - **Gap & Break Duration Computation:** Analyzes empty intervals between consecutive lectures. If a gap exists, it computes the exact duration (e.g., "Break 1h 30m") and positions the label precisely at the **vertical midpoint of the gap** at `z-[5]`, completely avoiding event card overlap.
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
3. **MIME Type Detection:** Automatically displays tailored icons for PDFs, PowerPoint presentations, Word documents, images, and videos.
4. **Metadata Viewer:** Shows file size formatted in B/KB/MB and last-modified dates.

### 6.6 Study Room (`src/components/study/`)

#### A. Interactive Whiteboard (`WhiteBoard.tsx`)
- Powered by `@excalidraw/excalidraw`.
- Infinite drawing canvas supporting shapes, lines, arrows, freehand drawings, sticky notes, and text.
- Fully synchronized with browser local storage (`excalidraw_data`) on every change.
- Includes integrated `MiniTimer` for focused problem-solving.

#### B. Native PDF File Annotator (`FileAnnotator.tsx`)
- High-performance PDF renderer utilizing `react-pdf` with a specialized web worker.
- **Canvas Annotation Overlay:** Allows direct drawing on top of PDF slides.
- **Annotation Toolset:**
  - Pen (custom color and stroke thickness)
  - Highlighter (semi-transparent alpha blending)
  - Eraser (object-level erasure)
  - Geometric Shapes (Rectangles, Circles, Arrows)
  - Text insertion with draggable placement
  - Image insertion directly into document pages
- **Selection & Manipulation Engine:** Move, drag, and resize placed elements with 4 corner anchors (`nw`, `ne`, `sw`, `se`).
- **Full Undo/Redo Stack:** History tracking per page.
- **Baking & Cloud Save:** Uses `pdf-lib` to embed vector paths and text directly into the binary PDF structure, saving the annotated file back to cloud storage.

#### C. Synthesized Pomodoro Timer (`MiniTimer.tsx` & `src/store/timerStore.ts`)
- Modes: **Pomodoro** (25 min), **Short Break** (5 min), **Long Break** (15 min), and **Custom Duration**.
- Audio Synthesizer: When the timer expires, it uses the **Web Audio API** (`AudioContext`) to generate a clean, musical chime pattern (C5 ➔ E5 ➔ G5 ➔ C6) without requiring external audio files.

### 6.7 Context-Aware AI Assistant (`src/components/ai/AIScreen.tsx`)
1. **Model Selection:**
   - `gemini-3.6-flash`: Optimized for rapid queries, timetable lookups, and task breakdowns.
   - `gemini-3.1-pro-preview`: Advanced analytical engine for complex reasoning, assignment drafting, and deep document explanation.
2. **Dynamic Student Context Injection:** Every message sent to Gemini automatically compiles and injects the student's complete academic state:
   - Enrolled subjects & lecture timetable
   - Pending deliverables & upcoming exams
   - Google Drive document titles & metadata
3. **Streaming Responses:** Employs `ai.models.generateContentStream` for instant, token-by-token visual feedback.
4. **Session Management:** Create new chat threads, rename discussions, delete sessions, and persist message histories in Firestore.

### 6.8 More & Preferences — v2.0.1 Refinement (`src/components/more/MoreScreen.tsx`)
1. **Consolidated Preferences Layout:**
   - **Segmented Control Theme Switcher:** Dual-state iOS-style toggle switching between Dark and Light mode.
   - **Segmented Control Language Switcher:** Dual-state toggle switching between English and Arabic with immediate RTL/LTR document layout updates.
   - **Push Notifications Card:** One-tap toggle to enable/disable Web Push notifications with proper spacing (`gap-4`) and clear explanatory text.
   - **Consolidated API Keys:** Placed neatly within an outlined card container, allowing user override of the Gemini API key.
   - **Quick University Links:** Custom input cards allowing students to specify custom URLs for their university's Banner and Blackboard portals.
2. **Standalone Destructive Logout:** Positioned cleanly at the bottom of the screen above the footer branding, featuring red border styling and double-confirmation safety.
3. **Data Export & Wipe:** One-tap export of the entire database into a structured JSON backup file, or a complete cloud wipe clearing all collections.
4. **Branding Footer:** Permanent product credit identifying creator Abdulkarim Alfallaj with v2.0.1 version stamp.

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
                                 │ Webhook Callback at exact time
                                 ▼
                    ┌─────────────────────────┐
                    │   api/tasks/execute.ts  │
                    │   (Firebase Admin FCM)  │
                    └────────────┬────────────┘
                                 │ Push
                                 ▼
                    ┌─────────────────────────┐
                    │   Student Device / PWA  │
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
   - Scans Firestore `users/{uid}/events` for one-off calendar events occurring today.
   - For each event/lecture, calculates `notifyAt = startTime - 10 minutes`.
   - Queues delayed messages via QStash `publishJSON` targeted at `/api/tasks/execute`.
2. **Evening Deliverables Cron (`/api/cron-tasks` at 15:00 UTC / 6:00 PM KSA):**
   - Evaluates the entire 24-hour range of "Tomorrow" in Saudi Time.
   - Scans uncompleted deliverables due tomorrow.
   - If tasks exist, immediately dispatches an FCM push summary:
     *Title:* `📋 لديك X مهمة غداً 💪`
     *Body:* `لا تنسى • [Task 1] • [Task 2]...`

### 7.3 On-Demand Same-Day Scheduling Pipeline
If a student adds or edits a lecture or calendar event **after** 7:30 AM for the current day, the morning cron has already executed. To solve this, Term incorporates on-demand serverless fallback endpoints:
- **`api/schedule-today-lecture.ts`:** Invoked client-side upon saving in `AddSubjectModal.tsx` or `ManageSubjectsModal.tsx`.
- **`api/schedule-today-event.ts`:** Invoked client-side upon saving in `AddEventModal.tsx` or `EditEventModal.tsx`.

Both endpoints:
1. Parse the payload in a non-blocking `fire-and-forget` pattern.
2. Verify the lecture/event is scheduled for today (KSA UTC+3).
3. Ensure the notification time is at least 60 seconds in the future.
4. Directly publish the delayed message to QStash.

### 7.4 Deduplication & Timezone Safeguards
- **Deduplication IDs:** To prevent multiple duplicate push notifications if a user edits a subject multiple times, requests pass an `Upstash-Deduplication-Id` header:
  - For Lectures: `${subjectId}-dow${todayDayOfWeek}-${todayDateStr}`
  - For Events: `event-${eventId}-${todayDateStr}`
- **Saudi Arabia Timezone Formula (Strict UTC+3):**
  ```typescript
  const nowUTC = Date.now();
  const nowSaudiMs = nowUTC + 3 * 60 * 60 * 1000;
  const nowSaudiDate = new Date(nowSaudiMs);
  const todayDayOfWeek = nowSaudiDate.getUTCDay(); // 0=Sun..6=Sat
  const todayDateStr = nowSaudiDate.toISOString().slice(0, 10); // YYYY-MM-DD
  
  // Calculate exact lecture start timestamp
  const saudiMidnightUTC = new Date(`${todayDateStr}T00:00:00Z`).getTime();
  const lecStartSaudiMs = saudiMidnightUTC + (lecHour * 60 + lecMin) * 60 * 1000;
  const notifyAtSaudiMs = lecStartSaudiMs - 10 * 60 * 1000;
  const notifyAtUTCMs = notifyAtSaudiMs - 3 * 60 * 60 * 1000;
  const notifyAtUnixSec = Math.floor(notifyAtUTCMs / 1000);
  ```

---

## 8. Data Models & State Management

### 8.1 Firestore Database Schema
All data is partitioned strictly per authenticated user under root collection `users/{uid}`:

```
users/{uid}/
├── (document root fields)
│   ├── fcmToken: string              # Device push token
│   └── fcmUpdatedAt: timestamp       # Token refresh timestamp
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
│   ├── isStudyBlock: boolean         # Auto-generated study block flag
│   ├── examId: string                # Parent exam event reference
│   ├── createdAt: number
│   └── updatedAt: number
│
├── events/{eventId}
│   ├── title: string                 # Event title
│   ├── type: 'lecture'|'exam'|'assignment'|'study'|'other'
│   ├── startDate: number             # Start timestamp in ms
│   ├── endDate: number               # End timestamp in ms
│   ├── subjectId: string             # Associated course ID
│   ├── location: string              # Room / Building
│   ├── description: string
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
│   └── timestamp: number
│
└── settings/
    ├── security                      # { pinHash: string }
    └── app                           # { geminiApiKey: string }
```

### 8.2 Global Client State (Zustand Stores)
1. **`useUIStore` (`src/store/index.ts`):** Controls active navigation tab, calendar view mode, selected date, modal display states (`showAddTask`, `showAddEvent`, `showAddSubject`), toast notifications, and authenticated user credentials.
2. **`useSettingsStore` (`src/store/index.ts`):** Persisted in `localStorage` under `student-dashboard-settings`. Controls language (`ar` / `en`), text direction (`rtl` / `ltr`), dark/light theme, user name, major, semester, university portal URLs (Banner / Blackboard), and Google Drive OAuth tokens.
3. **`useDataStore` (`src/store/dataStore.ts`):** In-memory cache holding real-time arrays of `subjects`, `tasks`, `events`, `driveFiles`, `chatSessions`, and `messages`. Synchronized automatically with Firestore via `onSnapshot` listeners in `App.tsx`.
4. **`useTimerStore` (`src/store/timerStore.ts`):** Tracks Pomodoro intervals, countdown state, active mode (`pomodoro`, `shortBreak`, `longBreak`, `custom`), and custom duration preferences.

---

## 9. Localization (i18n) & Accessibility

### 9.1 Bidirectional (RTL / LTR) Architecture
Term provides native, full-fidelity support for both Arabic (Right-to-Left) and English (Left-to-Right):
- **Root Element Binding:** When language changes, `App.tsx` dynamically sets attributes on `document.documentElement`:
  ```typescript
  document.documentElement.setAttribute('dir', dir); // 'rtl' or 'ltr'
  document.documentElement.setAttribute('lang', dir === 'rtl' ? 'ar' : 'en');
  ```
- **CSS Logical Properties:** Popups, sidebars, and dropdowns employ logical coordinates (such as `insetInlineStart: 0`) rather than physical coordinates (`left: 0` or `right: 0`), preventing off-screen clipping when switching between Arabic and English.
- **Directional Icon Flipping:** Chevron icons and directional arrows utilize `.rtl-flip` to flip horizontally by 180 degrees in RTL mode.
- **Punctuation Protection:** Arabic descriptions utilize explicit `dir="rtl"` and `text-right` alignment to prevent punctuation marks (e.g. trailing periods) from incorrectly wrapping to the start of sentences.

### 9.2 Translation System (`src/locales/index.ts` & `useTranslation.ts`)
Translations are managed via a key-value dictionary structure supporting dynamic parameter interpolation (e.g., `{{count}}`, `{{lectures}}`, `{{tasks}}`). All UI strings across modals, toasts, headings, and navigation labels are bound through the `useTranslation()` hook, ensuring zero raw key leaks.

---

*Term (Student Dashboard) — Engineered for Academic Excellence.*