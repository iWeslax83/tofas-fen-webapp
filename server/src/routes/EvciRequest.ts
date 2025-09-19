import { Router } from "express";
import { EvciRequest, IEvciRequest } from "../models/EvciRequest";
import { authenticateJWT, authorizeRoles } from "../utils/jwt";
import { validateEvciRequest } from "../middleware/validation";
const router = Router();

// Tüm evci taleplerini getir (admin)
router.get("/", authenticateJWT, authorizeRoles(['admin', 'teacher']), async (req, res) => {
  const all = await EvciRequest.find();
  res.json(all);
});

// Belirli bir öğrencinin evci talepleri
router.get("/student/:studentId", authenticateJWT, async (req, res) => {
  const list = await EvciRequest.find({ studentId: req.params.studentId });
  res.json(list);
});

// Yeni evci talebi oluştur
router.post("/", authenticateJWT, authorizeRoles(['student', 'parent']), validateEvciRequest, async (req, res) => {
  const { studentId, willGo, startDate, endDate, destination } = req.body;
  const newReq = new EvciRequest({ studentId, willGo, startDate, endDate, destination });
  await newReq.save();
  res.status(201).json(newReq);
});

// Evci talebini sil (sadece oluşturan kişi veya admin)
router.delete("/:id", authenticateJWT, authorizeRoles(['admin', 'student', 'parent']), async (req, res) => {
  await EvciRequest.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

// Evci talebini güncelle (sadece oluşturan kişi veya admin)
router.patch("/:id", authenticateJWT, authorizeRoles(['admin', 'student', 'parent']), validateEvciRequest, async (req, res) => {
  const updated = await EvciRequest.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(updated);
});

export default router;
