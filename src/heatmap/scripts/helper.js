import * as d3 from 'd3';

export function generateSVG(containerId, width, height, margin) {
    const svg = d3.select(containerId)
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    let title = '';
    
    switch (true) {
        case containerId.includes('revenue'):
            title = 'REVENUE';
            break;
        case containerId.includes('vote'):
            title = 'NOTE CRITIQUE';
            break;
        case containerId.includes('count'):
            title = 'NOMBRE DE FILMS';
            break;
    }
    
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