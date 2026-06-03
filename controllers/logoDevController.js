const {
  searchBrands,
  buildLogoImageUrl,
  normalizeDomain,
  hasSearchKey,
  hasImageToken,
} = require('../utils/logoDev');

exports.getStatus = (req, res) => {
  res.json({
    searchEnabled: hasSearchKey,
    imageEnabled: hasImageToken,
  });
};

exports.search = async (req, res) => {
  try {
    const q = req.query.q || req.query.query || '';
    const strategy = req.query.strategy === 'match' ? 'match' : 'typeahead';
    const results = await searchBrands(q, strategy);
    res.json({ results });
  } catch (error) {
    if (error.code === 'LOGO_DEV_NOT_CONFIGURED') {
      return res.status(503).json({ message: error.message, results: [] });
    }
    console.error('[logoDev] search error:', error.message);
    res.status(error.status >= 400 && error.status < 600 ? error.status : 502).json({
      message: error.message || 'Logo search failed',
      results: [],
    });
  }
};

exports.resolveImageUrl = (req, res) => {
  const domain = normalizeDomain(req.query.domain || req.query.url || '');
  if (!domain) {
    return res.status(400).json({ message: 'domain or url is required' });
  }
  if (!hasImageToken) {
    return res.status(503).json({
      message: 'LOGO_DEV_TOKEN is not configured on the server.',
      logoUrl: '',
    });
  }
  const size = parseInt(req.query.size, 10) || 200;
  res.json({
    domain,
    logoUrl: buildLogoImageUrl(domain, { size }),
  });
};
