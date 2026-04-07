import { formatMoney } from './scatterplot-data.js'

const imageBase = 'https://image.tmdb.org/t/p/w500'

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

  panel.budget.text(`${formatMoney(movie.budget)}`)
  panel.revenue.text(`${formatMoney(movie.revenue)}`)
  panel.rating.text(`${movie.vote_average.toFixed(3)}`)
  panel.runtime.text(`${Math.round(movie.runtime)}`)
  panel.genres.text(movie.genres || 'N/A')
}
