import 'reflect-metadata';
import express from 'express';
import { MikroORM } from '@mikro-orm/core';
import { buildSchema } from 'type-graphql';
import { ApolloServer } from 'apollo-server-express';

import { __prod__ } from './constants';
import microConfig from './mikro-orm.config';
import { PostResolver } from './resolvers/post';
import { HelloResolver } from './resolvers/hello';
import { UserResolver } from './resolvers/user';

import redis from 'redis';
import session from 'express-session';
import connectRedis from 'connect-redis';
import { MyContext } from './types';

const main = async () => {
  const orm = await MikroORM.init(microConfig);
  await orm.getMigrator().up();

  const app = express();

  const RedisStore = connectRedis(session);
  const redisClient = redis.createClient();

  app.use(
    session({
      name: 'qid',
      store: new RedisStore({
        client: redisClient,
        disableTouch: true,
      }),
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 365 * 10,
        httpOnly: true,
        sameSite: 'lax', // csrf
        secure: __prod__, // cookie only works in https
      },
      saveUninitialized: false,
      secret: 'k4k2j3l4l4jj3jd4b',
      resave: false,
    }),
  );

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [HelloResolver, PostResolver, UserResolver],
      validate: false,
    }),
    context: ({ req, res }): MyContext => ({ em: orm.em, req, res }),
  });

  apolloServer.applyMiddleware({ app });

  app.listen(4000, () => {
    console.log(`Server on port ${4000}`);
  });
};

main().catch((error) => {
  console.log(error);
});
