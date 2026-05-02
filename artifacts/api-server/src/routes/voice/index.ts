import { Router } from "express";
import twilioRouter from "./twilio.js";
import configRouter from "./config.js";
import callsRouter from "./calls.js";
import analyticsRouter from "./analytics.js";

const router = Router();

router.use(twilioRouter);
router.use(configRouter);
router.use(analyticsRouter);
router.use(callsRouter);

export default router;
