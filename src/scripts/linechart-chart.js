import * as d3 from 'd3'
import { formatMoney, formatCount } from './linechart-data.js'
import { COLORS, CHART_COLORS, translateCountryName } from './util.js'

function resolveChartWidth (selector) {
  const node = document.querySelector(selector)
  const containerWidth = node ? Math.floor(node.getBoundingClientRect().width) : 0
  return Math.max(320, containerWidth || (window.innerWidth - 100))
}

function placeTooltipWithinViewport (tooltip, event) {
  const offset = 12
  const tooltipNode = tooltip.node()
  if (!tooltipNode) {
    return
  }

  const tooltipRect = tooltipNode.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  let left = event.clientX + offset
  let top = event.clientY + offset

  if (left + tooltipRect.width > viewportWidth - 8) {
    left = event.clientX - tooltipRect.width - offset
  }
  if (left < 8) {
    left = 8
  }

  if (top + tooltipRect.height > viewportHeight - 8) {
    top = event.clientY - tooltipRect.height - offset
  }
  if (top < 8) {
    top = 8
  }

  tooltip
    .style('left', `${left}px`)
    .style('top', `${top}px`)
}

/**
 * Creates the multi-line chart visualization.
 *
 * @param {string} selector The chart container selector.
 * @param {object[]} data The yearly aggregated data.
 * @returns {{render: Function}} The chart API.
 */
export function createLineCharts (selector, data) {
  const container = d3.select(selector)

  // Chart dimensions
  const margin = { top: 15, right: 30, bottom: 45, left: 70 }
  const width = resolveChartWidth(selector)
  const height = 220

  // Create three chart sections
  const charts = [
    {
      title: 'Nombre de films',
      key: 'count',
      color: CHART_COLORS.colors[0],
      yLabel: 'Nombre',
      formatter: formatCount,
      selector: container.append('div').attr('class', 'chart-section')
    },
    {
      title: 'Budget moyen',
      key: 'avgBudget',
      color: CHART_COLORS.colors[1],
      yLabel: 'Budget ($)',
      formatter: formatMoney,
      selector: container.append('div').attr('class', 'chart-section')
    },
    {
      title: 'Revenus moyens',
      key: 'avgRevenue',
      color: CHART_COLORS.colors[2],
      yLabel: 'Revenus ($)',
      formatter: formatMoney,
      selector: container.append('div').attr('class', 'chart-section')
    }
  ]

  // Draw each chart
  charts.forEach(chart => {
    drawLineChart(chart.selector, data, chart, margin, width, height)
  })

  return {
    render: () => {
      // Re-render on window resize if needed
      charts.forEach(chart => {
        // Could implement responsive resizing here
      })
    }
  }
}

/**
 * Creates line charts for each of the top 5 countries.
 *
 * @param {string} selector The chart container selector.
 * @param {Object} data Object containing topCountries and countryData.
 * @returns {{render: Function}} The chart API.
 */
export function createCountryLineCharts (selector, data) {
  const container = d3.select(selector)
  const { topCountries, countryData } = data

  // Chart dimensions
  const margin = { top: 15, right: 30, bottom: 45, left: 70 }
  const width = resolveChartWidth(selector)
  const height = 220

  // Color scale for countries (colorblind-friendly palette)
  const colorScale = d3.scaleOrdinal()
    .domain(topCountries)
    .range(CHART_COLORS.colors)

  // Create legend container at top right
  const legendContainer = container.append('div')
    .attr('class', 'country-legend')
    .style('position', 'absolute')
    .style('top', '0')
    .style('right', '0')
    .style('background-color', COLORS.PRIMARY_BG)
    .style('border', `1px solid ${COLORS.BORDER}`)
    .style('border-radius', '4px')
    .style('padding', '10px')
    .style('z-index', '100')

  topCountries.forEach(country => {
    const legendItem = legendContainer.append('div')
      .style('display', 'flex')
      .style('align-items', 'center')
      .style('margin-bottom', '5px')

    legendItem.append('div')
      .style('width', '12px')
      .style('height', '2px')
      .style('background-color', colorScale(country))
      .style('margin-right', '8px')

    legendItem.append('span')
      .style('color', COLORS.TEXT_SECONDARY)
      .style('font-size', '12px')
      .text(translateCountryName(country))
  })

  // Define three metrics
  const metrics = [
    {
      title: 'Nombre de films',
      key: 'count',
      yLabel: 'Nombre de films',
      formatter: formatCount
    },
    {
      title: 'Budget moyen',
      key: 'avgBudget',
      yLabel: 'Budget ($)',
      formatter: formatMoney
    },
    {
      title: 'Revenus moyens',
      key: 'avgRevenue',
      yLabel: 'Revenus ($)',
      formatter: formatMoney
    }
  ]

  // Create a chart for each metric with all countries
  metrics.forEach(metric => {
    drawCountryLineChart(container, countryData, topCountries, metric, colorScale, margin, width, height)
  })

  return {
    render: () => {
      // Re-render on window resize if needed
    }
  }
}

/**
 * Draws a line chart with multiple countries.
 *
 * @param {Selection} container The D3 selection for the container.
 * @param {Object} countryData Data grouped by country.
 * @param {string[]} countries List of countries to display.
 * @param {Object} metric Metric configuration.
 * @param {Function} colorScale Color scale for countries.
 * @param {Object} margin Chart margins.
 * @param {number} width Chart width.
 * @param {number} height Chart height.
 */
function drawCountryLineChart (container, countryData, countries, metric, colorScale, margin, width, height) {
  const chartWidth = width - margin.left - margin.right
  const chartHeight = height - margin.top - margin.bottom

  // Add metric title
  container.append('h3')
    .attr('class', 'chart-title')
    .style('text-align', 'center')
    .text(metric.title)

  // Create SVG
  const svg = container.append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMinYMin meet')
    .attr('class', 'line-chart-svg')

  // Add background
  svg.append('rect')
    .attr('width', width)
    .attr('height', height)
    .attr('fill', '#323131')

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`)

  // Get all years across all countries
  const allYears = d3.merge(countries.map(country => countryData[country].map(d => d.year)))
  const extent = d3.extent(allYears)

  // Create scales
  const xScale = d3.scaleLinear()
    .domain([extent[0], extent[1]])
    .range([0, chartWidth])

  // Get max value across all countries for this metric
  const maxValue = d3.max(countries, country => d3.max(countryData[country], d => d[metric.key]))

  const yScale = d3.scaleLinear()
    .domain([0, maxValue])
    .range([chartHeight, 0])

  // Create line generator
  const line = d3.line()
    .x(d => xScale(d.year))
    .y(d => yScale(d[metric.key]))

  // Draw grid
  g.append('g')
    .attr('class', 'grid grid-y')
    .attr('opacity', 0.1)
    .call(d3.axisLeft(yScale)
      .tickSize(-chartWidth)
      .tickFormat('')
    )

  // Draw lines for each country
  countries.forEach(country => {
    g.append('path')
      .datum(countryData[country])
      .attr('class', 'line-path')
      .attr('fill', 'none')
      .attr('stroke', colorScale(country))
      .attr('stroke-width', 2.5)
      .attr('d', line)
  })

  // Draw dots for each country
  countries.forEach(country => {
    g.selectAll(`.chart-dot-${country}`)
      .data(countryData[country])
      .enter()
      .append('circle')
      .attr('class', `chart-dot chart-dot-${country}`)
      .attr('cx', d => xScale(d.year))
      .attr('cy', d => yScale(d[metric.key]))
      .attr('r', 3)
      .attr('fill', colorScale(country))
      .attr('opacity', 0.7)
      .on('mouseover', function (event, d) {
        d3.select(this)
          .attr('r', 5)
          .attr('opacity', 1)

        // Make other lines translucent
        g.selectAll('.line-path')
          .style('opacity', function () {
            // Get the stroke color of this line
            const lineColor = d3.select(this).attr('stroke')
            // Compare with the hovered country's color
            return lineColor === colorScale(country) ? 1 : 0.15
          })

        const tooltip = d3.select('.linechart-tooltip')
        tooltip
          .style('display', 'block')
          .style('background-color', COLORS.SECONDARY_BG)
          .style('border-color', COLORS.BORDER)
          .html(`<strong>${country}</strong><br/>Période: ${d.year - 4}-${d.year}<br/>${metric.title}: ${metric.formatter(d[metric.key])}`)

        placeTooltipWithinViewport(tooltip, event)
      })
      .on('mouseout', function () {
        d3.select(this)
          .attr('r', 3)
          .attr('opacity', 0.7)

        // Restore all lines to full opacity
        g.selectAll('.line-path')
          .style('opacity', 1)

        d3.select('.linechart-tooltip')
          .style('display', 'none')
      })
  })

  // Draw axes
  const tickValues = d3.range(Math.ceil(extent[0] / 5) * 5, extent[1] + 5, 5)

  g.append('g')
    .attr('class', 'axis axis-x')
    .attr('transform', `translate(0,${chartHeight})`)
    .call(d3.axisBottom(xScale)
      .tickValues(tickValues)
      .tickFormat(d3.format('d')))

  g.append('g')
    .attr('class', 'axis axis-y')
    .call(d3.axisLeft(yScale).tickFormat(d => {
      if (d >= 1e9) return (d / 1e9).toFixed(1) + 'G'
      if (d >= 1e6) return (d / 1e6).toFixed(0) + 'M'
      if (d >= 1e3) return (d / 1e3).toFixed(0) + 'K'
      return d
    }))

  // Add axis labels
  g.append('text')
    .attr('class', 'axis-label y-label')
    .attr('transform', 'rotate(-90)')
    .attr('y', 0 - margin.left)
    .attr('x', 0 - chartHeight / 2)
    .attr('dy', '1em')
    .style('text-anchor', 'middle')
    .text(metric.yLabel)

  svg.append('text')
    .attr('class', 'axis-label x-label')
    .attr('x', margin.left + chartWidth / 2)
    .attr('y', height - 5)
    .style('text-anchor', 'middle')
    .text('Année')
}

/**
 * Draws a single line chart.
 *
 * @param {Selection} container The D3 selection for the container.
 * @param {object[]} data The yearly data.
 * @param {object} chart The chart configuration.
 * @param {object} margin The chart margins.
 * @param {number} width The chart width.
 * @param {number} height The chart height.
 */
function drawLineChart (container, data, chart, margin, width, height) {
  const chartWidth = width - margin.left - margin.right
  const chartHeight = height - margin.top - margin.bottom

  // Add title
  container.append('h3')
    .attr('class', 'chart-title')
    .style('text-align', 'center')
    .text(chart.title)

  // Create SVG
  const svg = container.append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMinYMin meet')
    .attr('class', 'line-chart-svg')

  // Add background
  svg.append('rect')
    .attr('width', width)
    .attr('height', height)
    .attr('fill', '#323131')

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`)

  // Create scales
  const extent = d3.extent(data, d => d.year)
  const xScale = d3.scaleLinear()
    .domain([extent[0], extent[1]])
    .range([0, chartWidth])

  const yScale = d3.scaleLinear()
    .domain([0, d3.max(data, d => d[chart.key])])
    .range([chartHeight, 0])

  // Create line generator
  const line = d3.line()
    .x(d => xScale(d.year))
    .y(d => yScale(d[chart.key]))

  // Draw grid
  g.append('g')
    .attr('class', 'grid grid-y')
    .attr('opacity', 0.1)
    .call(d3.axisLeft(yScale)
      .tickSize(-chartWidth)
      .tickFormat('')
    )

  // Draw path
  g.append('path')
    .datum(data)
    .attr('class', 'line-path')
    .attr('fill', 'none')
    .attr('stroke', chart.color)
    .attr('stroke-width', 2.5)
    .attr('d', line)

  // Draw dots
  g.selectAll('.chart-dot')
    .data(data)
    .enter()
    .append('circle')
    .attr('class', 'chart-dot')
    .attr('cx', d => xScale(d.year))
    .attr('cy', d => yScale(d[chart.key]))
    .attr('r', 4)
    .attr('fill', chart.color)
    .attr('opacity', 0.7)
    .on('mouseover', function (event, d) {
      d3.select(this)
        .attr('r', 6)
        .attr('opacity', 1)

      // Show tooltip
      const tooltip = d3.select('.linechart-tooltip')
      tooltip
        .style('display', 'block')
        .html(`<strong>Année: ${d.year}</strong><br/>${chart.title}: ${chart.formatter(d[chart.key])}`)

      placeTooltipWithinViewport(tooltip, event)
    })
    .on('mouseout', function () {
      d3.select(this)
        .attr('r', 4)
        .attr('opacity', 0.7)

      d3.select('.linechart-tooltip')
        .style('display', 'none')
    })

  // Draw axes
  const extent2 = d3.extent(data, d => d.year)
  const tickValues = d3.range(Math.ceil(extent2[0] / 5) * 5, extent2[1] + 5, 5)

  g.append('g')
    .attr('class', 'axis axis-x')
    .attr('transform', `translate(0,${chartHeight})`)
    .call(d3.axisBottom(xScale)
      .tickValues(tickValues)
      .tickFormat(d3.format('d')))

  g.append('g')
    .attr('class', 'axis axis-y')
    .call(d3.axisLeft(yScale).tickFormat(d => {
      if (d >= 1e9) return (d / 1e9).toFixed(1) + 'G'
      if (d >= 1e6) return (d / 1e6).toFixed(0) + 'M'
      if (d >= 1e3) return (d / 1e3).toFixed(0) + 'K'
      return d
    }))

  // Add axis labels
  g.append('text')
    .attr('class', 'axis-label y-label')
    .attr('transform', 'rotate(-90)')
    .attr('y', 0)
    .attr('x', 0 - chartHeight / 2)
    .attr('dy', '1em')
    .style('text-anchor', 'middle')
    .text(chart.yLabel)

  // Add X axis label to SVG (not to g) so it appears at absolute position
  svg.append('text')
    .attr('class', 'axis-label x-label')
    .attr('x', margin.left + chartWidth / 2)
    .attr('y', height - 5)
    .style('text-anchor', 'middle')
    .text('Année')
}
