/**
 * MedVoice AI - Global Error Handler Middleware
 * Requirement 13: Never expose raw database errors to the patient.
 * Return clean user-friendly messages.
 */

export function errorHandler(err, req, res, next) {
  console.error('[API Error]', {
    method: req.method,
    url: req.url,
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  const statusCode = err.statusCode || (err.status >= 400 && err.status < 600 ? err.status : 500);

  // Clean sanitized response
  res.status(statusCode).json({
    success: false,
    error: err.name || 'APIError',
    message: err.userMessage || err.message || 'An unexpected error occurred. Please try again.',
    reason: err.reason || 'SERVER_ERROR',
  });
}
