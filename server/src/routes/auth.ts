import express from 'express';
import { registerFarmer, loginFarmer } from '../controllers/auth';

const router = express.Router();

router.post('/register', registerFarmer);
router.post('/login', loginFarmer);

export default router;
