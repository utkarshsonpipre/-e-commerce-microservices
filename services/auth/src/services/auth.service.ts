import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import {
  BadRequestError,
  ConflictError,
  EventType,
  NotFoundError,
  UnauthorizedError,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '@ecommerce/common';
import { config } from '../config';
import { bus } from '../events/bus';
import { UserDocument, UserModel } from '../models/user.model';

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult extends AuthTokens {
  user: { id: string; email: string; name: string; role: string };
}

function issueTokens(user: UserDocument): AuthTokens {
  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role as 'customer' | 'admin',
  });
  const refreshToken = signRefreshToken({
    sub: user.id,
    tokenId: user.refreshTokenId as string,
  });
  return { accessToken, refreshToken };
}

function toPublicUser(user: UserDocument): AuthResult['user'] {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

export const authService = {
  async register(input: RegisterInput): Promise<AuthResult> {
    const existing = await UserModel.findOne({ email: input.email.toLowerCase() });
    if (existing) throw new ConflictError('Email is already registered');

    const passwordHash = await bcrypt.hash(input.password, config.bcryptRounds);
    const user = await UserModel.create({
      email: input.email,
      passwordHash,
      name: input.name,
      refreshTokenId: randomUUID(),
    });

    // Announce the new user so notifications can send a welcome email.
    await bus.publish(EventType.UserRegistered, {
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    return { ...issueTokens(user), user: toPublicUser(user) };
  },

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await UserModel.findOne({ email: input.email.toLowerCase() });
    if (!user) throw new UnauthorizedError('Invalid credentials');

    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) throw new UnauthorizedError('Invalid credentials');

    // Rotate the refresh token id on each login.
    user.refreshTokenId = randomUUID();
    await user.save();

    return { ...issueTokens(user), user: toPublicUser(user) };
  },

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const claims = verifyRefreshToken(refreshToken);
    const user = await UserModel.findById(claims.sub);
    if (!user || user.refreshTokenId !== claims.tokenId) {
      throw new UnauthorizedError('Refresh token has been revoked');
    }
    // Rotate again so a refresh token can't be replayed.
    user.refreshTokenId = randomUUID();
    await user.save();
    return issueTokens(user);
  },

  async getById(userId: string): Promise<AuthResult['user']> {
    if (!userId) throw new BadRequestError('Missing user id');
    const user = await UserModel.findById(userId);
    if (!user) throw new NotFoundError('User not found');
    return toPublicUser(user);
  },
};
