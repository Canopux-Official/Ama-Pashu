import dotenv from "dotenv";
dotenv.config();
import axios from 'axios';
import connectDB from "./config/db";
import express from "express";
import path from "path";
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth';
import cattleRoutes from './routes/cattle';
import locationRoutes from './routes/location';
import userRoutes from './routes/user';

if (!process.env.JWT_SECRET || !process.env.MONGO_URI) {
  console.error("FATAL ERROR: Missing env secrets.");
  process.exit(1);
}

const app = express();
app.set('trust proxy', 1);
const port = process.env.PORT || 2424;

const allowedOrigins = [
  'http://localhost:5173',
  'capacitor://localhost',
  'http://localhost',
  'https://localhost',
  process.env.CLIENT_LINK || ''
];

const corsOptions = {
  origin: function (origin: any, callback: any) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`🛑 Blocked by CORS: ${origin}`);
      callback(new Error('Not allowed by CORS policy'));
    }
  },
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors(corsOptions));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} | IP: ${req.ip} | Origin: ${req.headers.origin || 'None'}`);
  next();
});

app.get('/api/health', (req, res) => {
  res.status(200).send("Express Server is Awake and running!");
});

const DL_API_URL = process.env.DL_API_URL;
if (DL_API_URL) {
  setInterval(async () => {
    try {
      await axios.get(`${DL_API_URL}/docs`);
    } catch (error: any) {
      console.error("Internal Ping Failed:", error.message);
    }
  }, 10 * 60 * 1000);
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

connectDB();

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/cattle', cattleRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/user', userRoutes);

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.get("/", (req, res) => {
  res.send("Hello World! API running");
});

app.listen(Number(port), "0.0.0.0", () => {
  console.log(`Server is running at http://0.0.0.0:${port}`);
});