export function errorHandler(err, req, res, next) {
  console.error('[Error]', err.message, err.stack?.split('\n')[0]);
  const status = err.status || 500;
  const msg = status === 500 ? 'Internal server error. Please try again.' : err.message;
  res.status(status).json({ success:false, error: msg });
}
export function asyncHandler(fn) {
  return (req,res,next) => Promise.resolve(fn(req,res,next)).catch(next);
}
