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
        .range(["#ffffff","#ff9999","#e60000","#5c0000","#1a0000"]);
}