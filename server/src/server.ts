import dotenv from "dotenv";
dotenv.config();
import connectDB from "./config/db";
import express from "express";
import cors from 'cors';

const app = express();
const port = process.env.PORT || 5000;
const corsOptions = {
  origin: `${process.env.CLIENT_LINK}`,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
};
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors(corsOptions));

connectDB();

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
