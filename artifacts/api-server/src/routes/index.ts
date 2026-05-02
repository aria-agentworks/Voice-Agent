import { Router, type IRouter } from "express";
import healthRouter from "./health";
import leadsRouter from "./leads";
import keywordsRouter from "./keywords";

const router: IRouter = Router();

router.use(healthRouter);
router.use(leadsRouter);
router.use(keywordsRouter);

export default router;
