/* eslint-disable quote-props */
// Color constants - Accessible for colorblind users
export const COLORS = {
  PRIMARY_BG: '#5a5a6a',
  SECONDARY_BG: '#4a4a5a',
  CHART_BG: '#5a5a6a',
  TEXT_PRIMARY: '#ffffff',
  TEXT_SECONDARY: '#e0e0e0',
  BORDER: '#6a6a7a'
}

// Colorblind-friendly palette (Deuteranopia and Protanopia safe)
export const CHART_COLORS = {
  colors: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd'],
  descriptions: ['Blue', 'Orange', 'Green', 'Red', 'Purple']
}

// Country name translations (EN to FR)
export const COUNTRY_NAMES = {
  'United States of America': 'États-Unis',
  'Canada': 'Canada',
  'United Kingdom': 'Royaume-Uni',
  'France': 'France',
  'Germany': 'Allemagne',
  'Ireland': 'Irlande',
  'Australia': 'Australie',
  'India': 'Inde',
  'Japan': 'Japon',
  'Italy': 'Italie',
  'Spain': 'Espagne',
  'Sweden': 'Suède',
  'Switzerland': 'Suisse'
}

/**
 * Translates a country name from English to French.
 * If translation is not found, returns the original name.
 *
 * @param {string} countryName The country name to translate
 * @returns {string} The translated country name
 */
export function translateCountryName (countryName) {
  return COUNTRY_NAMES[countryName] || countryName
}

/**
 * Utilitary funtion that returns an array of number in the given range, inclusively.
 *
 * @param {number} start The starting number
 * @param {number} stop The end number
 * @returns {number[]} The array with a sequence of numbers within the given range
 *
 */
export function range (start, stop) {
  const res = []
  for (var i = start; i <= stop; i++) {
    res.push(i)
  }
  return res
}
