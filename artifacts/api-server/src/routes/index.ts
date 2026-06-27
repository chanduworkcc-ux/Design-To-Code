import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import productsRouter from "./products";
import ordersRouter from "./orders";
import walletRouter from "./wallet";
import ticketsRouter from "./tickets";
import couponsRouter from "./coupons";
import adminRouter from "./admin";
import bannersRouter from "./banners";
import notificationsRouter from "./notifications";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(productsRouter);
router.use(ordersRouter);
router.use(walletRouter);
router.use(ticketsRouter);
router.use(couponsRouter);
router.use(adminRouter);
router.use(bannersRouter);
router.use(notificationsRouter);
router.use(storageRouter);

export default router;
