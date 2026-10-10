/**
 * Standard API Response Formatting Utilities
 */

export function success(res, data, message = 'Success', statusCode = 200, meta = null) {
  const response = {
    success: true,
    message,
    data,
  };
  if (meta) {
    response.meta = meta;
  }
  return res.status(statusCode).json(response);
}

export function created(res, data, message = 'Resource created successfully') {
  return success(res, data, message, 201);
}

export function paginated(res, data, { page, limit, total }, message = 'Success') {
  const totalPages = Math.ceil(total / limit) || 1;
  return success(res, data, message, 200, {
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: Number(total),
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  });
}

export function errorResponse(res, message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
  const response = {
    success: false,
    error: {
      message,
      code,
    },
  };
  if (details) {
    response.error.details = details;
  }
  return res.status(statusCode).json(response);
}

export default {
  success,
  created,
  paginated,
  errorResponse,
};
