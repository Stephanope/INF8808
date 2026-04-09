import * as d3 from 'd3';

export function drawLegend(svg, colorScale, title, domain, config) {
    const legendWidth = 400;
    const legendHeight = 15;
    const legendX = (config.width - legendWidth) / 2;
    const legendY = config.height - config.margin.bottom + 40;

    const gradientId = `grad-${title.replace(/\s/g, '')}`;

    const defs = svg.append('defs');
    const linearGradient = defs.append('linearGradient')
        .attr('id', gradientId)
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '100%')
        .attr('y2', '0%');

    const stops = d3.range(0, 1.05, 0.05);
    linearGradient.selectAll('stop')
        .data(stops)
        .enter()
        .append('stop')
        .attr('offset', d => `${d * 100}%`)
        .attr('stop-color', d => colorScale(domain[0] + d * (domain[1] - domain[0])));
    
    svg.append('rect')
        .attr('x', legendX)
        .attr('y', legendY)
        .attr('width', legendWidth)
        .attr('height', legendHeight)
        .style('fill', `url(#${gradientId})`)
    
    const legendScale = d3.scaleLinear().domain(domain).range([0, legendWidth]);
    const legendAxis = d3.axisBottom(legendScale).ticks(5).tickFormat(5);

    svg.append('g')
        .attr('transform', `translate(${legendX}, ${legendY + legendHeight})`)
        .call(legendAxis)
        .selectAll('text')
        .attr('fill', 'white');
    
    svg.selectAll('.domain, .tick line').attr('stroke', 'white');

    svg.append('text')
        .attr('x', config.width / 2)
        .attr('y', legendY + legendHeight + 35)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .attr('fill', 'white')
        .text(title);
}