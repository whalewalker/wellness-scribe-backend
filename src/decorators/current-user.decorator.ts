import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserDocument } from '../schemas/user.schema';

/**
 * Custom decorator to extract the current authenticated user from the request
 *
 * Usage:
 * @Get('profile')
 * async getProfile(@CurrentUser() user: UserDocument) {
 *   // user is now typed and contains the authenticated user
 * }
 *
 * With specific property extraction:
 * @Get('my-id')
 * async getMyId(@CurrentUser('_id') userId: string) {
 *   // only extracts the _id property
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: keyof UserDocument | '_id' | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest() as any;
    const user: UserDocument = request.user;

    if (!user) {
      return null;
    }

    // If a specific property is requested, return only that property
    return data ? (user as any)[data] : user;
  },
);
