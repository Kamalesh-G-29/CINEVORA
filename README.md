# CINEVORA — Movie Comparison & Discovery Platform

CINEVORA is a web-based movie discovery platform that allows users to browse, search, compare, and review movies using a simple and responsive interface built with HTML, CSS, and JavaScript.

## Features

- Browse trending, top-rated, popular, and newly released movies.
- Search for movies with autocomplete and voice search support.
- View movie details, cast, crew, genres, ratings, and recommendations when available through the movie API.
- Compare up to five movies across multiple categories with interactive charts.
- Estimate audience reception using available movie ratings and review sentiment.
- Save watchlists and viewing history locally in the browser.
- Customize the interface with 32 color themes.
- Play videos using available video sources.
- Responsive design for desktop, tablet, and mobile devices.

## Technology Stack

- **Frontend:** HTML5, CSS3, JavaScript
- **Movie Data:** TMDB API
- **Charts:** Chart.js
- **Icons:** Font Awesome
- **Browser Storage:** LocalStorage
- **Voice Search:** Web Speech API, where supported

## Setup

### Requirements

- A modern web browser
- Visual Studio Code
- Live Server extension for local development
- A TMDB API key for movie data

### Installation

1. Download or clone the CINEVORA repository.
2. Open the project folder in Visual Studio Code.
3. Configure the TMDB API URL and key according to the API's security requirements.
4. Install the Live Server extension if needed.
5. Open `index.html` using Live Server.

## Deployment

CINEVORA's static frontend can be deployed using GitHub Pages.

1. Push the HTML, CSS, and JavaScript files to GitHub.
2. Open the repository's **Settings → Pages**.
3. Select the `main` branch and the appropriate folder.
4. Save the settings and open the generated website URL.

## Important Notes

- LocalStorage stores watchlists and viewing history in the current browser; this data is not automatically synchronized across devices.
- Features requiring secure user authentication, shared reviews, or a database need a backend service.
- Movie information requires a working TMDB API connection.
- Never expose private API credentials in public JavaScript files.
- Audience reception estimates depend on the data sources actually available and should not be treated as guaranteed predictions.

## Project Goal

The goal of CINEVORA is to provide a user-friendly movie discovery and comparison experience using core web technologies without relying on heavy frontend frameworks.
