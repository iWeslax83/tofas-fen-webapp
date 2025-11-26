/**
 * GraphQL Resolvers
 * BFF layer resolvers with DataLoader for N+1 query prevention
 */

import { IResolvers } from '@graphql-tools/utils';
import DataLoader from 'dataloader';
import { User } from '../../models/User';
import { Announcement } from '../../models/Announcement';
import { Homework } from '../../models/Homework';
import { Note } from '../../models/Note';
import { EvciRequest } from '../../models/EvciRequest';
import { Club } from '../../models/Club';

// DataLoaders for batch loading
export const createUserLoader = () => {
  return new DataLoader(async (userIds: readonly string[]) => {
    const users = await User.find({ _id: { $in: userIds } });
    const userMap = new Map(users.map(user => [user._id.toString(), user]));
    return userIds.map(id => userMap.get(id) || null);
  });
};

// Context type
export interface GraphQLContext {
  user?: any;
  userLoader: DataLoader<string, any>;
  dataLoaders: {
    user: DataLoader<string, any>;
  };
}

// Resolvers
export const resolvers: IResolvers = {
  Query: {
    me: async (_parent, _args, context: GraphQLContext) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }
      return context.user;
    },

    user: async (_parent, { id }, context: GraphQLContext) => {
      return context.dataLoaders.user.load(id);
    },

    users: async (_parent, { role, page = 1, limit = 20 }) => {
      const query: any = {};
      if (role) query.rol = role;

      const skip = (page - 1) * limit;
      const [users, totalCount] = await Promise.all([
        User.find(query).skip(skip).limit(limit),
        User.countDocuments(query),
      ]);

      return {
        nodes: users,
        totalCount,
        pageInfo: {
          hasNextPage: skip + users.length < totalCount,
          hasPreviousPage: page > 1,
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
        },
      };
    },

    announcements: async (_parent, { filters = {}, page = 1, limit = 20 }) => {
      const query: any = {};
      if (filters.targetAudience) {
        query.targetAudience = { $in: filters.targetAudience };
      }
      if (filters.priority) query.priority = filters.priority;
      if (filters.createdBy) query.createdBy = filters.createdBy;

      const skip = (page - 1) * limit;
      const [announcements, totalCount] = await Promise.all([
        Announcement.find(query).skip(skip).limit(limit).populate('createdBy'),
        Announcement.countDocuments(query),
      ]);

      return {
        nodes: announcements,
        totalCount,
        pageInfo: {
          hasNextPage: skip + announcements.length < totalCount,
          hasPreviousPage: page > 1,
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
        },
      };
    },

    announcement: async (_parent, { id }) => {
      return Announcement.findById(id).populate('createdBy');
    },

    homeworks: async (_parent, { filters = {}, page = 1, limit = 20 }) => {
      const query: any = {};
      if (filters.assignedTo) query.assignedTo = filters.assignedTo;
      if (filters.createdBy) query.createdBy = filters.createdBy;
      if (filters.dueDateFrom || filters.dueDateTo) {
        query.dueDate = {};
        if (filters.dueDateFrom) query.dueDate.$gte = new Date(filters.dueDateFrom);
        if (filters.dueDateTo) query.dueDate.$lte = new Date(filters.dueDateTo);
      }

      const skip = (page - 1) * limit;
      const [homeworks, totalCount] = await Promise.all([
        Homework.find(query).skip(skip).limit(limit).populate('createdBy assignedTo'),
        Homework.countDocuments(query),
      ]);

      return {
        nodes: homeworks,
        totalCount,
        pageInfo: {
          hasNextPage: skip + homeworks.length < totalCount,
          hasPreviousPage: page > 1,
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
        },
      };
    },

    homework: async (_parent, { id }) => {
      return Homework.findById(id).populate('createdBy assignedTo');
    },

    myHomeworks: async (_parent, _args, context: GraphQLContext) => {
      if (!context.user) throw new Error('Not authenticated');
      return Homework.find({ assignedTo: context.user._id }).populate('createdBy');
    },

    evciRequests: async (_parent, { filters = {}, page = 1, limit = 20 }) => {
      const query: any = {};
      if (filters.studentId) query.studentId = filters.studentId;
      if (filters.status) query.status = filters.status;

      const skip = (page - 1) * limit;
      const [requests, totalCount] = await Promise.all([
        EvciRequest.find(query).skip(skip).limit(limit).populate('student approvedBy'),
        EvciRequest.countDocuments(query),
      ]);

      return {
        nodes: requests,
        totalCount,
        pageInfo: {
          hasNextPage: skip + requests.length < totalCount,
          hasPreviousPage: page > 1,
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
        },
      };
    },

    myEvciRequests: async (_parent, _args, context: GraphQLContext) => {
      if (!context.user) throw new Error('Not authenticated');
      return EvciRequest.find({ studentId: context.user._id }).populate('approvedBy');
    },

    meals: async (_parent, { date }) => {
      // Implementation depends on your Meal model
      // This is a placeholder
      return [];
    },

    dashboardStats: async (_parent, { role }, context: GraphQLContext) => {
      if (!context.user) throw new Error('Not authenticated');
      
      const [announcements, homeworks, evciRequests] = await Promise.all([
        Announcement.countDocuments({ targetAudience: { $in: [role] } }),
        Homework.countDocuments({ assignedTo: context.user._id }),
        EvciRequest.countDocuments({ studentId: context.user._id, status: 'pending' }),
      ]);

      return {
        totalAnnouncements: announcements,
        totalHomeworks: homeworks,
        pendingEvciRequests: evciRequests,
        unreadNotifications: 0, // Implement based on your notification system
      };
    },
  },

  Mutation: {
    login: async (_parent, { id, sifre }) => {
      // Use existing auth logic - import dynamically to avoid circular dependencies
      const { SecureAPI } = await import('../../utils/api');
      const response = await SecureAPI.login(id, sifre, { id, sifre });
      return response;
    },

    createAnnouncement: async (_parent, { input }, context: GraphQLContext) => {
      if (!context.user) throw new Error('Not authenticated');
      
      const announcement = new Announcement({
        ...input,
        createdBy: context.user._id,
      });
      return announcement.save();
    },

    createEvciRequest: async (_parent, { input }, context: GraphQLContext) => {
      if (!context.user) throw new Error('Not authenticated');
      
      const request = new EvciRequest({
        ...input,
        studentId: context.user._id,
        status: 'pending',
      });
      return request.save();
    },
  },

  // Field resolvers
  Announcement: {
    createdBy: async (parent, _args, context: GraphQLContext) => {
      return context.dataLoaders.user.load(parent.createdBy.toString());
    },
  },

  Homework: {
    createdBy: async (parent, _args, context: GraphQLContext) => {
      return context.dataLoaders.user.load(parent.createdBy.toString());
    },
    assignedTo: async (parent, _args, context: GraphQLContext) => {
      return Promise.all(
        parent.assignedTo.map((id: string) => context.dataLoaders.user.load(id.toString()))
      );
    },
  },
};

