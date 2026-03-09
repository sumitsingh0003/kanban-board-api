const express = require("express");
const router = express.Router();

const userController = require("../controllers/userController");
const auth = require("../middlewares/authMiddleware");

router.get('/me', auth, userController.getCurrentUser);
router.get("/:id", auth, userController.getSingleUser);
router.put("/:id", auth, userController.updateUser);
router.get("/", auth, userController.getUsers);

module.exports = router;