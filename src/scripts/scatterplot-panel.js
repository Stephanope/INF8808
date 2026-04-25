import * as d3 from 'd3'
import { formatMoney } from './scatterplot-data.js'

const imageBase = 'https://image.tmdb.org/t/p/w500'
const GENRE_TRANSLATIONS = {
  Action: 'Action',
  Adventure: 'Aventure',
  Animation: 'Animation',
  Comedy: 'Comedie',
  Crime: 'Crime',
  Documentary: 'Documentaire',
  Drama: 'Drame',
  Family: 'Famille',
  Fantasy: 'Fantastique',
  History: 'Historique',
  Horror: 'Horreur',
  Music: 'Musique',
  Mystery: 'Mystere',
  Romance: 'Romance',
  'Science Fiction': 'Science-fiction',
  'TV Movie': 'Telefilm',
  Thriller: 'Thriller',
  War: 'Guerre',
  Western: 'Western'
}

/**
 * Translates a comma-separated genre list from English to French.
 * Unknown genres are kept as-is.
 *
 * @param {string} genres The raw genre list.
 * @returns {string} The translated genre list.
 */
function translateGenres (genres) {
  if (!genres || typeof genres !== 'string') {
    return 'N/A'
  }

  return genres
    .split(',')
    .map(genre => genre.trim())
    .filter(Boolean)
    .map(genre => GENRE_TRANSLATIONS[genre] || genre)
    .join(', ')
}

/**
 * Initializes the movie detail panel.
 *
 * @returns {object} The panel selections.
 */
export function initMoviePanel () {
  return {
    title: d3.select('#movie-title'),
    poster: d3.select('#movie-poster'),
    budget: d3.select('#meta-budget'),
    revenue: d3.select('#meta-revenue'),
    rating: d3.select('#meta-rating'),
    runtime: d3.select('#meta-runtime'),
    genres: d3.select('#meta-genres')
  }
}

/**
 * Updates the movie detail panel.
 *
 * @param {object} panel The panel selections.
 * @param {object} movie The selected movie.
 */
export function updateMoviePanel (panel, movie) {
  panel.title.text((movie.title || 'Film').toUpperCase())

  if (movie.poster_path) {
    panel.poster
      .attr('src', `${imageBase}${movie.poster_path}`)
      .attr('alt', `Affiche de ${movie.title}`)
  } else {
    panel.poster
      .attr('src', '')
      .attr('alt', 'Aucune affiche disponible')
  }

  panel.budget.text(formatMoney(movie.budget))
  panel.revenue.text(formatMoney(movie.revenue))
  panel.rating.text(movie.vote_average.toFixed(3))
  panel.runtime.text(Math.round(movie.runtime))
  panel.genres.text(translateGenres(movie.genres))
}
