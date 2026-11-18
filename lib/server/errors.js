export class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const badRequest = (message) => new AppError(400, message);
export const unauthorized = (message = 'Please sign in.') => new AppError(401, message);
export const paymentRequired = (message) => new AppError(402, message);
export const forbidden = (message = 'You do not have access to this.') => new AppError(403, message);
export const notFound = (what = 'Item') => new AppError(404, `${what} not found.`);
export const conflict = (message) => new AppError(409, message);
