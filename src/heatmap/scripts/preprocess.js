export function formatData(rawData) {

    const monthNames = ["JAN", "FÉB", "MAR", "AVR", "MAI", "JUIN", "JUIL", "AOÛ", "SEP", "OCT", "NOV", "DÉC"];

    const monthlyStats = Array.from({ length: 12 }, (_, i) => ({ 
        month: monthNames[i], 
        totalRevenue: 0, 
        revenueCount: 0,
        totalRating: 0,
        ratingCount: 0,
    }));

    rawData.forEach(row => {
        if (!row.release_date) return;

        const dateParts = row.release_date.split('-');
        if (dateParts.length !== 3) return;

        const monthIndex = parseInt(dateParts[1], 10) - 1;

        if (monthIndex >= 0 && monthIndex < 12) {
            const revenue = parseFloat(row.revenue);
            const rating = parseFloat(row.vote_average);

            if (!isNaN(revenue) && revenue > 0) {
                monthlyStats[monthIndex].totalRevenue += revenue;
                monthlyStats[monthIndex].revenueCount++;
            }

            if (!isNaN(rating) && rating > 0) {
                monthlyStats[monthIndex].totalRating += rating;
                monthlyStats[monthIndex].ratingCount++;
            }
        }
    });

    const processedData = monthlyStats.map(stat => {
        const avgRevenueRaw = stat.revenueCount > 0 ? (stat.totalRevenue / stat.revenueCount) : 0;
        const avgRevenueMillions = avgRevenueRaw / 1e6;

        const avgRating = stat.ratingCount > 0 ? (stat.totalRating / stat.ratingCount) : 0;

        return {
            month: stat.month,
            Revenue: Math.round(avgRevenueMillions * 100) / 100,
            Rating: Math.round(avgRating * 100) / 100,
        };
    });

    return processedData;
}