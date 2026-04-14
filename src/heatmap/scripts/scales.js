import * as d3 from 'd3';

export function getScale(min, max) {
    return d3.scaleLinear()
        .domain([
            min,
            ((max - min) * 0.25) + min,
            ((max - min) * 0.5) + min,
            ((max - min) * 0.75) + min,
            max
        ])
        .range(["#1a0000", "#5c0000", "#e60000", "#ff9999", "#ffffff"]);
}