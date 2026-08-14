import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'quickbite_jwt_secret_key_2026',
    });
  }

  async validate(payload: any) {
    if (!payload || (!payload.userId && !payload.sub)) {
      throw new UnauthorizedException('Invalid token payload');
    }
    return {
      userId: payload.userId || payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
