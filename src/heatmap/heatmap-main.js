import * as d3 from 'd3';
import { buildHeatmaps } from './scripts/viz.js';
import { formatData } from './scripts/preprocess.js';
import csvPath from '../assets/data/movies_clean.csv';

const config = {
    width : 800,
    cellheight : 60,
    margin : { top: 40, right: 30, bottom: 90, left: 30 },
};

d3.csv(csvPath).then(rawData => {
    const data = formatData(rawData);
    buildHeatmaps(data, config); 
}).catch(err => console.error("Erreur de chargement CSV:", err));