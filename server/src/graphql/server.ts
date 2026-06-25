/**
 * Apollo GraphQL Server Setup
 * BFF layer with query complexity and depth limiting
 */

import { ApolloServer } from '@apollo/server';
import type { ExpressContextFunctionArgument } from '@apollo/server/express4';
import depthLimit from 'graphql-depth-limit';
import {
  createComplexityRule,
  fieldExtensionsEstimator,
  simpleEstimator,
} from 'graphql-query-complexity';
import jwt from 'jsonwebtoken';
import { typeDefs } from './schema';
import { resolvers } from './resolvers';
import { GraphQLContext } from './resolvers';
import { createUserLoader } from './resolvers/index';
import logger from '../utils/logger';

// JWT verification helper
async function verifyToken(token: string): Promise<unknown> {
  try {
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      logger.error('JWT_SECRET environment variable is not set');
      return null;
    }

    // Verify and decode token
    const decoded = jwt.verify(token, JWT_SECRET) as { userId?: string };
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

// Apollo Server 4 takes the context function at the middleware boundary rather
// than in the constructor — see createGraphQLContext below, passed to
// expressMiddleware in index.ts.
export function createApolloServer() {
  return new ApolloServer<GraphQLContext>({
    typeDefs,
    resolvers,
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
    formatError: (formattedError) => {
      logger.error('GraphQL Error:', formattedError);
      // Apollo v4 already populates extensions.code; keep message/path/extensions
      // and drop any internal stacktrace from the client-facing payload.
      return {
        message: formattedError.message,
        path: formattedError.path,
        extensions: formattedError.extensions,
      };
    },
    plugins: [
      {
        async requestDidStart() {
          return {
            async didResolveOperation(requestContext) {
              const { request } = requestContext;
              // graphql-query-complexity attaches operationComplexity at runtime
              const ctx = requestContext as unknown as { operationComplexity?: number };
              const complexity = ctx.operationComplexity;
              logger.debug(
                `GraphQL Operation: ${request.operationName}, Complexity: ${complexity}`,
              );
            },
          };
        },
      },
    ],
    // B-L2: gate introspection on an explicit env flag instead of
    // NODE_ENV !== 'production'. A misbuilt image with NODE_ENV unset would
    // otherwise expose the full schema in production.
    introspection:
      process.env.GRAPHQL_INTROSPECTION === 'true' ||
      (process.env.NODE_ENV === 'development' && process.env.GRAPHQL_INTROSPECTION !== 'false'),
  });
}

// Per-request context: authenticate the bearer token and build fresh DataLoaders.
// Passed to expressMiddleware(server, { context: createGraphQLContext }).
export async function createGraphQLContext({
  req,
}: ExpressContextFunctionArgument): Promise<GraphQLContext> {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');

  let user = null;
  if (token) {
    user = await verifyToken(token);
  }

  const userLoader = createUserLoader();

  return {
    user,
    userLoader,
    dataLoaders: {
      user: userLoader,
    },
  };
}
