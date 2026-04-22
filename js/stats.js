/**
 * Stats computation engine for Rapid Tracker.
 * All functions take the players object from store and return computed stat results.
 */

/**
 * Main entry point — computes all stats from players data.
 * @param {Object} players - The full players object from store.getPlayers()
 * @param {number} miaThresholdDays - Days before a player is considered MIA
 * @returns {Object} All computed stats
 */
export function computeStats(players, miaThresholdDays) {
    const playerList = Object.values(players);
    const thresholdSeconds = miaThresholdDays * 24 * 60 * 60;
    const nowUnix = Date.now() / 1000;

    const activePlayers = playerList.filter(p => (nowUnix - p.lastActiveDate) <= thresholdSeconds);
    const allPlayers = playerList;

    return {
        weeklyElo: computeWeeklyElo(allPlayers),
        volatility: computeVolatility(allPlayers),
        tiltTracker: computeTiltTracker(allPlayers),
        comebackKid: computeComebackKid(allPlayers),
        trendsetter: computeTrendsetter(allPlayers),
        distanceFromPeak: computeDistanceFromPeak(allPlayers),
        milestoneWatch: computeMilestoneWatch(allPlayers),
        grinder: computeGrinder(allPlayers),
        pacifist: computePacifist(allPlayers),
        allOrNothing: computeAllOrNothing(allPlayers),
        // Wrapped-style quick awards
        awards: computeAwards(allPlayers)
    };
}

/**
 * Weekly Elo Gain/Loss — rolling 7-day window.
 * Finds the earliest history point within the last 7 days and computes delta.
 */
function computeWeeklyElo(players) {
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

    const results = players.map(p => {
        if (!p.history || p.history.length < 2) {
            return { name: p.originalUsername, change: 0, hasData: false };
        }

        // Find the oldest history point within the 7-day window
        const pointsInWindow = p.history.filter(h => h.date >= sevenDaysAgo);

        if (pointsInWindow.length < 1) {
            // No points in window — use the most recent point before the window as baseline
            const beforeWindow = p.history.filter(h => h.date < sevenDaysAgo);
            if (beforeWindow.length === 0) {
                return { name: p.originalUsername, change: 0, hasData: false };
            }
            const baseline = beforeWindow[beforeWindow.length - 1].rating;
            return { name: p.originalUsername, change: p.rating - baseline, hasData: true };
        }

        const baseline = pointsInWindow[0].rating;
        const current = pointsInWindow[pointsInWindow.length - 1].rating;
        return { name: p.originalUsername, change: current - baseline, hasData: true };
    }).filter(r => r.hasData);

    results.sort((a, b) => b.change - a.change);

    return {
        gainers: results.filter(r => r.change > 0),
        losers: [...results.filter(r => r.change < 0)].sort((a, b) => a.change - b.change),
        all: results
    };
}

/**
 * 30-Day Volatility Index — standard deviation of successive rating deltas.
 * Flattest line = lowest σ, wildest rollercoaster = highest σ.
 */
function computeVolatility(players) {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

    const results = players.map(p => {
        if (!p.history || p.history.length < 3) {
            return null;
        }

        const recentHistory = p.history.filter(h => h.date >= thirtyDaysAgo);
        if (recentHistory.length < 3) return null;

        // Compute deltas between consecutive points
        const deltas = [];
        for (let i = 1; i < recentHistory.length; i++) {
            deltas.push(recentHistory[i].rating - recentHistory[i - 1].rating);
        }

        const mean = deltas.reduce((a, b) => a + b, 0) / deltas.length;
        const variance = deltas.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / deltas.length;
        const stdDev = Math.sqrt(variance);

        return {
            name: p.originalUsername,
            stdDev: Math.round(stdDev * 10) / 10,
            dataPoints: recentHistory.length
        };
    }).filter(r => r !== null);

    results.sort((a, b) => b.stdDev - a.stdDev);

    return {
        wildest: results[0] || null,
        flattest: results[results.length - 1] || null,
        all: results
    };
}

/**
 * Tilt Tracker — biggest single negative delta between consecutive history points.
 */
function computeTiltTracker(players) {
    const results = players.map(p => {
        if (!p.history || p.history.length < 2) return null;

        let worstDrop = 0;
        for (let i = 1; i < p.history.length; i++) {
            const delta = p.history[i].rating - p.history[i - 1].rating;
            if (delta < worstDrop) worstDrop = delta;
        }

        if (worstDrop === 0) return null;

        return { name: p.originalUsername, drop: worstDrop };
    }).filter(r => r !== null);

    results.sort((a, b) => a.drop - b.drop); // Most negative first

    return {
        worst: results[0] || null,
        all: results
    };
}

/**
 * Comeback Kid — biggest recovery from a local minimum to a subsequent peak.
 */
function computeComebackKid(players) {
    const results = players.map(p => {
        if (!p.history || p.history.length < 3) return null;

        let maxComeback = 0;
        let localMin = p.history[0].rating;

        for (let i = 1; i < p.history.length; i++) {
            const rating = p.history[i].rating;
            if (rating < localMin) {
                localMin = rating;
            }
            const recovery = rating - localMin;
            if (recovery > maxComeback) {
                maxComeback = recovery;
            }
        }

        if (maxComeback === 0) return null;

        return { name: p.originalUsername, recovery: maxComeback };
    }).filter(r => r !== null);

    results.sort((a, b) => b.recovery - a.recovery);

    return {
        best: results[0] || null,
        all: results
    };
}

/**
 * Trendsetter — longest consecutive streak of non-negative history deltas.
 */
function computeTrendsetter(players) {
    const results = players.map(p => {
        if (!p.history || p.history.length < 2) return null;

        let maxStreak = 0;
        let currentStreak = 0;

        for (let i = 1; i < p.history.length; i++) {
            const delta = p.history[i].rating - p.history[i - 1].rating;
            if (delta >= 0) {
                currentStreak++;
                if (currentStreak > maxStreak) maxStreak = currentStreak;
            } else {
                currentStreak = 0;
            }
        }

        if (maxStreak === 0) return null;

        return { name: p.originalUsername, streak: maxStreak };
    }).filter(r => r !== null);

    results.sort((a, b) => b.streak - a.streak);

    return {
        best: results[0] || null,
        all: results
    };
}

/**
 * Distance From Peak — peakRating - currentRating.
 */
function computeDistanceFromPeak(players) {
    const results = players
        .filter(p => p.peakRating != null && p.peakRating > 0)
        .map(p => ({
            name: p.originalUsername,
            current: p.rating,
            peak: p.peakRating,
            distance: p.peakRating - p.rating
        }));

    results.sort((a, b) => a.distance - b.distance); // Closest to peak first

    return {
        atPeak: results.filter(r => r.distance === 0),
        closest: results[0] || null,
        furthest: results[results.length - 1] || null,
        all: results
    };
}

/**
 * Milestone Watch — who's closest to the next 100-point milestone?
 */
function computeMilestoneWatch(players) {
    const results = players.map(p => {
        const nextMilestone = Math.ceil(p.rating / 100) * 100;
        // If rating is already exactly on a milestone, target next one
        const target = (nextMilestone === p.rating) ? p.rating + 100 : nextMilestone;
        const distance = target - p.rating;

        return {
            name: p.originalUsername,
            rating: p.rating,
            target: target,
            distance: distance
        };
    });

    results.sort((a, b) => a.distance - b.distance);

    return {
        closest: results[0] || null,
        all: results
    };
}

/**
 * The Grinder — total games played (wins + losses + draws).
 */
function computeGrinder(players) {
    const results = players
        .filter(p => (p.wins != null || p.losses != null || p.draws != null))
        .map(p => {
            const wins = p.wins || 0;
            const losses = p.losses || 0;
            const draws = p.draws || 0;
            return {
                name: p.originalUsername,
                total: wins + losses + draws,
                wins, losses, draws
            };
        })
        .filter(r => r.total > 0);

    results.sort((a, b) => b.total - a.total);

    return {
        top: results[0] || null,
        all: results
    };
}

/**
 * Pacifist — highest draw rate.
 */
function computePacifist(players) {
    const results = players
        .filter(p => (p.wins != null || p.losses != null || p.draws != null))
        .map(p => {
            const total = (p.wins || 0) + (p.losses || 0) + (p.draws || 0);
            if (total === 0) return null;
            return {
                name: p.originalUsername,
                drawRate: ((p.draws || 0) / total * 100),
                draws: p.draws || 0,
                total
            };
        })
        .filter(r => r !== null);

    results.sort((a, b) => b.drawRate - a.drawRate);

    return {
        top: results[0] || null,
        all: results
    };
}

/**
 * All-or-Nothing — lowest draw rate (fights to the death).
 */
function computeAllOrNothing(players) {
    const results = players
        .filter(p => (p.wins != null || p.losses != null || p.draws != null))
        .map(p => {
            const total = (p.wins || 0) + (p.losses || 0) + (p.draws || 0);
            if (total === 0) return null;
            return {
                name: p.originalUsername,
                drawRate: ((p.draws || 0) / total * 100),
                decisiveRate: (((p.wins || 0) + (p.losses || 0)) / total * 100),
                total
            };
        })
        .filter(r => r !== null);

    results.sort((a, b) => a.drawRate - b.drawRate); // Lowest draw rate first

    return {
        top: results[0] || null,
        all: results
    };
}

/**
 * Awards — quick "Spotify Wrapped" style award snippets.
 */
function computeAwards(players) {
    const awards = [];
    const weekly = computeWeeklyElo(players);
    const volatility = computeVolatility(players);
    const tilt = computeTiltTracker(players);
    const comeback = computeComebackKid(players);
    const trend = computeTrendsetter(players);
    const peak = computeDistanceFromPeak(players);
    const milestone = computeMilestoneWatch(players);
    const grinder = computeGrinder(players);

    if (weekly.gainers.length > 0) {
        awards.push({
            icon: 'local_fire_department',
            title: 'Hottest This Week',
            winner: weekly.gainers[0].name,
            value: `+${weekly.gainers[0].change} Elo`,
            color: 'primary'
        });
    }

    if (weekly.losers.length > 0) {
        awards.push({
            icon: 'ac_unit',
            title: 'Coldest This Week',
            winner: weekly.losers[0].name,
            value: `${weekly.losers[0].change} Elo`,
            color: 'error'
        });
    }

    if (volatility.wildest) {
        awards.push({
            icon: 'tsunami',
            title: 'Wildest Rollercoaster',
            winner: volatility.wildest.name,
            value: `σ = ${volatility.wildest.stdDev}`,
            color: 'tertiary'
        });
    }

    if (volatility.flattest && volatility.all.length > 1) {
        awards.push({
            icon: 'horizontal_rule',
            title: 'The Rock (Flattest)',
            winner: volatility.flattest.name,
            value: `σ = ${volatility.flattest.stdDev}`,
            color: 'secondary'
        });
    }

    if (tilt.worst) {
        awards.push({
            icon: 'mood_bad',
            title: 'Tilt Demon',
            winner: tilt.worst.name,
            value: `${tilt.worst.drop} in one sync`,
            color: 'error'
        });
    }

    if (comeback.best) {
        awards.push({
            icon: 'fitness_center',
            title: 'Comeback Kid',
            winner: comeback.best.name,
            value: `+${comeback.best.recovery} recovery`,
            color: 'primary'
        });
    }

    if (trend.best) {
        awards.push({
            icon: 'trending_up',
            title: 'Trendsetter',
            winner: trend.best.name,
            value: `${trend.best.streak} syncs rising`,
            color: 'primary'
        });
    }

    if (peak.closest && peak.closest.distance === 0) {
        awards.push({
            icon: 'military_tech',
            title: 'At Their Peak',
            winner: peak.closest.name,
            value: `${peak.closest.peak} (all-time best!)`,
            color: 'secondary'
        });
    } else if (peak.closest) {
        awards.push({
            icon: 'military_tech',
            title: 'Closest to Peak',
            winner: peak.closest.name,
            value: `${peak.closest.distance} away from ${peak.closest.peak}`,
            color: 'secondary'
        });
    }

    if (milestone.closest) {
        awards.push({
            icon: 'flag',
            title: 'Milestone Watch',
            winner: milestone.closest.name,
            value: `${milestone.closest.distance} pts to ${milestone.closest.target}`,
            color: 'tertiary'
        });
    }

    if (grinder.top) {
        awards.push({
            icon: 'sports_mma',
            title: 'The Grinder',
            winner: grinder.top.name,
            value: `${grinder.top.total.toLocaleString()} games`,
            color: 'secondary'
        });
    }

    return awards;
}
