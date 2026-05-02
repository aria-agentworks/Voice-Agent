import { Router } from "express";
import twilioRouter from "./twilio.js";
import configRouter from "./config.js";
import callsRouter from "./calls.js";
import analyticsRouter from "./analytics.js";
import appointmentsRouter from "./appointments.js";
import integrationsRouter from "./integrations.js";

const router = Router();

router.use(analyticsRouter);
router.use(appointmentsRouter);
router.use(integrationsRouter);
router.use(twilioRouter);
router.use(configRouter);
router.use(callsRouter);

export default router;
