import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AllowedRoles } from 'src/auth/role.decorator';
import { JwtService } from 'src/jwt/jwt.service';
import { User } from 'src/users/entities/user.entity';
import { UserService } from 'src/users/users.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
  ) {}
  async canActivate(context: ExecutionContext) {
    const roles = this.reflector.get<AllowedRoles>(
      'roles',
      context.getHandler(),
    );
    // Roles 설정이 없다면? public resolver라는 뜻.
    if (!roles) return true;
    const gqlContext = GqlExecutionContext.create(context).getContext();
    const token = gqlContext.token;
    if (!token) return false;

    try {
      const decoded = this.jwtService.verify(token.toString());
      if (typeof decoded === 'object' && decoded.hasOwnProperty('id')) {
        const { user } = await this.userService.findById({
          userId: decoded['id'],
        });
        // Roles에 설정이 있는데 user가 없다면?
        if (!user) return false;
        gqlContext['user'] = user;
        // Logged in 된 유저를 찾았고 Role에 Any가 있다면?
        if (roles.includes('Any')) return true;

        // 그 외에는 user.role이 allowedRoles에 포함되었는지 확인.
        return roles.includes(user.role);
      }
    } catch (error) {
      return false;
    }
  }
}
