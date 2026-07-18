import { Request, Response, NextFunction } from 'express';
import { isValidObjectId } from 'mongoose';

/**
 * Reject malformed Mongo ObjectIds with 400 instead of letting Model.findById()
 * throw a CastError that the route's try/catch surfaces as a 500.
 *
 * Two flavours:
 *   - `validateObjectId` is an Express `router.param` handler. Attach it once per
 *     router whose ':id' param is ALWAYS a Mongo _id:
 *         router.param('id', validateObjectId);
 *   - `validateObjectIdParam(name)` is a normal per-route middleware, for routers
 *     that mix ObjectId ':id' routes with non-ObjectId ones (e.g. Notification's
 *     in-memory automation rules), where router.param() would over-reach.
 *
 * Do NOT use on models keyed by a custom string id (e.g. Homework, User), whose
 * ':id' is a plain string and would be wrongly rejected.
 */
const INVALID_ID = { success: false, error: 'Geçersiz kimlik formatı' };

export function validateObjectId(
  _req: Request,
  res: Response,
  next: NextFunction,
  value: string,
): void {
  if (!isValidObjectId(value)) {
    res.status(400).json(INVALID_ID);
    return;
  }
  next();
}

export function validateObjectIdParam(paramName = 'id') {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!isValidObjectId(req.params[paramName])) {
      res.status(400).json(INVALID_ID);
      return;
    }
    next();
  };
}
