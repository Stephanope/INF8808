import { METRICS, loadMovies, getDefaultMovie } from './scatterplot-data.js'
import { createScatterplot } from './scatterplot-chart.js'
import { initMoviePanel, updateMoviePanel } from './scatterplot-panel.js'

(async function () {
  const movies = await loadMovies()
  const panel = initMoviePanel()

  let activeMetric = METRICS.vote_average
  let focusedMovie = getDefaultMovie(movies)

  updateMoviePanel(panel, focusedMovie)

  const chart = createScatterplot('#scatterplot', movies, movie => {
    focusedMovie = movie
    updateMoviePanel(panel, focusedMovie)
  })

  const buttons = d3.selectAll('.metric-btn')

  function setMetric (metricKey) {
    activeMetric = METRICS[metricKey]
    buttons.classed('active', false)
    d3.select(`.metric-btn[data-metric='${metricKey}']`).classed('active', true)
    chart.render(activeMetric)
  }

  buttons.on('click', function () {
    const metricKey = this.dataset.metric
    if (METRICS[metricKey]) {
      setMetric(metricKey)
    }
  })

  setMetric('vote_average')

  window.addEventListener('resize', () => {
    chart.render(activeMetric)
    updateMoviePanel(panel, focusedMovie)
  })
})()
