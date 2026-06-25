import { Router } from "express";
import { SocketEvents } from "@velvet/shared";
import type { ApplyRequest } from "@velvet/shared";
import { applyModuleStates, getModuleViews } from "../../core/config.js";
import { getIo } from "../socket.js";

export const modulesRouter: Router = Router();

modulesRouter.get("/", (_req, res) => {
  res.json({ modules: getModuleViews() });
});

modulesRouter.post("/apply", async (req, res) => {
  const body = req.body as ApplyRequest | undefined;
  if (!body || !Array.isArray(body.modules)) {
    res.status(400).json({ error: "Invalid payload: expected { modules: [...] }" });
    return;
  }
  try {
    await applyModuleStates(body.modules);
    const modules = getModuleViews();
    getIo()?.emit(SocketEvents.ConfigApplied, { modules });
    res.json({ modules });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});
