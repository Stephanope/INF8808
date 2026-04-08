import * as d3 from 'd3'
import { buildColorScale, formatMoney } from './scatterplot-data.js'

/**
 * Creates the scatterplot renderer.
 *
 * @param {string} selector The chart container selector.
 * @param {object[]} movies The movie dataset.
 * @param {Function} onMovieFocus Callback for point hover/click.
 * @returns {{render: Function}} The chart API.
 */
export function createScatterplot (selector, movies, onMovieFocus) {
  const container = d3.select(selector)
  const margin = { top: 56, right: 86, bottom: 56, left: 66 }

  const svg = container.append('svg')
    .attr('width', 0)
    .attr('height', 0)

  const root = svg.append('g').attr('class', 'plot-root')
  const gridX = root.append('g').attr('class', 'grid grid-x')
  const gridY = root.append('g').attr('class', 'grid grid-y')
  const axisX = root.append('g').attr('class', 'axis axis-x')
  const axisY = root.append('g').attr('class', 'axis axis-y')
  const thresholdLayer = root.append('g').attr('class', 'threshold-layer')
  const pointsLayer = root.append('g').attr('class', 'points-layer')
  const legendLayer = root.append('g').attr('class', 'legend-layer')

  // Groupe pour capturer les événements de zoom
  const zoomLayer = root.append('rect')
    .attr('class', 'zoom-layer')
    .attr('fill', 'none')
    .attr('pointer-events', 'all')

  // Mettre le zoom layer par-dessous pour que les points soient cliquables
  zoomLayer.lower()

  const xLabel = svg.append('text').attr('class', 'axis-label x-label')
  const yLabel = svg.append('text').attr('class', 'axis-label y-label')

  const tooltip = d3.select('#chart-tooltip')
  const xScale = d3.scaleLinear()
  const yScale = d3.scaleLinear()

  xScale.domain([0, d3.max(movies, d => d.budget) * 1.05]).nice()
  yScale.domain([0, d3.max(movies, d => d.revenue) * 1.05]).nice()

  /**
   * Draws the legend for the active metric.
   *
   * @param {object} metric The active metric definition.
   * @param {*} colorScale The color scale used for the points.
   * @param {object} plot The plot dimensions.
   */
  function drawLegend (metric, colorScale, plot) {
    legendLayer.selectAll('*').remove()

    const gradientId = `legend-gradient-${metric.key}`
    const defs = svg.select('defs').empty() ? svg.append('defs') : svg.select('defs')
    defs.select(`#${gradientId}`).remove()

    const linearGradient = defs
      .append('linearGradient')
      .attr('id', gradientId)
      .attr('x1', '0%')
      .attr('x2', '0%')
      .attr('y1', '100%')
      .attr('y2', '0%')

    const legendDomain = metric.colorDomain || d3.extent(movies, d => d[metric.key])
    const legendStart = legendDomain[0]
    const legendEnd = legendDomain[legendDomain.length - 1]
    const sample = d3.range(0, 1.01, 0.1)

    linearGradient.selectAll('stop')
      .data(sample)
      .enter()
      .append('stop')
      .attr('offset', d => `${d * 100}%`)
      .attr('stop-color', d => colorScale(legendStart + d * (legendEnd - legendStart)))

    const legendHeight = plot.height
    const legendWidth = 15
    const legendX = plot.width + 40
    const legendY = 0

    legendLayer
      .append('rect')
      .attr('x', legendX)
      .attr('y', legendY)
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .attr('fill', `url(#${gradientId})`)
      .attr('stroke', 'rgba(255,255,255,0.2)')

    const legendScale = d3
      .scaleLinear()
      .domain([legendStart, legendEnd])
      .range([legendY + legendHeight, legendY])

    const legendAxis = metric.key === 'runtime'
      ? d3.axisRight(legendScale)
        .tickValues([0, 90, 180])
        .tickFormat(d => (d === 180 ? '180+' : `${d}`))
      : d3.axisRight(legendScale).ticks(6)

    legendLayer
      .append('g')
      .attr('transform', `translate(${legendX + legendWidth}, 0)`)
      .call(legendAxis)
      .call(g => g.selectAll('text')
        .attr('fill', '#dcdde0')
        .style('font-size', '10px'))
      .call(g => g.selectAll('line').attr('stroke', 'rgba(255,255,255,0.2)'))
      .call(g => g.select('path').attr('stroke', 'rgba(255,255,255,0.25)'))

    legendLayer
      .append('text')
      .attr('x', metric.key === 'runtime' ? legendX - 17 : legendX - 2)
      .attr('y', -8)
      .attr('fill', '#f0f0f0')
      .style('font-size', '11px')
      .style('font-weight', 600)
      .style('letter-spacing', '0.1px')
      .text(metric.legendTitle)
  }

  /**
   * Positions the hover tooltip near the cursor.
   *
   * @param {MouseEvent} event The current pointer event.
   * @param {object} movie The hovered movie.
   */
  function placeTooltip (event, movie) {
    tooltip
      .style('left', `${event.offsetX + 8}px`)
      .style('top', `${Math.max(22, event.offsetY - 8)}px`)
      .text(movie.title)
      .classed('visible', true)
  }

  /**
   * Hides the hover tooltip.
   */
  function hideTooltip () {
    tooltip.classed('visible', false)
  }

  /**
   * Renders the scatterplot for the provided metric.
   *
   * @param {object} metric The active metric definition.
   */
  function render (metric) {
    const containerBounds = container.node().getBoundingClientRect()
    const panelBounds = container.node().parentElement.getBoundingClientRect()
    const width = Math.max(760, containerBounds.width || panelBounds.width)
    const height = Math.max(620, containerBounds.height || panelBounds.height)

    const plot = {
      width: width - margin.left - margin.right,
      height: height - margin.top - margin.bottom
    }

    svg.attr('viewBox', `0 0 ${width} ${height}`)
    svg.attr('width', width)
    svg.attr('height', height)
    root.attr('transform', `translate(${margin.left}, ${margin.top})`)

    // Configurer le zoom layer
    zoomLayer
      .attr('width', plot.width)
      .attr('height', plot.height)

    xScale.range([0, plot.width])
    yScale.range([plot.height, 0])

    // Créer les scales zoommées (pour le zoom)
    const xScaleZoomed = xScale.copy()
    const yScaleZoomed = yScale.copy()

    // Créer le comportement de zoom
    const zoom = d3.zoom()
      .scaleExtent([1, 200])
      .on('zoom', (event) => {
        let { x, y, k } = event.transform

        // Contraindre la translation basée sur la scale
        const maxX = 0
        const minX = plot.width * (1 - k)
        const maxY = 0
        const minY = plot.height * (1 - k)

        x = Math.max(minX, Math.min(maxX, x))
        y = Math.max(minY, Math.min(maxY, y))

        const transform = event.transform
        transform.x = x
        transform.y = y

        // Appliquer la transformation aux scales
        xScaleZoomed.range([0 * transform.k + transform.x, plot.width * transform.k + transform.x])
        yScaleZoomed.range([plot.height * transform.k + transform.y, 0 * transform.k + transform.y])

        // Mettre à jour les éléments du graphique
        pointsLayer.selectAll('circle')
          .attr('cx', d => xScaleZoomed(d.budget))
          .attr('cy', d => yScaleZoomed(d.revenue))

        // Ajuster le nombre de ticks dynamiquement selon le zoom
        const xTicks = Math.ceil(10 * k)
        const yTicks = Math.ceil(7 * k)

        axisX.call(d3.axisBottom(xScaleZoomed).ticks(xTicks).tickFormat(d => formatMoney(d)))
          .call(g => g.selectAll('text')
            .attr('fill', '#e9e9ea')
            .style('font-size', '10px'))
          .call(g => g.selectAll('line').attr('stroke', 'rgba(255,255,255,0.2)'))
          .call(g => g.select('path').attr('stroke', 'rgba(255,255,255,0.2)'))

        axisY.call(d3.axisLeft(yScaleZoomed).ticks(yTicks).tickFormat(d => formatMoney(d)))
          .call(g => g.selectAll('text')
            .attr('fill', '#e9e9ea')
            .style('font-size', '10px'))
          .call(g => g.selectAll('line').attr('stroke', 'rgba(255,255,255,0.2)'))
          .call(g => g.select('path').attr('stroke', 'rgba(255,255,255,0.2)'))

        gridX.call(d3.axisBottom(xScaleZoomed).ticks(xTicks).tickSize(-plot.height).tickFormat(''))
          .call(g => g.selectAll('line').attr('stroke', 'rgba(255,255,255,0.11)'))
          .call(g => g.select('path').attr('stroke', 'rgba(255,255,255,0.15)'))

        gridY.call(d3.axisLeft(yScaleZoomed).ticks(yTicks).tickSize(-plot.width).tickFormat(''))
          .call(g => g.selectAll('line').attr('stroke', 'rgba(255,255,255,0.11)'))
          .call(g => g.select('path').attr('stroke', 'rgba(255,255,255,0.15)'))
        // Mettre à jour la ligne de seuil de rentabilité
        thresholdLayer.selectAll('line')
          .attr('x1', xScaleZoomed(0))
          .attr('y1', yScaleZoomed(0))
          .attr('x2', xScaleZoomed(thresholdEnd))
          .attr('y2', yScaleZoomed(thresholdEnd))

        // Mettre à jour le label du seuil
        thresholdLayer.selectAll('text')
          .attr('x', xScaleZoomed(thresholdEnd * 0.95))
          .attr('y', yScaleZoomed(thresholdEnd) - 8)
      })

    // Appliquer le zoom au zoom layer
    zoomLayer.call(zoom)

    const xAxis = d3.axisBottom(xScale)
      .ticks(10)
      .tickFormat(d => formatMoney(d))

    const yAxis = d3.axisLeft(yScale)
      .ticks(7)
      .tickFormat(d => formatMoney(d))

    gridX
      .attr('transform', `translate(0, ${plot.height})`)
      .call(d3.axisBottom(xScale)
        .ticks(10)
        .tickSize(-plot.height)
        .tickFormat(''))
      .call(g => g.selectAll('line').attr('stroke', 'rgba(255,255,255,0.11)'))
      .call(g => g.select('path').attr('stroke', 'rgba(255,255,255,0.15)'))

    gridY
      .call(d3.axisLeft(yScale)
        .ticks(7)
        .tickSize(-plot.width)
        .tickFormat(''))
      .call(g => g.selectAll('line').attr('stroke', 'rgba(255,255,255,0.11)'))
      .call(g => g.select('path').attr('stroke', 'rgba(255,255,255,0.15)'))

    axisX
      .attr('transform', `translate(0, ${plot.height})`)
      .call(xAxis)
      .call(g => g.selectAll('text')
        .attr('fill', '#e9e9ea')
        .style('font-size', '10px'))
      .call(g => g.selectAll('line').attr('stroke', 'rgba(255,255,255,0.2)'))
      .call(g => g.select('path').attr('stroke', 'rgba(255,255,255,0.2)'))

    axisY
      .call(yAxis)
      .call(g => g.selectAll('text')
        .attr('fill', '#e9e9ea')
        .style('font-size', '10px'))
      .call(g => g.selectAll('line').attr('stroke', 'rgba(255,255,255,0.2)'))
      .call(g => g.select('path').attr('stroke', 'rgba(255,255,255,0.2)'))

    xLabel
      .attr('x', margin.left + plot.width / 2)
      .attr('y', height - 14)
      .attr('fill', '#d6d8dc')
      .style('font-size', '12px')
      .text('Budget ($)')

    yLabel
      .attr('x', -(margin.top + plot.height / 2))
      .attr('y', 18)
      .attr('transform', 'rotate(-90)')
      .attr('fill', '#d6d8dc')
      .style('font-size', '12px')
      .text('Revenue ($)')

    const maxBudget = d3.max(movies, d => d.budget)
    const thresholdEnd = maxBudget * 1.08

    thresholdLayer.selectAll('*').remove()
    thresholdLayer
      .append('line')
      .attr('x1', xScale(0))
      .attr('y1', yScale(0))
      .attr('x2', xScale(thresholdEnd))
      .attr('y2', yScale(thresholdEnd))
      .attr('stroke', '#ff2b42')
      .attr('stroke-width', 1.6)
      .attr('stroke-dasharray', '6,5')

    thresholdLayer
      .append('text')
      .attr('x', xScale(thresholdEnd * 0.95))
      .attr('y', yScale(thresholdEnd) - 8)
      .attr('text-anchor', 'end')
      .style('font-size', '11px')
      .attr('fill', '#ff5a67')
      .text('Seuil de rentabilite')

    const colorScale = buildColorScale(movies, metric.key, metric.colorStops)

    pointsLayer.selectAll('circle')
      .data(movies, d => d.id)
      .join(
        enter => enter.append('circle')
          .attr('cx', d => xScale(d.budget))
          .attr('cy', d => yScale(d.revenue))
          .attr('r', 2.3)
          .attr('fill', d => colorScale(d[metric.key]))
          .attr('opacity', 0.84)
          .on('mouseenter', function (event, d) {
            d3.select(this)
              .attr('r', 5.2)
              .attr('stroke', '#f8fff8')
              .attr('stroke-width', 1)
            placeTooltip(event, d)
            onMovieFocus(d)
          })
          .on('mousemove', function (event, d) {
            placeTooltip(event, d)
          })
          .on('mouseleave', function () {
            d3.select(this)
              .attr('r', 2.3)
              .attr('stroke', null)
            hideTooltip()
          })
          .on('click', function (event, d) {
            onMovieFocus(d)
          }),
        update => update
          .transition()
          .duration(350)
          .attr('cx', d => xScale(d.budget))
          .attr('cy', d => yScale(d.revenue))
          .attr('fill', d => colorScale(d[metric.key])),
        exit => exit.remove()
      )

    drawLegend(metric, colorScale, plot)
  }

  return { render }
}
