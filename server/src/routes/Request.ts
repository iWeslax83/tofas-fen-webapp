import { Router } from "express";
import { Request as RequestModel } from "../models/Request";
import { authenticateJWT, authorizeRoles } from "../utils/jwt";
import { validateRequest as validateRequestData } from "../middleware/validation";

const router = Router();

// Kullanıcının tüm talepleri
router.get("/user/:userId", authenticateJWT, async (req, res) => {
  const reqs = await RequestModel.find({ userId: req.params.userId }).sort({ createdAt: -1 });
  res.json(reqs);
});

// Tüm talepler (admin)
router.get("/", authenticateJWT, authorizeRoles(['admin', 'teacher']), async (req, res) => {
  const reqs = await RequestModel.find().sort({ createdAt: -1 });
  res.json(reqs);
});

// Yeni talep oluştur
router.post("/", authenticateJWT, validateRequestData, async (req, res) => {
  const { userId, type, details } = req.body;
  const reqDoc = await RequestModel.create({ userId, type, details });
  res.status(201).json(reqDoc);
});

// Talep durumunu güncelle (admin onay/red)
router.patch("/:id", authenticateJWT, authorizeRoles(['admin', 'teacher']), async (req, res) => {
  const updated = await RequestModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(updated);
});

// Talebi sil (sadece oluşturan kişi veya admin)
router.delete("/:id", authenticateJWT, async (req, res) => {
  await RequestModel.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

export default router; 