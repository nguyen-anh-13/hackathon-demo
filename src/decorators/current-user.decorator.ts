import { createParamDecorator, ExecutionContext } from '@nestjs/common';

type RequestUser = Record<string, unknown> & { id?: number };

export const CurrentUser = createParamDecorator(
  (data: keyof RequestUser | undefined, ctx: ExecutionContext): unknown => {
    const request = ctx.switchToHttp().getRequest<{ user?: RequestUser }>();
    const user = request.user;

    if (!user) {
      return undefined;
    }

    if (!data) {
      return user;
    }

    return user[data];
  }
);
