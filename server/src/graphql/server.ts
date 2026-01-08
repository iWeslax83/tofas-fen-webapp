/**
 * Apollo GraphQL Server Setup
 * BFF layer with query complexity and depth limiting
 */

import { ApolloServer } from 'apollo-server-express';
import depthLimit from 'graphql-depth-limit';
import { createComplexityRule, fieldExtensionsEstimator, simpleEstimator } from 'graphql-query-complexity';
import { typeDefs } from './schema';
import { resolvers } from './resolvers';
import { GraphQLContext } from './resolvers';
import { createUserLoader } from './resolvers/index';
import logger from '../utils/logger';

// JWT verification helper
async function verifyToken(token: string): Promise<any> {
  try {
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
    
    // Verify and decode token
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (!decoded || !decoded.userId) {
      return null;
    }
    
    const { User } = await import('../models/User');
    return User.findById(decoded.userId);
  } catch (error) {
    logger.error('Token verification failed:', error);
    return null;
  }
}

export function createApolloServer() {
  return new ApolloServer({
    typeDefs,
    resolvers,
    context: async ({ req }): Promise<GraphQLContext> => {
      // Extract token from Authorization header
      const authHeader = req.headers.authorization || '';
      const token = authHeader.replace('Bearer ', '');

      let user = null;
      if (token) {
        user = await verifyToken(token);
      }

      // Create DataLoaders for this request
      const userLoader = createUserLoader();

      return {
        user,
        userLoader,
        dataLoaders: {
          user: userLoader,
        },
      };
    },
    validationRules: [
      depthLimit(10), // Maximum query depth
      createComplexityRule({
        estimators: [fieldExtensionsEstimator(), simpleEstimator()],
        maximumComplexity: 1000,
        onComplete: (complexity: number) => {
          logger.debug(`Query complexity: ${complexity}`);
        },
      }),
    ],
    formatError: (error) => {
      logger.error('GraphQL Error:', error);
      return {
        message: error.message,
        code: error.extensions?.code,
        path: error.path,
      };
    },
    plugins: [
      {
        async requestDidStart() {
          return {
            async didResolveOperation(requestContext: any) {
              const { request } = requestContext;
              const complexity = (requestContext as any).operationComplexity;
              logger.debug(`GraphQL Operation: ${request.operationName}, Complexity: ${complexity}`);
            },
          };
        },
      },
    ],
    introspection: process.env.NODE_ENV !== 'production',
    playground: process.env.NODE_ENV !== 'production',
  });
}

