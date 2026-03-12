import dotenv from "dotenv";
dotenv.config();
import axios from 'axios';
import connectDB from "./config/db";
import express from "express";
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth';
import cattleRoutes from './routes/cattle';
import locationRoutes from './routes/location';
import userRoutes from './routes/user';

// Check required prod variables
if (!process.env.JWT_SECRET || !process.env.MONGO_URI) {
  console.error("FATAL ERROR: Missing env secrets.");
  process.exit(1);
}
const app = express();
// Enable proxy trust for GCP Load Balancing/Rate Limiting
app.set('trust proxy', 1);
const port = process.env.PORT || 2424;

// Strict CORS Rules
const corsOptions = {
  origin: [
    'http://localhost',
    'capacitor://localhost',
    'https://localhost',
    process.env.CLIENT_LINK || ''
  ],
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
};


app.get('/api/health', (req, res) => {
  res.status(200).send("Express Server is Awake and running!");
});

const DL_API_URL = process.env.DL_API_URL;

setInterval(async () => {
  try {
    await axios.get(`${DL_API_URL}/docs`);
    console.log("Internal Ping: Kept DL Server awake.");
  } catch (error: any) {
    console.error("Internal Ping Failed:", error.message);
  }
}, 10 * 60 * 1000);



app.use(helmet());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors(corsOptions));

// HTTP Request Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} | Origin: ${req.headers.origin} | IP: ${req.ip}`);
  next();
});

// Auth Route Rate Limiter (100 req / 15min)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

connectDB();

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/cattle', cattleRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/user', userRoutes);

// GCP Healthcheck
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.get("/", (req, res) => {
  res.send("Hello World! API running");
});

app.listen(Number(port), "0.0.0.0", () => {
  console.log(`Server is running at http://0.0.0.0:${port}`);
});
