# UD CIS Graduate Chatbot – RAG Integration with Google Gemini

## Overview
This project extends a capstone initiative to develop an AI-powered chatbot for UD CIS graduate students. The chatbot leverages **Google Gemini** and a **Retrieval-Augmented Generation (RAG)** approach to answer questions about the UD Computer & Information Sciences graduate program. 

Built with **Node.js**, **Express.js**, **TypeScript**, **TailwindCSS**, and **HTML**, this project automates the process of collecting and structuring reference data for Gemini using web scraping and JSON-based storage.

---

## Motivation
My capstone client requested an expanded dataset of question-answer pairs for the chatbot. I contributed by developing a system that automatically compiles data from the university’s graduate catalog. Instead of manually gathering questions from numerous web pages, I implemented a web scraping pipeline to retrieve and structure relevant content, reducing manual work and improving dataset coverage.

---

## System Architecture
**Tech Stack:** Node.js · Express.js · TypeScript · TailwindCSS · HTML · Google Gemini

**Workflow:**
1. The Express.js server provides API endpoints for query handling and data retrieval.
2. TypeScript implementation to scrape relevant catalog links, extract content, and consolidate it into a structured JSON dataset.
3. When a user submits a question:
   - Gemini identifies which links are likely relevant.
   - The selected links' contents are fetched dynamically.
   - Contextualized prompts guide Gemini's response generation to ensure answers remain focused on the UD CIS graduate program.
4. The system returns Gemini’s response to the user.

> **Note:** The current RAG pipeline performs content fetching per request, which may introduce latency.

---

## Installation & Setup

### Prerequisites
- Node.js v22.17.1
- A Google Gemini API key (make sure to add to `env` file)
- Make sure to provide a `PORT` number (make sure to add to `env` file)

### Installation
1. Clone repo
2. `cd` into `backend` folder
3. Run `npm install`
4. Run `npm run dev`
