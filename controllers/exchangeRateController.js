const exchangeRateService = require('../services/exchangeRateService');

exports.getSupportedCurrencies = async (req, res) => {
  try {
    const data = await exchangeRateService.getSupportedCurrencies();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching supported currencies',
      error: error.message,
    });
  }
};

exports.getRatesMeta = async (req, res) => {
  try {
    const data = await exchangeRateService.getRatesMeta();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching exchange rate metadata',
      error: error.message,
    });
  }
};
