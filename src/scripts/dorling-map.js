import * as d3 from 'd3'

const MOVIES_DATA_URL = './movies_clean.csv'
const WORLD_GEOJSON_URL =
  'https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson'

const COUNTRY_ALIASES = new Map([
  ['united states', 'United States of America'],
  ['usa', 'United States of America'],
  ['uk', 'United Kingdom'],
  ['south korea', 'Korea, Republic of'],
  ['north korea', "Korea, Democratic People's Republic of"],
  ['russia', 'Russian Federation'],
  ['czech republic', 'Czechia'],
  ['ivory coast', "Cote d'Ivoire"],
  ['vietnam', 'Viet Nam'],
  ['moldova', 'Moldova, Republic of'],
  ['iran', 'Iran, Islamic Republic of'],
  ['syria', 'Syrian Arab Republic'],
  ['venezuela', 'Venezuela, Bolivarian Republic of'],
  ['tanzania', 'Tanzania, United Republic of'],
  ['laos', "Lao People's Democratic Republic"],
  ['bolivia', 'Bolivia, Plurinational State of']
])

const SIZE_METRIC = {
  label: 'Nombre de films',
  value: (d) => d.count,
  format: d3.format(',')
}

const COLOR_METRICS = {
  revenue: {
    label: 'Revenus cumules ($)',
    value: (d) => d.revenue,
    format: d3.format('~s')
  },
  vote: {
    label: 'Note moyenne',
    value: (d) => d.voteAverage,
    format: d3.format('.2f')
  }
}

const BUBBLE_COLOR_RANGE = ['#fffafc', '#f3a5c5', '#b01946']

/**
 * Normalizes a country name key for lookups.
 *
 * @param {string} name Raw country name.
 * @returns {string} Normalized lowercase key.
 */
function normalizeCountryName (name) {
  return String(name || '')
    .trim()
    .toLowerCase()
}

/**
 * Resolves a dataset country name to a canonical value.
 *
 * @param {string} name Raw country name.
 * @returns {string} Canonical country name.
 */
function canonicalCountryName (name) {
  const normalized = normalizeCountryName(name)
  if (!normalized) {
    return ''
  }
  return COUNTRY_ALIASES.get(normalized) || String(name).trim()
}

/**
 * Parses the production countries CSV field to a clean list.
 *
 * @param {string} value Country list as CSV text.
 * @returns {string[]} Parsed country names.
 */
function parseCountryList (value) {
  return String(value || '')
    .split(',')
    .map((country) => canonicalCountryName(country))
    .filter(Boolean)
}

/**
 * Aggregates movie statistics by production country.
 *
 * @param {object[]} movies The movie dataset.
 * @returns {object[]} Per-country aggregate rows.
 */
function aggregateByCountry (movies) {
  const byCountry = new Map()

  movies.forEach((movie) => {
    const countries = [
      ...new Set(parseCountryList(movie.production_countries))
    ]
    if (countries.length === 0) {
      return
    }

    countries.forEach((country) => {
      const key = normalizeCountryName(country)
      if (!byCountry.has(key)) {
        byCountry.set(key, {
          country,
          count: 0,
          revenue: 0,
          voteSum: 0,
          voteCount: 0
        })
      }

      const row = byCountry.get(key)
      row.count += 1

      if (Number.isFinite(movie.revenue)) {
        row.revenue += movie.revenue
      }

      if (Number.isFinite(movie.vote_average)) {
        row.voteSum += movie.vote_average
        row.voteCount += 1
      }
    })
  })

  return Array.from(byCountry.values())
    .map((d) => ({
      country: d.country,
      count: d.count,
      revenue: d.revenue,
      voteAverage: d.voteCount > 0 ? d.voteSum / d.voteCount : 0
    }))
    .filter((d) => d.count > 0)
}

/**
 * Creates or retrieves the map tooltip node.
 *
 * @param {*} container The Dorling container selection.
 * @returns {*} The tooltip selection.
 */
function ensureTooltip (container) {
  let tooltip = container.select('.dorling-tooltip')
  if (tooltip.empty()) {
    tooltip = container.append('div').attr('class', 'dorling-tooltip')
  }
  return tooltip
}

/**
 * Positions the tooltip so it stays fully visible within the map container.
 *
 * @param {*} tooltip The tooltip selection.
 * @param {*} container The map container selection.
 * @param {number} x Pointer x in container coordinates.
 * @param {number} y Pointer y in container coordinates.
 */
function placeTooltipInBounds (tooltip, container, x, y) {
  const tooltipNode = tooltip.node()
  const containerNode = container.node()
  if (!tooltipNode || !containerNode) {
    return
  }

  const offset = 12
  const tooltipWidth = tooltipNode.offsetWidth || 0
  const tooltipHeight = tooltipNode.offsetHeight || 0
  const containerWidth = containerNode.clientWidth || 0
  const containerHeight = containerNode.clientHeight || 0

  let left = x + offset
  let top = y - tooltipHeight - offset

  if (left + tooltipWidth > containerWidth - 8) {
    left = x - tooltipWidth - offset
  }
  if (left < 8) {
    left = 8
  }

  if (top < 8) {
    top = y + offset
  }
  if (top + tooltipHeight > containerHeight - 8) {
    top = containerHeight - tooltipHeight - 8
  }

  tooltip
    .style('left', `${left}px`)
    .style('top', `${top}px`)
}

/**
 * Renders the Dorling map for the selected color metric.
 *
 * @param {*} container The map container selection.
 * @param {object} world The world GeoJSON feature collection.
 * @param {object[]} stats Per-country aggregate statistics.
 * @param {string} colorMetricKey Active color metric key.
 */
function drawDorlingMap (container, world, stats, colorMetricKey) {
  const colorMetric = COLOR_METRICS[colorMetricKey]
  const bounds = container.node().getBoundingClientRect()
  const width = Math.max(760, Math.round(bounds.width || 760))
  const height = Math.max(560, Math.round(bounds.height || 560))

  const svg = container
    .selectAll('svg')
    .data([null])
    .join('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('aria-label', 'Carte de Dorling des pays de production')

  const sceneGroup = svg
    .selectAll('.dorling-scene')
    .data([null])
    .join('g')
    .attr('class', 'dorling-scene')

  const worldFeatures = world.features.filter(
    (feature) => normalizeCountryName(feature.properties.name) !== 'antarctica'
  )
  const worldForFit = {
    type: 'FeatureCollection',
    features: worldFeatures
  }

  const projection = d3.geoNaturalEarth1().fitExtent(
    [
      [24, 22],
      [width - 24, height - 20]
    ],
    worldForFit
  )
  const focusedScale = projection.scale() * 1.12
  const [translateX, translateY] = projection.translate()
  projection
    .scale(focusedScale)
    .translate([translateX, translateY - height * 0.07])
  const geoPath = d3.geoPath(projection)

  const countriesGroup = sceneGroup
    .selectAll('.dorling-countries')
    .data([null])
    .join('g')
    .attr('class', 'dorling-countries')
  const bubblesGroup = sceneGroup
    .selectAll('.dorling-bubbles')
    .data([null])
    .join('g')
    .attr('class', 'dorling-bubbles')
  const labelsGroup = sceneGroup
    .selectAll('.dorling-labels')
    .data([null])
    .join('g')
    .attr('class', 'dorling-labels')
  const legendGroup = sceneGroup
    .selectAll('.dorling-legend')
    .data([null])
    .join('g')
    .attr('class', 'dorling-legend')

  countriesGroup
    .selectAll('path')
    .data(worldFeatures)
    .join('path')
    .attr('class', 'dorling-country')
    .attr('d', geoPath)

  const featuresByName = new Map(
    worldFeatures.map((feature) => [
      normalizeCountryName(feature.properties.name),
      feature
    ])
  )

  const nodes = stats
    .map((stat) => {
      const feature = featuresByName.get(normalizeCountryName(stat.country))
      if (!feature) {
        return null
      }

      const centroid = geoPath.centroid(feature)
      if (!Number.isFinite(centroid[0]) || !Number.isFinite(centroid[1])) {
        return null
      }

      return {
        ...stat,
        sizeValue: SIZE_METRIC.value(stat),
        colorValue: colorMetric.value(stat),
        x0: centroid[0],
        y0: centroid[1],
        x: centroid[0],
        y: centroid[1]
      }
    })
    .filter(Boolean)
    .filter((d) => Number.isFinite(d.sizeValue) && d.sizeValue > 0)
    .filter((d) => Number.isFinite(d.colorValue))

  const radiusScale = d3
    .scaleSqrt()
    .domain(d3.extent(nodes, (d) => d.sizeValue))
    .range([3.8, 38])

  const colorExtent = d3.extent(nodes, (d) => d.colorValue)
  const colorMin = colorExtent[0]
  const colorMax = colorExtent[1]
  const colorMid = (colorMin + colorMax) / 2
  const colorDomain =
    colorMin === colorMax
      ? [colorMin - 1, colorMin, colorMin + 1]
      : [colorMin, colorMid, colorMax]

  const colorScale = d3
    .scaleLinear()
    .domain(colorDomain)
    .range(BUBBLE_COLOR_RANGE)
    .clamp(true)

  nodes.forEach((node) => {
    node.r = radiusScale(node.sizeValue)
  })

  const simulation = d3
    .forceSimulation(nodes)
    .force('x', d3.forceX((d) => d.x0).strength(0.24))
    .force('y', d3.forceY((d) => d.y0).strength(0.24))
    .force('collision', d3.forceCollide((d) => d.r + 1.2).iterations(4))
    .stop()

  for (let i = 0; i < 360; i += 1) {
    simulation.tick()
  }

  const tooltip = ensureTooltip(container)

  bubblesGroup
    .selectAll('circle')
    .data(nodes, (d) => d.country)
    .join(
      (enter) =>
        enter
          .append('circle')
          .attr('class', 'dorling-bubble')
          .attr('cx', (d) => d.x)
          .attr('cy', (d) => d.y)
          .attr('r', 0)
          .attr('fill', (d) => colorScale(d.colorValue))
          .call((selection) =>
            selection
              .transition()
              .duration(420)
              .attr('r', (d) => d.r)
          ),
      (update) =>
        update
          .transition()
          .duration(420)
          .attr('cx', (d) => d.x)
          .attr('cy', (d) => d.y)
          .attr('r', (d) => d.r)
          .attr('fill', (d) => colorScale(d.colorValue)),
      (exit) => exit.transition().duration(220).attr('r', 0).remove()
    )
    .on('mousemove', function (event, d) {
      const [x, y] = d3.pointer(event, container.node())
      tooltip
        .html(
          `<strong>${d.country}</strong><br/>${SIZE_METRIC.label}: ${SIZE_METRIC.format(d.sizeValue)}<br/>${colorMetric.label}: ${colorMetric.format(d.colorValue)}`
        )
        .classed('visible', true)

      placeTooltipInBounds(tooltip, container, x, y)
    })
    .on('mouseleave', function () {
      tooltip.classed('visible', false)
    })

  labelsGroup
    .selectAll('text')
    .data(nodes.filter((d) => d.r >= 10))
    .join('text')
    .attr('x', (d) => d.x)
    .attr('y', (d) => d.y + 3)
    .attr('text-anchor', 'middle')
    .style('font-size', (d) => `${Math.max(7, Math.min(10, d.r / 2.8))}px`)
    .style('font-family', 'Roboto, sans-serif')
    .attr('fill', '#161413')
    .attr('pointer-events', 'none')
    .text((d) => d.country)

  const maxValue = d3.max(nodes, (d) => d.sizeValue)
  const midValue = maxValue / 2
  const minValue = d3.max([1, maxValue / 8])
  const legendValues = [maxValue, midValue, minValue]

  legendGroup.selectAll('*').remove()

  legendGroup
    .append('text')
    .attr('x', 18)
    .attr('y', 24)
    .style('font-family', 'Roboto, sans-serif')
    .style('font-size', '12px')
    .style('font-weight', 700)
    .attr('fill', '#1f1a16')
    .text(`${SIZE_METRIC.label} (taille)`)

  const baseX = 72
  const baseY = 112

  legendValues.forEach((value) => {
    const r = radiusScale(value)

    legendGroup
      .append('circle')
      .attr('cx', baseX)
      .attr('cy', baseY - r)
      .attr('r', r)
      .attr('fill', 'none')
      .attr('stroke', '#6f6354')
      .attr('stroke-width', 1)

    legendGroup
      .append('line')
      .attr('x1', baseX)
      .attr('x2', baseX + 42)
      .attr('y1', baseY - 2 * r)
      .attr('y2', baseY - 2 * r)
      .attr('stroke', '#6f6354')
      .attr('stroke-width', 1)

    legendGroup
      .append('text')
      .attr('x', baseX + 48)
      .attr('y', baseY - 2 * r + 4)
      .style('font-family', 'Roboto, sans-serif')
      .style('font-size', '11px')
      .attr('fill', '#352d25')
      .text(SIZE_METRIC.format(value))
  })

  legendGroup
    .append('line')
    .attr('x1', baseX)
    .attr('x2', baseX)
    .attr('y1', baseY - 2 * radiusScale(maxValue))
    .attr('y2', baseY)
    .attr('stroke', '#6f6354')
    .attr('stroke-width', 1)

  const defs = svg.select('defs').empty()
    ? svg.append('defs')
    : svg.select('defs')
  const colorGradientId = 'dorling-color-gradient'
  defs.select(`#${colorGradientId}`).remove()

  const colorGradient = defs
    .append('linearGradient')
    .attr('id', colorGradientId)
    .attr('x1', '0%')
    .attr('x2', '0%')
    .attr('y1', '100%')
    .attr('y2', '0%')

  colorGradient
    .selectAll('stop')
    .data([
      { offset: '0%', color: BUBBLE_COLOR_RANGE[0] },
      { offset: '50%', color: BUBBLE_COLOR_RANGE[1] },
      { offset: '100%', color: BUBBLE_COLOR_RANGE[2] }
    ])
    .enter()
    .append('stop')
    .attr('offset', (d) => d.offset)
    .attr('stop-color', (d) => d.color)

  const colorLegendHeight = 130
  const colorLegendWidth = 14
  const colorLegendX = width - 56
  const colorLegendY = 26

  legendGroup
    .append('text')
    .attr('x', colorLegendX - 70)
    .attr('y', colorLegendY - 6)
    .style('font-family', 'Roboto, sans-serif')
    .style('font-size', '12px')
    .style('font-weight', 700)
    .attr('fill', '#1f1a16')
    .text(`${colorMetric.label} (couleur)`)

  legendGroup
    .append('rect')
    .attr('x', colorLegendX)
    .attr('y', colorLegendY)
    .attr('width', colorLegendWidth)
    .attr('height', colorLegendHeight)
    .attr('fill', `url(#${colorGradientId})`)
    .attr('stroke', '#6f6354')
    .attr('stroke-width', 0.8)

  const colorLegendScale = d3
    .scaleLinear()
    .domain([colorMin, colorMax])
    .range([colorLegendY + colorLegendHeight, colorLegendY])

  legendGroup
    .append('g')
    .attr('transform', `translate(${colorLegendX + colorLegendWidth}, 0)`)
    .call(
      d3
        .axisRight(colorLegendScale)
        .ticks(4)
        .tickFormat((d) => colorMetric.format(d))
    )
    .call((g) =>
      g
        .selectAll('text')
        .attr('fill', '#3e362f')
        .style('font-size', '11px')
        .style('font-family', 'Roboto, sans-serif')
    )
    .call((g) => g.selectAll('line').attr('stroke', '#7a6d5d'))
    .call((g) => g.select('path').attr('stroke', '#7a6d5d'))

  // If the composed map scene is larger than the viewport, scale it down as a whole.
  const sceneNode = sceneGroup.node()
  if (sceneNode) {
    const bbox = sceneNode.getBBox()
    if (bbox.width > 0 && bbox.height > 0) {
      const padding = 6
      const scale = Math.min(
        1,
        (width - padding * 2) / bbox.width,
        (height - padding * 2) / bbox.height
      )
      const tx = (width - bbox.width * scale) / 2 - bbox.x * scale
      const ty = (height - bbox.height * scale) / 2 - bbox.y * scale
      sceneGroup.attr('transform', `translate(${tx},${ty}) scale(${scale})`)
    }
  }
}

/**
 * Initializes the Dorling map and binds UI interactions.
 *
 * @returns {Promise<void>} Resolves when map initialization completes.
 */
export async function initDorlingMap () {
  const container = d3.select('#dorling-map')
  const colorSelect = d3.select('#dorling-color')

  if (container.empty() || colorSelect.empty()) {
    return
  }

  const [movies, world] = await Promise.all([
    d3.csv(MOVIES_DATA_URL, d3.autoType),
    d3.json(WORLD_GEOJSON_URL)
  ])

  const stats = aggregateByCountry(movies)

  const render = () => {
    const colorMetricKey = colorSelect.property('value')
    drawDorlingMap(
      container,
      world,
      stats,
      COLOR_METRICS[colorMetricKey] ? colorMetricKey : 'revenue'
    )
  }

  render()
  colorSelect.on('change', render)
  window.addEventListener('resize', render)
}
