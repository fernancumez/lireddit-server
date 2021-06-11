import { MikroORM } from '@mikro-orm/core';
import microConfig from './mikro-orm.config';
import { __prod__ } from './constants';
import { Post } from './entities/Post';

const main = async () => {
  const orm = await MikroORM.init(microConfig);
  await orm.getMigrator().up();

  const posts = await orm.em.find(Post, {});

  if (posts.length <= 0) {
    const post = orm.em.create(Post, { title: 'My first post' });
    await orm.em.persistAndFlush(post);
  }

  console.log(posts);
};

main().catch((error) => console.log(error));
