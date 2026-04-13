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

export function getRatingScale(data) {
    return d3.scaleLinear()
        .domain([0, 2.5, 5, 7.5, 10])
        .range(["#1a0000", "#5c0000", "#e60000", "#ff9999", "#ffffff"]);
}