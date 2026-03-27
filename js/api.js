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
    const results = [];
    const batchSize = 5; // Batch 5 requests at a time
    
    for (let i = 0; i < usernames.length; i += batchSize) {
        const batch = usernames.slice(i, i + batchSize);
        const batchResults = await Promise.all(
            batch.map(async (username) => {
                const stats = await fetchPlayerStats(username);
                return stats && stats.chess_rapid ? { username, stats } : null;
            })
        );
        
        results.push(...batchResults.filter(r => r !== null));
        
        // Wait 100ms before next batch to be super safe
        if (i + batchSize < usernames.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    
    return results;
};
