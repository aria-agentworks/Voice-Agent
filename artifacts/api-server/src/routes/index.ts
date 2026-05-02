import { Router, type IRouter } from "express";
import healthRouter from "./health";
import leadsRouter from "./leads";
import keywordsRouter from "./keywords";
import testPhraseRouter from "./test-phrase";
import voiceRouter from "./voice/index.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(leadsRouter);
router.use(testPhraseRouter);
router.use(keywordsRouter);
router.use(voiceRouter);

export default router;
