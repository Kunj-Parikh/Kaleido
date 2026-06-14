# Kaleido 

> **Seamless, privacy-first context handoff between LLMs—running entirely in your browser.**

**Kaleido** is a lightweight Google Chrome extension (built using Manifest V3) designed to help you swap your conversations between different LLM providers (ChatGPT, Gemini, Claude, Grok, DeepSeek, Perplexity, and Copilot) in milliseconds. It extracts your current active chat session, runs it through an optimized local NLP pipeline for text compression and constraint extraction, and automatically injects the handoff prompt into the target LLM's input field in your new tab.

---

##  Key Features

- **Multi-Platform Support**: Scrapes and injects context across ChatGPT, Gemini, Claude, Grok, DeepSeek, Perplexity, and Copilot.
- **Classical NLP Pipeline**: Uses recency-weighted TF-IDF, RAKE (Rapid Automatic Keyword Extraction), a regex token scanner, and a Naive Bayes classifier to summarize topics, find code symbols, and identify user constraints locally in under 5ms.
- **Layout-Aware Truncation**: Intelligently truncates dialogue prose while preserving code blocks, markdown tables, bulleted lists, key-value configurations, and poem stanzas at full length.
- **Hybrid Input Injection**: Safely targets and injects text into both standard textareas (bypassing React/Vue state tracking via prototype descriptor hijacking) and rich-text contenteditables (via `document.execCommand`).
- **100% Private & Local**: Zero external API keys, server dependencies, or telemetry. Your conversations remain entirely secure in your browser.

---

##  Repository Structure

```text
kaleido/
├── manifest.json              # Extension Manifest V3 configuration
├── background/
│   └── service_worker.js      # Orchestrates tabs and runs the NLP pipeline
├── content_scripts/
│   ├── scraper.js             # Platform-specific DOM scraper with two-pass filtering
│   └── injector.js            # Hybrid rich-text editor and textarea injector
├── nlp/
│   └── pipeline.js            # Recency-weighted TF-IDF, RAKE, and Bayes classifier
├── popup/
│   ├── popup.html             # Extension popup UI
│   ├── popup.css              # Beautifully styled popup panel
│   └── popup.js               # Handlespopup interactions and message passing
└── icons/
    └── ...                    # Static design assets and extension logos
