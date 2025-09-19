import { Router } from "express";
import { MealList, IMealList } from "../models/MealList";
import { authenticateJWT, authorizeRoles } from "../utils/jwt";
import { validateMealList } from "../middleware/validation";

const router = Router();

// Tüm yemek listelerini getir
router.get("/", authenticateJWT, async (req, res) => {
  try {
    const { date, mealType } = req.query;
    let filter: any = {};
    
    if (date) {
      filter.date = new Date(date as string);
    }
    if (mealType) {
      filter.mealType = mealType;
    }
    
    const meals = await MealList.find(filter).sort({ date: -1 });
    res.json(meals);
  } catch (error) {
    console.error("Yemek listesi getirme hatası:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Belirli bir yemek listesini getir
router.get("/:id", authenticateJWT, async (req, res) => {
  try {
    const meal = await MealList.findById(req.params.id);
    if (!meal) {
      return res.status(404).json({ error: "Yemek listesi bulunamadı" });
    }
    res.json(meal);
  } catch (error) {
    console.error("Yemek listesi getirme hatası:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Yeni yemek listesi ekle (sadece admin ve yemekhane personeli)
router.post("/", authenticateJWT, authorizeRoles(['admin', 'kitchen_staff']), validateMealList, async (req, res) => {
  try {
    const meal = new MealList(req.body);
    await meal.save();
    res.status(201).json(meal);
  } catch (error) {
    console.error("Yemek listesi oluşturma hatası:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Yemek listesini güncelle (sadece admin ve yemekhane personeli)
router.put("/:id", authenticateJWT, authorizeRoles(['admin', 'kitchen_staff']), validateMealList, async (req, res) => {
  try {
    const meal = await MealList.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!meal) {
      return res.status(404).json({ error: "Yemek listesi bulunamadı" });
    }
    res.json(meal);
  } catch (error) {
    console.error("Yemek listesi güncelleme hatası:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// Yemek listesini sil (sadece admin)
router.delete("/:id", authenticateJWT, authorizeRoles(['admin']), async (req, res) => {
  try {
    const meal = await MealList.findByIdAndDelete(req.params.id);
    if (!meal) {
      return res.status(404).json({ error: "Yemek listesi bulunamadı" });
    }
    res.json({ success: true, message: "Yemek listesi silindi" });
  } catch (error) {
    console.error("Yemek listesi silme hatası:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

export default router;
