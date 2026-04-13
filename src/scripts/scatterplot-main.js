import * as d3 from 'd3'
import { METRICS, getDefaultMovie } from './scatterplot-data.js'
import { createScatterplot } from './scatterplot-chart.js'
import { initMoviePanel, updateMoviePanel } from './scatterplot-panel.js'

;(function () {
  d3.csv('./movies_clean.csv', d3.autoType).then(function (allMovies) {
    try {
      const movies = allMovies
        .filter(d => Number.isFinite(d.budget) && d.budget > 0)
        .filter(d => Number.isFinite(d.revenue) && d.revenue > 0)
        .filter(d => Number.isFinite(d.vote_average) && d.vote_average > 0)
        .filter(d => Number.isFinite(d.runtime) && d.runtime > 0)
      console.log('Movies loaded:', movies)
      console.log('Number of movies:', movies?.length)
      console.log('First movie:', movies?.[0])
      const panel = initMoviePanel()

      let activeMetric = METRICS.vote_average
      let focusedMovie = getDefaultMovie(movies) || movies[0] || null

      if (focusedMovie) {
        updateMoviePanel(panel, focusedMovie)
      }

      const chart = createScatterplot('#scatterplot', movies, movie => {
        focusedMovie = movie
        updateMoviePanel(panel, focusedMovie)
      })

      d3.select('#zoom-in-btn').on('click', () => {
        chart.zoomIn()
      })

      d3.select('#zoom-out-btn').on('click', () => {
        chart.zoomOut()
      })

      const buttons = d3.selectAll('.metric-btn')

      const setMetric = metricKey => {
        activeMetric = METRICS[metricKey]
        buttons.classed('active', false)
        d3.select(`.metric-btn[data-metric='${metricKey}']`).classed('active', true)
        chart.resetZoom()
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
        if (focusedMovie) {
          updateMoviePanel(panel, focusedMovie)
        }
      })
    } catch (error) {
      console.error(error)
      d3.select('#scatterplot')
        .append('div')
        .style('padding', '24px')
        .style('color', '#fff')
        .style('font-family', 'Roboto Slab, serif')
        .text('Impossible de charger le scatterplot. Ouvre la console pour voir l’erreur.')
    }
  })
})()
