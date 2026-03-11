const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');

router.get('/latest-number', taskController.getLatestTaskNumber);
router.get('/history/:id', taskController.getTaskHistory);
router.get('/:id', taskController.getTaskById); 
router.get('/', taskController.getTasks);

router.post('/', taskController.createTask);
router.put('/move/:id', taskController.moveTask);
router.put('/:id', taskController.updateTask);
router.delete('/:id', taskController.deleteTask);

module.exports = router;