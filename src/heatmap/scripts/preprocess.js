export function formatData(rawData) {
    const monthNames = ["JAN", "FÉB", "MAR", "AVR", "MAI", "JUIN", "JUIL", "AOÛ", "SEP", "OCT", "NOV", "DÉC"];

    const monthlyStats = Array.from({ length: 12 }, (_, i) => ({ 
        month: monthNames[i], 
        totalRevenue: 0, 
        revenueCount: 0,
        totalVotes: 0,
        voteCount: 0,
    }));

    rawData.forEach(row => {
        if (!row.release_date) return;

        const dateParts = row.release_date.split('-');
        if (dateParts.length !== 3) return;

        const monthIndex = parseInt(dateParts[1], 10) - 1;

        if (monthIndex >= 0 && monthIndex < 12) {
            const revenue = parseFloat(row.revenue);
            const votes = parseFloat(row.vote_count);

            if (!isNaN(revenue) && revenue > 0) {
                monthlyStats[monthIndex].totalRevenue += revenue;
                monthlyStats[monthIndex].revenueCount++;
            }

            if (!isNaN(votes) && votes > 0) {
                monthlyStats[monthIndex].totalVotes += votes;
                monthlyStats[monthIndex].voteCount++;
            }
        }
    });

    const processedData = monthlyStats.map(stat => {
        const avgRevenueRaw = stat.revenueCount > 0 ? (stat.totalRevenue / stat.revenueCount) : 0;
        const avgRevenueMillions = avgRevenueRaw / 1e6;

        const avgVotes = stat.voteCount > 0 ? (stat.totalVotes / stat.voteCount) : 0;

        return {
            month: stat.month,
            Revenue: Math.round(avgRevenueMillions * 100) / 100,
            Votes: Math.round(avgVotes * 100) / 100,
        };
    });

    return processedData;
}