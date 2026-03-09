const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const connectDB = require("./config/db");
const taskRoutes = require("./routes/taskRoutes");
const socketHandler = require("./socket/socketHandler");
const errorHandler = require("./middlewares/errorHandler");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
require("dotenv").config();

const app = express();

connectDB();

app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));

app.use(express.json());

app.use("/tasks", taskRoutes);
app.use("/auth",authRoutes);
app.use("/users",userRoutes);

const server = http.createServer(app);

const io = new Server(server,{
  cors:{
    origin:"http://localhost:3000",
    methods:["GET","POST","PUT"]
  }
});

socketHandler(io);

app.use(errorHandler);

server.listen(5000,()=>{
  console.log("Server running on port 5000");
});