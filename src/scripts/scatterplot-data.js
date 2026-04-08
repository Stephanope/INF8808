import * as d3 from 'd3'

export const METRICS = {
  vote_average: {
    key: 'vote_average',
    label: 'Note',
    buttonLabel: 'Note',
    legendTitle: 'Note',
    colorStops: ['#ff2b2b', '#ffd800', '#5eff2d']
  },
  runtime: {
    key: 'runtime',
    label: 'Duree',
    buttonLabel: 'Duree',
    legendTitle: 'Duree (min)',
    colorStops: ['#ff2b2b', '#ffd800', '#5eff2d'],
    colorDomain: [0, 90, 180]
  }
}

/**
 * Loads and filters the movie dataset used by the scatterplot.
 *
 * @returns {Promise<object[]>} The filtered movie dataset.
 */
export function loadMovies () {
  const movies = d3.csv('./assets/data/movies_clean.csv', d3.autoType)

  return movies
    .filter(d => Number.isFinite(d.budget) && d.budget > 0)
    .filter(d => Number.isFinite(d.revenue) && d.revenue > 0)
    .filter(d => Number.isFinite(d.vote_average) && d.vote_average > 0)
    .filter(d => Number.isFinite(d.runtime) && d.runtime > 0)
}

/**
 * Returns the movie that should be highlighted by default.
 *
 * @param {object[]} movies The movie list.
 * @returns {object|null} The default movie.
 */
export function getDefaultMovie (movies) {
  const explicit = movies.find(movie => movie.title === 'Avengers: Endgame')
  if (explicit) {
    return explicit
  }

  return movies.reduce((best, current) => {
    if (!best || current.revenue > best.revenue) {
      return current
    }
    return best
  }, null)
}

/**
 * Formats money values into compact labels.
 *
 * @param {number} value The amount to format.
 * @returns {string} The formatted string.
 */
export function formatMoney (value) {
  if (!Number.isFinite(value) || value <= 0) {
    return '0'
  }

  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(1).replace(/\.0$/, '')}B`
  }

  if (value >= 1000000) {
    return `${Math.round(value / 1000000)}M`
  }

  return `${Math.round(value)}`
}

/**
 * Builds the color scale used to color the points.
 *
 * @param {object[]} movies The movie list.
 * @param {string} metricKey The metric used for color.
 * @param {string[]} colorStops The color range.
 * @returns {*} The D3 scale.
 */
export function buildColorScale (movies, metricKey, colorStops) {
  const metric = METRICS[metricKey]
  if (metric?.colorDomain) {
    return d3
      .scaleLinear()
      .domain(metric.colorDomain)
      .range(colorStops)
      .clamp(true)
  }

  const extent = d3.extent(movies, d => d[metricKey])
  const [start, end] = extent
  const safeDomain = start === end ? [start - 1, end + 1] : extent

  return d3
    .scaleLinear()
    .domain([safeDomain[0], d3.mean(safeDomain), safeDomain[1]])
    .range(colorStops)
    .clamp(true)
}
