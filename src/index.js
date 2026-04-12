import * as d3 from 'd3'
import { initDorlingMap } from './scripts/dorling-map.js'
import { loadBoxplotData } from './scripts/boxplot-data.js'
import { initBoxplot } from './scripts/boxplot.js'

initDorlingMap().catch((error) => {
  // Keep the app usable even if remote geojson fails to load.
  // eslint-disable-next-line no-console
  console.error('Dorling map initialization failed:', error)

  const container = d3.select('#dorling-map')
  if (!container.empty()) {
    container
      .append('p')
      .style('padding', '18px')
      .style('font-family', 'Roboto, sans-serif')
      .style('color', '#822')
      .text(
        'Impossible de charger la carte. Verifie la connexion reseau et recharge la page.'
      )
  }
})

loadBoxplotData().then(data => {
  initBoxplot(data)
}).catch(err => console.error('Boxplot init failed:', err))
// TODO Other visualizations can be initialized here as needed.
