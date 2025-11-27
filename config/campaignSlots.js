module.exports = {
  store: {
    homepage: 10, // Top 10 stores on homepage
    categoryPage: 5, // 5 sponsored per category
    searchResults: 8, // 8 sponsored in search results
    totalActive: 50 // Max 50 active store campaigns at once
  },
  coupon: {
    homepage: 15,
    categoryPage: 8,
    searchResults: 12,
    totalActive: 100
  },
  deal: {
    homepage: 20,
    categoryPage: 10,
    searchResults: 15,
    totalActive: 150
  },
  // Update frequency for priority ranking
  priorityUpdateInterval: '1h', // Update every hour
  // Minimum bid amounts (per day)
  minimumBids: {
    store: 5.00, // $5/day minimum
    coupon: 2.00,
    deal: 3.00
  },
  // Priority score weights
  priorityWeights: {
    bidAmount: 0.7, // 70% weight on bid
    performance: 0.3 // 30% weight on performance
  }
};

