import { Router } from "express";
import { getPermissionAudit } from "../../core/permissions.js";

export const permissionsRouter: Router = Router();

permissionsRouter.get("/", (_req, res) => {
  res.json(getPermissionAudit());
});
