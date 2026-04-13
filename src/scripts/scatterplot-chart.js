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
  const clipId = 'scatterplot-plot-clip'
  const zoomStep = 1.25
  const minZoom = 1
  const maxZoom = 8

  let zoomLevel = 1
  let panX = 0
  let panY = 0
  let currentPlot = null
  let currentThresholdEnd = null

  const svg = container.append('svg')
    .attr('width', 0)
    .attr('height', 0)

  const defs = svg.append('defs')
  const plotClip = defs
    .append('clipPath')
    .attr('id', clipId)
    .attr('clipPathUnits', 'userSpaceOnUse')
    .append('rect')

  const root = svg.append('g').attr('class', 'plot-root')
  const plotBody = root.append('g')
    .attr('class', 'plot-body')
    .attr('clip-path', `url(#${clipId})`)

  const gridX = plotBody.append('g').attr('class', 'grid grid-x')
  const gridY = plotBody.append('g').attr('class', 'grid grid-y')
  const axisX = root.append('g').attr('class', 'axis axis-x')
  const axisY = root.append('g').attr('class', 'axis axis-y')
  const thresholdLayer = plotBody.append('g').attr('class', 'threshold-layer')
  const pointsLayer = plotBody.append('g').attr('class', 'points-layer')
  const legendLayer = root.append('g').attr('class', 'legend-layer')

  const xLabel = svg.append('text').attr('class', 'axis-label x-label')
  const yLabel = svg.append('text').attr('class', 'axis-label y-label')

  const tooltip = d3.select('#chart-tooltip')
  const xScale = d3.scaleLinear()
  const yScale = d3.scaleLinear()

  xScale.domain([0, d3.max(movies, d => d.budget) * 1.05]).nice()
  yScale.domain([0, d3.max(movies, d => d.revenue) * 1.05]).nice()

  /**
   * Computes a centered zoomed range from a base range.
   *
   * @param {number[]} range The base range.
   * @param {number} level The zoom level.
   * @param {number} panOffset The translation offset.
   * @returns {number[]} The zoomed range.
   */
  function getZoomedRange (range, level, panOffset) {
    const start = range[0]
    const end = range[1]
    const center = (start + end) / 2

    return [
      center + (start - center) * level + panOffset,
      center + (end - center) * level + panOffset
    ]
  }

  /**
   * Builds the scaled axes used for the current zoom level.
   *
   * @param {object} plot The plot dimensions.
   * @returns {{xScaleZoomed: *, yScaleZoomed: *}} The zoomed scales.
   */
  function createZoomedScales (plot) {
    const xScaleZoomed = xScale.copy()
    const yScaleZoomed = yScale.copy()

    xScaleZoomed.range(getZoomedRange([0, plot.width], zoomLevel, panX))
    yScaleZoomed.range(getZoomedRange([plot.height, 0], zoomLevel, panY))

    return { xScaleZoomed, yScaleZoomed }
  }

  /**
   * Clamps a zoom level to the supported range.
   *
   * @param {number} value The candidate zoom level.
   * @returns {number} The clamped zoom level.
   */
  function clampZoomLevel (value) {
    return Math.max(minZoom, Math.min(maxZoom, value))
  }

  /**
   * Clamps the current pan offset so the chart stays within view.
   *
   * @param {object} plot The plot dimensions.
   */
  function clampPan (plot) {
    const maxPanX = Math.max(0, (plot.width * (zoomLevel - 1)) / 2)
    const maxPanY = Math.max(0, (plot.height * (zoomLevel - 1)) / 2)

    panX = Math.max(-maxPanX, Math.min(maxPanX, panX))
    panY = Math.max(-maxPanY, Math.min(maxPanY, panY))
  }

  /**
   * Keeps the pan centered when zoom is at the minimum level.
   */
  function normalizePan () {
    if (zoomLevel === minZoom) {
      panX = 0
      panY = 0
    }
  }

  /**
   * Applies the current zoom state to the chart layers.
   *
   * @param {object} plot The plot dimensions.
   * @param {number} thresholdEnd The threshold line endpoint.
   */
  function applyZoom (plot, thresholdEnd) {
    currentPlot = plot
    currentThresholdEnd = thresholdEnd

    const { xScaleZoomed, yScaleZoomed } = createZoomedScales(plot)

    const xTicks = Math.ceil(10 * zoomLevel)
    const yTicks = Math.ceil(7 * zoomLevel)

    const updateTickVisibility = (axisGroup, scale, min, max) => {
      axisGroup.selectAll('.tick text')
        .style('display', d => {
          const p = scale(d)
          return p < min || p > max ? 'none' : null
        })
    }

    pointsLayer.selectAll('circle')
      .attr('cx', d => xScaleZoomed(d.budget))
      .attr('cy', d => yScaleZoomed(d.revenue))

    axisX.call(d3.axisBottom(xScaleZoomed).ticks(xTicks).tickFormat(d => formatMoney(d)))
      .call(g => g.selectAll('text')
        .attr('fill', '#e9e9ea')
        .style('font-size', '10px'))
      .call(g => g.selectAll('line').attr('stroke', 'rgba(255,255,255,0.2)'))
      .call(g => g.select('path').attr('stroke', 'rgba(255,255,255,0.2)'))
      .call(g => g.selectAll('path, line').attr('clip-path', `url(#${clipId})`))

    updateTickVisibility(axisX, xScaleZoomed, 0, plot.width)

    axisY.call(d3.axisLeft(yScaleZoomed).ticks(yTicks).tickFormat(d => formatMoney(d)))
      .call(g => g.selectAll('text')
        .attr('fill', '#e9e9ea')
        .style('font-size', '10px'))
      .call(g => g.selectAll('line').attr('stroke', 'rgba(255,255,255,0.2)'))
      .call(g => g.select('path').attr('stroke', 'rgba(255,255,255,0.2)'))
      .call(g => g.selectAll('path, line').attr('clip-path', `url(#${clipId})`))

    updateTickVisibility(axisY, yScaleZoomed, 0, plot.height)

    gridX.call(d3.axisBottom(xScaleZoomed).ticks(xTicks).tickSize(-plot.height).tickFormat(''))
      .call(g => g.selectAll('line').attr('stroke', 'rgba(255,255,255,0.11)'))
      .call(g => g.select('path').attr('stroke', 'rgba(255,255,255,0.15)'))

    gridY.call(d3.axisLeft(yScaleZoomed).ticks(yTicks).tickSize(-plot.width).tickFormat(''))
      .call(g => g.selectAll('line').attr('stroke', 'rgba(255,255,255,0.11)'))
      .call(g => g.select('path').attr('stroke', 'rgba(255,255,255,0.15)'))

    thresholdLayer.selectAll('line')
      .attr('x1', xScaleZoomed(0))
      .attr('y1', yScaleZoomed(0))
      .attr('x2', xScaleZoomed(thresholdEnd))
      .attr('y2', yScaleZoomed(thresholdEnd))

    thresholdLayer.selectAll('text')
      .attr('x', xScaleZoomed(thresholdEnd * 0.95))
      .attr('y', yScaleZoomed(thresholdEnd) - 8)
  }

  /**
   * Applies the current zoom and pan state if a plot has already been rendered.
   *
   * @returns {boolean} True when the view was refreshed.
   */
  function refreshView () {
    if (currentPlot && currentThresholdEnd !== null) {
      applyZoom(currentPlot, currentThresholdEnd)
      return true
    }

    return false
  }

  const dragBehavior = d3.drag()
    .filter(event => event.button === 0)
    .on('start', () => {
      svg.style('cursor', 'grabbing')
    })
    .on('drag', (event) => {
      if (!currentPlot) {
        return
      }

      if (zoomLevel === minZoom) {
        return
      }

      panY += event.dy
      panX += event.dx
      clampPan(currentPlot)
      refreshView()
    })
    .on('end', () => {
      svg.style('cursor', zoomLevel > minZoom ? 'grab' : 'default')
    })

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
    svg.style('cursor', zoomLevel > minZoom ? 'grab' : 'default')
    root.attr('transform', `translate(${margin.left}, ${margin.top})`)
    plotClip
      .attr('x', margin.left - 70)
      .attr('y', margin.top - 70)
      .attr('width', plot.width + 15)
      .attr('height', plot.height + 15)

    xScale.range([0, plot.width])
    yScale.range([plot.height, 0])

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
      .call(g => g.selectAll('path, line').attr('clip-path', `url(#${clipId})`))

    axisX.selectAll('.tick text')
      .style('display', d => {
        const p = xScale(d)
        return p < 0 || p > plot.width ? 'none' : null
      })

    axisY
      .call(yAxis)
      .call(g => g.selectAll('text')
        .attr('fill', '#e9e9ea')
        .style('font-size', '10px'))
      .call(g => g.selectAll('line').attr('stroke', 'rgba(255,255,255,0.2)'))
      .call(g => g.select('path').attr('stroke', 'rgba(255,255,255,0.2)'))
      .call(g => g.selectAll('path, line').attr('clip-path', `url(#${clipId})`))

    axisY.selectAll('.tick text')
      .style('display', d => {
        const p = yScale(d)
        return p < 0 || p > plot.height ? 'none' : null
      })

    xLabel
      .attr('x', margin.left + plot.width / 2)
      .attr('y', height - 14)
      .attr('fill', '#d6d8dc')
      .style('font-size', '12px')
      .text('Budget ($)')
      .call(g => g.selectAll('path, line').attr('clip-path', `url(#${clipId})`))

    yLabel
      .attr('x', -(margin.top + plot.height / 2))
      .attr('y', 18)
      .attr('transform', 'rotate(-90)')
      .attr('fill', '#d6d8dc')
      .style('font-size', '12px')
      .text('Revenue ($)')
      .call(g => g.selectAll('path, line').attr('clip-path', `url(#${clipId})`))

    const maxBudget = d3.max(movies, d => d.budget)
    const thresholdEnd = maxBudget * 1.08
    currentThresholdEnd = thresholdEnd

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
            svg.style('cursor', 'pointer')
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
            svg.style('cursor', zoomLevel > minZoom ? 'grab' : 'default')
            hideTooltip()
          })
          .on('click', function (event, d) {
            onMovieFocus(d)
          }),
        update => update
          .call(selection => {
            if (zoomLevel > minZoom) {
              selection
                .transition()
                .duration(350)
                .attr('cx', d => xScale(d.budget))
                .attr('cy', d => yScale(d.revenue))
                .attr('fill', d => colorScale(d[metric.key]))
            } else {
              selection
                .interrupt()
                .attr('cx', d => xScale(d.budget))
                .attr('cy', d => yScale(d.revenue))
                .attr('fill', d => colorScale(d[metric.key]))
            }
          }),
        exit => exit.remove()
      )

    pointsLayer.selectAll('circle')
      .attr('fill', d => colorScale(d[metric.key]))

    applyZoom(plot, thresholdEnd)
    svg.call(dragBehavior)

    drawLegend(metric, colorScale, plot)
  }

  return {
    render,
    resetZoom: () => {
      zoomLevel = minZoom
      panX = 0
      panY = 0
      svg.style('cursor', 'default')

      if (currentPlot && currentThresholdEnd !== null) {
        applyZoom(currentPlot, currentThresholdEnd)
      }
    },
    zoomIn: () => {
      const plotWidth = Math.max(760, container.node().getBoundingClientRect().width || container.node().parentElement.getBoundingClientRect().width) - margin.left - margin.right
      const plotHeight = Math.max(620, container.node().getBoundingClientRect().height || container.node().parentElement.getBoundingClientRect().height) - margin.top - margin.bottom
      zoomLevel = clampZoomLevel(zoomLevel * zoomStep)
      if (currentPlot) {
        clampPan(currentPlot)
      }
      svg.style('cursor', zoomLevel > minZoom ? 'grab' : 'default')
      if (!refreshView()) {
        applyZoom({ width: plotWidth, height: plotHeight }, d3.max(movies, d => d.budget) * 1.08)
      }
    },
    zoomOut: () => {
      const plotWidth = Math.max(760, container.node().getBoundingClientRect().width || container.node().parentElement.getBoundingClientRect().width) - margin.left - margin.right
      const plotHeight = Math.max(620, container.node().getBoundingClientRect().height || container.node().parentElement.getBoundingClientRect().height) - margin.top - margin.bottom
      zoomLevel = clampZoomLevel(zoomLevel / zoomStep)
      normalizePan()
      if (currentPlot) {
        clampPan(currentPlot)
      }
      svg.style('cursor', zoomLevel > minZoom ? 'grab' : 'default')
      if (!refreshView()) {
        applyZoom({ width: plotWidth, height: plotHeight }, d3.max(movies, d => d.budget) * 1.08)
      }
    }
  }
}
