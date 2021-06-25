import argon2 from 'argon2';
import { COOKIE_NAME } from '../constants';
import {
  Arg,
  Ctx,
  Field,
  InputType,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from 'type-graphql';

import { User } from '../entities/User';
import { MyContext } from '../types';

@InputType()
class LoginInput {
  @Field()
  email: string;

  @Field()
  password: string;
}

@InputType()
class RegisterInput {
  @Field()
  username: string;

  @Field()
  email: string;

  @Field()
  password: string;
}

@ObjectType()
class FieldError {
  @Field()
  field: string;

  @Field()
  message: string;
}

@ObjectType()
class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => User, { nullable: true })
  user?: User;
}

@Resolver()
export class UserResolver {
  @Query(() => User, { nullable: true })
  async me(@Ctx() { req, em }: MyContext) {
    // you are not logged in
    if (!req.session.userId) {
      return null;
    }

    const user = await em.findOne(User, { id: req.session.userId });
    return user;
  }

  @Mutation(() => UserResponse)
  async register(
    @Arg('options') options: RegisterInput,
    @Ctx() { em, req }: MyContext,
  ): Promise<UserResponse> {
    const validateEmail = (email: string) => {
      let regexEmail = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;

      return !!email && typeof email === 'string' && email.match(regexEmail);
    };

    if (options.username.length <= 2) {
      return {
        errors: [
          {
            field: 'username',
            message: 'length must be greater than 2',
          },
        ],
      };
    }

    if (!validateEmail(options.email)) {
      return {
        errors: [
          {
            field: 'email',
            message: 'must be a valid email address',
          },
        ],
      };
    }

    if (options.password.length <= 3) {
      return {
        errors: [
          {
            field: 'pasword',
            message: 'length must be greater than 3',
          },
        ],
      };
    }

    const hashedPassword = await argon2.hash(options.password);

    const user = em.create(User, {
      username: options.username,
      email: options.email,
      password: hashedPassword,
    });

    try {
      await em.persistAndFlush(user);
    } catch (error) {
      if (error.code === '23505') {
        return {
          errors: [
            {
              field: 'email',
              message: 'email already taken',
            },
          ],
        };
      }
    }

    // store user id session
    // this will set a cookie on the user
    // keep them logged in
    req.session.userId = user.id;

    return { user };
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg('options') options: LoginInput,
    @Ctx() { em, req }: MyContext,
  ): Promise<UserResponse> {
    const user = await em.findOne(User, { email: options.email });

    if (!user) {
      return {
        errors: [
          {
            field: 'email',
            message: 'that user doesn´t exist',
          },
        ],
      };
    }

    const valid = await argon2.verify(user.password, options.password);

    if (!valid) {
      return {
        errors: [
          {
            field: 'password',
            message: 'incorrect password',
          },
        ],
      };
    }

    // store user id session
    // this will set a cookie on the user
    // keep them logged in

    req.session.userId = user.id;

    return {
      user,
    };
  }

  @Mutation(() => Boolean)
  logout(@Ctx() { req, res }: MyContext) {
    return new Promise((resolve) =>
      req.session.destroy((err: any) => {
        res.clearCookie(COOKIE_NAME);
        if (err) {
          resolve(false);
          return;
        }

        resolve(true);
      }),
    );
  }
}
