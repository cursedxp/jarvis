# Product Requirements Document (PRD) -- Jarvis: Voice-First Coding Mentor

## 1. Product Summary

Jarvis is a voice-activated AI coding mentor that runs as a background
agent on boot, wakes up when called ("Hey Jarvis"), integrates with VS
Code, and assists developers with code explanation, refactoring
suggestions, safe package installations, test execution, and long-term
personalized learning.

## 2. Goals & Vision

### Short-Term (MVP, 0--3 months)

-   Always-on agent, boot-activated, with wake-word ("Hey Jarvis").
-   STT (speech-to-text) + TTS (text-to-speech) for natural dialogue.
-   VS Code integration: explain selection, run tests, install packages
    (securely).
-   LLM adapter with hot-swappable models.
-   Safe package install flow (dry-run + approval).

### Mid-Term (3--12 months)

-   Mentor mode: Socratic questioning, refactor challenges, quizzes.
-   RAG integration: knowledge from notes, repo code, docs.
-   Model registry + Canary deployments: test new LLMs live with
    rollback.
-   Semantic code search across repos.
-   Quiet hours / contextual modes (office vs. home).
-   Cross-platform parity (macOS LaunchAgent, Windows Task Scheduler,
    Linux systemd).

### Long-Term (1--3 years)

-   Personalized learning paths: developer skill assessments, tailored
    growth plans.
-   Gamified learning: XP, streaks, performance dashboards.
-   Team collaboration: Jarvis as a shared mentor in pair/mob
    programming.
-   Offline-first: self-hosted LLMs, local embeddings, full privacy.
-   Marketplace of skills: plugins for frameworks, languages, devops
    tools.
-   Universal IDE integration: VS Code first → JetBrains → Neovim.
-   Voice-driven DevOps: trigger CI/CD, monitor deployments by voice.

## 3. Target Users

-   Junior Developers -- want a coding mentor and guided learning.
-   Mid-level Developers -- need fast explanations, test automation,
    productivity boosts.
-   Senior Developers -- benefit from code reviews, automated package
    setup, and custom workflows.
-   Teams -- pair programming with Jarvis as an extra "mentor voice" in
    the room.

## 4. User Stories & Acceptance Criteria

### Voice Interaction

-   Wake latency \< 400ms, false positives \< 1/h.

### Code Explanation

-   Inline + panel, spoken short summary.

### Secure Package Installation

-   Dry-run + approval, whitelist only.

### Test Execution

-   Jest/Vitest, map errors to file+line, short spoken summary.

### Mentorship Mode

-   Quizzes, rubric evaluation, Socratic dialogue.

### Model Switching

-   Hot reload, Canary %, rollback in 1 click.

## 5. Features

-   Always-on agent + Tray UI.
-   Wake-word detection.
-   STT (whisper.cpp), TTS (Piper).
-   VS Code Extension.
-   LLM registry + hot-swap.
-   RAG (notes + repo).
-   Semantic search, mentorship engine.
-   Team collaboration, DevOps voice integration, plugin marketplace.

## 6. Technical Architecture

-   Agent (Node/TS).
-   Electron Tray UI.
-   VS Code extension.
-   STT/TTS subprocesses.
-   Wake-word (onnx, later Rust).
-   LLM adapters + registry + eval pipeline.
-   RAG with FAISS/SQLite.
-   Sandbox security for installs/tests.

## 7. Roadmap

### Phase 1 (0--3 months)

MVP: Boot-on-login agent, wake-word, STT/TTS, explain selection, package
install, model hot-swap.

### Phase 2 (3--12 months)

Expansion: Run Tests, Refactor, RAG, Mentorship engine v1, Canary eval,
Semantic search.

### Phase 3 (1--3 years)

Vision: Gamification, team features, multi-IDE support, offline LLMs,
DevOps, plugin marketplace.

## 8. Success Metrics

-   Wake latency \< 400 ms.
-   Response \< 5 s.
-   JSON/tool-call compliance ≥ 95%.
-   User satisfaction ≥ 80%.
-   Retention ≥ 50% DAU.
-   Learning completion ≥ 70%.
