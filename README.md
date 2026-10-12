# CINEVORA — Movie Comparison & Discovery Platform

CINEVORA lets users browse, search, compare, and review movies. It includes a movie reception forecast that combines TMDB and IMDb ratings with sentiment from CINEVORA reviews and, when configured, public Reddit posts.

## Features

- User authentication with JWT
- Browse trending, top-rated, new releases, and popular movies
- Search with autocomplete and voice support
- Movie detail pages with cast, crew, recommendations, and reviews
- Audience reception prediction (0–100), source ratings, review sentiment, and social sentiment
- Personal watchlist and viewing history
- Compare up to 5 movies across 12 categories with interactive charts
- 32 color themes and a video player with multiple server sources

## Tech stack

- **Backend:** Node.js, Express, MongoDB/Mongoose, TMDB API
- **Frontend:** HTML, CSS, JavaScript, Chart.js, Font Awesome
- **Sentiment:** Local, lexicon-based classification; user review text is not sent to third-party services
- **Optional social source:** Reddit's official OAuth API

## Setup

### Requirements

- Node.js 18 or newer
- MongoDB (local or hosted)
- A TMDB API key
- Optional: an OMDb API key for IMDb ratings
- Optional: a Reddit app with OAuth credentials for social reactions

### Install

From the repository root:

```bash
npm install
npm install --prefix backend
```

Create `backend/.env` from `backend/.env.example` and set the values:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/cinevora
JWT_SECRET=use-a-long-random-secret
TMDB_API_KEY=your-tmdb-api-key
OMDB_API_KEY=your-omdb-api-key
REDDIT_CLIENT_ID=your-reddit-app-id
REDDIT_CLIENT_SECRET=your-reddit-app-secret
REDDIT_USER_AGENT=CINEVORA/1.0 (contact: you@example.com)
```

`TMDB_API_KEY` is required for movie browsing and predictions. `OMDB_API_KEY` enables IMDb ratings. Reddit credentials are optional; without them the prediction still uses available ratings and CINEVORA reviews. The app reports unavailable sources instead of treating missing data as zero. Keep `.env` private and never commit API credentials.

### Run

Start MongoDB, then run from the repository root:

```bash
npm start
```

Open [http://localhost:5000](http://localhost:5000). For automatic backend restarts during development, use `npm run dev`.

## Audience reception score

The backend caches external source snapshots for six hours. The score is a weighted estimate: TMDB rating (35%), IMDb rating (35%), CINEVORA review sentiment (15%), and Reddit post sentiment (15%). Reddit post sentiment is weighted by each post's score and comment count. Missing components are excluded and the remaining weights are normalized. Sentiment is classified as positive, neutral, or negative; the detail page shows percentages, source ratings, sample counts, and a confidence indicator. It is an estimate, not a guarantee of audience response.

The public prediction endpoint is `GET /api/movies/reception/:tmdbMovieId`. Reviews are stored in MongoDB and classified when submitted through the authenticated `POST /api/reviews` endpoint.
