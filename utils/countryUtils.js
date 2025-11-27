/**
 * Country utility functions for handling country codes and names
 * Note: Countries are now dynamically loaded from visitor data, not static lists
 */

// Basic country name normalization (for matching purposes)
// This is a fallback mapping if we need to normalize country names
// The main source of countries should be from visitor data
const COUNTRY_NAME_VARIANTS = {
  'united states': 'United States',
  'us': 'United States',
  'usa': 'United States',
  'united kingdom': 'United Kingdom',
  'uk': 'United Kingdom',
  'great britain': 'United Kingdom',
  // Add common variations as needed
};

/**
 * Normalize country name (handles variations and common name formats)
 * @param {string} country - Country name or code
 * @returns {string} Normalized country name
 */
function normalizeCountry(country) {
  if (!country) return null;
  
  // Check for common variations
  const lowerCountry = country.toLowerCase();
  if (COUNTRY_NAME_VARIANTS[lowerCountry]) {
    return COUNTRY_NAME_VARIANTS[lowerCountry];
  }
  
  // Capitalize properly (Title Case)
  const words = country.toLowerCase().split(' ');
  const capitalized = words.map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
  
  return capitalized;
}

/**
 * Check if a country is available for a given target countries list
 * @param {string} userCountry - User's country
 * @param {Array<string>} targetCountries - List of target countries or ['WORLDWIDE']
 * @param {boolean} isWorldwide - Whether the item is available worldwide
 * @returns {boolean} True if country is available
 */
function isCountryAvailable(userCountry, targetCountries = [], isWorldwide = true) {
  if (!userCountry) return true; // If no country specified, show to all
  
  // If worldwide, show to all
  if (isWorldwide) return true;
  
  // Normalize user country
  const normalizedUserCountry = normalizeCountry(userCountry);
  
  // Check if user's country is in target list
  const normalizedTargets = targetCountries.map(c => normalizeCountry(c));
  
  // Check for 'WORLDWIDE' in targets
  if (normalizedTargets.includes('WORLDWIDE')) return true;
  
  // Check if user country matches any target country
  return normalizedTargets.includes(normalizedUserCountry) || 
         normalizedTargets.includes(userCountry);
}

/**
 * Note: getAllCountries() is deprecated - countries should be fetched from visitor data
 * via the /api/v1/visitors/countries endpoint
 * This function is kept for backward compatibility but returns empty array
 * @returns {Array<{code: string, name: string}>} Empty array - use visitor endpoint instead
 */
function getAllCountries() {
  console.warn('getAllCountries() is deprecated. Use /api/v1/visitors/countries endpoint instead.');
  return [];
}

module.exports = {
  normalizeCountry,
  isCountryAvailable,
  getAllCountries,
};

