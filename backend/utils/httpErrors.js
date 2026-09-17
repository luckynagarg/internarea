class HttpError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

function badRequest(message, details) {
  return new HttpError(400, message, details);
}

function forbidden(message, details) {
  return new HttpError(403, message, details);
}

function unauthorized(message, details) {
  return new HttpError(401, message, details);
}

function notFound(message, details) {
  return new HttpError(404, message, details);
}

function internalServerError(message, details) {
  return new HttpError(500, message, details);
}

function serviceUnavailable(message, details) {
  return new HttpError(503, message, details);
}

module.exports = {
  HttpError,
  badRequest,
  forbidden,
  unauthorized,
  notFound,
  internalServerError,
  serviceUnavailable,
};

