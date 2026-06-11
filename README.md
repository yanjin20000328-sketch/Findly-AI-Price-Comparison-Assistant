# Findly AI Shopping Demo

An AI-powered shopping assistant featuring object recognition via camera and smart price comparison.

Findly is an image-first AI shopping demo. Users upload or capture a product image, the local API server calls Doubao / Volcengine Ark VLM to understand the item, then Findly combines mock commerce data, product detail pages, agent discussion, favorites, price watching, and AI comparison flows.

## Features

- 5-page animated Landing flow plus a user preference step.
- VLM image recognition through the local Express API server.
- Rich mock product dataset for search, product detail, price watching, and comparison demos.
- Top 1 recommendation card with agent discussion and streaming-style output.
- Product detail modules for price watching, saving strategy, reputation, and comparison.
- Favorites and watched-product carousel interactions.

## Tech Stack

- React + TypeScript + Vite
- Zustand
- Express
- Doubao / Volcengine Ark Chat Completions API
- Rich local mock commerce dataset

## Requirements

- Node.js 22.x is recommended. Node 20+ should also work.
- npm 10+.

## Setup For Collaborators

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env
```

Fill in the keys if you need real VLM / AI calls:

```bash
ARK_API_KEY=your_volcengine_ark_api_key
RAPID_API_KEY=your_rapidapi_key
```

Start the backend API in terminal 1:

```bash
npm run server
```

Start the frontend in terminal 2:

```bash
npm run dev
```

Open:

```text
http://localhost:5183/landing
```

If port `5183` is already occupied, Vite may print another local URL. Open the URL shown in that terminal.

## Build

```bash
npm run build
```

## Sharing Notes

- Do not commit or share `.env`; use `.env.example` as the template.
- Do not share `node_modules`, `dist`, or `.node-runtime`; collaborators should run `npm install`.
- The frontend dev server uses HTTP config by default for easier local preview in Trae / browser environments.
