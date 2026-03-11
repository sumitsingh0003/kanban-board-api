const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

require("dotenv").config();

const connectDB = require("./config/db");
const taskRoutes = require("./routes/taskRoutes");
const socketHandler = require("./socket/socketHandler");
const errorHandler = require("./middlewares/errorHandler");
const loggerMiddleware = require("./middlewares/loggerMiddleware");
const { logger } = require("./utils/logger");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");

const app = express();
app.use(express.json());
app.use(loggerMiddleware); // Add logger middleware

const allowedOrigins = [
  "http://localhost:3000",
  "https://kan-ban-board-ai.vercel.app"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));

app.get("/", (req, res) => {
  logger.info('Health check endpoint hit');
  res.status(200).json({
    status: "success",
    message: "Kanban Board API is running 🚀"
  });
});

app.use("/auth", authRoutes);
app.use("/tasks", taskRoutes);
app.use("/users", userRoutes);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

socketHandler(io);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    logger.info('Starting server...', {
      mongoURI: process.env.MONGO_URI ? 'Loaded' : 'Missing'
    });

    await connectDB();

    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Server start failed', error);
    process.exit(1);
  }
};

startServer();