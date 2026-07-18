import { Injectable, ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto } from './auth.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already registered');

    // Validate email existence using Abstract Email Reputation API
    const abstractKey = this.config.get('ABSTRACT_EMAIL_API_KEY');
    if (abstractKey) {
      try {
        const response = await fetch(
          `https://emailreputation.abstractapi.com/v1/?api_key=${abstractKey}&email=${encodeURIComponent(dto.email)}`
        );
        if (response.ok) {
          const data = (await response.json()) as any;
          const status = data?.email_deliverability?.status;
          const isMxValid = data?.email_deliverability?.is_mx_valid;
          // Block if domain has no valid MX records (email cannot be delivered)
          if (status === 'undeliverable' && isMxValid === false) {
            throw new BadRequestException('El correo electrónico ingresado no existe o no puede recibir mensajes.');
          }
        }
      } catch (err) {
        if (err instanceof BadRequestException) throw err;
        console.error('Abstract API check failed:', err);
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: { email: dto.email, passwordHash, name: dto.name, city: dto.city ?? '' },
      select: { id: true, email: true, name: true, city: true, createdAt: true },
    });

    // Initialize streak and XP for new user
    await Promise.all([
      this.prisma.streak.create({ data: { userId: user.id } }),
      this.prisma.userXp.create({ data: { userId: user.id } }),
    ]);

    const tokens = this.generateTokens(user.id, user.email);
    return { user, ...tokens };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const { passwordHash: _, ...safeUser } = user;
    const tokens = this.generateTokens(user.id, user.email);
    return { user: safeUser, ...tokens };
  }

  async refresh(token: string) {
    try {
      const payload = this.jwt.verify(token, {
        secret: this.config.get('JWT_REFRESH_SECRET') || 'default_jwt_refresh_secret_key_12345',
      });
      return this.generateTokens(payload.sub, payload.email);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, city: true, avatar: true, themeColor: true, createdAt: true },
    });
    const [streak, xp] = await Promise.all([
      this.prisma.streak.findUnique({ where: { userId } }),
      this.prisma.userXp.findUnique({ where: { userId } }),
    ]);

    // Compute whether user already registered a transaction today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastEntry = streak?.lastEntryDate ? new Date(streak.lastEntryDate) : null;
    if (lastEntry) lastEntry.setHours(0, 0, 0, 0);
    const registeredToday = lastEntry?.getTime() === today.getTime();

    // Return a flat, normalized shape so the frontend does not need to adapt it
    return {
      ...user,
      level: xp?.level ?? 1,
      xp: xp?.totalXp ?? 0,
      xpToNextLevel: (xp?.level ?? 1) * 500,
      streakDays: streak?.currentStreak ?? 0,
      maxStreak: streak?.longestStreak ?? 0,
      coins: xp?.coins ?? 0,
      badges: xp?.badges ?? '[]',
      monthsActive: user?.createdAt
        ? Math.max(
            1,
            Math.ceil(
              (Date.now() - new Date(user.createdAt).getTime()) /
                (1000 * 60 * 60 * 24 * 30),
            ),
          )
        : 1,
      goalsCompleted: await this.prisma.goal
        .count({ where: { userId, status: 'completed' } })
        .catch(() => 0),
      registeredToday,
      lastEntryDate: streak?.lastEntryDate ?? null,
      streak,
      xpData: xp,
    };
  }


  async getAllUsers(currentUserId: string) {
    const users = await this.prisma.user.findMany({
      where: { id: { not: currentUserId } },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        avatar: true,
        userXp: { select: { level: true, badges: true, totalXp: true } }
      },
    });

    const friendships = await this.prisma.friendship.findMany({
      where: {
        OR: [
          { userId: currentUserId },
          { friendId: currentUserId }
        ]
      }
    });

    return users.map(user => {
      const isFriend = friendships.some(f => 
        (f.userId === currentUserId && f.friendId === user.id) ||
        (f.friendId === currentUserId && f.userId === user.id)
      );
      return { ...user, isFriend };
    });
  }

  async searchUsers(currentUserId: string, query: string) {
    if (!query) return [];
    const users = await this.prisma.user.findMany({
      where: {
        id: { not: currentUserId },
        name: { contains: query }
      },
      select: {
        id: true,
        name: true,
        avatar: true,
        city: true,
        userXp: { select: { level: true, badges: true } }
      },
      take: 20
    });
    return users;
  }

  async addFriend(userId: string, friendId: string) {
    if (userId === friendId) throw new Error("Cannot add yourself as friend");
    const existing = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { userId, friendId },
          { userId: friendId, friendId: userId }
        ]
      }
    });
    if (existing) return existing;
    return this.prisma.friendship.create({
      data: {
        userId,
        friendId,
        status: 'accepted'
      }
    });
  }

  async getFriends(userId: string) {
    const friendships = await this.prisma.friendship.findMany({
      where: {
        OR: [{ userId }, { friendId: userId }]
      },
      include: {
        user: { select: { id: true, name: true, avatar: true, userXp: { select: { level: true, badges: true } } } },
        friend: { select: { id: true, name: true, avatar: true, userXp: { select: { level: true, badges: true } } } }
      }
    });
    
    return friendships.map(f => {
      if (f.userId === userId) return f.friend;
      return f.user;
    });
  }

  private generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email };
    const accessToken = this.jwt.sign(payload, {
      secret: this.config.get('JWT_SECRET') || 'super_secret_jwt_key_12345',
      expiresIn: this.config.get('JWT_EXPIRES_IN') || '1d',
    });
    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET') || 'default_jwt_refresh_secret_key_12345',
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN') || '7d',
    });
    return { accessToken, refreshToken };
  }
}
