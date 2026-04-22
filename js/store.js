const STORAGE_KEY_PLAYERS = "rapidTracker_players";
const STORAGE_KEY_SETTINGS = "rapidTracker_settings";

const TIME_CONTROLS = ['rapid', 'blitz', 'bullet'];
const API_KEY_MAP = {
    rapid: 'chess_rapid',
    blitz: 'chess_blitz',
    bullet: 'chess_bullet'
};

const defaultSettings = {
    miaThresholdDays: 7,
    lastSync: null
};

// Players data structure (v2 — multi-mode):
// {
//   username: {
//      originalUsername: "PlayerName",
//      rapid:  { rating, peakRating, wins, losses, draws, lastActiveDate, history: [...] },
//      blitz:  { rating, peakRating, wins, losses, draws, lastActiveDate, history: [...] },
//      bullet: { rating, peakRating, wins, losses, draws, lastActiveDate, history: [...] },
//   }
// }

/**
 * Transparently migrate a flat (v1) player entry into the nested v2 format.
 * Non-destructive: if the player already has .rapid, it's returned unchanged.
 */
function migratePlayerEntry(entry) {
    if (entry.rapid || entry.blitz || entry.bullet) return entry; // already v2

    // Build the rapid bucket from the flat fields
    const rapidBucket = {
        rating: entry.rating ?? 0,
        peakRating: entry.peakRating ?? entry.rating ?? 0,
        wins: entry.wins ?? 0,
        losses: entry.losses ?? 0,
        draws: entry.draws ?? 0,
        lastActiveDate: entry.lastActiveDate ?? (Date.now() / 1000),
        history: entry.history ?? []
    };

    const emptyBucket = () => ({
        rating: 0, peakRating: 0,
        wins: 0, losses: 0, draws: 0,
        lastActiveDate: Date.now() / 1000,
        history: []
    });

    return {
        originalUsername: entry.originalUsername,
        rapid: rapidBucket,
        blitz: emptyBucket(),
        bullet: emptyBucket()
    };
}

function buildBucketFromApiStats(apiStats) {
    const rating = apiStats.last ? apiStats.last.rating : 0;
    const lastActiveDate = apiStats.last ? apiStats.last.date : (Date.now() / 1000);
    const peakRating = apiStats.best ? apiStats.best.rating : rating;
    const record = apiStats.record || {};

    return {
        rating,
        peakRating,
        wins: record.win || 0,
        losses: record.loss || 0,
        draws: record.draw || 0,
        lastActiveDate,
        history: [{ date: Date.now(), rating }]
    };
}

const emptyBucket = () => ({
    rating: 0, peakRating: 0,
    wins: 0, losses: 0, draws: 0,
    lastActiveDate: Date.now() / 1000,
    history: []
});

export const store = {
    getSettings() {
        const data = localStorage.getItem(STORAGE_KEY_SETTINGS);
        return data ? { ...defaultSettings, ...JSON.parse(data) } : { ...defaultSettings };
    },
    
    saveSettings(settings) {
        localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    },

    getPlayers() {
        const data = localStorage.getItem(STORAGE_KEY_PLAYERS);
        if (!data) return {};

        const raw = JSON.parse(data);
        let needsSave = false;

        // Auto-migrate any v1 entries
        for (const key of Object.keys(raw)) {
            const migrated = migratePlayerEntry(raw[key]);
            if (migrated !== raw[key]) {
                raw[key] = migrated;
                needsSave = true;
            }
        }

        if (needsSave) {
            localStorage.setItem(STORAGE_KEY_PLAYERS, JSON.stringify(raw));
        }

        return raw;
    },

    savePlayers(players) {
        localStorage.setItem(STORAGE_KEY_PLAYERS, JSON.stringify(players));
    },

    addPlayer(username, fullStats) {
        const players = this.getPlayers();
        const lowerUsername = username.toLowerCase();
        if (players[lowerUsername]) return false; // Already exists

        const entry = { originalUsername: username };

        for (const mode of TIME_CONTROLS) {
            const apiKey = API_KEY_MAP[mode];
            const modeStats = fullStats[apiKey];
            entry[mode] = modeStats ? buildBucketFromApiStats(modeStats) : emptyBucket();
        }

        players[lowerUsername] = entry;
        this.savePlayers(players);
        return true;
    },

    removePlayer(username) {
        const players = this.getPlayers();
        delete players[username.toLowerCase()];
        this.savePlayers(players);
    },

    updatePlayers(updates) {
        // updates is array of { username, stats }
        const players = this.getPlayers();
        const now = Date.now();
        
        updates.forEach(({username, stats}) => {
            const lowerUsername = username.toLowerCase();
            if (!players[lowerUsername]) return;

            for (const mode of TIME_CONTROLS) {
                const apiKey = API_KEY_MAP[mode];
                const modeStats = stats[apiKey] || {};
                const bucket = players[lowerUsername][mode];

                if (!bucket) {
                    players[lowerUsername][mode] = emptyBucket();
                    continue;
                }

                const newRating = modeStats.last ? modeStats.last.rating : bucket.rating;
                const newDate = modeStats.last ? modeStats.last.date : bucket.lastActiveDate;
                const newPeak = modeStats.best ? modeStats.best.rating : bucket.peakRating;
                const record = modeStats.record || {};
                
                bucket.history.push({ date: now, rating: newRating });
                bucket.rating = newRating;
                bucket.lastActiveDate = newDate;
                bucket.peakRating = newPeak || bucket.rating;
                bucket.wins = record.win ?? bucket.wins ?? 0;
                bucket.losses = record.loss ?? bucket.losses ?? 0;
                bucket.draws = record.draw ?? bucket.draws ?? 0;
                
                // Keep history trimmed to last 50 data points
                if (bucket.history.length > 50) {
                    bucket.history.shift();
                }
            }
        });

        this.savePlayers(players);
        
        // Update sync time
        const settings = this.getSettings();
        settings.lastSync = now;
        this.saveSettings(settings);
    },

    clearAll() {
        localStorage.removeItem(STORAGE_KEY_PLAYERS);
        localStorage.removeItem(STORAGE_KEY_SETTINGS);
    },
    
    exportData() {
        const data = {
            players: this.getPlayers(),
            settings: this.getSettings()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `rapid-tracker-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    importData(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (data.players && data.settings) {
                this.savePlayers(data.players);
                this.saveSettings(data.settings);
                return true;
            }
            return false;
        } catch (e) {
            console.error("Invalid import JSON", e);
            return false;
        }
    }
};
