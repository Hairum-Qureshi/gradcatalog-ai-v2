# Semantic RAG Pipeline – Experimental Gemini Extension

## Overview

This project experimented with extending a previous UD CIS chatbot system by implementing a **Semantic Retrieval-Augmented Generation (RAG)** pipeline using **Google Gemini**, **Redis**, and **local transformer-based embeddings**. The goal was to move beyond simple keyword retrieval toward a pipeline capable of **semantic chunking**, **vector search**, and **cosine-similarity-driven context selection** for UD CIS graduate catalog content.

Unlike the earlier chatbot, this approach attempted to build a **fully custom retriever**, using MiniLM for embeddings and Redis as a pseudo-vector store. Although the pipeline executes end-to-end — scraping pages, embedding text, storing vectors, and ranking chunks — the retrieval quality proved too unreliable for practical use.

---

## Motivation

After implementing a more traditional RAG pipeline, this project served as a sandbox to explore whether a self-managed retrieval stack could outperform prompt-level context injection. The intent was to:

* Move computation out of Gemini’s prompt layer
* Experiment with **local embedding-based retrieval**
* Test cosine similarity as a ranking strategy for academic-catalog text
* Evaluate whether Redis could function as a lightweight vector store

While the mechanics worked, the experiment highlighted a mismatched assumption: **vector similarity alone does not ensure useful semantic retrieval**, especially without proper chunking strategies or re-ranking methods. Instead of escalating complexity (vector DB, re-ranks, hybrid search), the experiment was stopped deliberately.

---

## System Architecture

**Tech Stack:** Node.js · Express.js · TypeScript · Google Gemini · Redis · Cheerio · Xenova Transformers

**Workflow:**

1. The Express server accepts user questions via an `/ask-question` route.
2. Gemini identifies catalog pages that may contain relevant content.
3. Pages are scraped with Cheerio, token-chunked, and embedded locally using **MiniLM**.
4. Embeddings and chunk metadata are cached in Redis.
5. On user query:

   * The query is embedded
   * Cosine similarity ranks stored chunks
   * The “best” chunk + neighbors are returned as retrieval context
6. Gemini uses that context to generate a final answer.

> **Note:** The retrieval pipeline executes correctly, but similarity ranking frequently surfaces contextually weak chunks, degrading response quality.

---

## Technical Limitations

The main bottleneck was semantic accuracy. Failures stemmed from:

* Token-based chunking rather than semantic segmentation
* Reliance on Redis instead of a real vector index
* Pure cosine similarity with no cross-encoder re-ranking
* Neighbor-chunk heuristics introducing off-topic text

These constraints caused **lexical overlap without conceptual relevance**, revealing the limits of naïve vector search on dense academic content.

The takeaway is straightforward: if you don't combine a vector index, semantic chunking, and re-ranking, “semantic search” devolves into guesswork.

---

## Installation & Setup

### Prerequisites

* Node.js v22.17.1
* Redis running locally (`redis://localhost:6379`)
* Valid Google Gemini API key

### Environment Variables

Create `.env` inside the `backend` folder:

```
DOTENV_CONFIG_QUIET=true
PORT=8000
GEMINI_API_KEY=your_api_key_here
REDIS_URL=redis://localhost:6379
```

### Installation

1. Clone repo
2. `cd` into `backend`
3. Run:

   ```bash
   npm install
   npm run dev
   ```
4. Start Redis:

   ```bash
   redis-server
   ```

---

## Status

* ✅ Scraping, embedding, and Redis caching functional
* ✅ End-to-end pipeline runs as intended
* ⚠️ Retrieval inconsistent; semantic precision insufficient
* ❌ Not suitable for production context retrieval
* 🚫 Development intentionally discontinued

---

## Future Directions

If revisited, improvements would require:

* Replacing Redis with a real **vector database** (Qdrant/Chroma/Weaviate)
* **Semantic chunker** instead of token slicing
* **Cross-encoder re-ranking** or Gemini-scored retrieval
* Hybrid lexical + vector search
* Possibly offloading retrieval to Gemini’s future native APIs

These steps move the system from “toy semantic search” to something robust — but they also introduce significantly more engineering complexity.

---

## Lessons Learned

This experiment surfaced a practical reality: **semantic retrieval is not trivial**, even with good embeddings. Cosine similarity offers a useful baseline for vector math, but treating it as a retrieval strategy — without chunk discipline, index structures, or re-ranking — produces brittle results.

The pipeline validates the mechanics of manual RAG, but also demonstrates why production-grade systems rely on **vector stores + hybrid search + re-rankers**, not just raw cosine matching.
