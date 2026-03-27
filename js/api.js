const API_BASE = "https://api.chess.com/pub/player";

export const fetchPlayerStats = async (username) => {
    try {
        const response = await fetch(`${API_BASE}/${username}/stats`);
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching player stats:", error);
        return null; // Return null on failure (e.g. 404 not found)
    }
};

export const fetchAllPlayers = async (usernames) => {
    const promises = usernames.map(username => 
        fetchPlayerStats(username).then(stats => ({ username, stats }))
    );
    const results = await Promise.allSettled(promises);
    return results
        .filter(r => r.status === 'fulfilled' && r.value.stats !== null)
        .map(r => r.value);
};
