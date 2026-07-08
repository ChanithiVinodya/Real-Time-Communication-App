import { Router } from "express";
import { getTurnCredentials } from "../controllers/turn.controller.js";

const router = Router();

router.get("/credentials", getTurnCredentials);

export default router;
