import * as d3 from 'd3'

export async function loadBoxplotData () {
    const raw = await d3.csv('./movies_clean.csv')

    return raw 
        .map(d => ({
            genres: d.genres, 
            revenue: +d.revenue,
            vote_average: +d.vote_average, 
            year: d.release_date ? +d.release_date.slice(0, 4) : null
        }))
        .filter(d => d.year && d.year > 1900 && d.revenue > 0 && d.vote_average > 0)
}