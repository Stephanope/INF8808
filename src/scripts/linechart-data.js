import * as d3 from 'd3'

/**
 * Loads and aggregates movie data by year.
 *
 * @returns {Promise<object[]>} The aggregated data by year.
 */
export function loadYearlyData () {
  const parseDate = d3.timeParse('%Y-%m-%d')

  return d3.csv('./movies_clean.csv').then(movies => {
    // Parse and filter valid movies
    const parsed = movies.map(d => ({
      ...d,
      budget: +d.budget,
      revenue: +d.revenue,
      release_date: parseDate(d.release_date)
    }))

    const afterDate = parsed.filter(d => d.release_date !== null)
    const afterBudget = afterDate.filter(d => Number.isFinite(d.budget) && d.budget > 0)
    const validMovies = afterBudget.filter(d => Number.isFinite(d.revenue) && d.revenue > 0)

    const yearData = d3.rollup(
      validMovies,
      group => ({
        count: group.length,
        avgBudget: d3.mean(group, d => d.budget),
        avgRevenue: d3.mean(group, d => d.revenue),
        totalBudget: d3.sum(group, d => d.budget),
        totalRevenue: d3.sum(group, d => d.revenue)
      }),
      d => Math.ceil(d.release_date.getFullYear() / 5) * 5
    )

    return Array.from(yearData, ([year, data]) => ({
      year,
      ...data
    })).sort((a, b) => a.year - b.year)
      .filter(d => d.year >= 1955)
  })
}

/**
 * Formats a number as a currency string.
 *
 * @param {number} value The value to format.
 * @returns {string} The formatted value.
 */
export function formatMoney (value) {
  if (value >= 1e9) {
    return (value / 1e9).toFixed(1) + ' G$'
  }
  if (value >= 1e6) {
    return (value / 1e6).toFixed(1) + ' M$'
  }
  if (value >= 1e3) {
    return (value / 1e3).toFixed(1) + ' K$'
  }
  return value.toFixed(0)
}

/**
 * Formats a number as a count string.
 *
 * @param {number} value The value to format.
 * @returns {string} The formatted value.
 */
export function formatCount (value) {
  return Math.round(value).toString()
}

/**
 * Loads and aggregates movie data by country and 5-year periods.
 *
 * @returns {Promise<Object>} Data grouped by country.
 */
export function loadCountryData () {
  const parseDate = d3.timeParse('%Y-%m-%d')

  return d3.csv('./movies_clean.csv').then(movies => {
    // Parse and filter valid movies
    const parsed = movies.map(d => ({
      ...d,
      budget: +d.budget,
      revenue: +d.revenue,
      release_date: parseDate(d.release_date)
    }))

    const afterDate = parsed.filter(d => d.release_date !== null)
    const afterBudget = afterDate.filter(d => Number.isFinite(d.budget) && d.budget > 0)
    const validMovies = afterBudget.filter(d => Number.isFinite(d.revenue) && d.revenue > 0)

    // Extract countries and count films per country
    const countryCounts = {}
    validMovies.forEach(movie => {
      const countries = movie.production_countries
        ? movie.production_countries.split(',').map(c => c.trim())
        : []
      countries.forEach(country => {
        countryCounts[country] = (countryCounts[country] || 0) + 1
      })
    })

    // Get top 5 countries
    const topCountries = Object.entries(countryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([country]) => country)

    // Group by country and 5-year period
    const countryData = {}
    topCountries.forEach(country => {
      const countryMovies = validMovies.filter(movie => {
        const countries = movie.production_countries
          ? movie.production_countries.split(',').map(c => c.trim())
          : []
        return countries.includes(country)
      })

      const yearData = d3.rollup(
        countryMovies,
        group => ({
          count: group.length,
          avgBudget: d3.mean(group, d => d.budget),
          avgRevenue: d3.mean(group, d => d.revenue)
        }),
        d => Math.ceil(d.release_date.getFullYear() / 5) * 5
      )

      countryData[country] = Array.from(yearData, ([period, data]) => ({
        year: period,
        ...data
      })).sort((a, b) => a.year - b.year)
        .filter(d => d.year >= 1955)
    })

    return { topCountries, countryData }
  })
}
