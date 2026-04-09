import * as d3 from 'd3';

export function generateSVG(containerId, width, height, margin) {
    const svg = d3.select(containerId)
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    const title = containerId.includes('revenue') ? 'REVENUE' : 'NOTE CRITIQUE';
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', margin.top / 2)
        .attr('text-anchor', 'middle')
        .attr('font-size', '16px')
        .attr('font-weight', 'bold')
        .attr('fill', 'white')
        .text(title);

    return { svg, g };
}