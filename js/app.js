import { store } from './store.js';
import { fetchPlayerStats, fetchAllPlayers } from './api.js';
import { animateValue, FLIP } from './animations.js';
import { computeStats } from './stats.js';
import { pawnParticles } from './pawn-particles.js';

const app = {
    state: {
        currentView: 'leaderboard',
        currentMode: 'rapid',  // 'rapid' | 'blitz' | 'bullet'
        settings: store.getSettings(),
        players: store.getPlayers(),
        isSyncing: false,
        duelPlayerA: store.getDuelSelection().playerA,
        duelPlayerB: store.getDuelSelection().playerB,

    },
    
    init() {
        this.bindEvents();
        this.renderAll();
        // Set initial view
        this.switchView('leaderboard');
        this.updateModeToggleUI();
        this.setEditionDate();
    },

    setEditionDate() {
        const ed = document.getElementById('edition-date');
        if (ed) {
            ed.textContent = new Date()
                .toLocaleDateString([], { month: 'short', day: 'numeric' })
                .toUpperCase();
        }
    },

    bindEvents() {

        // Navigation Logic
        const navLinks = document.querySelectorAll('[data-view]');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const view = link.getAttribute('data-view');
                this.switchView(view);
            });
        });

        // Mode Toggle (Time Control Selector)
        const modeButtons = document.querySelectorAll('[data-mode]');
        modeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const mode = btn.getAttribute('data-mode');
                if (mode !== this.state.currentMode) {
                    this.state.currentMode = mode;
                    this.updateModeToggleUI();
                    this.renderAll();
                }
            });
        });

        // Leaderboard Search
        const inputSearch = document.getElementById('input-leaderboard-search');
        if (inputSearch) {
            inputSearch.addEventListener('input', (e) => {
                this.state.searchTerm = e.target.value.toLowerCase().trim();
                this.renderAll();
            });
        }

        // Add Player Modal
        const fabAddOpen = document.getElementById('fab-add-player');
        const modalAdd = document.getElementById('modal-add-player');
        const btnCloseModal = document.getElementById('btn-close-modal');
        const btnConfirmAdd = document.getElementById('btn-confirm-add');
        const inputUsername = document.getElementById('input-username');
        const addError = document.getElementById('add-error');
        
        const openModal = () => {
            modalAdd.classList.remove('hidden');
            setTimeout(() => modalAdd.classList.add('show'), 10);
            inputUsername.value = '';
            addError.classList.add('hidden');
            inputUsername.focus();
        };

        const closeModal = () => {
            modalAdd.classList.remove('show');
            setTimeout(() => modalAdd.classList.add('hidden'), 300);
        };


        if(fabAddOpen) fabAddOpen.addEventListener('click', openModal);
        if(btnCloseModal) btnCloseModal.addEventListener('click', closeModal);

        btnConfirmAdd.addEventListener('click', async () => {
            const username = inputUsername.value.trim();
            if(!username) return;
            
            // UI Loading logic
            const spinner = document.getElementById('add-spinner');
            const text = document.getElementById('add-text');
            addError.classList.add('hidden');
            spinner.classList.remove('hidden');
            text.textContent = 'Verifying...';
            btnConfirmAdd.disabled = true;

            const stats = await fetchPlayerStats(username);
            
            if (stats && (stats.chess_rapid || stats.chess_blitz || stats.chess_bullet)) {
                const added = store.addPlayer(stats.name || username, stats);
                if (added) {
                    this.state.players = store.getPlayers();
                    this.renderAll();
                    closeModal();
                } else {
                    addError.textContent = 'Player already tracked.';
                    addError.classList.remove('hidden');
                }
            } else {
                addError.textContent = 'Player not found or no rated stats available.';
                addError.classList.remove('hidden');
            }

            spinner.classList.add('hidden');
            text.textContent = 'Add to ledger';
            btnConfirmAdd.disabled = false;
        });

        // Sync Button
        const btnSync = document.getElementById('btn-sync');
        if(btnSync) {
            btnSync.addEventListener('click', () => this.syncData());
        }

        // Settings Buttons
        const miaSlider = document.getElementById('mia-slider');
        const miaVal = document.getElementById('mia-threshold-val');
        if(miaSlider) {
            miaSlider.addEventListener('input', (e) => {
                const val = e.target.value;
                miaVal.textContent = val;
                this.state.settings.miaThresholdDays = parseInt(val, 10);
                store.saveSettings(this.state.settings);
                this.renderAll(); // Re-render to show MIA changes instantly
            });
        }

        const btnExport = document.getElementById('btn-export');
        if(btnExport) btnExport.addEventListener('click', () => store.exportData());

        const fileImport = document.getElementById('file-import');
        if(fileImport) fileImport.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if(!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                if (store.importData(event.target.result)) {
                    this.state.players = store.getPlayers();
                    this.state.settings = store.getSettings();
                    this.renderAll();
                    alert("Import successful");
                } else {
                    alert("Import failed: Invalid JSON");
                }
            };
            reader.readAsText(file);
        });

        const btnClear = document.getElementById('btn-clear');
        if(btnClear) btnClear.addEventListener('click', () => {
            if(confirm("Are you sure you want to delete all tracked players and history?")) {
                store.clearAll();
                this.state.players = {};
                this.renderAll();
            }
        });
    },

    updateModeToggleUI() {
        const mode = this.state.currentMode;
        // Update all toggle buttons (desktop + mobile instances)
        document.querySelectorAll('[data-mode]').forEach(btn => {
            const isActive = btn.getAttribute('data-mode') === mode;
            btn.classList.toggle('mode-active', isActive);
            btn.classList.toggle('mode-inactive', !isActive);
            btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });

        // Update the mode badge text
        const badges = document.querySelectorAll('.mode-badge-text');
        const labels = { rapid: 'Rapid', blitz: 'Blitz', bullet: 'Bullet' };
        badges.forEach(b => b.textContent = labels[mode] || 'Rapid');
    },

    /**
     * Flatten multi-mode player data into the shape the renderers expect,
     * based on the currently selected time-control mode.
     */
    getModePlayers() {
        const mode = this.state.currentMode;
        const raw = this.state.players;
        const flattened = {};

        for (const [key, player] of Object.entries(raw)) {
            const bucket = player[mode];
            if (!bucket) continue;

            flattened[key] = {
                originalUsername: player.originalUsername,
                rating: bucket.rating ?? 0,
                peakRating: bucket.peakRating ?? 0,
                wins: bucket.wins ?? 0,
                losses: bucket.losses ?? 0,
                draws: bucket.draws ?? 0,
                lastActiveDate: bucket.lastActiveDate ?? (Date.now() / 1000),
                history: bucket.history ?? []
            };
        }

        return flattened;
    },

    switchView(viewId) {
        this.state.currentView = viewId;
        
        // Hide all views
        document.querySelectorAll('.view').forEach(v => {
            v.classList.remove('active');
            // Wait for transition, then hide
            setTimeout(() => { if (!v.classList.contains('active')) v.classList.add('hidden'); }, 300);
        });
        
        // Show target view
        const targetView = document.getElementById(`view-${viewId}`);
        if(targetView) {
            targetView.classList.remove('hidden');
            // Small delay to allow display:block to apply before opacity transition
            setTimeout(() => targetView.classList.add('active'), 10);
        }

        // Update nav active states
        document.querySelectorAll('.nav-btn, .nav-btn-top, .nav-btn-mobile').forEach(btn => {
            const isActive = btn.getAttribute('data-view') === viewId;
            if (btn.classList.contains('nav-btn-mobile')) {
                btn.classList.toggle('active-mobile', isActive);
            } else {
                btn.classList.toggle('active', isActive);
            }
        });
        
        // Hide FAB on non-leaderboard pages
        const fab = document.getElementById('fab-add-player');
        if(fab) {
            if(viewId === 'leaderboard') {
                fab.classList.remove('hidden');
            } else {
                fab.classList.add('hidden');
            }
        }
        
        // Re-trigger animations if needed
        if(viewId === 'duel') {
            this.renderDuelSelectors();
            this.renderDuel();
        }
        if(viewId === 'stats') {
            this.renderStats();
            pawnParticles.start();
        } else {
            pawnParticles.stop();
        }
    },

    async syncData() {
        if(this.state.isSyncing) return;
        this.state.isSyncing = true;
        
        const syncText = document.getElementById('sync-status-text');
        const syncIcon = document.getElementById('sync-status-indicator');
        if(syncText) syncText.textContent = "Syncing...";
        if(syncIcon) syncIcon.classList.replace('bg-primary', 'bg-secondary');


        // Grab usernames
        const usernames = Object.values(this.state.players).map(p => p.originalUsername);
        
        const results = await fetchAllPlayers(usernames);
        
        // Capture old ratings for the current mode (for animations)
        const mode = this.state.currentMode;
        const oldRatings = {};
        usernames.forEach(u => {
             const key = u.toLowerCase();
             const bucket = this.state.players[key]?.[mode];
             oldRatings[key] = bucket ? bucket.rating : 0;
        });

        // Update store
        store.updatePlayers(results);
        this.state.players = store.getPlayers();
        this.state.settings = store.getSettings();
        
        // Play animations for rank changes
        const flip = new FLIP('#leaderboard-grid');
        flip.read();
        
        this.renderAll();
        
        flip.play();

        // Animate numbers for changed ratings (current mode only)
        const modePlayers = this.getModePlayers();
        usernames.forEach(u => {
            const key = u.toLowerCase();
            const oldRating = oldRatings[key];
            const newRating = modePlayers[key]?.rating ?? 0;
            if(oldRating !== newRating) {
                const el = document.getElementById(`rating-val-${key}`);
                if(el) animateValue(el, oldRating, newRating, 1000);
            }
        });



        if(syncText) syncText.textContent = "Sync: 100%";
        if(syncIcon) syncIcon.classList.replace('bg-secondary', 'bg-primary');
        this.state.isSyncing = false;

        // If duel view is active, re-render duel with fresh data
        if (this.state.currentView === 'duel') {
            this.renderDuel();
        }
    },



    isMIA(lastActiveUnix) {
        const thresholdSeconds = this.state.settings.miaThresholdDays * 24 * 60 * 60;
        const nowUnix = Date.now() / 1000;
        return (nowUnix - lastActiveUnix) > thresholdSeconds;
    },

    getSortedPlayers() {
        const modePlayers = this.getModePlayers();
        let players = Object.values(modePlayers).sort((a, b) => b.rating - a.rating);
        
        // Filter out unrated players (rating = 0)
        players = players.filter(p => p.rating > 0);

        if (this.state.searchTerm) {
            players = players.filter(p => p.originalUsername.toLowerCase().includes(this.state.searchTerm));
        }
        return players;
    },

    getColorAccent(index) {
        // Rotates through some branded tailwind colors for initals and charts
        const colors = [
            { bg: 'bg-secondary', text: 'text-on-secondary', border: 'border-secondary', stroke: 'stroke-secondary' },
            { bg: 'bg-tertiary', text: 'text-on-tertiary', border: 'border-tertiary', stroke: 'stroke-tertiary' },
            { bg: 'bg-primary-fixed-dim', text: 'text-on-primary-fixed-variant', border: 'border-primary', stroke: 'stroke-primary' },
            { bg: 'bg-error', text: 'text-on-error', border: 'border-error', stroke: 'stroke-error' },
            { bg: 'bg-secondary-container', text: 'text-on-secondary-container', border: 'border-secondary-container', stroke: 'stroke-secondary-container' }
        ];
        return colors[index % colors.length];
    },

    generateSparklineSVG(history, config) {
        if (!history || history.length < 2) {
             return `<svg role="img" aria-label="Flat rating history sparkline" class="w-full h-full ${config.stroke} fill-none stroke-[2]" viewBox="0 0 100 30"><path d="M0,15 L100,15" stroke-linecap="round"></path></svg>`;
        }
        
        // Take up to last 10 points for sparkline
        const points = history.slice(-10);
        const maxR = Math.max(...points.map(p => p.rating));
        const minR = Math.min(...points.map(p => p.rating));
        const range = maxR - minR || 1; // avoid division by zero
        
        const pathData = points.map((p, i) => {
            const x = (i / (points.length - 1)) * 100;
            // invert y so higher rating is top (lower y)
            const y = 30 - (((p.rating - minR) / range) * 20 + 5); 
            return `${i===0?'M':'L'}${x},${y}`;
        }).join(" ");

        return `
            <svg role="img" aria-label="Rating history sparkline" class="w-full h-full ${config.stroke} fill-none stroke-[2]" viewBox="0 0 100 30">
                <title>Rating history sparkline showing last 10 rating updates</title>
                <path d="${pathData}" stroke-linecap="round" stroke-linejoin="round" class="sparkline-path" style="stroke-dasharray: 200; stroke-dashoffset: 200; animation: drawSpark 1s ease-out forwards;"></path>
            </svg>
        `;
    },

    renderAll() {
        this.renderLeaderboard();
        if(this.state.currentView === 'duel') {
            this.renderDuelSelectors();
            this.renderDuel();
        }
        if(this.state.currentView === 'stats') this.renderStats();
        this.renderSettings();
    },

    renderLeaderboard() {
        const grid = document.getElementById('leaderboard-grid');
        const count = document.getElementById('leaderboard-count');
        if(!grid) return;

        const players = this.getSortedPlayers();
        count.textContent = `${players.length} player${players.length === 1 ? '' : 's'} on the books · sorted by rating`;

        if (players.length === 0) {
             grid.innerHTML = `
                <div class="glass-card rounded-lg px-8 py-16 text-center">
                    <span class="material-symbols-outlined text-5xl text-outline">menu_book</span>
                    <p class="font-display text-2xl text-on-background mt-3">The book is empty</p>
                    <p class="text-on-surface-variant mt-1">Add a Chess.com player to open the standings.</p>
                </div>`;
             return;
         }

        // Assign rank numbers based on rating order first
        const playersWithRank = players.map((p, index) => ({
            ...p,
            rank: index + 1,
            isMia: this.isMIA(p.lastActiveDate)
        }));

        // Re-sort: active players first, MIA players at bottom (rank numbers unchanged)
        playersWithRank.sort((a, b) => {
            if (a.isMia === b.isMia) return a.rank - b.rank;
            return a.isMia ? 1 : -1;
        });

        let html = '';
        playersWithRank.forEach((p, displayIndex) => {
            const isMia = p.isMia;
            const rank = p.rank.toString().padStart(2, '0');
            const initials = p.originalUsername.substring(0, 2).toUpperCase();
            const config = this.getColorAccent(p.rank - 1);
            
            // Calculate rating change and games played since last update
            let ratingChange = 0;
            let gamesPlayed = 0;
            if (p.history && p.history.length > 1) {
                 ratingChange = p.rating - p.history[p.history.length - 2].rating;
                 const prevTotal = p.history[p.history.length - 2].total;
                 const currTotal = p.history[p.history.length - 1].total;
                 if (prevTotal != null && currTotal != null) {
                     gamesPlayed = Math.max(0, currTotal - prevTotal);
                 }
            }
            const gamesLabel = gamesPlayed > 0 ? `${gamesPlayed} game${gamesPlayed === 1 ? '' : 's'}` : null;

            const changeText = isMia ? '0.0' : (ratingChange === 0 ? '0.0' : (ratingChange > 0 ? `+${ratingChange}` : ratingChange));
            const changeColor = ratingChange > 0 ? 'text-primary' : (ratingChange < 0 ? 'text-error' : 'text-on-surface-variant');
            const changeIcon = ratingChange > 0 ? 'trending_up' : (ratingChange < 0 ? 'trending_down' : 'remove');
            const uname = p.originalUsername.toLowerCase();
            const profile = `https://www.chess.com/member/${p.originalUsername}`;

            if (isMia) {
                // Flag fell — struck from the active standings
                const daysAgo = Math.floor(((Date.now()/1000) - p.lastActiveDate) / 86400);
                html += `
                    <div id="row-${uname}" class="leaderboard-row lb-row--mia group">
                        <div class="lb-rank">
                            <span class="lb-rank-num">${rank}</span>
                            <span class="lb-rank-label">Board</span>
                        </div>
                        <div class="lb-id">
                            <div class="lb-avatar bg-surface-container-high text-outline">${initials}</div>
                            <div class="lb-meta">
                                <h3 class="lb-name">
                                    <a href="${profile}" target="_blank" rel="noopener">${p.originalUsername}</a>
                                    <span class="lb-flag"><span class="material-symbols-outlined">flag</span>MIA</span>
                                </h3>
                                <span class="lb-sub">Flag fell · last seen ${daysAgo}d ago</span>
                            </div>
                        </div>
                        <div class="lb-spark hidden lg:block">
                            <svg class="w-full h-full stroke-outline fill-none stroke-[1]" viewBox="0 0 100 30"><path d="M0,15 L100,15" stroke-linecap="round" stroke-dasharray="3 3"></path></svg>
                        </div>
                        <div class="lb-score">
                            <div id="rating-val-${uname}" class="lb-rating">${p.rating}</div>
                            <div class="lb-delta text-outline"><span class="material-symbols-outlined">remove</span>0.0</div>
                        </div>
                    </div>`;
            } else {
                // Active board
                const isTopRanked = p.rank === 1;
                html += `
                    <div id="row-${uname}" class="leaderboard-row ${isTopRanked ? 'lb-row--top' : ''} group">
                        <div class="lb-rank">
                            <span class="lb-rank-num">${rank}</span>
                            <span class="lb-rank-label">Board</span>
                        </div>
                        <div class="lb-id">
                            <div class="lb-avatar ${config.bg} ${config.text}">${initials}</div>
                            <div class="lb-meta">
                                <h3 class="lb-name">
                                    <a href="${profile}" target="_blank" rel="noopener">${p.originalUsername}</a>
                                    ${isTopRanked ? '<span class="lb-stamp">Top board</span>' : ''}
                                </h3>
                                <span class="lb-sub">Peak ${p.peakRating ?? 0}</span>
                            </div>
                        </div>
                        <div class="lb-spark hidden lg:block">
                            ${this.generateSparklineSVG(p.history, config)}
                        </div>
                        <div class="lb-score">
                            <div id="rating-val-${uname}" class="lb-rating">${p.rating}</div>
                            <div class="lb-delta ${changeColor}">
                                <span class="material-symbols-outlined">${changeIcon}</span>${changeText}
                            </div>
                            ${gamesLabel ? `<span class="lb-games">${gamesLabel}</span>` : ''}
                        </div>
                    </div>`;
            }
        });

        grid.innerHTML = html;
    },

    // ─────────────────────────────────────────────
    // Duel Page
    // ─────────────────────────────────────────────

    /**
     * Populate both <select> dropdowns with current tracked players.
     * Restores saved selections if players still exist.
     */
    renderDuelSelectors() {
        const selectA = document.getElementById('duel-select-a');
        const selectB = document.getElementById('duel-select-b');
        if (!selectA || !selectB) return;

        const players = Object.values(this.getModePlayers())
            .sort((a, b) => b.rating - a.rating);

        // Build options HTML
        const optionsHtml = players.map(p =>
            `<option value="${p.originalUsername.toLowerCase()}">${p.originalUsername} (${p.rating})</option>`
        ).join('');

        const blank = '<option value="">-- Select Player --</option>';
        selectA.innerHTML = blank + optionsHtml;
        selectB.innerHTML = blank + optionsHtml;

        // Restore saved selections (if player still tracked)
        const keys = players.map(p => p.originalUsername.toLowerCase());
        if (this.state.duelPlayerA && keys.includes(this.state.duelPlayerA)) {
            selectA.value = this.state.duelPlayerA;
        }
        if (this.state.duelPlayerB && keys.includes(this.state.duelPlayerB)) {
            selectB.value = this.state.duelPlayerB;
        }

        // Bind change events (safe: remove old listeners by replacing elements)
        const newSelectA = selectA.cloneNode(true);
        const newSelectB = selectB.cloneNode(true);
        selectA.parentNode.replaceChild(newSelectA, selectA);
        selectB.parentNode.replaceChild(newSelectB, selectB);

        // Restore values after clone
        if (this.state.duelPlayerA && keys.includes(this.state.duelPlayerA)) {
            newSelectA.value = this.state.duelPlayerA;
        }
        if (this.state.duelPlayerB && keys.includes(this.state.duelPlayerB)) {
            newSelectB.value = this.state.duelPlayerB;
        }

        newSelectA.addEventListener('change', (e) => {
            this.state.duelPlayerA = e.target.value || null;
            store.saveDuelSelection(this.state.duelPlayerA, this.state.duelPlayerB);
            this.renderDuel();
        });
        newSelectB.addEventListener('change', (e) => {
            this.state.duelPlayerB = e.target.value || null;
            store.saveDuelSelection(this.state.duelPlayerA, this.state.duelPlayerB);
            this.renderDuel();
        });
    },

    /**
     * Render the duel stats grid for the two selected players.
     */
    renderDuel() {
        const grid = document.getElementById('duel-stats-grid');
        if (!grid) return;

        const keyA = this.state.duelPlayerA;
        const keyB = this.state.duelPlayerB;
        const modePlayers = this.getModePlayers();

        // Empty / incomplete selection states
        if (!keyA && !keyB) {
            grid.innerHTML = `
                <div class="duel-empty">
                    <span class="material-symbols-outlined">swords</span>
                    <p class="text-sm font-bold text-on-surface-variant">Select two players above to begin the duel</p>
                </div>`;
            return;
        }
        if (!keyA || !keyB) {
            grid.innerHTML = `
                <div class="duel-empty">
                    <span class="material-symbols-outlined">person_search</span>
                    <p class="text-sm font-bold text-on-surface-variant">Select the ${!keyA ? 'first' : 'second'} player to continue</p>
                </div>`;
            return;
        }
        if (keyA === keyB) {
            grid.innerHTML = `
                <div class="duel-empty">
                    <span class="material-symbols-outlined">warning</span>
                    <p class="text-sm font-bold text-on-surface-variant">Pick two different players</p>
                </div>`;
            return;
        }

        const pA = modePlayers[keyA];
        const pB = modePlayers[keyB];

        if (!pA || !pB) {
            grid.innerHTML = `
                <div class="duel-empty">
                    <span class="material-symbols-outlined">error_outline</span>
                    <p class="text-sm font-bold text-on-surface-variant">One or both players have no data in this mode</p>
                </div>`;
            return;
        }

        const statsA = this.buildDuelStats(pA);
        const statsB = this.buildDuelStats(pB);
        const configA = this.getColorAccent(0);
        const configB = this.getColorAccent(1);

        // Player header cards
        const initA = pA.originalUsername.substring(0, 2).toUpperCase();
        const initB = pB.originalUsername.substring(0, 2).toUpperCase();
        const miaA  = this.isMIA(pA.lastActiveDate);
        const miaB  = this.isMIA(pB.lastActiveDate);

        const playerHeaderA = `
            <div class="duel-player-card">
                <div class="w-16 h-16 rounded-xl flex items-center justify-center font-black text-2xl shadow-lg ${configA.bg} ${configA.text}">${initA}</div>
                <a href="https://www.chess.com/member/${pA.originalUsername}" target="_blank"
                   class="font-headline text-lg font-bold text-on-background hover:text-primary transition-colors">
                    ${pA.originalUsername}
                </a>
                <span class="font-headline text-3xl font-black text-primary text-glow">${pA.rating}</span>
                ${miaA ? '<span class="text-[10px] bg-outline-variant/20 text-outline px-2 py-0.5 rounded border border-outline-variant/30 uppercase font-black">MIA</span>' : ''}
            </div>`;

        const playerHeaderB = `
            <div class="duel-player-card">
                <div class="w-16 h-16 rounded-xl flex items-center justify-center font-black text-2xl shadow-lg ${configB.bg} ${configB.text}">${initB}</div>
                <a href="https://www.chess.com/member/${pB.originalUsername}" target="_blank"
                   class="font-headline text-lg font-bold text-on-background hover:text-primary transition-colors">
                    ${pB.originalUsername}
                </a>
                <span class="font-headline text-3xl font-black text-secondary">${pB.rating}</span>
                ${miaB ? '<span class="text-[10px] bg-outline-variant/20 text-outline px-2 py-0.5 rounded border border-outline-variant/30 uppercase font-black">MIA</span>' : ''}
            </div>`;

        // Build stat rows
        let rowsHtml = '';
        let currentSection = null;

        statsA.forEach((statA, i) => {
            const statB = statsB[i];

            // Section header
            if (statA.section !== currentSection) {
                currentSection = statA.section;
                const sectionMeta = {
                    rating:   { icon: 'analytics',    label: 'Rating',        color: 'text-primary' },
                    record:   { icon: 'sports_mma',   label: 'Record',         color: 'text-secondary' },
                    history:  { icon: 'show_chart',   label: 'Performance',    color: 'text-tertiary' },
                    milestone:{ icon: 'flag',          label: 'Next Milestone', color: 'text-tertiary' },
                }[currentSection] || { icon: 'info', label: currentSection, color: 'text-on-surface-variant' };

                rowsHtml += `
                    <div class="duel-section-header">
                        <span class="material-symbols-outlined ${sectionMeta.color}" style="font-variation-settings: 'FILL' 1;">${sectionMeta.icon}</span>
                        <h4>${sectionMeta.label}</h4>
                    </div>`;
            }

            // Determine winner
            const winner = this.getDuelWinner(statA, statB);
            const aWins = winner === 'A';
            const bWins = winner === 'B';
            const crownA = aWins ? '<span class="material-symbols-outlined text-sm" style="font-variation-settings: \'FILL\' 1;">star</span>' : '';
            const crownB = bWins ? '<span class="material-symbols-outlined text-sm" style="font-variation-settings: \'FILL\' 1;">star</span>' : '';

            rowsHtml += `
                <div class="duel-row">
                    <div class="duel-val-a ${aWins ? 'winner' : ''}">
                        ${crownA}
                        <span>${statA.display}</span>
                    </div>
                    <div class="duel-row-label">${statA.label}</div>
                    <div class="duel-val-b ${bWins ? 'winner' : ''}">
                        <span>${statB.display}</span>
                        ${crownB}
                    </div>
                </div>`;
        });

        grid.innerHTML = `
            <!-- Player Headers -->
            <div class="grid grid-cols-3 gap-4 mb-6 items-stretch">
                ${playerHeaderA}
                <div class="flex items-center justify-center">
                    <div class="flex flex-col items-center gap-2">
                        <span class="material-symbols-outlined text-tertiary text-4xl" style="font-variation-settings: 'FILL' 1;">swords</span>
                        <span class="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">VS</span>
                    </div>
                </div>
                ${playerHeaderB}
            </div>
            <!-- Stat Rows -->
            <div class="space-y-1.5">${rowsHtml}</div>`;
    },

    /**
     * Compute all displayable duel stats for a single mode-flattened player.
     */
    buildDuelStats(p) {
        const wins   = p.wins   ?? 0;
        const losses = p.losses ?? 0;
        const draws  = p.draws  ?? 0;
        const total  = wins + losses + draws;
        const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) + '%' : 'N/A';
        const winRateRaw = total > 0 ? wins / total : 0;

        // Rating change since last update
        let lastChange = 0;
        if (p.history && p.history.length > 1) {
            lastChange = p.rating - p.history[p.history.length - 2].rating;
        }

        // Weekly Elo change (7-day window)
        const weeklyChange = this.computeWeeklyDelta(p);

        // Peak distance
        const peakDist = (p.peakRating ?? 0) - p.rating;

        // Longest gain streak
        let maxStreak = 0, curStreak = 0;
        if (p.history && p.history.length > 1) {
            for (let i = 1; i < p.history.length; i++) {
                const delta = p.history[i].rating - p.history[i - 1].rating;
                if (delta >= 0) { curStreak++; if (curStreak > maxStreak) maxStreak = curStreak; }
                else curStreak = 0;
            }
        }

        // Next milestone
        const nextMs = Math.ceil(p.rating / 100) * 100;
        const msTarget = nextMs === p.rating ? p.rating + 100 : nextMs;
        const msDist = msTarget - p.rating;

        const fmt = (n, prefix = '') => {
            if (n === null || n === undefined) return 'N/A';
            const sign = n > 0 ? '+' : '';
            return prefix ? prefix + n : sign + n;
        };

        return [
            // Rating section
            { section: 'rating',    label: 'Current Rating',   display: String(p.rating),                 rawValue: p.rating,           higherIsBetter: true },
            { section: 'rating',    label: 'Peak Rating',      display: String(p.peakRating ?? 0),         rawValue: p.peakRating ?? 0,  higherIsBetter: true },
            { section: 'rating',    label: 'Dist. from Peak',  display: peakDist === 0 ? 'At Peak!' : '-' + peakDist, rawValue: peakDist, higherIsBetter: false },
            // Record section
            { section: 'record',    label: 'Wins',             display: wins.toLocaleString(),            rawValue: wins,               higherIsBetter: true },
            { section: 'record',    label: 'Losses',           display: losses.toLocaleString(),          rawValue: losses,             higherIsBetter: false },
            { section: 'record',    label: 'Draws',            display: draws.toLocaleString(),           rawValue: draws,              higherIsBetter: null },
            { section: 'record',    label: 'Total Games',      display: total.toLocaleString(),           rawValue: total,              higherIsBetter: true },
            { section: 'record',    label: 'Win Rate',         display: winRate,                          rawValue: winRateRaw,         higherIsBetter: true },
            // Performance section
            { section: 'history',   label: 'Last Change Δ',    display: fmt(lastChange),                  rawValue: lastChange,         higherIsBetter: true },
            { section: 'history',   label: 'Weekly Elo Δ',     display: weeklyChange !== null ? fmt(weeklyChange) : 'N/A', rawValue: weeklyChange, higherIsBetter: true },
            { section: 'history',   label: 'Gain Streak',      display: maxStreak + ' gains',             rawValue: maxStreak,          higherIsBetter: true },
            // Milestone section
            { section: 'milestone', label: 'Next Milestone',   display: `${msDist} pts → ${msTarget}`,   rawValue: msDist,             higherIsBetter: false },
        ];
    },

    /**
     * Compute the rolling 7-day Elo delta for a single player.
     */
    computeWeeklyDelta(p) {
        if (!p.history || p.history.length < 2) return null;
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const pointsInWindow = p.history.filter(h => h.date >= sevenDaysAgo);
        if (pointsInWindow.length >= 2) {
            return pointsInWindow[pointsInWindow.length - 1].rating - pointsInWindow[0].rating;
        }
        const beforeWindow = p.history.filter(h => h.date < sevenDaysAgo);
        if (beforeWindow.length > 0) {
            return p.rating - beforeWindow[beforeWindow.length - 1].rating;
        }
        return null;
    },

    /**
     * Determine which player wins a stat row.
     * Returns 'A', 'B', or 'tie'.
     */
    getDuelWinner(statA, statB) {
        if (statA.higherIsBetter === null) return 'tie'; // neutral stat (draws)
        if (statA.rawValue === null || statB.rawValue === null || statA.rawValue === undefined || statB.rawValue === undefined) return 'tie';
        if (statA.rawValue === statB.rawValue) return 'tie';
        if (statA.higherIsBetter) {
            return statA.rawValue > statB.rawValue ? 'A' : 'B';
        } else {
            return statA.rawValue < statB.rawValue ? 'A' : 'B';
        }
    },

    renderSettings() {
        document.getElementById('mia-slider').value = this.state.settings.miaThresholdDays;
        document.getElementById('mia-threshold-val').textContent = this.state.settings.miaThresholdDays;
        
        if (this.state.settings.lastSync) {
            const date = new Date(this.state.settings.lastSync);
            document.getElementById('settings-last-sync').textContent = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) + " UTC";
        }

        const players = this.getSortedPlayers();
        const activeCount = players.filter(p => !this.isMIA(p.lastActiveDate)).length;
        document.getElementById('settings-player-count').textContent = players.length;
        document.getElementById('settings-active-count').textContent = activeCount;
    },

    renderStats() {
        const modePlayers = this.getModePlayers();
        const stats = computeStats(modePlayers, this.state.settings.miaThresholdDays);
        const playerCount = Object.keys(modePlayers).length;

        // Hint when history is too thin for the column to say much
        const notice = document.getElementById('stats-data-notice');
        if (notice) {
            const avgHistory = playerCount > 0
                ? Object.values(modePlayers).reduce((s, p) => s + (p.history?.length || 0), 0) / playerCount
                : 0;
            notice.classList.toggle('hidden', avgHistory >= 3);
        }

        this.setDispatchDate();
        this.renderDispatch(stats, playerCount);
        this.renderMovers(stats.weeklyElo);
        this.renderWatch(stats);
    },

    setDispatchDate() {
        const el = document.getElementById('dispatch-date');
        if (el) {
            el.textContent = new Date()
                .toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
                .toUpperCase();
        }
    },

    // —— Small inline helpers for the prose dispatch ——
    escHtml(str) {
        return String(str).replace(/[&<>"']/g, c => (
            { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
        ));
    },
    dName(n) { return `<span class="dispatch-name">${this.escHtml(n)}</span>`; },
    dUp(v)   { return `<span class="d-up">${this.escHtml(v)}</span>`; },
    dDown(v) { return `<span class="d-down">${this.escHtml(v)}</span>`; },

    /**
     * Writes the week up as a short column from the computed stats.
     * Returns an array of paragraph HTML strings; the first always opens
     * with plain text so the CSS drop cap lands on a real letter.
     */
    composeDispatch(stats) {
        const paras = [];
        const wk = stats.weeklyElo;
        const vol = stats.volatility;
        const tilt = stats.tiltTracker;
        const comeback = stats.comebackKid;
        const milestone = stats.milestoneWatch;
        const grinder = stats.grinder;

        // Paragraph 1 — the week's swings
        const p1 = [];
        const topGain = wk.gainers[0];
        const topDrop = wk.losers[0];
        if (topGain && topDrop) {
            p1.push(`The week belonged to ${this.dName(topGain.name)}, up ${this.dUp('+' + topGain.change)} on the board, while ${this.dName(topDrop.name)} slid the other way at ${this.dDown(topDrop.change)}.`);
        } else if (topGain) {
            p1.push(`The week ran hottest for ${this.dName(topGain.name)}, up ${this.dUp('+' + topGain.change)}.`);
        } else if (topDrop) {
            p1.push(`A quiet week up top, but ${this.dName(topDrop.name)} felt it most, down ${this.dDown(topDrop.change)}.`);
        }
        if (comeback.best && tilt.worst) {
            p1.push(`Off the canvas, ${this.dName(comeback.best.name)} clawed back ${this.dUp('+' + comeback.best.recovery)} from a low, while ${this.dName(tilt.worst.name)} took the cruelest single session — ${this.dDown(tilt.worst.drop)} in one sitting.`);
        } else if (comeback.best) {
            p1.push(`Off the canvas, ${this.dName(comeback.best.name)} clawed back ${this.dUp('+' + comeback.best.recovery)} from a low.`);
        } else if (tilt.worst) {
            p1.push(`The hardest fall went to ${this.dName(tilt.worst.name)} — ${this.dDown(tilt.worst.drop)} in one sitting.`);
        }
        if (p1.length) paras.push(p1.join(' '));

        // Paragraph 2 — temperament and ambition
        const p2 = [];
        if (vol.wildest && vol.flattest && vol.all.length > 1) {
            p2.push(`For temperament, ${this.dName(vol.wildest.name)} rode the wildest line (σ ${vol.wildest.stdDev}) while ${this.dName(vol.flattest.name)} held steadiest of all (σ ${vol.flattest.stdDev}).`);
        } else if (vol.wildest) {
            p2.push(`For temperament, ${this.dName(vol.wildest.name)} kept the most volatile form (σ ${vol.wildest.stdDev}).`);
        }
        if (milestone.closest) {
            p2.push(`Closest to a milestone sits ${this.dName(milestone.closest.name)}, just ${milestone.closest.distance} from ${milestone.closest.target}.`);
        }
        if (grinder.top) {
            p2.push(`And ${this.dName(grinder.top.name)} keeps grinding — ${grinder.top.total.toLocaleString()} games and counting.`);
        }
        if (p2.length) paras.push(p2.join(' '));

        return paras;
    },

    renderDispatch(stats, playerCount) {
        const body = document.getElementById('form-dispatch-body');
        if (!body) return;

        if (playerCount === 0) {
            body.innerHTML = `<p>The book is blank. Track a few players and run a sync to see the week take shape.</p>`;
            return;
        }

        const paras = this.composeDispatch(stats);
        if (paras.length === 0) {
            body.innerHTML = `<p>Not enough history yet to call the week. Keep syncing and the form will fill in.</p>`;
            return;
        }
        body.innerHTML = paras.map(p => `<p>${p}</p>`).join('');
    },

    // One ledger row: name · dot leader · value (+ optional caption)
    formRow(name, val, valClass = '', sub = '') {
        const subHtml = sub ? `<span class="form-row-sub">${this.escHtml(sub)}</span>` : '';
        return `<div class="form-row">`
            + `<span class="form-row-name">${this.escHtml(name)}</span>`
            + `<span class="form-row-lead" aria-hidden="true"></span>`
            + `<span class="form-row-val ${valClass}">${this.escHtml(val)}</span>`
            + subHtml
            + `</div>`;
    },

    renderMovers(weeklyElo) {
        const el = document.getElementById('dept-movers');
        if (!el) return;

        const gainers = weeklyElo.gainers.slice(0, 4);
        const losers = weeklyElo.losers.slice(0, 4);

        if (gainers.length === 0 && losers.length === 0) {
            el.innerHTML = `<p class="form-dept-empty">No swings logged in the last seven days.</p>`;
            return;
        }

        let html = '';
        if (gainers.length) {
            html += `<div class="form-subhead">Gaining</div>`;
            html += gainers.map(g => this.formRow(g.name, '+' + g.change, 'is-up')).join('');
        }
        if (losers.length) {
            html += `<div class="form-subhead">Slipping</div>`;
            html += losers.map(l => this.formRow(l.name, String(l.change), 'is-down')).join('');
        }
        el.innerHTML = html;
    },

    renderWatch(stats) {
        const el = document.getElementById('dept-watch');
        if (!el) return;

        const milestone = (stats.milestoneWatch.all || []).slice(0, 3);
        const nearPeak = (stats.distanceFromPeak.all || [])
            .filter(d => d.distance > 0)
            .slice(0, 3);

        if (milestone.length === 0 && nearPeak.length === 0) {
            el.innerHTML = `<p class="form-dept-empty">Nothing on the horizon just yet.</p>`;
            return;
        }

        let html = '';
        if (milestone.length) {
            html += `<div class="form-subhead">Next milestone</div>`;
            html += milestone.map(m => this.formRow(m.name, `${m.distance} pts`, '', `→ ${m.target}`)).join('');
        }
        if (nearPeak.length) {
            html += `<div class="form-subhead">Near a peak</div>`;
            html += nearPeak.map(d => this.formRow(d.name, `${d.distance} back`, '', `peak ${d.peak}`)).join('');
        }
        el.innerHTML = html;
    }
};

window.addEventListener('DOMContentLoaded', () => {
    app.init();
});
