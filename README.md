CINEVORA — Movie Comparison & Discovery Platform
CINEVORA lets users browse, search, compare, and review movies. It includes a movie reception forecast that combines TMDB and IMDb ratings with sentiment from CINEVORA reviews and, when configured, public Reddit posts.

Features
User authentication with JWT
Browse trending, top-rated, new releases, and popular movies
Search with autocomplete and voice support
Movie detail pages with cast, crew, recommendations, and reviews
Audience reception prediction (0–100), source ratings, review sentiment, and social sentiment
Personal watchlist and viewing history
Compare up to 5 movies across 12 categories with interactive charts
32 color themes and a video player with multiple server sources
Tech stack
Backend: Node.js, Express, MongoDB/Mongoose, TMDB API
Frontend: HTML, CSS, JavaScript, Chart.js, Font Awesome
Sentiment: Local, lexicon-based classification; user review text is not sent to third-party services
Optional social source: Reddit's official OAuth API
Setup
Requirements
Node.js 18 or newer
MongoDB (local or hosted)
A TMDB API key
Optional: an OMDb API key for IMDb ratings
Optional: a Reddit app with OAuth credentials for social reactions
Install
From the repository root:

npm install
npm install --prefix backend
Create backend/.env from backend/.env.example and set the values:

PORT=5000
MONGODB_URI=mongodb://localhost:27017/cinevora
JWT_SECRET=use-a-long-random-secret
TMDB_API_KEY=your-tmdb-api-key
OMDB_API_KEY=your-omdb-api-key
REDDIT_CLIENT_ID=your-reddit-app-id
REDDIT_CLIENT_SECRET=your-reddit-app-secret
REDDIT_USER_AGENT=CINEVORA/1.0 (contact: you@example.com)
TMDB_API_KEY is required for movie browsing and predictions. OMDB_API_KEY enables IMDb ratings. Reddit credentials are optional; without them the prediction still uses available ratings and CINEVORA reviews. The app reports unavailable sources instead of treating missing data as zero. Keep .env private and never commit API credentials.

Run
Start MongoDB, then run from the repository root:

npm start
Open http://localhost:5000. For automatic backend restarts during development, use npm run dev.

The browser uses the same-origin API when served by Express. When using a local static server such as VS Code Live Server, it automatically calls http://localhost:5000. The optional js/config.js setting is reserved for the deployed API URL; never put TMDB, MongoDB, JWT, Gemini, OMDb, or Reddit credentials in frontend files.

Deployment
The backend can be deployed to Render and the static frontend to GitHub Pages. The checked-in render.yaml configures the backend service, MongoDB readiness check, and Pages CORS origin. Create a MongoDB Atlas database and provide its connection string and the TMDB API key in Render's environment settings; the blueprint generates JWT_SECRET. Optional integrations can be added there as well. Configure Atlas network access to allow Render connections. Do not commit backend/.env or enter secrets as GitHub repository variables.

After creating the Render service from this repository, copy its HTTPS service URL (for example, https://cinevora-api.onrender.com) into the GitHub repository variable CINEVORA_API_BASE_URL under Settings → Secrets and variables → Actions → Variables. Then enable GitHub Pages with GitHub Actions as the build and deployment source. The Pages workflow injects only that public base URL into js/config.js; server credentials remain on Render.

Push the deployment changes from the repository root:

git add README.md index.html js/app.js js/config.js backend/config/database.js backend/server.js backend/.env.example render.yaml .github/workflows/pages.yml
git commit -m "Fix movie API routing and deployment configuration"
git push origin main
The Pages URL for this repository is https://kamalesh-g-29.github.io/Movie-Streaming-Application/. The API will be available at <your-render-service-url>/api/movies/trending; verify <your-render-service-url>/api/health reports {"status":"ok","database":"connected"} after deployment.

Audience reception score
The backend caches external source snapshots for six hours. The score is a weighted estimate: TMDB rating (35%), IMDb rating (35%), CINEVORA review sentiment (15%), and Reddit post sentiment (15%). Reddit post sentiment is weighted by each post's score and comment count. Missing components are excluded and the remaining weights are normalized. Sentiment is classified as positive, neutral, or negative; the detail page shows percentages, source ratings, sample counts, and a confidence indicator. It is an estimate, not a guarantee of audience response.

The public prediction endpoint is GET /api/movies/reception/:tmdbMovieId. Reviews are stored in MongoDB and classified when submitted through the authenticated POST /api/reviews endpoint.

