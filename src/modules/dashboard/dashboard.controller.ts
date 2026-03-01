import { Request, Response, NextFunction } from 'express';
import * as dashboardService from './dashboard.service';
import { sendSuccess } from '../../utils/response';

export async function getCreatorDashboard(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const dashboard = await dashboardService.getCreatorDashboard(req.user!.id);
    sendSuccess(res, dashboard);
  } catch (err) {
    next(err);
  }
}

export async function getAudienceDashboard(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const dashboard = await dashboardService.getAudienceDashboard(req.user!.id);
    sendSuccess(res, dashboard);
  } catch (err) {
    next(err);
  }
}

export async function getConnectionsCount(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await dashboardService.getConnectionsCount(req.user!.id, req.user!.role);
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

export async function getConnections(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await dashboardService.getConnections(req.user!.id, req.user!.role);
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}
