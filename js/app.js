// ════════════════════════════════════════════════════════════════
        //  CINEVORA — Complete Application
        //  Player: No controls — only Servers dropdown with 10 sources
        //  No pop-ups, no new tabs — all inside the app.
        // ════════════════════════════════════════════════════════════════

        // ─── THEME CONFIGURATION ───
        const THEME_CATEGORIES = {
            'Modern Tech': ['cyberpunk', 'nord', 'dracula', 'onedark', 'github-dark', 'slate', 'oled', 'matrix'],
            'Earthy & Nature': ['forest', 'sahara', 'ocean', 'volcano', 'winter', 'clay'],
            'Pastel Palette': ['candy', 'matcha', 'lavender', 'lemon', 'mint', 'peach', 'bubblegum', 'vintage'],
            'Vibrant & Premium': ['royal', 'gold', 'sunset', 'crimson', 'cyber-light', 'arcade', 'teal', 'coffee']
        };

        // ─── 10 STREAM SOURCES (Servers) ───
        const STREAM_SOURCES = [
            { name: 'Server 1', url: (id) => `https://www.2embed.cc/embed/${id}` },
            { name: 'Server 2', url: (id) => `https://streamimdb.ru/embed/movie/${id}` },
            { name: 'Server 3', url: (id) => `https://vidsrc.to/embed/movie/${id}` },
            { name: 'Server 4', url: (id) => `https://embed.su/embed/movie/${id}` },
            { name: 'Server 5', url: (id) => `https://www.2embed.cc/embed/${id}` },
            { name: 'Server 6', url: (id) => `https://streamimdb.ru/embed/movie/${id}` },
            { name: 'Server 7', url: (id) => `https://vidsrc.to/embed/movie/${id}` },
            { name: 'Server 8', url: (id) => `https://embed.su/embed/movie/${id}` },
            { name: 'Server 9', url: (id) => `https://www.2embed.cc/embed/${id}` },
            { name: 'Server 10', url: (id) => `https://streamimdb.ru/embed/movie/${id}` },
        ];

        // ─── CONSTANTS ───
        const TMDB_KEY = '7248c5cc1f2080c7baf7361d2427fb80';
        const OMDb_KEY = '2deceaec';
        const IMG_BASE = 'https://image.tmdb.org/t/p/w500';
        const IMG_ORIGINAL = 'https://image.tmdb.org/t/p/original';
        const IMG_NA = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="300" viewBox="0 0 200 300"%3E%3Crect width="200" height="300" fill="%231a2332"/%3E%3Ctext x="100" y="150" font-family="sans-serif" font-size="18" fill="%2364748b" text-anchor="middle"%3ENo Image%3C/text%3E%3C/svg%3E';

        // ─── BLOCKED CONTENT ───
        const BLOCKED_TITLES = ['nude', 'porn', 'xxx', 'sex', 'adult', 'erotic', 'uncensored'];

        function isBlockedMovie(title) {
            if (!title) return false;
            const lower = title.toLowerCase().trim();
            for (const b of BLOCKED_TITLES) {
                if (lower === b || lower.includes(b)) return true;
            }
            return false;
        }

        function filterBlockedMovies(movies) {
            if (!movies || !Array.isArray(movies)) return movies;
            return movies.filter(m => !isBlockedMovie(m.title || m.name || ''));
        }

        // ─── STATE ───
        let currentUser = null;
        let usersDB = JSON.parse(localStorage.getItem('cineverse_users')) || [];
        let watchlist = [];
        let recentlyViewed = [];
        let currentPage = 'home';
        let lastSearchFunc = '';
        let cachedOMDb = {};
        let browseMovies = [];
        let filteredBrowseMovies = [];
        let selectedGenre = 'all';
        let sortBy = 'vote_average.desc';
        let selectedLanguage = 'all';
        let recognition = null;
        let isListening = false;
        let theme = 'cyberpunk';
        let movieReviews = JSON.parse(localStorage.getItem('cineverse_reviews')) || {};

        // Compare state
        let compareMovies = [];
        let compareResults = null;
        let radarChartInstance = null;
        let barChartInstance = null;
        let pieChartInstance = null;

        // Player state
        let playerModal = null;
        let playerIframe = null;
        let playerLoading = null;
        let playerError = null;
        let playerCloseBtn = null;
        let playerTitleEl = null;
        let playerServerSelect = null;
        let playerFullscreenBtn = null;
        let playerStatusDot = null;
        let playerStatusText = null;
        let currentMovieData = null;
        let currentServerIndex = 0;

        // ─── SEED DEMO USER ───
        if (!usersDB.some(u => u.email === 'admin@cineverse.com')) {
            usersDB.push({ email: 'admin@cineverse.com', password: '12345', name: 'Admin' });
            localStorage.setItem('cineverse_users', JSON.stringify(usersDB));
        }

        // ─── HELPERS ───
        function toast(msg, type = 'info') {
            const t = document.getElementById('toastMsg');
            const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
            t.textContent = `${icons[type] || ''} ${msg}`;
            t.style.display = 'block';
            clearTimeout(t._timer);
            t._timer = setTimeout(() => t.style.display = 'none', 2800);
        }

        function fetchJSON(url) {
            return fetch(url).then(r => r.json()).catch(() => null);
        }

        function getPoster(path) { return path ? IMG_BASE + path : IMG_NA; }

        function getBackdrop(path) { return path ? IMG_ORIGINAL + path : ''; }

        function getYear(date) { return date ? date.split('-')[0] : ''; }

        function formatRuntime(min) {
            if (!min) return '';
            const h = Math.floor(min / 60);
            const m = min % 60;
            return h > 0 ? `${h}h ${m}min` : `${m}min`;
        }

        function sanitizeQuery(q) {
            return q.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
        }

        // ─── COMPARE CATEGORIES ───
        const COMPARE_CATEGORIES = [
            { key: 'story', label: 'Story', icon: 'fa-book', sub: 'Plot, narrative, twists' },
            { key: 'music', label: 'Music', icon: 'fa-music', sub: 'Songs, soundtrack' },
            { key: 'bgm', label: 'BGM', icon: 'fa-headphones', sub: 'Background score' },
            { key: 'acting', label: 'Acting', icon: 'fa-mask-theater', sub: 'Performances' },
            { key: 'editing', label: 'Editing', icon: 'fa-scissors', sub: 'Pacing, cuts' },
            { key: 'direction', label: 'Direction', icon: 'fa-clapperboard', sub: 'Vision & execution' },
            { key: 'cinematography', label: 'Cinematography', icon: 'fa-camera', sub: 'Visual composition' },
            { key: 'vfx', label: 'Visual Effects', icon: 'fa-wand-sparkles', sub: 'VFX & CGI' },
            { key: 'dialogues', label: 'Dialogues', icon: 'fa-comment', sub: 'Writing & wit' },
            { key: 'emotional', label: 'Emotional Impact', icon: 'fa-heart', sub: 'Feel & resonance' },
            { key: 'entertainment', label: 'Entertainment Value', icon: 'fa-face-laugh', sub: 'Fun & engagement' },
            { key: 'rewatch', label: 'Rewatch Value', icon: 'fa-rotate', sub: 'Repeat viewing' }
        ];

        // ─── COMPARE ENGINE ───
        async function addMovieToCompare(title) {
            const query = (title || '').trim();
            if (!query) {
                toast('Enter a movie title', 'warning');
                return;
            }
            if (compareMovies.length >= 5) {
                toast('Maximum 5 movies for comparison', 'warning');
                return;
            }

            try {
                const data = await api.tmdb.search(query);
                if (!data?.results?.length) {
                    toast('Movie not found', 'error');
                    return;
                }

                const m = data.results[0];
                if (compareMovies.some(cm => cm.id === m.id)) {
                    toast('Movie already in comparison', 'warning');
                    return;
                }

                const details = await api.tmdb.details('movie', m.id);
                compareMovies.push({
                    id: m.id,
                    title: m.title || m.name || 'Untitled',
                    year: getYear(m.release_date),
                    poster: getPoster(m.poster_path),
                    vote_average: m.vote_average || 0,
                    runtime: details?.runtime || 0,
                    genres: (details?.genres || []).map(g => g.name).slice(0, 3).join(', ')
                });

                renderCompareSelected();
                document.getElementById('compareSearchInput').value = '';
                toast(`Added "${m.title}" to comparison`, 'success');
            } catch (error) {
                console.error('Compare search error', error);
                toast('Error searching for movie', 'error');
            }
        }

        function removeCompareMovie(id) {
            compareMovies = compareMovies.filter(m => m.id !== id);
            renderCompareSelected();
            document.getElementById('compareResults')?.classList.remove('active');
            destroyCharts();
            toast('Removed from comparison', 'info');
        }

        function renderCompareSelected() {
            const container = document.getElementById('compareSelected');
            if (!container) return;
            if (compareMovies.length === 0) {
                container.innerHTML = `<div class="empty-hint">Add movies above to start comparing. (2–5 movies)</div>`;
                document.getElementById('compareRunBtn').disabled = true;
                return;
            }
            container.innerHTML = '';
            compareMovies.forEach(m => {
                const div = document.createElement('div');
                div.className = 'selected-movie';
                div.innerHTML = `
                    <img src="${m.poster || IMG_NA}" alt="${m.title}" onerror="this.src='${IMG_NA}'" />
                    <div class="info">
                        <span class="title">${m.title}</span>
                        <span class="year">${m.year || ''} ⭐ ${m.vote_average ? m.vote_average.toFixed(1) : '—'}</span>
                    </div>
                    <button class="remove-sel" data-id="${m.id}"><i class="fas fa-times"></i></button>
                `;
                div.querySelector('.remove-sel')?.addEventListener('click', function (e) {
                    e.stopPropagation();
                    removeCompareMovie(parseInt(this.dataset.id, 10));
                });
                container.appendChild(div);
            });
            document.getElementById('compareRunBtn').disabled = compareMovies.length < 2;
        }

        function destroyCharts() {
            if (radarChartInstance) { radarChartInstance.destroy(); radarChartInstance = null; }
            if (barChartInstance) { barChartInstance.destroy(); barChartInstance = null; }
            if (pieChartInstance) { pieChartInstance.destroy(); pieChartInstance = null; }
        }

        function generateComparison() {
            if (compareMovies.length < 2) {
                toast('Add at least 2 movies to compare', 'warning');
                return;
            }

            const resultsDiv = document.getElementById('compareResults');
            resultsDiv?.classList.add('active');

            const scores = compareMovies.map(movie => {
                const base = Math.min(10, (movie.vote_average || 0) + 1.5);
                const categoryScores = COMPARE_CATEGORIES.map((cat, idx) => {
                    const correlation = 0.3 + (idx / COMPARE_CATEGORIES.length) * 0.5;
                    const variation = (Math.random() - 0.5) * 2.5;
                    let score = Math.min(10, Math.max(1, base * correlation + (10 - base * correlation) * 0.3 + variation));
                    if (Math.random() > 0.6) score = Math.min(10, score + 1.5);
                    if (Math.random() > 0.8) score = Math.min(10, score - 1);
                    return Math.round(score * 10) / 10;
                });
                return { movie, scores: categoryScores };
            });

            const averages = scores.map(s => s.scores.reduce((a, b) => a + b, 0) / s.scores.length);
            const bestIdx = averages.indexOf(Math.max(...averages));
            const winner = scores[bestIdx].movie;
            document.getElementById('winnerBadge').textContent = `🏆 Winner: ${winner.title}`;

            destroyCharts();
            renderRadarChart(scores);
            renderBarChart(scores);
            renderPieChart(scores, averages);
            renderRankingList(scores, averages);

            compareResults = { scores, averages, winner };
            toast('✅ Comparison generated!', 'success');
        }

        function renderRadarChart(scores) {
            const canvas = document.getElementById('radarChart');
            if (!canvas) return;

            const labels = COMPARE_CATEGORIES.map(c => c.label);
            const colors = ['#ff6b6b','#4ecdc4','#45b7d1','#f9ca24','#6c5ce7','#fd79a8','#00b894','#e17055','#0984e3','#fdcb6e','#00cec9','#a29bfe'];
            const datasets = scores.map((s, idx) => ({
                label: s.movie.title,
                data: s.scores,
                backgroundColor: colors[idx % colors.length] + '40',
                borderColor: colors[idx % colors.length],
                borderWidth: 2,
                pointBackgroundColor: colors[idx % colors.length],
                pointBorderColor: '#fff',
                pointRadius: 4,
                pointHoverRadius: 6
            }));

            const ctx = canvas.getContext('2d');
            radarChartInstance = new Chart(ctx, {
                type: 'radar',
                data: { labels, datasets },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: {
                            labels: {
                                color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary') || '#aaa',
                                font: { size: 11, weight: '500' }
                            }
                        }
                    },
                    scales: {
                        r: {
                            angleLines: { color: getComputedStyle(document.documentElement).getPropertyValue('--border-light') || '#333' },
                            grid: { color: getComputedStyle(document.documentElement).getPropertyValue('--border-light') || '#333' },
                            pointLabels: {
                                color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary') || '#fff',
                                font: { size: 10, weight: '600' }
                            },
                            ticks: {
                                color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted') || '#888',
                                backdropColor: 'transparent',
                                stepSize: 2,
                                max: 10,
                                min: 0
                            },
                            min: 0,
                            max: 10
                        }
                    }
                }
            });
        }

        function renderBarChart(scores) {
            const canvas = document.getElementById('barChart');
            if (!canvas) return;

            const categories = COMPARE_CATEGORIES.map(c => c.label);
            const colors = ['#ff6b6b','#4ecdc4','#45b7d1','#f9ca24','#6c5ce7','#fd79a8','#00b894','#e17055','#0984e3','#fdcb6e','#00cec9','#a29bfe'];
            const datasets = scores.map((s, idx) => ({
                label: s.movie.title,
                data: s.scores,
                backgroundColor: colors[idx % colors.length],
                borderColor: colors[idx % colors.length],
                borderWidth: 1,
                borderRadius: 4,
                barPercentage: 0.7,
                categoryPercentage: 0.8
            }));

            const ctx = canvas.getContext('2d');
            barChartInstance = new Chart(ctx, {
                type: 'bar',
                data: { labels: categories, datasets },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: {
                            labels: {
                                color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary') || '#aaa',
                                font: { size: 10, weight: '500' }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: { color: getComputedStyle(document.documentElement).getPropertyValue('--border-light') || '#333', drawBorder: false },
                            ticks: {
                                color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary') || '#fff',
                                maxRotation: 35,
                                minRotation: 25,
                                font: { size: 9, weight: '600' }
                            }
                        },
                        y: {
                            grid: { color: getComputedStyle(document.documentElement).getPropertyValue('--border-light') || '#333', drawBorder: false },
                            ticks: {
                                color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted') || '#888',
                                stepSize: 2,
                                max: 10,
                                min: 0
                            },
                            min: 0,
                            max: 10
                        }
                    }
                }
            });
        }

        function renderPieChart(scores, averages) {
            const canvas = document.getElementById('pieChart');
            if (!canvas) return;

            const colors = ['#ff6b6b','#4ecdc4','#45b7d1','#f9ca24','#6c5ce7','#fd79a8','#00b894','#e17055','#0984e3','#fdcb6e','#00cec9','#a29bfe'];
            const data = scores.map((s, idx) => ({
                label: s.movie.title,
                value: averages[idx],
                color: colors[idx % colors.length]
            }));
            const sorted = [...data].sort((a, b) => b.value - a.value);
            const ctx = canvas.getContext('2d');

            pieChartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: sorted.map(d => d.label),
                    datasets: [{
                        data: sorted.map(d => d.value),
                        backgroundColor: sorted.map(d => d.color + '80'),
                        borderColor: sorted.map(d => d.color),
                        borderWidth: 2,
                        hoverOffset: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary') || '#aaa',
                                font: { size: 11, weight: '500' },
                                padding: 14,
                                usePointStyle: true,
                                pointStyle: 'circle'
                            }
                        }
                    }
                }
            });
        }

        function renderRankingList(scores, averages) {
            const container = document.getElementById('rankingList');
            if (!container) return;

            const data = scores.map((s, idx) => ({
                title: s.movie.title,
                avg: averages[idx],
                poster: s.movie.poster
            }));
            const sorted = data.sort((a, b) => b.avg - a.avg);

            let html = `<div style="font-weight:700;font-size:1rem;margin-bottom:12px;color:var(--text-primary);">
                <i class="fas fa-list" style="color:var(--accent);margin-right:8px;"></i>Overall Ranking
            </div>`;
            sorted.forEach((item, idx) => {
                const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
                html += `
                    <div class="rank-item ${idx === 0 ? 'winner' : ''}">
                        <span class="pos">${medal}</span>
                        <span class="title">${item.title}</span>
                        <span class="score">${item.avg.toFixed(1)}<span class="max">/10</span></span>
                    </div>
                `;
            });
            container.innerHTML = html;
        }

        // ─── THEME ───
        function setTheme(themeName) {
            theme = themeName;
            document.documentElement.setAttribute('data-theme', themeName);
            localStorage.setItem('cineverse_theme', themeName);
            document.querySelectorAll('.theme-item').forEach(el => {
                el.classList.toggle('active', el.dataset.theme === themeName);
            });
            toast(`Theme: ${themeName.charAt(0).toUpperCase() + themeName.slice(1).replace('-', ' ')}`, 'success');
        }

        function loadTheme() {
            const saved = localStorage.getItem('cineverse_theme') || 'cyberpunk';
            theme = saved;
            document.documentElement.setAttribute('data-theme', theme);
        }

        function renderThemeModal() {
            const body = document.getElementById('themeModalBody');
            if (!body) return;
            let html = '';
            for (const [category, themes] of Object.entries(THEME_CATEGORIES)) {
                html += `<div class="theme-category"><div class="category-title">${category}</div><div class="theme-grid">`;
                for (const t of themes) {
                    const active = t === theme ? 'active' : '';
                    html += `<button class="theme-item ${active}" data-theme="${t}">
                        <div class="preview"><i class="fas fa-palette"></i></div>
                        <span class="name">${t.charAt(0).toUpperCase() + t.slice(1).replace('-', ' ')}</span>
                    </button>`;
                }
                html += `</div></div>`;
            }
            body.innerHTML = html;
            body.querySelectorAll('.theme-item').forEach(btn => {
                btn.addEventListener('click', function () {
                    setTheme(this.dataset.theme);
                    document.getElementById('themeModal').classList.remove('active');
                });
            });
        }

        function toggleThemeModal(show) {
            const modal = document.getElementById('themeModal');
            if (!modal) return;
            if (show === undefined) { modal.classList.toggle('active'); } else if (show) {
                modal.classList.add('active');
                renderThemeModal();
            } else { modal.classList.remove('active'); }
        }

        // ─── API ───
        const api = {
            tmdb: {
                async get(endpoint, params = {}) {
                    const url = new URL(`https://api.themoviedb.org/3/${endpoint}`);
                    url.search = new URLSearchParams({ api_key: TMDB_KEY, language: 'en-US', ...params });
                    return fetchJSON(url);
                },
                async findById(imdbId) { return this.get(`find/${imdbId}`, { external_source: 'imdb_id' }); },
                async details(type, id) { return this.get(`${type}/${id}`, { append_to_response: 'videos,credits' }); },
                async trending() { return this.get('trending/movie/day'); },
                async topRated() { return this.get('movie/top_rated'); },
                async nowPlaying() { return this.get('movie/now_playing'); },
                async popular() { return this.get('movie/popular'); },
                async discover(params = {}) { return this.get('discover/movie', params); },
                async search(query, params = {}) { return this.get('search/movie', { query, ...params }); }
            },
            omdb: {
                async get(imdbId) {
                    if (cachedOMDb[imdbId]) return cachedOMDb[imdbId];
                    const url = new URL('https://www.omdbapi.com/');
                    url.search = new URLSearchParams({ apikey: OMDb_KEY, i: imdbId, r: 'json' });
                    const data = await fetchJSON(url);
                    if (data && data.Response === 'True') cachedOMDb[imdbId] = data;
                    return data;
                }
            }
        };

        // ─── VOICE SEARCH ───
        function initVoiceSearch() {
            const voiceBtn = document.getElementById('voiceSearchBtn');
            const searchInput = document.getElementById('globalSearch');
            if (!voiceBtn) return;
            if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
                voiceBtn.style.opacity = '0.4';
                voiceBtn.title = 'Voice search not supported';
                return;
            }
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognition = new SpeechRecognition();
            recognition.lang = 'en-US';
            recognition.interimResults = true;
            recognition.continuous = false;
            recognition.maxAlternatives = 1;
            recognition.onstart = function () {
                isListening = true;
                voiceBtn.classList.add('listening');
                voiceBtn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
                toast('🎤 Listening… speak clearly');
            };
            recognition.onerror = function (event) {
                isListening = false;
                voiceBtn.classList.remove('listening');
                voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
                if (event.error !== 'aborted' && event.error !== 'no-speech') {
                    toast('🎤 Voice error: ' + event.error, 'error');
                }
            };
            recognition.onend = function () {
                isListening = false;
                voiceBtn.classList.remove('listening');
                voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
            };
            recognition.onresult = function (event) {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
                }
                if (finalTranscript) {
                    searchInput.value = finalTranscript.trim();
                    toast(`🔍 Searching: "${finalTranscript.trim()}"`);
                    searchInput.dispatchEvent(new Event('input'));
                    if (recognition) recognition.stop();
                }
            };
            voiceBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                if (isListening) { if (recognition) recognition.stop(); return; }
                try { recognition.start(); } catch (err) { toast('Voice search already starting...'); }
            });
        }

        // ─── AUTH ───
        function loginUser(email) {
            currentUser = usersDB.find(u => u.email === email);
            if (!currentUser) return false;
            document.getElementById('loginPanel').style.display = 'none';
            document.getElementById('appDashboard').style.display = 'block';
            document.getElementById('avatarDisplay').textContent = currentUser.name ? currentUser.name[0].toUpperCase() : 'U';
            document.getElementById('dropdownUserName').textContent = currentUser.name || 'User';
            document.getElementById('dropdownUserEmail').textContent = currentUser.email || '';
            loadUserData();
            renderAll();
            toast(`Welcome back, ${currentUser.name || 'User'}!`, 'success');
            return true;
        }

        function loadUserData() {
            if (!currentUser) return;
            const wl = localStorage.getItem(`wl_${currentUser.email}`);
            watchlist = wl ? JSON.parse(wl) : [];
            const rv = localStorage.getItem(`rv_${currentUser.email}`);
            recentlyViewed = rv ? JSON.parse(rv) : [];
            movieReviews = JSON.parse(localStorage.getItem('cineverse_reviews')) || {};
        }

        function saveUserData() {
            if (!currentUser) return;
            localStorage.setItem(`wl_${currentUser.email}`, JSON.stringify(watchlist));
            localStorage.setItem(`rv_${currentUser.email}`, JSON.stringify(recentlyViewed));
            localStorage.setItem('cineverse_reviews', JSON.stringify(movieReviews));
            localStorage.setItem('cineverse_users', JSON.stringify(usersDB));
        }

        // ─── NAVIGATION ───
        function navigateTo(page, params) {
            document.getElementById('homePage').style.display = 'none';
            document.getElementById('browsePage').classList.remove('active');
            document.getElementById('watchlistPage').classList.remove('active');
            document.getElementById('movieDetailPage').classList.remove('active');
            document.getElementById('profilePage').classList.remove('active');
            document.getElementById('comparePage').classList.remove('active');
            document.querySelectorAll('#navLinksContainer button').forEach(b => {
                b.classList.toggle('active', b.dataset.page === page);
            });
            currentPage = page;
            if (page === 'home') {
                document.getElementById('homePage').style.display = 'block';
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else if (page === 'browse') {
                document.getElementById('browsePage').classList.add('active');
                loadBrowse();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else if (page === 'watchlist') {
                document.getElementById('watchlistPage').classList.add('active');
                renderWatchlistPage();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else if (page === 'detail') {
                document.getElementById('movieDetailPage').classList.add('active');
                if (params && params.id) loadMovieDetail(params.id, params.type || 'movie');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else if (page === 'profile') {
                document.getElementById('profilePage').classList.add('active');
                renderProfilePage();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else if (page === 'compare') {
                document.getElementById('comparePage').classList.add('active');
                renderCompareSelected();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
            closeVideoPlayer();
        }

        // ─── MOVIE CARD BUILDER ───
        function createEnhancedMovieCard(movie, onClick, showRemove = false, onRemove = null) {
            const card = document.createElement('div');
            card.className = 'movie-card';
            const poster = movie.poster_path ? getPoster(movie.poster_path) : (movie.poster || IMG_NA);
            const title = movie.title || movie.name || 'Untitled';
            const year = getYear(movie.release_date || movie.first_air_date) || movie.year || '';
            const rating = movie.vote_average || 0;
            card.innerHTML = `
                <div class="poster-wrap">
                    <img src="${poster}" loading="lazy" alt="${title}" onerror="this.src='${IMG_NA}';this.classList.add('fallback')" />
                    <div class="poster-overlay"></div>
                    ${showRemove ? `<button class="remove-btn" title="Remove"><i class="fas fa-times"></i></button>` : ''}
                    <i class="fas fa-play-circle play-overlay"></i>
                </div>
                <div class="info">
                    <h4>${title}</h4>
                    <div class="sub"><span>${year || '—'}</span><span class="rating"><i class="fas fa-star"></i> ${rating ? rating.toFixed(1) : '—'}</span></div>
                </div>
            `;
            card.addEventListener('click', (e) => {
                if (e.target.closest('.remove-btn')) return;
                if (onClick) onClick(movie);
            });
            if (showRemove && onRemove) {
                const removeBtn = card.querySelector('.remove-btn');
                if (removeBtn) {
                    removeBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        onRemove(movie);
                    });
                }
            }
            return card;
        }

        // ─── RENDER ALL HOME SECTIONS ───
        async function renderAll() {
            await loadHero();
            await loadRow('trendingGrid', () => api.tmdb.trending(), 'Trending');
            await loadRow('topRatedGrid', () => api.tmdb.topRated(), 'Top Rated');
            await loadRow('newReleasesGrid', () => api.tmdb.nowPlaying(), 'New Releases');
            await loadRow('popularGrid', () => api.tmdb.popular(), 'Popular');
            renderWatchlistHome();
            renderRecentlyViewed();
        }

        async function loadRow(gridId, fetchFn, label) {
            const grid = document.getElementById(gridId);
            if (!grid) return;
            grid.innerHTML = `<div class="grid-loading"><i class="fas fa-spinner fa-spin"></i> Loading ${label}…</div>`;
            try {
                const data = await fetchFn();
                if (data && data.results && data.results.length > 0) {
                    grid.innerHTML = '';
                    const filtered = filterBlockedMovies(data.results);
                    const movies = filtered.slice(0, 15);
                    for (const m of movies) {
                        const card = createEnhancedMovieCard(m, () => navigateTo('detail', { id: m.id, type: 'movie' }));
                        grid.appendChild(card);
                    }
                    if (movies.length === 0) grid.innerHTML = `<div class="grid-empty">No ${label} available</div>`;
                } else {
                    grid.innerHTML = `<div class="grid-empty">No ${label} available</div>`;
                }
            } catch (e) {
                grid.innerHTML = `<div class="grid-empty">Failed to load ${label}</div>`;
            }
        }

        // ─── WATCHLIST HOME ───
        function renderWatchlistHome() {
            const grid = document.getElementById('watchlistGridHome');
            if (!grid) return;
            const items = filterBlockedMovies(watchlist);
            if (items.length === 0) {
                grid.innerHTML = `<div class="grid-empty"><i class="fas fa-bookmark" style="font-size:2rem;display:block;margin-bottom:8px;opacity:0.3;"></i> Your watchlist is empty</div>`;
                return;
            }
            grid.innerHTML = '';
            for (const item of items.slice(0, 15)) {
                const card = createEnhancedMovieCard(item,
                    () => { if (item.imdbId) openDetailByImdb(item.imdbId); },
                    true,
                    (movie) => {
                        showConfirmDialog('Remove from Watchlist', `Remove "${movie.title}" from your watchlist?`, () => {
                            const idx = watchlist.findIndex(w => w.imdbId === movie.imdbId);
                            if (idx > -1) {
                                watchlist.splice(idx, 1);
                                saveUserData();
                                renderWatchlistHome();
                                renderWatchlistPage();
                                toast('Removed from Watchlist', 'success');
                            }
                        });
                    }
                );
                grid.appendChild(card);
            }
        }

        // ─── RECENTLY VIEWED ───
        function renderRecentlyViewed() {
            const grid = document.getElementById('recentlyViewedGrid');
            if (!grid) return;
            const items = filterBlockedMovies(recentlyViewed);
            if (items.length === 0) {
                grid.innerHTML = `<div class="grid-empty"><i class="fas fa-clock" style="font-size:2rem;display:block;margin-bottom:8px;opacity:0.3;"></i> No viewing history available</div>`;
                return;
            }
            grid.innerHTML = '';
            for (const item of items.slice(0, 15)) {
                const card = createEnhancedMovieCard(item,
                    () => { if (item.imdbId) openDetailByImdb(item.imdbId); },
                    true,
                    (movie) => {
                        showConfirmDialog('Remove from History', `Remove "${movie.title}" from your viewing history?`, () => {
                            const idx = recentlyViewed.findIndex(r => r.imdbId === movie.imdbId);
                            if (idx > -1) {
                                recentlyViewed.splice(idx, 1);
                                saveUserData();
                                renderRecentlyViewed();
                                toast('Movie removed from history', 'success');
                            }
                        });
                    }
                );
                if (item.viewedAt) {
                    const timeEl = document.createElement('div');
                    timeEl.style.cssText = 'position:absolute;bottom:8px;left:8px;font-size:0.55rem;color:var(--text-muted);background:rgba(0,0,0,0.6);padding:2px 8px;border-radius:4px;z-index:3;backdrop-filter:blur(4px);';
                    const diff = Math.floor((Date.now() - new Date(item.viewedAt)) / 60000);
                    let label = 'Just now';
                    if (diff > 60) label = `${Math.floor(diff / 60)}h ago`;
                    else if (diff > 5) label = `${diff}m ago`;
                    timeEl.textContent = `⏱ ${label}`;
                    card.querySelector('.poster-wrap').appendChild(timeEl);
                }
                grid.appendChild(card);
            }
        }

        function addToRecentlyViewed(movie) {
            if (!movie || !movie.imdbId) return;
            const idx = recentlyViewed.findIndex(r => r.imdbId === movie.imdbId);
            if (idx > -1) recentlyViewed.splice(idx, 1);
            recentlyViewed.unshift({ ...movie, viewedAt: new Date().toISOString() });
            if (recentlyViewed.length > 20) recentlyViewed = recentlyViewed.slice(0, 20);
            saveUserData();
            renderRecentlyViewed();
        }

        function clearAllHistory() {
            if (recentlyViewed.length === 0) { toast('No history to clear', 'warning'); return; }
            showConfirmDialog('Clear All History', 'This will remove all movies from your viewing history.', () => {
                recentlyViewed = [];
                saveUserData();
                renderRecentlyViewed();
                toast('History Cleared', 'success');
            });
        }

        // ─── HERO ───
        async function loadHero() {
            const hero = document.getElementById('heroDynamic');
            try {
                const data = await api.tmdb.trending();
                if (data && data.results && data.results.length > 0) {
                    const filtered = filterBlockedMovies(data.results);
                    if (filtered.length === 0) {
                        hero.innerHTML = `<div class="content"><h1>Welcome to CINEVORA</h1><p>Explore every frame.</p></div>`;
                        return;
                    }
                    const m = filtered[0];
                    const backdrop = m.backdrop_path ? getBackdrop(m.backdrop_path) : '';
                    if (backdrop) {
                        hero.style.backgroundImage = `linear-gradient(105deg, var(--hero-overlay) 0%, rgba(0,0,0,0.25) 70%, transparent 100%), url('${backdrop}')`;
                        hero.style.backgroundSize = 'cover';
                        hero.style.backgroundPosition = 'center 30%';
                    }
                    document.getElementById('heroRating').textContent = (m.vote_average || 0).toFixed(1);
                    document.getElementById('heroYear').textContent = getYear(m.release_date) || '—';
                    document.getElementById('heroTitle').textContent = m.title || 'Untitled';
                    document.getElementById('heroTagline').textContent = m.tagline || '';
                    document.getElementById('heroOverview').textContent = m.overview || 'No description available.';
                    const watchBtn = document.getElementById('heroWatchBtn');
                    const detailsBtn = document.getElementById('heroDetailsBtn');
                    const movieData = {
                        imdbId: m.id,
                        title: m.title,
                        poster: m.poster_path ? getPoster(m.poster_path) : IMG_NA,
                        year: getYear(m.release_date),
                        vote_average: m.vote_average,
                        original_language: m.original_language,
                        runtime: m.runtime
                    };
                    watchBtn.onclick = function (e) {
                        e.stopPropagation();
                        navigateTo('detail', { id: m.id, type: 'movie' });
                        setTimeout(() => { startPlaybackFromMovie(movieData); }, 400);
                    };
                    detailsBtn.onclick = function () { navigateTo('detail', { id: m.id, type: 'movie' }); };
                }
            } catch (e) { console.error('Hero load error', e); }
        }

        // ─── LOAD MOVIE DETAIL ───
        async function loadMovieDetail(id, type = 'movie') {
            const container = document.getElementById('detailContent');
            container.innerHTML = `<div style="text-align:center;padding:60px 0;"><i class="fas fa-spinner fa-spin"></i> Loading…</div>`;
            try {
                const data = await api.tmdb.details(type, id);
                if (!data) { container.innerHTML = '<p style="text-align:center;padding:40px;">Failed to load details.</p>'; return; }
                if (isBlockedMovie(data.title || data.name)) {
                    container.innerHTML = '<p style="text-align:center;padding:40px;color:var(--text-muted);">This content has been filtered.</p>';
                    return;
                }
                addToRecentlyViewed({
                    imdbId: data.imdb_id || id,
                    title: data.title || data.name,
                    year: getYear(data.release_date),
                    poster: data.poster_path ? getPoster(data.poster_path) : IMG_NA,
                    vote_average: data.vote_average,
                    original_language: data.original_language,
                    runtime: data.runtime
                });
                const poster = data.poster_path ? getPoster(data.poster_path) : IMG_NA;
                const title = data.title || data.name || 'Untitled';
                const year = getYear(data.release_date || data.first_air_date);
                const runtime = formatRuntime(data.runtime);
                const genres = (data.genres || []).map(g => g.name);
                const overview = data.overview || 'No description available.';
                const tagline = data.tagline || '';
                const voteAvg = data.vote_average || 0;
                const imdbId = data.imdb_id;
                const langMap = {
                    'en': 'English', 'hi': 'Hindi', 'ta': 'Tamil', 'te': 'Telugu', 'ml': 'Malayalam',
                    'kn': 'Kannada', 'fr': 'French', 'es': 'Spanish', 'de': 'German', 'it': 'Italian', 'ja': 'Japanese',
                    'ko': 'Korean', 'zh': 'Chinese', 'ru': 'Russian'
                };
                const langCode = data.original_language || '';
                const language = langMap[langCode] || langCode.toUpperCase();
                const cast = (data.credits?.cast || []).slice(0, 8).map(c => c.name);
                const director = (data.credits?.crew || []).find(c => c.job === 'Director')?.name || '';
                let similar = [];
                if (data.recommendations && data.recommendations.results) {
                    similar = filterBlockedMovies(data.recommendations.results).slice(0, 6);
                }
                const inWatchlist = imdbId ? watchlist.some(w => w.imdbId === imdbId) : false;
                const reviewsKey = imdbId || `tmdb_${id}`;
                let html = `
                    <div class="detail-container">
                        <div class="poster-col"><img src="${poster}" alt="${title}" onerror="this.src='${IMG_NA}'" /></div>
                        <div class="info-col">
                            <div class="title-row"><h2>${title}</h2><span class="year">(${year || ''})</span></div>
                            <div class="meta-row">
                                <div class="rating-block"><span class="score">${voteAvg ? voteAvg.toFixed(1) : '—'}</span><span class="star">★</span><span class="label">Cinevora</span></div>
                                ${runtime ? `<span class="pill"><i class="far fa-clock"></i> ${runtime}</span>` : ''}
                                ${language ? `<span class="pill lang"><i class="fas fa-globe"></i> ${language}</span>` : ''}
                            </div>
                            <div class="genres">${genres.map(g => `<span class="genre-pill">${g}</span>`).join('')}</div>
                            ${tagline ? `<div class="tagline-text">${tagline}</div>` : ''}
                            <div class="storyline">${overview}</div>
                            <div class="crew-row">
                                ${director ? `<div><strong>Director:</strong> ${director}</div>` : ''}
                                ${cast.length ? `<div><strong>Cast:</strong> <span class="cast-list">${cast.map(c => `<span class="cast-item">${c}</span>`).join('')}</span></div>` : ''}
                            </div>
                            <div class="action-row">
                                <button class="btn-watchlist ${inWatchlist ? 'in-list' : ''}" data-imdb="${imdbId || ''}" data-title="${title}" data-year="${year}" data-poster="${poster}">
                                    <i class="fas ${inWatchlist ? 'fa-check' : 'fa-plus'}"></i> ${inWatchlist ? 'In Watchlist' : 'Watchlist'}
                                </button>
                                ${imdbId ? `<button class="btn-imdb" data-imdb="${imdbId}"><i class="fab fa-imdb"></i> IMDb</button>` : ''}
                                <button class="btn-play" data-id="${id}" data-title="${title}" data-poster="${poster}" data-year="${year}" data-rating="${voteAvg}" data-lang="${language}" data-runtime="${data.runtime}">
                                    <i class="fas fa-play play-text"></i><span class="spinner"></span> Play
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                const reviews = movieReviews[reviewsKey] || [];
                let reviewListHtml = '';
                if (reviews.length === 0) {
                    reviewListHtml = `<div class="review-empty"><i class="fas fa-comment-slash"></i> No reviews yet. Be the first to review!</div>`;
                } else {
                    reviewListHtml = reviews.map((r, idx) => `
                        <div class="review-item" data-review-index="${idx}">
                            <div class="review-header">
                                <span class="reviewer">${r.name || 'Anonymous'}</span>
                                <span class="review-stars">${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)}</span>
                                <span class="review-date">${r.date || 'just now'}</span>
                            </div>
                            <div class="review-body">${r.text || ''}</div>
                            <button class="delete-review-btn" data-review-index="${idx}" title="Delete review"><i class="fas fa-trash"></i></button>
                        </div>
                    `).join('');
                }
                html += `
                    <div class="reviews-section" data-reviews-key="${reviewsKey}">
                        <h3><i class="fas fa-comment-dots"></i> Reviews</h3>
                        <div class="review-form">
                            <div class="star-selector" data-selected="0">
                                ${[1, 2, 3, 4, 5].map(n => `<span class="star" data-val="${n}">★</span>`).join('')}
                            </div>
                            <textarea placeholder="Share your thoughts about this movie..." id="detailReviewTextarea"></textarea>
                            <div class="review-actions"><button id="detailSubmitReviewBtn">Submit Review</button></div>
                        </div>
                        <div class="review-list" id="detailReviewList">${reviewListHtml}</div>
                    </div>
                `;
                if (similar.length) {
                    html += `
                        <div class="similar-section">
                            <h4><i class="fas fa-film"></i> Similar Movies</h4>
                            <div class="similar-grid">
                                ${similar.map(s => `
                                    <div class="sim-card" data-id="${s.id}">
                                        <img src="${s.poster_path ? getPoster(s.poster_path) : IMG_NA}" alt="${s.title}" onerror="this.src='${IMG_NA}'" />
                                        <div class="sim-info">
                                            <div class="sim-title">${s.title || 'Untitled'}</div>
                                            <div class="sim-year">${getYear(s.release_date)}</div>
                                            <div class="sim-rating"><i class="fas fa-star"></i> ${(s.vote_average || 0).toFixed(1)}</div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                }
                container.innerHTML = html;

                // Events
                container.querySelector('.btn-watchlist')?.addEventListener('click', function () {
                    const imdb = this.dataset.imdb;
                    const title = this.dataset.title;
                    const year = this.dataset.year;
                    const poster = this.dataset.poster;
                    if (!imdb) { toast('No IMDb ID', 'error'); return; }
                    const idx = watchlist.findIndex(w => w.imdbId === imdb);
                    if (idx > -1) {
                        watchlist.splice(idx, 1);
                        this.classList.remove('in-list');
                        this.innerHTML = '<i class="fas fa-plus"></i> Watchlist';
                        toast('Removed from Watchlist', 'success');
                    } else {
                        watchlist.push({
                            imdbId: imdb, title, year, poster, vote_average: 0, original_language: 'en',
                            runtime: 0
                        });
                        this.classList.add('in-list');
                        this.innerHTML = '<i class="fas fa-check"></i> In Watchlist';
                        toast('Added to Watchlist', 'success');
                    }
                    saveUserData();
                    renderWatchlistHome();
                    renderWatchlistPage();
                });
                container.querySelector('.btn-imdb')?.addEventListener('click', function () {
                    const imdb = this.dataset.imdb;
                    if (imdb) window.open(`https://www.imdb.com/title/${imdb}/`, '_blank');
                });
                container.querySelector('.btn-play')?.addEventListener('click', function () {
                    const movieId = this.dataset.id;
                    if (!movieId) { toast('No movie ID available', 'error'); return; }
                    const movieData = {
                        imdbId: movieId,
                        title: this.dataset.title,
                        poster: this.dataset.poster || IMG_NA,
                        year: this.dataset.year || '',
                        vote_average: parseFloat(this.dataset.rating) || 0,
                        original_language: this.dataset.lang || 'en',
                        runtime: parseInt(this.dataset.runtime) || 0
                    };
                    startPlaybackFromMovie(movieData);
                });
                container.querySelectorAll('.sim-card').forEach(card => {
                    card.addEventListener('click', function () {
                        const sid = this.dataset.id;
                        if (sid) navigateTo('detail', { id: sid, type: 'movie' });
                    });
                });

                // Reviews
                const starContainer = container.querySelector('.star-selector');
                if (starContainer) {
                    const stars = starContainer.querySelectorAll('.star');
                    let selectedStars = 0;
                    stars.forEach(star => {
                        star.addEventListener('click', function () {
                            const val = parseInt(this.dataset.val);
                            selectedStars = val;
                            stars.forEach(s => s.classList.toggle('active', parseInt(s.dataset.val) <= val));
                        });
                    });
                    container.querySelector('#detailSubmitReviewBtn')?.addEventListener('click', function () {
                        const textarea = document.getElementById('detailReviewTextarea');
                        const text = textarea.value.trim();
                        if (!text) { toast('Please write a review', 'warning'); return; }
                        if (selectedStars === 0) { toast('Please rate the movie (1–5 stars)', 'warning'); return; }
                        const key = reviewsKey;
                        if (!movieReviews[key]) movieReviews[key] = [];
                        movieReviews[key].push({
                            name: currentUser?.name || 'Anonymous',
                            email: currentUser?.email || '',
                            stars: selectedStars,
                            text: text,
                            date: new Date().toLocaleDateString()
                        });
                        localStorage.setItem('cineverse_reviews', JSON.stringify(movieReviews));
                        renderReviews(key);
                        textarea.value = '';
                        selectedStars = 0;
                        stars.forEach(s => s.classList.remove('active'));
                        toast('✅ Review submitted!', 'success');
                    });
                }
                container.querySelectorAll('.delete-review-btn').forEach(btn => {
                    btn.addEventListener('click', function (e) {
                        e.stopPropagation();
                        const idx = parseInt(this.dataset.reviewIndex);
                        const key = reviewsKey;
                        if (!movieReviews[key] || idx >= movieReviews[key].length) return;
                        const review = movieReviews[key][idx];
                        if (currentUser && review.name !== currentUser.name && review.email !== currentUser
                            .email) {
                            toast('You can only delete your own reviews', 'warning');
                            return;
                        }
                        showConfirmDialog('Delete Review', 'Are you sure you want to delete this review?', () => {
                            movieReviews[key].splice(idx, 1);
                            if (movieReviews[key].length === 0) delete movieReviews[key];
                            localStorage.setItem('cineverse_reviews', JSON.stringify(movieReviews));
                            renderReviews(key);
                            toast('🗑️ Review deleted', 'success');
                        });
                    });
                });
            } catch (e) {
                console.error(e);
                container.innerHTML = '<p style="text-align:center;padding:40px;">Error loading details.</p>';
            }
        }

        function renderReviews(key) {
            const listContainer = document.getElementById('detailReviewList');
            if (!listContainer) return;
            const reviews = movieReviews[key] || [];
            if (reviews.length === 0) {
                listContainer.innerHTML =
                    `<div class="review-empty"><i class="fas fa-comment-slash"></i> No reviews yet. Be the first to review!</div>`;
                return;
            }
            listContainer.innerHTML = reviews.map((r, idx) => `
                <div class="review-item" data-review-index="${idx}">
                    <div class="review-header">
                        <span class="reviewer">${r.name || 'Anonymous'}</span>
                        <span class="review-stars">${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)}</span>
                        <span class="review-date">${r.date || 'just now'}</span>
                    </div>
                    <div class="review-body">${r.text || ''}</div>
                    <button class="delete-review-btn" data-review-index="${idx}" title="Delete review"><i class="fas fa-trash"></i></button>
                </div>
            `).join('');
            listContainer.querySelectorAll('.delete-review-btn').forEach(btn => {
                btn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    const idx = parseInt(this.dataset.reviewIndex);
                    if (!movieReviews[key] || idx >= movieReviews[key].length) return;
                    const review = movieReviews[key][idx];
                    if (currentUser && review.name !== currentUser.name && review.email !== currentUser
                        .email) {
                        toast('You can only delete your own reviews', 'warning');
                        return;
                    }
                    showConfirmDialog('Delete Review', 'Are you sure you want to delete this review?', () => {
                        movieReviews[key].splice(idx, 1);
                        if (movieReviews[key].length === 0) delete movieReviews[key];
                        localStorage.setItem('cineverse_reviews', JSON.stringify(movieReviews));
                        renderReviews(key);
                        toast('🗑️ Review deleted', 'success');
                    });
                });
            });
        }

        // ─── PLAYBACK ENGINE ───
        function startPlaybackFromMovie(movie) {
            if (!movie || !movie.imdbId) { toast('No playable source found', 'error'); return; }
            addToRecentlyViewed(movie);
            const serverIndex = parseInt(playerServerSelect?.value || '0');
            const streamUrl = STREAM_SOURCES[serverIndex].url(movie.imdbId);
            openVideoPlayer(streamUrl, movie);
        }

        // ─── VIDEO PLAYER — No controls, only Servers dropdown ───
        function initPlayerElements() {
            playerModal = document.getElementById('videoPlayerModal');
            playerIframe = document.getElementById('playerIframe');
            playerLoading = document.getElementById('playerLoading');
            playerError = document.getElementById('playerError');
            playerCloseBtn = document.getElementById('playerModalClose');
            playerTitleEl = document.getElementById('playerModalTitle');
            playerServerSelect = document.getElementById('playerServerSelect');
            playerFullscreenBtn = document.getElementById('playerFullscreenBtn');
            playerStatusDot = document.getElementById('statusDot');
            playerStatusText = document.getElementById('statusText');
        }

        function openVideoPlayer(source, movieData) {
            if (!playerModal) initPlayerElements();
            if (!playerModal) return;
            currentMovieData = movieData;
            currentServerIndex = parseInt(playerServerSelect?.value || '0');
            playerError.classList.remove('active');
            playerLoading.classList.remove('hidden');
            playerTitleEl.textContent = movieData?.title || 'Now Playing';
            playerIframe.src = 'about:blank';
            playerIframe.style.display = 'block';
            playerIframe.src = source;
            setStatus('loading', 'Loading...');
            playerIframe.onload = function () {
                playerLoading.classList.add('hidden');
                setStatus('online', 'Online');
                toast(`Connected to ${STREAM_SOURCES[currentServerIndex].name}`, 'success');
            };
            playerIframe.onerror = function () {
                playerLoading.classList.add('hidden');
                setStatus('offline', 'Offline');
                showPlayerError();
            };
            clearTimeout(window._iframeTimeout);
            window._iframeTimeout = setTimeout(() => {
                if (!playerError.classList.contains('active') && !playerLoading.classList.contains('hidden')) {
                    playerLoading.classList.add('hidden');
                    setStatus('offline', 'Timeout');
                    showPlayerError();
                }
            }, 15000);
            playerModal.classList.add('active');
            document.body.style.overflow = 'hidden';
            setupPlayerControls();
        }

        function setStatus(type, text) {
            if (playerStatusDot) {
                playerStatusDot.className = 'dot ' + type;
            }
            if (playerStatusText) {
                playerStatusText.textContent = text;
            }
        }

        function showPlayerError() {
            playerError.classList.add('active');
            setStatus('offline', 'Offline');
        }

        function setupPlayerControls() {
            // Server switching
            if (playerServerSelect) {
                playerServerSelect.onchange = function () {
                    const idx = parseInt(this.value);
                    currentServerIndex = idx;
                    if (currentMovieData?.imdbId) {
                        const newUrl = STREAM_SOURCES[idx].url(currentMovieData.imdbId);
                        playerLoading.classList.remove('hidden');
                        playerError.classList.remove('active');
                        setStatus('loading', 'Switching...');
                        playerIframe.src = 'about:blank';
                        playerIframe.src = newUrl;
                        playerIframe.onload = function () {
                            playerLoading.classList.add('hidden');
                            setStatus('online', 'Online');
                            toast(`Switched to ${STREAM_SOURCES[idx].name}`, 'success');
                        };
                        playerIframe.onerror = function () {
                            playerLoading.classList.add('hidden');
                            setStatus('offline', 'Offline');
                            showPlayerError();
                        };
                    }
                };
            }

            // Fullscreen
            if (playerFullscreenBtn) {
                playerFullscreenBtn.onclick = function () {
                    const container = document.querySelector('.video-player-modal .player-container');
                    if (!container) return;
                    if (document.fullscreenElement) {
                        document.exitFullscreen();
                    } else {
                        container.requestFullscreen().catch(() => { });
                    }
                };
            }

            // Close
            if (playerCloseBtn) {
                playerCloseBtn.onclick = closeVideoPlayer;
            }

            // Click backdrop to close
            if (playerModal) {
                playerModal.addEventListener('click', function (e) {
                    if (e.target === this) closeVideoPlayer();
                });
            }

            // Keyboard: Escape to close
            document.addEventListener('keydown', function (e) {
                if (e.key === 'Escape' && playerModal?.classList.contains('active')) {
                    closeVideoPlayer();
                }
            });
        }

        function closeVideoPlayer() {
            if (playerModal) {
                playerModal.classList.remove('active');
                document.body.style.overflow = '';
            }
            if (playerIframe) {
                playerIframe.src = 'about:blank';
            }
            playerError.classList.remove('active');
            playerLoading.classList.add('hidden');
            clearTimeout(window._iframeTimeout);
        }

        // ─── BROWSE ───
        async function loadBrowse() {
            const grid = document.getElementById('browseGrid');
            const searchInput = document.getElementById('globalSearch');
            const query = searchInput.value.trim();
            grid.innerHTML = `<div class="grid-loading"><i class="fas fa-spinner fa-spin"></i> Loading movies…</div>`;
            try {
                let data;
                const params = { sort_by: sortBy, 'vote_count.gte': 100, page: 1 };
                if (selectedLanguage !== 'all') params.with_original_language = selectedLanguage;
                if (query) {
                    const searchParams = { query };
                    if (selectedLanguage !== 'all') searchParams.with_original_language = selectedLanguage;
                    data = await api.tmdb.search(query, searchParams);
                } else {
                    if (selectedGenre !== 'all') params.with_genres = selectedGenre;
                    data = await api.tmdb.discover(params);
                }
                if (data && data.results && data.results.length > 0) {
                    const filtered = filterBlockedMovies(data.results);
                    browseMovies = filtered;
                    filteredBrowseMovies = [...filtered];
                    renderBrowseGrid();
                    const subtitle = document.getElementById('browseSubtitle');
                    if (query) {
                        subtitle.textContent = `Showing ${filtered.length} results for "${query}"`;
                    } else {
                        let filterDesc = [];
                        if (selectedLanguage !== 'all') filterDesc.push(selectedLanguage.toUpperCase());
                        if (selectedGenre !== 'all') {
                            const genreMap = {
                                28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
                                18: 'Drama', 14: 'Fantasy', 27: 'Horror', 878: 'Sci-Fi', 53: 'Thriller'
                            };
                            filterDesc.push(genreMap[selectedGenre] || selectedGenre);
                        }
                        subtitle.textContent = filterDesc.length > 0 ?
                            `Showing ${filtered.length} movies • ${filterDesc.join(' • ')}` :
                            'Discover your next favorite film';
                    }
                } else {
                    grid.innerHTML = `<div class="grid-empty"><i class="fas fa-search"></i> No movies found${query ? ` for "${query}"` : ''}</div>`;
                }
            } catch (e) {
                console.error(e);
                grid.innerHTML = `<div class="grid-empty">Failed to load movies.</div>`;
            }
        }

        function renderBrowseGrid() {
            const grid = document.getElementById('browseGrid');
            const filtered = filterBlockedMovies(filteredBrowseMovies);
            if (filtered.length === 0) {
                grid.innerHTML = `<div class="grid-empty"><i class="fas fa-search"></i> No movies match your filters</div>`;
                return;
            }
            grid.innerHTML = '';
            for (const m of filtered) {
                const card = createEnhancedMovieCard(m, () => navigateTo('detail', { id: m.id, type: 'movie' }));
                grid.appendChild(card);
            }
        }

        // ─── WATCHLIST PAGE ───
        function renderWatchlistPage() {
            const grid = document.getElementById('watchlistGrid');
            const filtered = filterBlockedMovies(watchlist);
            if (filtered.length === 0) {
                grid.innerHTML =
                    `<div class="grid-empty"><i class="fas fa-heart" style="font-size:2.5rem;display:block;margin-bottom:12px;opacity:0.4;"></i> No movies added to Watchlist.</div>`;
                return;
            }
            grid.innerHTML = '';
            for (const item of filtered) {
                const card = createEnhancedMovieCard(item,
                    () => { if (item.imdbId) openDetailByImdb(item.imdbId); },
                    true,
                    (movie) => {
                        showConfirmDialog('Remove from Watchlist', `Remove "${movie.title}" from your watchlist?`, () => {
                            const idx = watchlist.findIndex(w => w.imdbId === movie.imdbId);
                            if (idx > -1) {
                                watchlist.splice(idx, 1);
                                saveUserData();
                                renderWatchlistHome();
                                renderWatchlistPage();
                                toast('Removed from Watchlist', 'success');
                            }
                        });
                    }
                );
                grid.appendChild(card);
            }
        }

        // ─── PROFILE PAGE ───
        function renderProfilePage() {
            const container = document.getElementById('profileContent');
            if (!currentUser) {
                container.innerHTML =
                    `<div class="empty-state"><i class="fas fa-user-slash"></i> Please log in to view your profile.</div>`;
                return;
            }
            let userReviewCount = 0;
            let userReviews = [];
            for (const [key, reviews] of Object.entries(movieReviews)) {
                for (const r of reviews) {
                    if (r.name === currentUser.name || r.email === currentUser.email) {
                        const exists = userReviews.some(ur => ur.text === r.text && ur.movieKey === key);
                        if (!exists) {
                            userReviews.push({ ...r, movieKey: key });
                            userReviewCount++;
                        }
                    }
                }
            }
            const watchlistCount = watchlist.length;
            const historyCount = recentlyViewed.length;
            const avatarLetter = currentUser.name ? currentUser.name[0].toUpperCase() : 'U';
            let html = `
                <div class="profile-header">
                    <div class="profile-avatar">${avatarLetter}</div>
                    <div class="profile-info">
                        <div class="name-row"><h2>${currentUser.name || 'User'}</h2><span class="edit-icon" id="profileEditIcon" title="Edit profile"><i class="fas fa-pen"></i></span></div>
                        <div class="profile-email">${currentUser.email || ''}</div>
                        <div class="profile-meta">
                            <span class="meta-item"><i class="fas fa-heart"></i> <span class="count">${watchlistCount}</span> Watchlist</span>
                            <span class="meta-item"><i class="fas fa-clock"></i> <span class="count">${historyCount}</span> History</span>
                            <span class="meta-item"><i class="fas fa-star"></i> <span class="count">${userReviewCount}</span> Reviews</span>
                        </div>
                    </div>
                </div>
                <div class="profile-tabs">
                    <button class="tab-btn active" data-tab="watchlist"><i class="fas fa-heart"></i> Watchlist <span class="badge">${watchlistCount}</span></button>
                    <button class="tab-btn" data-tab="history"><i class="fas fa-clock"></i> History <span class="badge">${historyCount}</span></button>
                    <button class="tab-btn" data-tab="reviews"><i class="fas fa-star"></i> Reviews <span class="badge">${userReviewCount}</span></button>
                </div>
                <div class="tab-content active" id="tab-watchlist">
                    ${watchlistCount === 0 ? `<div class="empty-state"><i class="fas fa-heart"></i> No movies added to Watchlist.</div>` : `
                        <div class="profile-grid">${watchlist.map(item => `
                            <div class="profile-card" data-imdb="${item.imdbId}">
                                <img src="${item.poster || IMG_NA}" alt="${item.title}" onerror="this.src='${IMG_NA}'" />
                                <div class="card-info">
                                    <h4>${item.title || 'Untitled'}</h4>
                                    <div class="sub"><span>${item.year || ''}</span><span class="rating"><i class="fas fa-star"></i> <span style="color:var(--text-secondary);">—</span></span></div>
                                </div>
                                <button class="remove-btn" data-imdb="${item.imdbId}" title="Remove from watchlist"><i class="fas fa-times"></i></button>
                            </div>
                        `).join('')}</div>
                    `}
                </div>
                <div class="tab-content" id="tab-history">
                    ${historyCount === 0 ? `<div class="empty-state"><i class="fas fa-clock"></i> No viewing history available.</div>` : `
                        <div class="profile-grid">${recentlyViewed.map(item => `
                            <div class="profile-card" data-imdb="${item.imdbId}">
                                <img src="${item.poster || IMG_NA}" alt="${item.title}" onerror="this.src='${IMG_NA}'" />
                                <div class="card-info">
                                    <h4>${item.title || 'Untitled'}</h4>
                                    <div class="sub"><span>${item.year || ''}</span><span style="color:#a78bfa;font-size:0.65rem;"><i class="fas fa-clock"></i> ${item.viewedAt ? new Date(item.viewedAt).toLocaleDateString() : 'recently'}</span></div>
                                </div>
                                <button class="remove-btn" data-imdb="${item.imdbId}" title="Remove from history" style="background:rgba(108,92,231,0.85);"><i class="fas fa-times"></i></button>
                            </div>
                        `).join('')}</div>
                    `}
                </div>
                <div class="tab-content" id="tab-reviews">
                    ${userReviewCount === 0 ? `<div class="empty-state"><i class="fas fa-star"></i> You haven't written any reviews yet.</div>` : `
                        <div class="review-list-full">${userReviews.map((r, idx) => `
                            <div class="review-item-full" data-idx="${idx}">
                                <div class="review-left">
                                    <div class="review-movie" data-key="${r.movieKey}">${r.movieKey ? r.movieKey.replace('tmdb_', 'Movie ') : 'Unknown'}</div>
                                    <div class="review-stars">${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)}</div>
                                    <div class="review-text">${r.text || ''}</div>
                                    <div class="review-date">${r.date || 'just now'}</div>
                                </div>
                                <div class="review-right">
                                    <button class="action-btn view-btn" data-key="${r.movieKey}"><i class="fas fa-external-link-alt"></i> View</button>
                                    <button class="action-btn delete-btn" data-idx="${idx}" data-key="${r.movieKey}"><i class="fas fa-trash"></i> Delete</button>
                                </div>
                            </div>
                        `).join('')}</div>
                    `}
                </div>
            `;
            container.innerHTML = html;

            // Tabs
            container.querySelectorAll('.tab-btn').forEach(btn => {
                btn.addEventListener('click', function () {
                    container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                    this.classList.add('active');
                    const tabName = this.dataset.tab;
                    container.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
                    const target = document.getElementById(`tab-${tabName}`);
                    if (target) target.classList.add('active');
                });
            });

            // Remove from watchlist
            container.querySelectorAll('.profile-card .remove-btn').forEach(btn => {
                btn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    const imdb = this.dataset.imdb;
                    if (!imdb) return;
                    const card = this.closest('.profile-card');
                    const title = card?.querySelector('.card-info h4')?.textContent || 'Movie';
                    showConfirmDialog('Remove from Watchlist', `Remove "${title}" from your watchlist?`, () => {
                        const idx = watchlist.findIndex(w => w.imdbId === imdb);
                        if (idx > -1) {
                            watchlist.splice(idx, 1);
                            saveUserData();
                            renderWatchlistHome();
                            renderWatchlistPage();
                            renderProfilePage();
                            toast('Removed from Watchlist', 'success');
                        }
                    });
                });
            });

            // Remove from history
            container.querySelectorAll('#tab-history .profile-card .remove-btn').forEach(btn => {
                btn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    const imdb = this.dataset.imdb;
                    if (!imdb) return;
                    const card = this.closest('.profile-card');
                    const title = card?.querySelector('.card-info h4')?.textContent || 'Movie';
                    showConfirmDialog('Remove from History', `Remove "${title}" from your viewing history?`, () => {
                        const idx = recentlyViewed.findIndex(r => r.imdbId === imdb);
                        if (idx > -1) {
                            recentlyViewed.splice(idx, 1);
                            saveUserData();
                            renderRecentlyViewed();
                            renderProfilePage();
                            toast('Movie removed from history', 'success');
                        }
                    });
                });
            });

            // Click profile card
            container.querySelectorAll('.profile-card').forEach(card => {
                card.addEventListener('click', function (e) {
                    if (e.target.closest('.remove-btn')) return;
                    const imdb = this.dataset.imdb;
                    if (imdb) openDetailByImdb(imdb);
                });
            });

            // View review
            container.querySelectorAll('.view-btn').forEach(btn => {
                btn.addEventListener('click', function () {
                    const key = this.dataset.key;
                    if (!key) return;
                    if (key.startsWith('tmdb_')) {
                        const parts = key.split('_');
                        const id = parts[1];
                        if (id) {
                            api.tmdb.details('movie', id).then(data => {
                                if (data && data.imdb_id) openDetailByImdb(data.imdb_id);
                                else toast('Movie not found', 'error');
                            }).catch(() => toast('Error loading movie', 'error'));
                            return;
                        }
                    }
                    toast('Cannot open this movie directly', 'warning');
                });
            });

            // Delete review
            container.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', function () {
                    const key = this.dataset.key;
                    const idx = parseInt(this.dataset.idx);
                    if (!key || isNaN(idx)) return;
                    const reviews = movieReviews[key] || [];
                    if (idx >= reviews.length) return;
                    const review = reviews[idx];
                    if (currentUser && review.name !== currentUser.name && review.email !== currentUser
                        .email) {
                        toast('You can only delete your own reviews', 'warning');
                        return;
                    }
                    showConfirmDialog('Delete Review', 'Are you sure you want to delete this review?', () => {
                        movieReviews[key].splice(idx, 1);
                        if (movieReviews[key].length === 0) delete movieReviews[key];
                        localStorage.setItem('cineverse_reviews', JSON.stringify(movieReviews));
                        renderProfilePage();
                        toast('🗑️ Review deleted', 'success');
                    });
                });
            });

            // Edit profile
            document.getElementById('profileEditIcon')?.addEventListener('click', function () {
                document.getElementById('editName').value = currentUser.name || '';
                document.getElementById('editEmail').value = currentUser.email || '';
                document.getElementById('editProfileModal').classList.add('active');
            });
            document.getElementById('editCancelBtn')?.addEventListener('click', function () {
                document.getElementById('editProfileModal').classList.remove('active');
            });
            document.getElementById('editSaveBtn')?.addEventListener('click', function () {
                const newName = document.getElementById('editName').value.trim();
                const newEmail = document.getElementById('editEmail').value.trim();
                if (!newName || !newEmail) { toast('Please fill in all fields', 'warning'); return; }
                const emailExists = usersDB.some(u => u.email === newEmail && u.email !== currentUser.email);
                if (emailExists) { toast('Email already in use by another account', 'error'); return; }
                const userIdx = usersDB.findIndex(u => u.email === currentUser.email);
                if (userIdx > -1) {
                    const oldEmail = currentUser.email;
                    usersDB[userIdx].name = newName;
                    usersDB[userIdx].email = newEmail;
                    localStorage.setItem('cineverse_users', JSON.stringify(usersDB));
                    if (oldEmail !== newEmail) {
                        ['wl', 'rv'].forEach(k => {
                            const oldKey = `${k}_${oldEmail}`;
                            const newKey = `${k}_${newEmail}`;
                            const data = localStorage.getItem(oldKey);
                            if (data) {
                                localStorage.setItem(newKey, data);
                                localStorage.removeItem(oldKey);
                            }
                        });
                    }
                    currentUser = usersDB[userIdx];
                    document.getElementById('avatarDisplay').textContent = newName[0].toUpperCase();
                    document.getElementById('dropdownUserName').textContent = newName;
                    document.getElementById('dropdownUserEmail').textContent = newEmail;
                    loadUserData();
                    document.getElementById('editProfileModal').classList.remove('active');
                    renderProfilePage();
                    toast('✅ Profile updated successfully!', 'success');
                }
            });
            document.getElementById('editProfileModal')?.addEventListener('click', function (e) {
                if (e.target === this) this.classList.remove('active');
            });
        }

        // ─── CONFIRMATION ───
        let confirmCallback = null;

        function showConfirmDialog(title, message, onConfirm) {
            const dialog = document.getElementById('confirmDialog');
            document.getElementById('confirmTitle').textContent = title;
            document.getElementById('confirmMessage').textContent = message;
            confirmCallback = onConfirm;
            dialog.classList.add('active');
        }
        document.getElementById('confirmCancel')?.addEventListener('click', function () {
            document.getElementById('confirmDialog').classList.remove('active');
            confirmCallback = null;
        });
        document.getElementById('confirmRemove')?.addEventListener('click', function () {
            document.getElementById('confirmDialog').classList.remove('active');
            if (confirmCallback) {
                confirmCallback();
                confirmCallback = null;
            }
        });

        // ─── OPEN DETAIL BY IMDB ───
        async function openDetailByImdb(imdbId) {
            try {
                const res = await api.tmdb.findById(imdbId);
                if (res && res.movie_results && res.movie_results.length > 0) {
                    const m = res.movie_results[0];
                    if (isBlockedMovie(m.title || m.name)) { toast('This content is not available', 'error'); return; }
                    navigateTo('detail', { id: m.id, type: 'movie' });
                } else {
                    toast('Movie not found', 'error');
                }
            } catch (e) { toast('Error loading movie', 'error'); }
        }

        // ─── SEARCH ───
        function setupSearch() {
            const inp = document.getElementById('globalSearch');
            const sugg = document.getElementById('searchSuggest');
            if (!inp) return;
            inp.addEventListener('input', function () {
                const val = this.value.trim();
                if (val === '') {
                    sugg.style.display = 'none';
                    if (currentPage === 'browse') loadBrowse(); return;
                }
                const funcName = sanitizeQuery(val);
                if (!funcName) return;
                const callback = `imdb$${funcName}`;
                window[callback] = function (obj) {
                    sugg.style.display = 'none';
                    if (obj && obj.d && obj.d.length > 0) {
                        const results = obj.d.filter(r => r.id && r.id.slice(0, 2) !== 'nm' && !r.id.includes('/') && r
                            .qid !== 'musicvideo');
                        const filteredResults = results.filter(r => !isBlockedMovie(r.l));
                        if (filteredResults.length > 0) {
                            navigateTo('browse');
                            const grid = document.getElementById('browseGrid');
                            grid.innerHTML = '';
                            for (const r of filteredResults.slice(0, 12)) {
                                const card = createMovieCardFromImdb(r);
                                if (card) grid.appendChild(card);
                            }
                            document.getElementById('browseSubtitle').textContent =
                                `Showing ${filteredResults.length} results for "${val}"`;
                        } else { toast('No movie results found', 'warning'); }
                    } else { if (currentPage === 'browse') loadBrowse(); }
                    try { delete window[callback]; } catch (e) { }
                };
                try { delete window[lastSearchFunc]; } catch (e) { }
                lastSearchFunc = callback;
                document.querySelectorAll('.imdb-script').forEach(n => n.remove());
                const script = document.createElement('script');
                script.src = `https://sg.media-imdb.com/suggests/${funcName[0]}/${encodeURIComponent(funcName)}.json`;
                script.className = 'imdb-script';
                script.onerror = () => { toast('Search failed', 'error'); };
                document.head.appendChild(script);
                sugg.style.display = 'flex';
                sugg.innerHTML = `<div class="suggest-empty"><i class="fas fa-spinner fa-spin"></i> Searching…</div>`;
            });
            inp.addEventListener('focus', function () {
                if (this.value.trim() !== '') this.dispatchEvent(new Event(
                    'input'));
            });
            inp.addEventListener('blur', () => setTimeout(() => sugg.style.display = 'none', 200));
            document.addEventListener('keydown', function (e) {
                if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                    e.preventDefault();
                    inp.focus();
                    inp.select();
                    toast('🔍 Search focused');
                }
                if (e.key === 'Escape') {
                    inp.blur();
                    sugg.style.display = 'none';
                }
            });
        }

        function createMovieCardFromImdb(result) {
            const card = document.createElement('div');
            card.className = 'movie-card';
            const title = result.l || 'Untitled';
            const year = result.y || '';
            const rating = result.v || '—';
            const imgSrc = result.i ? `https://img.omdbapi.com/?i=${result.id}&apikey=${OMDb_KEY}` : IMG_NA;
            card.innerHTML = `
                <div class="poster-wrap">
                    <img class="poster" src="${imgSrc}" loading="lazy" alt="${title}" onerror="this.src='${IMG_NA}';this.classList.add('fallback')" />
                    <div class="poster-overlay"></div>
                    <i class="fas fa-play-circle play-overlay"></i>
                </div>
                <div class="info"><h4>${title}</h4><div class="sub"><span>${year}</span><span class="rating"><i class="fas fa-star"></i> ${rating}</span></div></div>
            `;
            card.addEventListener('click', () => { if (result.id) openDetailByImdb(result.id); });
            return card;
        }

        // ─── BROWSE FILTERS ───
        function setupBrowseFilters() {
            document.querySelectorAll('#genreFilters .filter-btn').forEach(btn => {
                btn.addEventListener('click', function () {
                    document.querySelectorAll('#genreFilters .filter-btn').forEach(b => b.classList.remove(
                        'active'));
                    this.classList.add('active');
                    selectedGenre = this.dataset.genre;
                    loadBrowse();
                });
            });
            document.getElementById('languageFilter').addEventListener('change', function () {
                selectedLanguage = this.value;
                loadBrowse();
            });
            document.getElementById('sortSelect').addEventListener('change', function () {
                sortBy = this.value;
                loadBrowse();
            });
        }

        // ─── PROFILE DROPDOWN ───
        function setupProfileDropdown() {
            const avatarWrap = document.getElementById('avatarWrap');
            const dropdown = document.getElementById('profileDropdown');
            if (!avatarWrap || !dropdown) return;
            avatarWrap.addEventListener('click', function (e) {
                e.stopPropagation();
                dropdown.classList.toggle('open');
            });
            document.addEventListener('click', function () { dropdown.classList.remove('open'); });
            document.querySelectorAll('.dropdown-item[data-action]').forEach(item => {
                item.addEventListener('click', function (e) {
                    e.stopPropagation();
                    const action = this.dataset.action;
                    if (action === 'profile') {
                        dropdown.classList.remove('open');
                        navigateTo('profile');
                    } else if (action === 'settings') {
                        dropdown.classList.remove('open');
                        toast('⚙️ Settings — coming soon');
                    }
                });
            });
        }

        // ─── THEME MODAL ───
        function setupThemeModal() {
            const modal = document.getElementById('themeModal');
            const closeBtn = document.getElementById('closeThemeModal');
            const paletteBtn = document.getElementById('themePaletteBtn');
            if (!modal || !paletteBtn) return;
            paletteBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                toggleThemeModal(true);
            });
            if (closeBtn) closeBtn.addEventListener('click', function () { toggleThemeModal(false); });
            modal.addEventListener('click', function (e) { if (e.target === this) toggleThemeModal(false); });
        }

        // ─── INIT ───
        function init() {
            loadTheme();
            renderThemeModal();
            setupThemeModal();
            initPlayerElements();

            document.getElementById('doLoginBtn').addEventListener('click', async () => {
                const email = document.getElementById('loginUser').value.trim();
                const pass = document.getElementById('loginPass').value;
                const errorMsgEl = document.getElementById('loginErrorMsg');
                if (errorMsgEl) errorMsgEl.textContent = '';
                
                try {
                    const res = await fetch('/api/auth/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password: pass })
                    });
                    const data = await res.json();
                    if (data.success && data.user) {
                        localStorage.setItem('cinevora_token', data.token);
                        let userInLocal = usersDB.find(u => u.email === data.user.email);
                        if (!userInLocal) {
                            userInLocal = { email: data.user.email, name: data.user.name, password: pass };
                            usersDB.push(userInLocal);
                            localStorage.setItem('cineverse_users', JSON.stringify(usersDB));
                        }
                        if (document.getElementById('remMe').checked) localStorage.setItem('remSession', data.user.email);
                        else localStorage.removeItem('remSession');
                        loginUser(data.user.email);
                        return;
                    }
                } catch (err) {
                    console.warn('Backend API login offline or failed, falling back to local storage:', err);
                }

                const user = usersDB.find(u => (u.email === email || u.mobile === email) && u.password === pass);
                if (user) {
                    if (document.getElementById('remMe').checked) localStorage.setItem('remSession', user.email);
                    else localStorage.removeItem('remSession');
                    loginUser(user.email);
                } else {
                    if (errorMsgEl) errorMsgEl.textContent = 'Invalid credentials';
                }
            });
            document.getElementById('googleMockBtn').addEventListener('click', () => {
                const g = usersDB.find(u => u.email === 'admin@cineverse.com');
                if (g) loginUser(g.email);
            });
            document.getElementById('openSignup').addEventListener('click', async () => {
                const em = prompt('Enter email:');
                if (!em) return;
                const pw = prompt('Enter password:');
                if (!pw) return;
                const name = prompt('Enter your name:') || 'User';

                try {
                    const res = await fetch('/api/auth/register', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: em, password: pw, name })
                    });
                    const data = await res.json();
                    if (!data.success) {
                        alert(data.message || 'Registration failed');
                        return;
                    }
                } catch (err) {
                    console.warn('Backend registration offline, saving locally');
                }

                if (!usersDB.some(u => u.email === em)) {
                    usersDB.push({ email: em, password: pw, name });
                    localStorage.setItem('cineverse_users', JSON.stringify(usersDB));
                }
                alert('Account created! Please login.');
            });
            document.getElementById('loginPass').addEventListener('keydown', (e) => {
                if (e.key === 'Enter') document.getElementById('doLoginBtn').click();
            });
            document.getElementById('loginUser').addEventListener('keydown', (e) => {
                if (e.key === 'Enter') document.getElementById('doLoginBtn').click();
            });
            document.getElementById('logoutAppBtn').addEventListener('click', () => {
                currentUser = null;
                localStorage.removeItem('remSession');
                document.getElementById('loginPanel').style.display = 'flex';
                document.getElementById('appDashboard').style.display = 'none';
                closeVideoPlayer();
                toast('Signed out');
            });
            document.querySelectorAll('#navLinksContainer button').forEach(btn => {
                btn.addEventListener('click', () => navigateTo(btn.dataset.page));
            });
            document.getElementById('clearHistoryBtn')?.addEventListener('click', clearAllHistory);
            document.getElementById('backToTopBtn')?.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
            document.getElementById('detailBackBtn')?.addEventListener('click', () => { navigateTo('home'); });
            document.getElementById('playerModalClose')?.addEventListener('click', closeVideoPlayer);
            document.getElementById('compareAddBtn')?.addEventListener('click', () => {
                const inp = document.getElementById('compareSearchInput');
                addMovieToCompare(inp?.value || '');
            });
            document.getElementById('compareSearchInput')?.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') addMovieToCompare(e.target.value);
            });
            document.getElementById('compareClearBtn')?.addEventListener('click', () => {
                compareMovies = [];
                renderCompareSelected();
                document.getElementById('compareResults')?.classList.remove('active');
                destroyCharts();
                toast('Comparison cleared', 'info');
            });
            document.getElementById('compareRunBtn')?.addEventListener('click', generateComparison);

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    if (document.getElementById('videoPlayerModal')?.classList.contains('active')) closeVideoPlayer();
                    if (document.getElementById('profileDropdown')?.classList.contains('open')) document.getElementById(
                        'profileDropdown').classList.remove('open');
                    if (document.getElementById('editProfileModal')?.classList.contains('active')) document
                        .getElementById('editProfileModal').classList.remove('active');
                    if (document.getElementById('themeModal')?.classList.contains('active')) document.getElementById(
                        'themeModal').classList.remove('active');
                    if (document.getElementById('confirmDialog')?.classList.contains('active')) document.getElementById(
                        'confirmDialog').classList.remove('active');
                }
            });

            initVoiceSearch();
            setupSearch();
            setupBrowseFilters();
            setupProfileDropdown();

            const rem = localStorage.getItem('remSession');
            if (rem) {
                const u = usersDB.find(usr => usr.email === rem);
                if (u) loginUser(u.email);
            }
            if (!currentUser) {
                document.getElementById('loginPanel').style.display = 'flex';
                document.getElementById('appDashboard').style.display = 'none';
            } else {
                document.getElementById('loginPanel').style.display = 'none';
                document.getElementById('appDashboard').style.display = 'block';
                loadUserData();
                renderAll();
            }
            console.log('🎬 CINEVORA — Player with Servers dropdown (10 sources), no controls.');
            console.log('🎨 32 Themes · 📺 No pop-ups, no new tabs — all inside the app.');
        }

        window.navigateTo = navigateTo;
        window.startPlaybackFromMovie = startPlaybackFromMovie;
        window.openVideoPlayer = openVideoPlayer;
        window.closeVideoPlayer = closeVideoPlayer;
        window.showConfirmDialog = showConfirmDialog;
        window.clearAllHistory = clearAllHistory;
        window.toast = toast;
        window.toggleThemeModal = toggleThemeModal;

        document.addEventListener('DOMContentLoaded', init);