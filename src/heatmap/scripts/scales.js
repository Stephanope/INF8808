import * as d3 from 'd3';

export function getRevenueScale(data) {
    const maxRevenue = d3.max(data, d => d.Revenue);

    return d3.scaleLinear()
        .domain([
            0, 
            maxRevenue * 0.25,
            maxRevenue * 0.5,
            maxRevenue * 0.75,
            maxRevenue
        ])
        .range(["#1a0000", "#5c0000", "#e60000", "#ff9999", "#ffffff"]);
}

export function getVotesScale(data) {
    const maxVotes = d3.max(data, d => d.Votes);

    return d3.scaleLinear()
        .domain([
            0, 
            maxVotes * 0.25,
            maxVotes * 0.5,
            maxVotes * 0.75,
            maxVotes
        ])
        .range(["#1a0000", "#5c0000", "#e60000", "#ff9999", "#ffffff"]);
}