import * as d3 from 'd3';
import * as helper from './helper.js';
import * as scales from './scales.js';
import * as legends from './legends.js';

export function buildHeatmaps(data, config) {
    const revenueScale = scales.getRevenueScale(data);
    const ratingScale = scales.getRatingScale(data);

    const maxRevenue = d3.max(data, d => d.Revenue);
    const maxRating = 10;

    drawHeatmap(
        "#heatmap-revenue", 
        data, 
        "Revenue", 
        revenueScale, 
        'Revenue (Millions $ USD)', 
        [0, maxRevenue],
        config
    );

    drawHeatmap(
        "#heatmap-vote", 
        data,
        "Rating",
        ratingScale,
        'Note moyenne (0-10)',
        [0, maxRating],
        config
    );
}

function drawHeatmap(containerId, data, valueKey, colorScale, legendTitle, domain, config) {
    const totalHeight = config.cellheight + config.margin.top + config.margin.bottom;
    const innerWidth = config.width - config.margin.left - config.margin.right;
    const cellWidth = innerWidth / data.length;

    const { svg, g } = helper.generateSVG(containerId, config.width, totalHeight, config.margin);

    g.selectAll('.cell')
        .data(data)
        .enter()
        .append('rect')
        .attr('class', 'cell')
        .attr('x', (d, i) => i * cellWidth)
        .attr('y', 0)
        .attr('width', cellWidth)
        .attr('height', config.cellheight)
        .style('stroke', '#1a1a1a')
        .style('stroke-width', '1px')
        .style('fill', d => colorScale(d[valueKey]))
        .on('mouseover', function (event, d) {
            g.selectAll('.cell')
                .style('stroke', '#1a1a1a')
                .style('stroke-width', '1px');
            hoverText.style('opacity', 0);
            
            const element = d3.select(event.currentTarget);

            element
                .interrupt()
                .raise()
                .style('stroke', 'white')
                .style('stroke-width', '3px');
            
            const xPos = parseFloat(element.attr('x')) + (cellWidth / 2);
            const yPos = config.cellheight / 2;

            hoverText
                .attr('x', xPos)
                .attr('y', yPos)
                .text(d[valueKey])
                .raise()
                .style('opacity', 1);
        })
    
    g.on('mouseleave', function () {
        g.selectAll('.cell')
            .style('stroke', '#1a1a1a')
            .style('stroke-width', '1px');
        hoverText.style('opacity', 0);
    });
    
        
    const hoverText = g.append('text')
        .attr('class', 'hover-label')
        .attr('text-anchor', 'middle')
        .attr('font-size', '14px')
        .attr('fill', 'white')
        .attr('dominant-baseline', 'middle')
        .attr('font-weight', 'bold')
        .style('pointer-events', 'none')
        .style('text-shadow', '1px 1px 2px black, -1px -1px 2px black')
        .style('opacity', 0);
    
    g.selectAll('.month-label')
        .data(data)
        .enter()
        .append('text')
        .attr('class', 'month-label')
        .attr('x', (d, i) => (i * cellWidth) + (cellWidth / 2))
        .attr('y', config.cellheight + 20)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .attr('fill', 'white')
        .text(d => d.month);
    
    legends.drawLegend(svg, colorScale, legendTitle, domain, config);
}