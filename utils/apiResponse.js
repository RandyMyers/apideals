const { applyCorsHeaders } = require('../middleware/security');

class ApiError extends Error {
  constructor(status, code, message, details = null, phase = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.phase = phase;
  }
}

function sendApiError(req, res, { status = 500, code = 'INTERNAL_ERROR', message, details = null, phase = null }) {
  applyCorsHeaders(req, res);
  const payload = {
    success: false,
    error: true,
    code,
    message: message || 'Request failed',
    phase: phase || undefined,
    requestId: req.correlationId || req.headers['x-request-id'] || undefined,
    timestamp: new Date().toISOString(),
  };

  if (details && typeof details === 'object') {
    payload.details = details;
  } else if (details) {
    payload.details = { info: String(details) };
  }

  if (process.env.NODE_ENV !== 'production' && details instanceof Error) {
    payload.stack = details.stack;
  }

  return res.status(status).json(payload);
}

function sendApiSuccess(req, res, data, status = 200) {
  applyCorsHeaders(req, res);
  return res.status(status).json(data);
}

module.exports = {
  ApiError,
  sendApiError,
  sendApiSuccess,
};
