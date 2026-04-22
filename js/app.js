import { store } from './store.js';
import { fetchPlayerStats, fetchAllPlayers } from './api.js';
import { animateValue, FLIP } from './animations.js';
import { computeStats } from './stats.js';

const app = {
    state: {
        currentView: 'leaderboard',
        settings: store.getSettings(),
        players: store.getPlayers(),
        isSyncing: false
    },
    
    init() {
        this.bindEvents();
        this.renderAll();
        // Set initial view
        this.switchView('leaderboard');
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

        // Global Search
        const inputGlobalSearch = document.getElementById('input-global-search');
        if (inputGlobalSearch) {
            inputGlobalSearch.addEventListener('input', (e) => {
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
            
            if (stats && stats.chess_rapid) {
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
                addError.textContent = 'Player not found or no rapid stats available.';
                addError.classList.remove('hidden');
            }

            spinner.classList.add('hidden');
            text.textContent = 'Track Player';
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
            btn.classList.remove('active', 'active-mobile');
            if (btn.getAttribute('data-view') === viewId) {
                if(btn.classList.contains('nav-btn-mobile')) {
                    // Mobile active state tweaks
                    btn.classList.add('active-mobile');
                    btn.classList.replace('text-slate-400', 'text-cyan-400');
                    btn.querySelector('.nav-icon').style.fontVariationSettings = "'FILL' 1";
                } else {
                    btn.classList.add('active');
                }
            } else {
                if(btn.classList.contains('nav-btn-mobile')) {
                    btn.classList.replace('text-cyan-400', 'text-slate-400');
                    btn.querySelector('.nav-icon').style.fontVariationSettings = "'FILL' 0";
                }
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
        if(viewId === 'comparison') {
            this.renderComparisonContent();
        }
        if(viewId === 'stats') {
            this.renderStats();
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
        
        const oldRatings = {};
        usernames.forEach(u => {
             const key = u.toLowerCase();
             oldRatings[key] = this.state.players[key].rating;
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

        // Animate numbers for changed ratings
        usernames.forEach(u => {
            const key = u.toLowerCase();
            const oldRating = oldRatings[key];
            const newRating = this.state.players[key].rating;
            if(oldRating !== newRating) {
                const el = document.getElementById(`rating-val-${key}`);
                if(el) animateValue(el, oldRating, newRating, 1000);
            }
        });

        if(syncText) syncText.textContent = "Sync: 100%";
        if(syncIcon) syncIcon.classList.replace('bg-secondary', 'bg-primary');
        this.state.isSyncing = false;
    },

    isMIA(lastActiveUnix) {
        const thresholdSeconds = this.state.settings.miaThresholdDays * 24 * 60 * 60;
        const nowUnix = Date.now() / 1000;
        return (nowUnix - lastActiveUnix) > thresholdSeconds;
    },

    getSortedPlayers() {
        let players = Object.values(this.state.players).sort((a, b) => b.rating - a.rating);
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
             return `<svg class="w-full h-full ${config.stroke} fill-none stroke-[2]" viewBox="0 0 100 30"><path d="M0,15 L100,15" stroke-linecap="round"></path></svg>`;
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
            <svg class="w-full h-full ${config.stroke} fill-none stroke-[2]" viewBox="0 0 100 30">
                <path d="${pathData}" stroke-linecap="round" stroke-linejoin="round" class="sparkline-path" style="stroke-dasharray: 200; stroke-dashoffset: 200; animation: drawSpark 1s ease-out forwards;"></path>
            </svg>
        `;
    },

    renderAll() {
        this.renderLeaderboard();
        if(this.state.currentView === 'comparison') this.renderComparisonContent();
        if(this.state.currentView === 'stats') this.renderStats();
        this.renderSettings();
    },

    renderLeaderboard() {
        const grid = document.getElementById('leaderboard-grid');
        const count = document.getElementById('leaderboard-count');
        if(!grid) return;

        const players = this.getSortedPlayers();
        count.textContent = `${players.length} players tracked across all shards`;

        if (players.length === 0) {
             grid.innerHTML = `<div class="p-8 text-center text-on-surface-variant glass-card rounded-lg">No players tracked yet. Add one to begin.</div>`;
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
            
            // Calculate rating change
            let ratingChange = 0;
            if (p.history && p.history.length > 1) {
                 ratingChange = p.rating - p.history[p.history.length - 2].rating;
            }

            const changeText = isMia ? '0.0' : (ratingChange === 0 ? '0.0' : (ratingChange > 0 ? `+${ratingChange}` : ratingChange));
            const changeColor = ratingChange > 0 ? 'text-primary' : (ratingChange < 0 ? 'text-error' : 'text-on-surface-variant');
            const changeIcon = ratingChange > 0 ? 'trending_up' : (ratingChange < 0 ? 'trending_down' : 'remove');

            if (isMia) {
                // MIA Row styling
                const daysAgo = Math.floor(((Date.now()/1000) - p.lastActiveDate) / 86400);
                html += `
                    <div id="row-${p.originalUsername.toLowerCase()}" class="leaderboard-row group relative overflow-hidden glass-card rounded-lg opacity-40 grayscale transition-all duration-300 hover:opacity-70 hover:grayscale-0">
                        <div class="flex items-center gap-4 px-4 sm:px-6 py-5 relative z-10">
                            <div class="w-12 sm:w-16 flex justify-center">
                                <span class="text-3xl font-headline font-bold text-outline leading-none">${rank}</span>
                            </div>
                            <div class="flex items-center gap-4 flex-1">
                                <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-md bg-surface-container-high flex items-center justify-center text-outline font-black text-lg">
                                    ${initials}
                                </div>
                                <div>
                                    <div class="flex items-center gap-2">
                                        <a href="https://www.chess.com/member/${p.originalUsername}" target="_blank" class="text-sm sm:text-lg font-bold font-body text-outline break-all hover:text-cyan-400 transition-colors duration-300 block">${p.originalUsername}</a>
                                        <span class="bg-outline-variant/20 text-outline text-[10px] px-2 py-0.5 rounded border border-outline-variant/30 uppercase font-black">MIA</span>
                                    </div>
                                    <span class="text-xs text-outline/60 font-medium uppercase tracking-widest">Last seen ${daysAgo}d ago</span>
                                </div>
                            </div>
                            <div class="hidden lg:block w-32 h-12">
                                <svg class="w-full h-full stroke-outline fill-none stroke-[1] stroke-dasharray-4" viewBox="0 0 100 30">
                                    <path d="M0,15 L100,15" stroke-linecap="round"></path>
                                </svg>
                            </div>
                            <div class="text-right min-w-[80px] sm:min-w-[140px]">
                                <div id="rating-val-${p.originalUsername.toLowerCase()}" class="text-2xl sm:text-3xl font-headline font-bold text-outline leading-none tabular-nums">
                                    ${p.rating.toLocaleString()}
                                </div>
                                <div class="flex items-center justify-end gap-1 text-outline font-bold text-[10px] sm:text-sm mt-1">
                                    <span class="material-symbols-outlined text-[10px] sm:text-sm">remove</span>
                                    0.0
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                // Active Row styling
                const isTopRanked = p.rank === 1;
                const primaryGlow = isTopRanked ? `<div class="absolute left-0 top-0 bottom-0 w-1 bg-primary shadow-[0_0_15px_rgba(129,236,255,0.6)]"></div><div class="absolute -left-20 top-1/2 -translate-y-1/2 w-64 h-64 bg-primary/5 rounded-full blur-[100px] pointer-events-none"></div>` : '';
                const rankClass = isTopRanked ? 'text-5xl text-primary-dim' : 'text-3xl sm:text-4xl text-on-surface-variant/50';
                
                let avatarClass = `w-10 h-10 sm:w-14 sm:h-14 rounded-md flex items-center justify-center font-black text-lg sm:text-xl shadow-lg ${config.bg} ${config.text}`;
                
                html += `
                    <div id="row-${p.originalUsername.toLowerCase()}" class="leaderboard-row group relative overflow-hidden glass-card rounded-lg transition-all duration-300 hover:-translate-y-1 hover:bg-surface-container-highest/90">
                        ${primaryGlow}
                        <div class="flex items-center gap-4 px-4 sm:px-6 py-5 relative z-10">
                            <div class="w-12 sm:w-16 flex justify-center">
                                <span class="font-headline font-black leading-none ${rankClass}">${rank}</span>
                            </div>
                            <div class="flex flex-1 items-center gap-4">
                                <div class="${avatarClass}">
                                    ${initials}
                                </div>
                                <div>
                                    <h3 class="flex items-center gap-2 break-all">
                                        <a href="https://www.chess.com/member/${p.originalUsername}" target="_blank" class="text-sm sm:text-xl font-bold font-body text-on-background hover:text-cyan-400 transition-colors duration-300 inline-block">
                                            ${p.originalUsername}
                                        </a>
                                        ${isTopRanked ? '<span class="material-symbols-outlined text-primary text-lg" style="font-variation-settings: \'FILL\' 1;">verified</span>' : ''}
                                    </h3>
                                    <span class="text-[10px] sm:text-xs text-on-surface-variant font-medium uppercase tracking-widest">${isTopRanked ? 'Grandmaster Shard' : 'Ranked Contender'}</span>
                                </div>
                            </div>
                            <div class="hidden lg:block w-32 h-12 opacity-80">
                                ${this.generateSparklineSVG(p.history, config)}
                            </div>
                            <div class="text-right min-w-[80px] sm:min-w-[140px]">
                                <div id="rating-val-${p.originalUsername.toLowerCase()}" class="text-2xl sm:text-4xl font-headline font-bold ${isTopRanked?'text-primary text-glow':'text-on-background'} leading-none tabular-nums">
                                    ${p.rating.toLocaleString()}
                                </div>
                                <div class="flex items-center justify-end gap-1 ${changeColor} font-bold text-[10px] sm:text-sm mt-1">
                                    <span class="material-symbols-outlined text-[10px] sm:text-sm">${changeIcon}</span>
                                    ${changeText}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }
        });

        grid.innerHTML = html;
    },

    renderComparisonContent() {
        const players = this.getSortedPlayers();
        const activePlayers = players.filter(p => !this.isMIA(p.lastActiveDate));
        const chartData = [];
        
        let avgChange = 0;
        let topGainer = { name: '...', change: 0 };
        let biggestDrop = { name: '...', change: 0 };
        
        activePlayers.forEach((p, index) => {
            let change = 0;
            if (p.history && p.history.length > 1) {
                 change = p.rating - p.history[p.history.length - 2].rating;
            }
            
            if (index < 8) { // Top 8 active
                chartData.push({ p, change, config: this.getColorAccent(index) });
            }

            avgChange += change;
            if (topGainer.change === 0 || change > topGainer.change) topGainer = { name: p.originalUsername, change };
            if (biggestDrop.change === 0 || change < biggestDrop.change) biggestDrop = { name: p.originalUsername, change };
        });

        if (activePlayers.length > 0) avgChange /= activePlayers.length;
        
        document.getElementById('avg-rating-change').textContent = (avgChange > 0 ? '+' : '') + avgChange.toFixed(1);
        document.getElementById('avg-rating-icon').textContent = avgChange >= 0 ? 'trending_up' : 'trending_down';
        document.getElementById('stat-top-gainer').textContent = `${topGainer.name} (+${topGainer.change})`;
        document.getElementById('stat-biggest-drop').textContent = `${biggestDrop.name} (${biggestDrop.change})`;

        // Render Chart
        const chartContainer = document.getElementById('chart-container');
        if(chartContainer) {
            const maxRating = Math.max(...chartData.map(d => d.p.rating), 1);
            const minRating = Math.max(Math.min(...chartData.map(d => d.p.rating), 1) - 30, 0); // Increased contrast zoom
            const range = maxRating - minRating;

            let chartHtml = `
                <div class="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20 py-2 z-0">
                    <div class="border-t border-on-surface-variant w-full flex items-center"><span class="absolute -left-2 text-[8px] text-on-surface-variant font-bold -translate-y-1/2 bg-surface-container px-1 rounded transform -rotate-90 origin-left">MAX</span></div>
                    <div class="border-t border-outline-variant w-full border-dashed"></div>
                    <div class="border-t border-outline-variant w-full border-dashed"></div>
                    <div class="border-t border-on-surface-variant w-full flex items-center"><span class="absolute -left-2 text-[8px] text-on-surface-variant font-bold -translate-y-1/2 bg-surface-container px-1 rounded transform -rotate-90 origin-left">MIN</span></div>
                </div>`;

            chartData.forEach((d, i) => {
                const heightPct = Math.max(((d.p.rating - minRating) / range) * 95, 5); 
                const changeIcon = d.change > 0 ? '▲' : (d.change < 0 ? '▼' : 'Δ');
                const changeStr = d.change > 0 ? `+${d.change}` : d.change;
                const changeColor = d.change >= 0 ? 'text-primary' : 'text-error';
                const nameStr = d.p.originalUsername.substring(0, 8);

                chartHtml += `
                <div class="flex-1 h-full flex flex-col justify-end items-center group relative cursor-pointer z-10" title="Rating: ${d.p.rating.toLocaleString()} | Change: ${changeStr}">
                    <div class="absolute -top-12 opacity-0 group-hover:opacity-100 group-hover:-translate-y-2 transition-all duration-300 bg-surface-container-highest border border-primary/20 shadow-xl rounded-lg px-4 py-2 pointer-events-none flex flex-col items-center z-50">
                        <span class="font-headline font-bold text-lg text-primary text-glow">${d.p.rating.toLocaleString()}</span>
                        <span class="text-[10px] font-bold ${changeColor} tracking-widest">${changeStr} ${changeIcon}</span>
                    </div>
                    
                    <div class="w-full max-w-[56px] bg-primary group-hover:bg-primary-container rounded-t-lg bar-grow-up transform transition-all duration-300 group-hover:scale-x-110 shadow-[0_0_15px_rgba(129,236,255,0.15)] group-hover:shadow-[0_0_30px_rgba(0,227,253,0.5)] border-t border-primary-container" style="height: 0%;" data-height="${heightPct}%"></div>
                    
                    <span class="mt-4 text-[10px] sm:text-xs font-bold text-on-surface-variant group-hover:text-primary group-hover:scale-110 uppercase tracking-tighter overflow-hidden text-ellipsis whitespace-nowrap w-full text-center transition-all duration-300">${nameStr}</span>
                </div>`;
            });

            chartContainer.innerHTML = chartHtml;
            
            // Trigger animation reliably after DOM paints
            setTimeout(() => {
                requestAnimationFrame(() => {
                    chartContainer.querySelectorAll('.bar-grow-up').forEach(bar => {
                        bar.style.height = bar.dataset.height;
                    });
                });
            }, 50);
        }

        // Render List (Active only)
        const listContainer = document.getElementById('comparison-list');
        if(listContainer) {
            let listHtml = '';
            chartData.forEach((d, i) => {
                const changeIcon = d.change > 0 ? '▲' : (d.change < 0 ? '▼' : 'Δ');
                const changeStr = d.change > 0 ? `+${d.change} ${changeIcon}` : `${d.change} ${changeIcon}`;
                const changeColor = d.change >= 0 ? 'text-primary' : 'text-error';
                
                listHtml += `
                <div class="bg-surface-container-high hover:bg-surface-container-highest transition-all p-4 sm:p-5 rounded-lg flex items-center justify-between group cursor-pointer border border-transparent hover:border-primary/20">
                    <div class="flex items-center gap-4 overflow-hidden">
                        <div class="w-10 h-10 shrink-0 rounded bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center border border-white/5 group-hover:shadow-[0_0_15px_rgba(129,236,255,0.3)] transition-all">
                            <span class="material-symbols-outlined text-primary text-xl">person</span>
                        </div>
                        <div class="truncate">
                            <p class="font-bold text-on-background group-hover:text-primary transition-colors truncate">${d.p.originalUsername}</p>
                            <p class="text-[10px] text-on-surface-variant uppercase font-medium truncate">Rank #${i+1} Active</p>
                        </div>
                    </div>
                    <div class="text-right shrink-0">
                        <p class="font-headline text-lg font-bold text-on-background">${d.p.rating.toLocaleString()}</p>
                        <p class="text-xs ${changeColor} font-bold">${changeStr}</p>
                    </div>
                </div>`;
            });
            listContainer.innerHTML = listHtml;
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
        const stats = computeStats(this.state.players, this.state.settings.miaThresholdDays);
        const playerCount = Object.keys(this.state.players).length;

        // Show data notice if fewer than 2 history points on average
        const notice = document.getElementById('stats-data-notice');
        if (notice) {
            const avgHistory = playerCount > 0
                ? Object.values(this.state.players).reduce((s, p) => s + (p.history?.length || 0), 0) / playerCount
                : 0;
            notice.classList.toggle('hidden', avgHistory >= 3);
        }

        this.renderAwards(stats.awards);
        this.renderWeeklyElo(stats.weeklyElo);
        this.renderVolatility(stats.volatility);
        this.renderDetailedStats(stats);
        this.renderRecordStats(stats);
    },

    renderAwards(awards) {
        const grid = document.getElementById('stats-awards-grid');
        if (!grid) return;

        if (awards.length === 0) {
            grid.innerHTML = `
                <div class="sm:col-span-2 lg:col-span-3 stats-no-data">
                    <span class="material-symbols-outlined">emoji_events</span>
                    <p class="text-sm font-bold">No awards yet</p>
                    <p class="text-xs">Sync your players a few times to unlock awards</p>
                </div>`;
            return;
        }

        const colorMap = {
            primary: { icon: 'text-primary', glow: 'text-glow' },
            error: { icon: 'text-error', glow: '' },
            secondary: { icon: 'text-secondary', glow: '' },
            tertiary: { icon: 'text-tertiary', glow: '' }
        };

        grid.innerHTML = awards.map(a => {
            const colors = colorMap[a.color] || colorMap.primary;
            return `
                <div class="stat-award-card accent-${a.color}">
                    <div class="flex items-center gap-3 mb-3">
                        <span class="material-symbols-outlined ${colors.icon} text-2xl" style="font-variation-settings: 'FILL' 1;">${a.icon}</span>
                        <span class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">${a.title}</span>
                    </div>
                    <div class="font-headline text-xl font-bold text-on-background ${colors.glow} truncate">${a.winner}</div>
                    <div class="text-xs font-bold ${colors.icon} mt-1 tracking-wide">${a.value}</div>
                </div>`;
        }).join('');
    },

    renderWeeklyElo(weeklyElo) {
        const container = document.getElementById('stats-weekly-section');
        if (!container) return;

        if (weeklyElo.all.length === 0) {
            container.innerHTML = `
                <div class="lg:col-span-2 stats-no-data">
                    <span class="material-symbols-outlined">calendar_today</span>
                    <p class="text-sm font-bold">No weekly data available</p>
                    <p class="text-xs">Need at least 2 syncs within the last 7 days</p>
                </div>`;
            return;
        }

        // Gainers column
        const gainersHtml = weeklyElo.gainers.length > 0
            ? weeklyElo.gainers.map((g, i) => `
                <div class="stats-table-row">
                    <div class="flex items-center gap-3">
                        <span class="text-xs font-headline font-bold text-on-surface-variant w-6">#${i + 1}</span>
                        <span class="font-bold text-on-background text-sm truncate">${g.name}</span>
                    </div>
                    <div class="flex items-center gap-1 text-primary font-bold text-sm">
                        <span class="material-symbols-outlined text-sm">trending_up</span>
                        +${g.change}
                    </div>
                </div>`).join('')
            : '<div class="stats-table-row"><span class="text-on-surface-variant text-sm">No gainers this week</span></div>';

        // Losers column
        const losersHtml = weeklyElo.losers.length > 0
            ? weeklyElo.losers.map((l, i) => `
                <div class="stats-table-row">
                    <div class="flex items-center gap-3">
                        <span class="text-xs font-headline font-bold text-on-surface-variant w-6">#${i + 1}</span>
                        <span class="font-bold text-on-background text-sm truncate">${l.name}</span>
                    </div>
                    <div class="flex items-center gap-1 text-error font-bold text-sm">
                        <span class="material-symbols-outlined text-sm">trending_down</span>
                        ${l.change}
                    </div>
                </div>`).join('')
            : '<div class="stats-table-row"><span class="text-on-surface-variant text-sm">No losers this week</span></div>';

        container.innerHTML = `
            <div class="glass-card rounded-xl p-6">
                <div class="flex items-center gap-2 mb-4">
                    <span class="material-symbols-outlined text-primary text-lg">arrow_upward</span>
                    <h4 class="text-xs font-bold uppercase tracking-widest text-primary">Top Gainers</h4>
                </div>
                <div class="space-y-2">${gainersHtml}</div>
            </div>
            <div class="glass-card rounded-xl p-6">
                <div class="flex items-center gap-2 mb-4">
                    <span class="material-symbols-outlined text-error text-lg">arrow_downward</span>
                    <h4 class="text-xs font-bold uppercase tracking-widest text-error">Biggest Drops</h4>
                </div>
                <div class="space-y-2">${losersHtml}</div>
            </div>`;
    },

    renderVolatility(volatility) {
        const container = document.getElementById('stats-volatility-section');
        if (!container) return;

        if (!volatility.all || volatility.all.length === 0) {
            container.innerHTML = `
                <div class="stats-no-data">
                    <span class="material-symbols-outlined">show_chart</span>
                    <p class="text-sm font-bold">Not enough data for volatility</p>
                    <p class="text-xs">Need at least 3 history points within the last 30 days</p>
                </div>`;
            return;
        }

        const maxStdDev = Math.max(...volatility.all.map(v => v.stdDev), 1);

        const rows = volatility.all.map((v, i) => {
            const barWidth = Math.max((v.stdDev / maxStdDev) * 100, 4);
            let pillClass = 'flat';
            if (v.stdDev > maxStdDev * 0.6) pillClass = 'wild';
            else if (v.stdDev > maxStdDev * 0.3) pillClass = 'moderate';

            const isWildest = i === 0;
            const isFlattest = i === volatility.all.length - 1 && volatility.all.length > 1;
            let badge = '';
            if (isWildest) badge = '<span class="text-[9px] bg-tertiary/15 text-tertiary px-2 py-0.5 rounded-full font-bold uppercase">Wildest</span>';
            if (isFlattest) badge = '<span class="text-[9px] bg-primary/15 text-primary px-2 py-0.5 rounded-full font-bold uppercase">Flattest</span>';

            return `
                <div class="stats-table-row">
                    <div class="flex items-center gap-3 flex-1 min-w-0">
                        <span class="text-xs font-headline font-bold text-on-surface-variant w-6 shrink-0">#${i + 1}</span>
                        <span class="font-bold text-on-background text-sm truncate">${v.name}</span>
                        ${badge}
                    </div>
                    <div class="flex items-center gap-3 shrink-0">
                        <div class="hidden sm:block w-32 h-2 bg-surface-container-lowest rounded-full overflow-hidden">
                            <div class="h-full rounded-full transition-all duration-700" style="width: ${barWidth}%; background: ${pillClass === 'wild' ? '#ff6c95' : pillClass === 'moderate' ? '#a68cff' : '#81ecff'};"></div>
                        </div>
                        <span class="volatility-pill ${pillClass}">σ ${v.stdDev}</span>
                    </div>
                </div>`;
        }).join('');

        container.innerHTML = `
            <div class="glass-card rounded-xl p-6">
                <div class="space-y-2">${rows}</div>
            </div>`;
    },

    renderDetailedStats(stats) {
        const container = document.getElementById('stats-details-section');
        if (!container) return;

        let html = '';

        // Tilt Tracker
        if (stats.tiltTracker.all.length > 0) {
            const rows = stats.tiltTracker.all.slice(0, 5).map((t, i) => `
                <div class="stats-table-row">
                    <div class="flex items-center gap-3">
                        <span class="text-xs font-headline font-bold text-on-surface-variant w-6">#${i + 1}</span>
                        <span class="font-bold text-on-background text-sm truncate">${t.name}</span>
                    </div>
                    <span class="text-error font-bold text-sm">${t.drop}</span>
                </div>`).join('');
            html += `
                <div class="glass-card rounded-xl p-6">
                    <div class="flex items-center gap-2 mb-4">
                        <span class="material-symbols-outlined text-error" style="font-variation-settings: 'FILL' 1;">mood_bad</span>
                        <h4 class="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Tilt Tracker (Worst Single Drop)</h4>
                    </div>
                    <div class="space-y-2">${rows}</div>
                </div>`;
        }

        // Comeback Kid
        if (stats.comebackKid.all.length > 0) {
            const rows = stats.comebackKid.all.slice(0, 5).map((c, i) => `
                <div class="stats-table-row">
                    <div class="flex items-center gap-3">
                        <span class="text-xs font-headline font-bold text-on-surface-variant w-6">#${i + 1}</span>
                        <span class="font-bold text-on-background text-sm truncate">${c.name}</span>
                    </div>
                    <span class="text-primary font-bold text-sm">+${c.recovery}</span>
                </div>`).join('');
            html += `
                <div class="glass-card rounded-xl p-6">
                    <div class="flex items-center gap-2 mb-4">
                        <span class="material-symbols-outlined text-primary" style="font-variation-settings: 'FILL' 1;">fitness_center</span>
                        <h4 class="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Comeback Kid (Max Recovery)</h4>
                    </div>
                    <div class="space-y-2">${rows}</div>
                </div>`;
        }

        // Trendsetter
        if (stats.trendsetter.all.length > 0) {
            const rows = stats.trendsetter.all.slice(0, 5).map((t, i) => `
                <div class="stats-table-row">
                    <div class="flex items-center gap-3">
                        <span class="text-xs font-headline font-bold text-on-surface-variant w-6">#${i + 1}</span>
                        <span class="font-bold text-on-background text-sm truncate">${t.name}</span>
                    </div>
                    <span class="text-primary font-bold text-sm">${t.streak} syncs</span>
                </div>`).join('');
            html += `
                <div class="glass-card rounded-xl p-6">
                    <div class="flex items-center gap-2 mb-4">
                        <span class="material-symbols-outlined text-primary" style="font-variation-settings: 'FILL' 1;">trending_up</span>
                        <h4 class="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Trendsetter (Longest Gain Streak)</h4>
                    </div>
                    <div class="space-y-2">${rows}</div>
                </div>`;
        }

        // Distance From Peak
        if (stats.distanceFromPeak.all.length > 0) {
            const rows = stats.distanceFromPeak.all.slice(0, 5).map((d, i) => {
                const atPeak = d.distance === 0;
                return `
                <div class="stats-table-row">
                    <div class="flex items-center gap-3">
                        <span class="text-xs font-headline font-bold text-on-surface-variant w-6">#${i + 1}</span>
                        <span class="font-bold text-on-background text-sm truncate">${d.name}</span>
                        ${atPeak ? '<span class="text-[9px] bg-primary/15 text-primary px-2 py-0.5 rounded-full font-bold uppercase">At Peak!</span>' : ''}
                    </div>
                    <div class="text-right">
                        <span class="font-headline font-bold text-sm ${atPeak ? 'text-primary' : 'text-on-surface-variant'}">${atPeak ? d.peak : '-' + d.distance}</span>
                        <span class="text-[10px] text-outline block">peak: ${d.peak}</span>
                    </div>
                </div>`;
            }).join('');
            html += `
                <div class="glass-card rounded-xl p-6">
                    <div class="flex items-center gap-2 mb-4">
                        <span class="material-symbols-outlined text-secondary" style="font-variation-settings: 'FILL' 1;">military_tech</span>
                        <h4 class="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Distance From Peak</h4>
                    </div>
                    <div class="space-y-2">${rows}</div>
                </div>`;
        }

        // Milestone Watch
        if (stats.milestoneWatch.all.length > 0) {
            const rows = stats.milestoneWatch.all.slice(0, 5).map((m, i) => `
                <div class="stats-table-row">
                    <div class="flex items-center gap-3">
                        <span class="text-xs font-headline font-bold text-on-surface-variant w-6">#${i + 1}</span>
                        <span class="font-bold text-on-background text-sm truncate">${m.name}</span>
                    </div>
                    <div class="text-right">
                        <span class="font-headline font-bold text-sm text-tertiary">${m.distance} pts</span>
                        <span class="text-[10px] text-outline block">${m.rating} → ${m.target}</span>
                    </div>
                </div>`).join('');
            html += `
                <div class="glass-card rounded-xl p-6">
                    <div class="flex items-center gap-2 mb-4">
                        <span class="material-symbols-outlined text-tertiary" style="font-variation-settings: 'FILL' 1;">flag</span>
                        <h4 class="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Milestone Watch (Next 100)</h4>
                    </div>
                    <div class="space-y-2">${rows}</div>
                </div>`;
        }

        if (html === '') {
            html = `
                <div class="lg:col-span-2 stats-no-data">
                    <span class="material-symbols-outlined">analytics</span>
                    <p class="text-sm font-bold">No detailed stats available</p>
                    <p class="text-xs">Sync a few more times to generate breakdowns</p>
                </div>`;
        }

        container.innerHTML = html;
    },

    renderRecordStats(stats) {
        const container = document.getElementById('stats-records-section');
        if (!container) return;

        const hasRecordData = stats.grinder.all.length > 0;

        if (!hasRecordData) {
            container.innerHTML = `
                <div class="lg:col-span-3 stats-no-data">
                    <span class="material-symbols-outlined">sports_esports</span>
                    <p class="text-sm font-bold">No game record data</p>
                    <p class="text-xs">Sync players to load win/loss/draw records from Chess.com</p>
                </div>`;
            return;
        }

        let html = '';

        // The Grinder
        if (stats.grinder.all.length > 0) {
            const rows = stats.grinder.all.slice(0, 5).map((g, i) => `
                <div class="stats-table-row">
                    <div class="flex items-center gap-3 min-w-0">
                        <span class="text-xs font-headline font-bold text-on-surface-variant w-6 shrink-0">#${i + 1}</span>
                        <span class="font-bold text-on-background text-sm truncate">${g.name}</span>
                    </div>
                    <div class="text-right shrink-0">
                        <span class="font-headline font-bold text-sm text-secondary">${g.total.toLocaleString()}</span>
                        <span class="text-[10px] text-outline block">${g.wins}W / ${g.losses}L / ${g.draws}D</span>
                    </div>
                </div>`).join('');
            html += `
                <div class="glass-card rounded-xl p-6">
                    <div class="flex items-center gap-2 mb-4">
                        <span class="material-symbols-outlined text-secondary" style="font-variation-settings: 'FILL' 1;">sports_mma</span>
                        <h4 class="text-xs font-bold uppercase tracking-widest text-on-surface-variant">The Grinder (Most Games)</h4>
                    </div>
                    <div class="space-y-2">${rows}</div>
                </div>`;
        }

        // Pacifist
        if (stats.pacifist.all.length > 0) {
            const rows = stats.pacifist.all.slice(0, 5).map((p, i) => `
                <div class="stats-table-row">
                    <div class="flex items-center gap-3 min-w-0">
                        <span class="text-xs font-headline font-bold text-on-surface-variant w-6 shrink-0">#${i + 1}</span>
                        <span class="font-bold text-on-background text-sm truncate">${p.name}</span>
                    </div>
                    <div class="text-right shrink-0">
                        <span class="font-headline font-bold text-sm text-primary">${p.drawRate.toFixed(1)}%</span>
                        <span class="text-[10px] text-outline block">${p.draws} draws / ${p.total}</span>
                    </div>
                </div>`).join('');
            html += `
                <div class="glass-card rounded-xl p-6">
                    <div class="flex items-center gap-2 mb-4">
                        <span class="material-symbols-outlined text-primary" style="font-variation-settings: 'FILL' 1;">handshake</span>
                        <h4 class="text-xs font-bold uppercase tracking-widest text-on-surface-variant">The Pacifist (Draw Rate)</h4>
                    </div>
                    <div class="space-y-2">${rows}</div>
                </div>`;
        }

        // All-or-Nothing
        if (stats.allOrNothing.all.length > 0) {
            const rows = stats.allOrNothing.all.slice(0, 5).map((a, i) => `
                <div class="stats-table-row">
                    <div class="flex items-center gap-3 min-w-0">
                        <span class="text-xs font-headline font-bold text-on-surface-variant w-6 shrink-0">#${i + 1}</span>
                        <span class="font-bold text-on-background text-sm truncate">${a.name}</span>
                    </div>
                    <div class="text-right shrink-0">
                        <span class="font-headline font-bold text-sm text-tertiary">${a.decisiveRate.toFixed(1)}%</span>
                        <span class="text-[10px] text-outline block">decisive</span>
                    </div>
                </div>`).join('');
            html += `
                <div class="glass-card rounded-xl p-6">
                    <div class="flex items-center gap-2 mb-4">
                        <span class="material-symbols-outlined text-tertiary" style="font-variation-settings: 'FILL' 1;">local_fire_department</span>
                        <h4 class="text-xs font-bold uppercase tracking-widest text-on-surface-variant">All-or-Nothing (Lowest Draw Rate)</h4>
                    </div>
                    <div class="space-y-2">${rows}</div>
                </div>`;
        }

        container.innerHTML = html;
    }
};

window.addEventListener('DOMContentLoaded', () => {
    app.init();
});
