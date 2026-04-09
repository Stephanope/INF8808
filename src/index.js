import * as d3 from 'd3'
import { initDorlingMap } from './scripts/dorling-map.js'

import { buildHeatmaps } from './heatmap/scripts/viz.js';
import { formatData } from './heatmap/scripts/preprocess.js';
import data from './assets/data/movies_clean.csv';

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
// TODO Other visualizations can be initialized here as needed.

const config = {
    width : 800,
    cellheight : 60,
    margin : { top: 40, right: 30, bottom: 90, left: 30 },
};

d3.csv(data).then(rawData => {
    console.log("1. Données brutes chargées :", rawData)
    const data = formatData(rawData);
    buildHeatmaps(data, config);
}).catch(error => {
    console.error('Error loading or processing data:', error);
});