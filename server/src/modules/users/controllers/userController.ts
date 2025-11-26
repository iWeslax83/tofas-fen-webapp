import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../../utils/AppError';
import { UserService } from '../services/userService';
import { asyncHandler } from '../../../middleware/errorHandler';
// import { authorizeRoles } from '../../../utils/jwt';

/**
 * User Controller
 * Handles all user-related operations
 */
export class UserController {
  /**
   * Get all users (admin only)
   */
  static getAllUsers = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { page = 1, limit = 10, role, search, isActive } = req.query;
    
    const users = await UserService.getAllUsers({
      page: Number(page),
      limit: Number(limit),
      role: role as string,
      search: search as string,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined as any
    });

    res.json({
      success: true,
      data: users.users,
      pagination: {
        page: users.page,
        limit: users.limit,
        total: users.total,
        pages: users.pages
      }
    });
  });

  /**
   * Get user by ID
   */
  static getUserById = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;
    const currentUser = (req as any).user;

    // Users can only view their own profile unless they're admin
    if (currentUser.role !== 'admin' && currentUser.userId !== id) {
      throw AppError.forbidden('Bu kullanıcının bilgilerini görme yetkiniz yok');
    }

    const user = await UserService.getUserById(id);
    
    res.json({
      success: true,
      data: user
    });
  });

  /**
   * Create new user (admin only)
   */
  static createUser = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const userData = req.body;
    
    const user = await UserService.createUser(userData);
    
    res.status(201).json({
      success: true,
      message: 'Kullanıcı başarıyla oluşturuldu',
      data: user
    });
  });

  /**
   * Update user
   */
  static updateUser = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;
    const updateData = req.body;
    const currentUser = (req as any).user;

    // Users can only update their own profile unless they're admin
    if (currentUser.role !== 'admin' && currentUser.userId !== id) {
      throw AppError.forbidden('Bu kullanıcıyı güncelleme yetkiniz yok');
    }

    const user = await UserService.updateUser(id, updateData, currentUser.role);
    
    res.json({
      success: true,
      message: 'Kullanıcı başarıyla güncellendi',
      data: user
    });
  });

  /**
   * Delete user (admin only)
   */
  static deleteUser = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;
    
    await UserService.deleteUser(id);
    
    res.json({
      success: true,
      message: 'Kullanıcı başarıyla silindi'
    });
  });

  /**
   * Deactivate user (admin only)
   */
  static deactivateUser = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;
    
    await UserService.deactivateUser(id);
    
    res.json({
      success: true,
      message: 'Kullanıcı başarıyla deaktive edildi'
    });
  });

  /**
   * Activate user (admin only)
   */
  static activateUser = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { id } = req.params;
    
    await UserService.activateUser(id);
    
    res.json({
      success: true,
      message: 'Kullanıcı başarıyla aktif edildi'
    });
  });

  /**
   * Get user statistics (admin only)
   */
  static getUserStats = asyncHandler(async (_req: Request, res: Response, _next: NextFunction) => {
    const stats = await UserService.getUserStats();
    
    res.json({
      success: true,
      data: stats
    });
  });

  /**
   * Search users
   */
  static searchUsers = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { q, role, limit = 10 } = req.query;
    
    if (!q || (q as string).length < 2) {
      throw AppError.validation('Arama terimi en az 2 karakter olmalıdır');
    }

    const users = await UserService.searchUsers({
      query: q as string,
      role: role as string,
      limit: Number(limit)
    });
    
    res.json({
      success: true,
      data: users
    });
  });

  /**
   * Get users by role
   */
  static getUsersByRole = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { role } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    const users = await UserService.getUsersByRole(role, {
      page: Number(page),
      limit: Number(limit)
    });
    
    res.json({
      success: true,
      data: users.users,
      pagination: {
        page: users.page,
        limit: users.limit,
        total: users.total,
        pages: users.pages
      }
    });
  });

  /**
   * Get parent's children
   */
  static getParentChildren = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { parentId } = req.params;
    const currentUser = (req as any).user;

    // Only parents can view their own children or admins
    if (currentUser.role !== 'admin' && currentUser.userId !== parentId) {
      throw AppError.forbidden('Bu ebeveynin çocuklarını görme yetkiniz yok');
    }

    const children = await UserService.getParentChildren(parentId);
    
    res.json({
      success: true,
      data: children
    });
  });

  /**
   * Get students in class
   */
  static getStudentsInClass = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { sinif, sube } = req.params;
    
    const students = await UserService.getStudentsInClass(sinif, sube);
    
    res.json({
      success: true,
      data: students
    });
  });

  /**
   * Get dormitory students
   */
  static getDormitoryStudents = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
    const { page = 1, limit = 10 } = req.query;
    
    const students = await UserService.getDormitoryStudents({
      page: Number(page),
      limit: Number(limit)
    });
    
    res.json({
      success: true,
      data: students.students,
      pagination: {
        page: students.page,
        limit: students.limit,
        total: students.total,
        pages: students.pages
      }
    });
  });
}
