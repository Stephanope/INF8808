import { loadCountryData } from './linechart-data.js'
import { createCountryLineCharts } from './linechart-chart.js'

;(function () {
  loadCountryData().then(function (data) {
    try {
      createCountryLineCharts('#linechart-container', data)

      // Handle window resize
      window.addEventListener('resize', () => {
        // Could implement responsive resizing here
      })
    } catch (error) {
      // Silently handle errors
    }
  }).catch(() => {
    // Silently handle errors
  })
})()
