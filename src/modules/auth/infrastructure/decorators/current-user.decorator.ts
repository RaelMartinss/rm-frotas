import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserPayload } from '../strategies/jwt.strategy';

export const CurrentUser = createParamDecorator(
  (data: keyof UserPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as UserPayload;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);