import { Router } from "express";
import { getStatus } from "../../core/status.js";

export const statusRouter: Router = Router();

statusRouter.get("/", async (_req, res) => {
  res.json(await getStatus());
});
