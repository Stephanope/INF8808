import * as d3 from 'd3';
import { buildHeatmaps } from 'scripts/viz.js';
import { formatData } from 'scripts/preprocess.js';
import data from './assets/data/movies_clean.csv';
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