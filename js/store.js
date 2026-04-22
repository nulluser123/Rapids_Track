const STORAGE_KEY_PLAYERS = "rapidTracker_players";
const STORAGE_KEY_SETTINGS = "rapidTracker_settings";

const defaultSettings = {
    miaThresholdDays: 7,
    lastSync: null
};

// Players data structure:
// {
//   username: {
//      rating: 1200,
//      peakRating: 1450,
//      wins: 120,
//      losses: 85,
//      draws: 14,
//      lastActiveDate: unix_timestamp,
//      history: [{ date: timestamp, rating: 1200 }, ...]
//   }
// }

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
        return data ? JSON.parse(data) : {};
    },

    savePlayers(players) {
        localStorage.setItem(STORAGE_KEY_PLAYERS, JSON.stringify(players));
    },

    addPlayer(username, initialStats) {
        const players = this.getPlayers();
        const lowerUsername = username.toLowerCase();
        if (players[lowerUsername]) return false; // Already exists

        const rapidStats = initialStats.chess_rapid || {};
        const rating = rapidStats.last ? rapidStats.last.rating : 0;
        const lastActiveDate = rapidStats.last ? rapidStats.last.date : (Date.now()/1000);
        const peakRating = rapidStats.best ? rapidStats.best.rating : rating;
        const record = rapidStats.record || {};

        players[lowerUsername] = {
            originalUsername: username,
            rating: rating,
            peakRating: peakRating,
            wins: record.win || 0,
            losses: record.loss || 0,
            draws: record.draw || 0,
            lastActiveDate: lastActiveDate,
            history: [{ date: Date.now(), rating: rating }]
        };

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
            if (players[lowerUsername]) {
                const rapidStats = stats.chess_rapid || {};
                const newRating = rapidStats.last ? rapidStats.last.rating : players[lowerUsername].rating;
                const newDate = rapidStats.last ? rapidStats.last.date : players[lowerUsername].lastActiveDate;
                const newPeak = rapidStats.best ? rapidStats.best.rating : players[lowerUsername].peakRating;
                const record = rapidStats.record || {};
                
                // Only push to history if sync happens, we can just push current status
                players[lowerUsername].history.push({ date: now, rating: newRating });
                players[lowerUsername].rating = newRating;
                players[lowerUsername].lastActiveDate = newDate;
                players[lowerUsername].peakRating = newPeak || players[lowerUsername].rating;
                players[lowerUsername].wins = record.win ?? players[lowerUsername].wins ?? 0;
                players[lowerUsername].losses = record.loss ?? players[lowerUsername].losses ?? 0;
                players[lowerUsername].draws = record.draw ?? players[lowerUsername].draws ?? 0;
                
                // Keep history trimmed to say, last 50 data points to avoid blowing up storage
                if (players[lowerUsername].history.length > 50) {
                    players[lowerUsername].history.shift();
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
