import * as d3 from 'd3';

export function drawLegend(svg, colorScale, title, domain, config) {
    const legendWidth = 400;
    const legendHeight = 15;
    const legendX = (config.width - legendWidth) / 2;
    const legendY = config.cellheight + 70;

    const gradientId = `gradient-${title.replace(/[^a-zA-Z]/g, '')}`;

    const defs = svg.append('defs');
    const linearGradient = defs.append('linearGradient')
        .attr('id', gradientId)
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '100%')
        .attr('y2', '0%');
    
    const steps = d3.range(0, 1.1, 0.1);
    linearGradient.selectAll('stop')
        .data(steps)
        .enter().append('stop')
        .attr('offset', d => `${d * 100}%`)
        .attr('stop-color', d => colorScale(domain[0] + d * (domain[1] - domain[0])));
    
    svg.append('rect')
        .attr('x', legendX).attr('y', legendY)
        .attr('width', legendWidth).attr('height', legendHeight)
        .style('fill', `url(#${gradientId})`)
        .style('stroke', '#1a1a1a')
        .style('stroke-width', '1px');
    
    const legendScale = d3.scaleLinear().domain(domain).range([0, legendWidth]);
    const ticks = [domain[0], (domain[1]-domain[0])/2, domain[1]];

    svg.append('g')
        .attr('transform', `translate(${legendX}, ${legendY + legendHeight + 15})`)
        .selectAll('text')
        .data(ticks)
        .enter().append('text')
        .attr('x', d => legendScale(d))
        .attr('text-anchor', 'middle')
        .attr('fill', 'white')
        .style('font-size', '12px')
        .text(d => d.toFixed(0));

    svg.append('text')
        .attr('x', config.width / 2)
        .attr('y', legendY + legendHeight + 35)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .attr('fill', 'white')
        .text(title);
}