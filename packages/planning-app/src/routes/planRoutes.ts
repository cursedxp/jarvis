import { Router } from 'express';
import { PlanController } from '../controllers/planController';

const router = Router();
const planController = new PlanController();

// Daily Plan routes
router.post('/daily/:date', planController.createDailyPlan.bind(planController));
router.get('/daily/:date', planController.getDailyPlan.bind(planController));
router.put('/daily/:date', planController.updateDailyPlan.bind(planController));
router.delete('/daily/:date', planController.deleteDailyPlan.bind(planController));

// Task routes
router.post('/daily/:date/tasks', planController.addTask.bind(planController));
router.put('/daily/:date/tasks/:taskId', planController.updateTask.bind(planController));
router.delete('/daily/:date/tasks/:taskId', planController.removeTask.bind(planController));

// Weekly Plan routes
router.post('/weekly/:date', planController.createWeeklyPlan.bind(planController));
router.get('/weekly/:date', planController.getWeeklyPlan.bind(planController));
router.put('/weekly/:date', planController.updateWeeklyPlan.bind(planController));

// Utility routes
router.get('/stats/weekly/:date', planController.getWeeklyStats.bind(planController));
router.get('/today', planController.getTodaysPlan.bind(planController));

export default router;