import { ApiError } from "../utils/apiError.js";

export function notFoundHandler(req, _res, next) {
  next(new ApiError(404, `Route ${req.method} ${req.originalUrl} was not found.`));
}

export function errorHandler(error, _req, res, _next) {
  if (error.name === "SequelizeUniqueConstraintError") {
    return res.status(409).json({
      message: "A record with the same unique value already exists.",
    });
  }

  if (error.name === "SequelizeValidationError") {
    return res.status(400).json({
      message: "Validation failed.",
      details: error.errors?.map((item) => item.message) ?? [],
    });
  }

  const statusCode = error instanceof ApiError ? error.statusCode : 500;

  return res.status(statusCode).json({
    message: error.message || "Internal server error.",
    details: error.details ?? null,
  });
}
