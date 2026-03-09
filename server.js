const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const connectDB = require("./config/db");
const taskRoutes = require("./routes/taskRoutes");
const socketHandler = require("./socket/socketHandler");
const errorHandler = require("./middlewares/errorHandler");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");

require("dotenv").config();

const app = express();

// connectDB();

app.use(cors({
 origin: "*",
  methods:["GET","POST","PUT","DELETE"],
  credentials: true
}));

app.use(express.json());

app.get("/", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Kanban Board API is running 🚀"
  });
});

app.use("/tasks", taskRoutes);
app.use("/auth", authRoutes);
app.use("/users", userRoutes);

const server = http.createServer(app);

const io = new Server(server,{
  cors:{
    origin:"*",
    methods:["GET","POST","PUT","DELETE"]
  }
});

socketHandler(io);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server start failed:", error);
  }
};

startServer();
