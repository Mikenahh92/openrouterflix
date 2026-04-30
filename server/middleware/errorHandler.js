/**
 * Centralized Express error middleware.
 * All errors are returned as structured JSON: { error: string, details?: string }
 */
export function errorHandler(err, _req, res, _next) {
  const status = err.status || 500;
  const response = {
    error: err.message || 'Internal Server Error',
  };

  if (err.details) {
    response.details = err.details;
  }

  // Never expose stack traces or internal details in production
  res.status(status).json(response);
}
