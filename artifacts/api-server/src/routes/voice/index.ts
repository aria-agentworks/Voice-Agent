import { Router } from "express";
import twilioRouter from "./twilio.js";
import configRouter from "./config.js";
import callsRouter from "./calls.js";

const router = Router();

router.use(twilioRouter);
router.use(configRouter);
router.use(callsRouter);

export default router;
