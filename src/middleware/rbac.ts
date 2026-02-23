import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../db/schema/users';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';

/**
 * Role-Based Access Control middleware.
 * Must be used after the `authenticate` middleware.
 *
 * Usage:
 *   router.get('/creator', authenticate, requireRole('creator'), handler)
 *   router.get('/admin', authenticate, requireRole('creator', 'audience'), handler)
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `This route requires one of the following roles: ${roles.join(', ')}`,
        ),
      );
    }

    next();
  };
}
