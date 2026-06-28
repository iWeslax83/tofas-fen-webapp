import { Router } from 'express';
import { validateObjectId } from '../middleware/validateObjectId';
import { MealList, IMealList } from '../models/MealList';
import { FilterQuery } from 'mongoose';
import { authenticateJWT, authorizeRoles } from '../utils/jwt';
import { validateMealList } from '../middleware/validation';
import logger from '../utils/logger';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Reject malformed ObjectIds (400) before findById() can throw a CastError (500)
router.param('id', validateObjectId);

// Tüm yemek listelerini getir
router.get(
  '/',
  authenticateJWT,
  asyncHandler(async (req, res) => {
    try {
      const { date, mealType } = req.query;
      const filter: FilterQuery<IMealList> = {};

      if (date) {
        filter.date = new Date(date as string);
      }
      if (mealType) {
        filter.mealType = mealType;
      }

      const meals = await MealList.find(filter).sort({ date: -1 });
      res.json(meals);
    } catch (error) {
      logger.error('Yemek listesi getirme hatasi', {
        error: error instanceof Error ? error.message : error,
      });
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }),
);

// Belirli bir yemek listesini getir
router.get(
  '/:id',
  authenticateJWT,
  asyncHandler(async (req, res) => {
    try {
      const meal = await MealList.findById(req.params.id);
      if (!meal) {
        return res.status(404).json({ error: 'Yemek listesi bulunamadı' });
      }
      res.json(meal);
    } catch (error) {
      logger.error('Yemek listesi getirme hatasi', {
        error: error instanceof Error ? error.message : error,
      });
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }),
);

// Yeni yemek listesi ekle (sadece admin ve yemekhane personeli)
router.post(
  '/',
  authenticateJWT,
  authorizeRoles(['admin']),
  validateMealList,
  asyncHandler(async (req, res) => {
    try {
      const meal = new MealList(req.body);
      await meal.save();
      res.status(201).json(meal);
    } catch (error) {
      logger.error('Yemek listesi olusturma hatasi', {
        error: error instanceof Error ? error.message : error,
      });
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }),
);

// Yemek listesini güncelle (sadece admin ve yemekhane personeli)
router.put(
  '/:id',
  authenticateJWT,
  authorizeRoles(['admin']),
  validateMealList,
  asyncHandler(async (req, res) => {
    try {
      const meal = await MealList.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      });
      if (!meal) {
        return res.status(404).json({ error: 'Yemek listesi bulunamadı' });
      }
      res.json(meal);
    } catch (error) {
      logger.error('Yemek listesi guncelleme hatasi', {
        error: error instanceof Error ? error.message : error,
      });
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }),
);

// Yemek listesini sil (sadece admin)
router.delete(
  '/:id',
  authenticateJWT,
  authorizeRoles(['admin']),
  asyncHandler(async (req, res) => {
    try {
      const meal = await MealList.findByIdAndDelete(req.params.id);
      if (!meal) {
        return res.status(404).json({ error: 'Yemek listesi bulunamadı' });
      }
      res.json({ success: true, message: 'Yemek listesi silindi' });
    } catch (error) {
      logger.error('Yemek listesi silme hatasi', {
        error: error instanceof Error ? error.message : error,
      });
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }),
);

export default router;
