import { User } from '../../../models/User';
import { AppError } from '../../../utils/AppError';
import bcrypt from 'bcryptjs';

/**
 * User Service
 * Business logic for user operations
 */
export class UserService {
  /**
   * Get all users with pagination and filters
   */
  static async getAllUsers(options: {
    page: number;
    limit: number;
    role?: string;
    search?: string;
    isActive?: boolean;
  }) {
    const { page, limit, role, search, isActive } = options;
    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};
    
    if (role) {
      query.rol = role;
    }
    
    if (isActive !== undefined) {
      query.isActive = isActive;
    }
    
    if (search) {
      query.$or = [
        { adSoyad: { $regex: search, $options: 'i' } },
        { id: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-sifre -resetToken -forgotPasswordToken')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(query)
    ]);

    return {
      users,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    };
  }

  /**
   * Get user by ID
   */
  static async getUserById(id: string): Promise<any> {
    const user = await User.findOne({ id, isActive: true })
      .select('-sifre -resetToken -forgotPasswordToken -forgotPasswordExpires');
    
    if (!user) {
      throw AppError.notFound('Kullanıcı bulunamadı');
    }

    return user;
  }

  /**
   * Create new user
   */
  static async createUser(userData: any): Promise<any> {
    // Check if user already exists
    const existingUser = await User.findOne({ id: userData.id });
    if (existingUser) {
      throw AppError.conflict('Bu ID ile zaten bir kullanıcı mevcut');
    }

    // Check email uniqueness if provided
    if (userData.email) {
      const existingEmail = await User.findOne({ email: userData.email });
      if (existingEmail) {
        throw AppError.conflict('Bu email adresi ile zaten bir kullanıcı mevcut');
      }
    }

    // Hash password if provided
    if (userData.sifre) {
      userData.sifre = await bcrypt.hash(userData.sifre, 12);
    }

    const user = new User(userData);
    await user.save();

    // Return user without sensitive data
    const { sifre, resetToken, forgotPasswordToken, ...userResponse } = user.toObject();
    return userResponse;
  }

  /**
   * Update user
   */
  static async updateUser(id: string, updateData: any, currentUserRole: string): Promise<any> {
    const user = await User.findOne({ id, isActive: true });
    if (!user) {
      throw AppError.notFound('Kullanıcı bulunamadı');
    }

    // Check email uniqueness if email is being updated
    if (updateData.email && updateData.email !== user.email) {
      const existingEmail = await User.findOne({ email: updateData.email });
      if (existingEmail) {
        throw AppError.conflict('Bu email adresi ile zaten bir kullanıcı mevcut');
      }
    }

    // Hash password if being updated
    if (updateData.sifre) {
      updateData.sifre = await bcrypt.hash(updateData.sifre, 12);
      // Increment token version to invalidate existing tokens
      updateData.tokenVersion = (user.tokenVersion || 0) + 1;
    }

    // Non-admin users can't change certain fields
    if (currentUserRole !== 'admin') {
      delete updateData.rol;
      delete updateData.isActive;
      delete updateData.tokenVersion;
    }

    Object.assign(user, updateData);
    await user.save();

    // Return user without sensitive data
    const { sifre, resetToken, forgotPasswordToken, ...userResponse } = user.toObject();
    return userResponse;
  }

  /**
   * Delete user (soft delete)
   */
  static async deleteUser(id: string): Promise<void> {
    const user = await User.findOne({ id, isActive: true });
    if (!user) {
      throw AppError.notFound('Kullanıcı bulunamadı');
    }

    user.isActive = false;
    user.tokenVersion = (user.tokenVersion || 0) + 1; // Invalidate tokens
    await user.save();
  }

  /**
   * Deactivate user
   */
  static async deactivateUser(id: string): Promise<void> {
    const user = await User.findOne({ id, isActive: true });
    if (!user) {
      throw AppError.notFound('Kullanıcı bulunamadı');
    }

    user.isActive = false;
    user.tokenVersion = (user.tokenVersion || 0) + 1; // Invalidate tokens
    await user.save();
  }

  /**
   * Activate user
   */
  static async activateUser(id: string): Promise<void> {
    const user = await User.findOne({ id, isActive: false });
    if (!user) {
      throw AppError.notFound('Kullanıcı bulunamadı');
    }

    user.isActive = true;
    await user.save();
  }

  /**
   * Get user statistics
   */
  static async getUserStats(): Promise<any> {
    const [
      totalUsers,
      activeUsers,
      usersByRole,
      recentLogins
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      User.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$rol', count: { $sum: 1 } } }
      ]),
      User.countDocuments({
        lastLogin: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        isActive: true
      })
    ]);

    const roleStats: Record<string, number> = {};
    usersByRole.forEach(stat => {
      roleStats[stat._id] = stat.count;
    });

    return {
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      usersByRole: roleStats,
      recentLogins
    };
  }

  /**
   * Search users
   */
  static async searchUsers(options: {
    query: string;
    role?: string;
    limit: number;
  }): Promise<any[]> {
    const { query, role, limit } = options;

    const searchQuery: any = {
      $or: [
        { adSoyad: { $regex: query, $options: 'i' } },
        { id: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ],
      isActive: true
    };

    if (role) {
      searchQuery.rol = role;
    }

    const users = await User.find(searchQuery)
      .select('-sifre -resetToken -forgotPasswordToken')
      .limit(limit);

    return users;
  }

  /**
   * Get users by role
   */
  static async getUsersByRole(role: string, options: {
    page: number;
    limit: number;
  }) {
    const { page, limit } = options;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find({ rol: role, isActive: true })
        .select('-sifre -resetToken -forgotPasswordToken')
        .sort({ adSoyad: 1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments({ rol: role, isActive: true })
    ]);

    return {
      users,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    };
  }

  /**
   * Get parent's children
   */
  static async getParentChildren(parentId: string): Promise<any[]> {
    const children = await User.find({
      parentId,
      isActive: true
    }).select('-sifre -resetToken -forgotPasswordToken');

    return children;
  }

  /**
   * Get students in class
   */
  static async getStudentsInClass(sinif: string, sube: string): Promise<any[]> {
    const students = await User.find({
      rol: 'student',
      sinif,
      sube,
      isActive: true
    }).select('-sifre -resetToken -forgotPasswordToken');

    return students;
  }

  /**
   * Get dormitory students
   */
  static async getDormitoryStudents(options: {
    page: number;
    limit: number;
  }) {
    const { page, limit } = options;
    const skip = (page - 1) * limit;

    const [students, total] = await Promise.all([
      User.find({
        rol: 'student',
        pansiyon: true,
        isActive: true
      })
        .select('-sifre -resetToken -forgotPasswordToken')
        .sort({ adSoyad: 1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments({
        rol: 'student',
        pansiyon: true,
        isActive: true
      })
    ]);

    return {
      students,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    };
  }

  /**
   * Validate user data
   */
  static validateUserData(userData: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!userData.id || userData.id.length < 1) {
      errors.push('ID gereklidir');
    }

    if (!userData.adSoyad || userData.adSoyad.length < 2) {
      errors.push('Ad soyad en az 2 karakter olmalıdır');
    }

    if (!userData.rol || !['admin', 'teacher', 'student', 'parent', 'hizmetli'].includes(userData.rol)) {
      errors.push('Geçerli bir rol seçilmelidir');
    }

    if (userData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
      errors.push('Geçerli bir email adresi giriniz');
    }

    if (userData.sinif && !['9', '10', '11', '12'].includes(userData.sinif)) {
      errors.push('Geçerli bir sınıf seçilmelidir');
    }

    if (userData.sube && !['A', 'B', 'C', 'D', 'E', 'F'].includes(userData.sube)) {
      errors.push('Geçerli bir şube seçilmelidir');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
