import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { UsersService, SafeUser } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import type { JwtPayload } from './jwt.strategy';
import type { OAuthProfile } from './google.strategy';
import type { Request } from 'express';

const PASSWORD_SALT_ROUNDS = 10;

function parseUserAgent(ua: string | undefined): { os: string; browser: string } {
  if (!ua) return { os: 'Inconnu', browser: 'Inconnu' };

  let os = 'Autre';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  let browser = 'Autre';
  if (ua.includes('Firefox/')) browser = 'Firefox';
  else if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('OPR/') || ua.includes('Opera')) browser = 'Opera';
  else if (ua.includes('Chrome/')) browser = 'Chrome';
  else if (ua.includes('Safari/') && ua.includes('Version/')) browser = 'Safari';

  return { os, browser };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly settings: SettingsService,
    private readonly emailService: EmailService,
    private readonly usersService: UsersService,
  ) {}

  async register(dto: RegisterDto, request?: Request): Promise<{ user: SafeUser; token: string }> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Un compte existe déjà avec cet email.');
    }
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Les mots de passe ne correspondent pas.');
    }

    const password = await bcrypt.hash(dto.password, PASSWORD_SALT_ROUNDS);
    const emailVerificationToken = randomBytes(32).toString('hex');
    const ttlHours = await this.settings.getNumber('email_verification_token_ttl_hours', 24);

    const ua = request?.headers['user-agent'];
    const ip = (request?.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      ?? request?.socket?.remoteAddress
      ?? null;
    const { os, browser } = parseUserAgent(ua);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password,
        emailVerificationToken,
        emailVerificationExpiresAt: new Date(Date.now() + ttlHours * 60 * 60 * 1000),
        registrationIp: ip,
        registrationUserAgent: ua ?? null,
        registrationOs: os,
        registrationBrowser: browser,
      },
    });

    // Ne jamais bloquer l'inscription si l'email échoue (même esprit que §11
    // pour Facebook) : on log et on continue.
    try {
      await this.emailService.sendEmailVerification(user.email, user.name, emailVerificationToken);
    } catch (error) {
      this.logger.error(`Échec envoi email de vérification à ${user.email}`, error as Error);
    }

    const token = this.issueToken(user.id, user.email, user.role);
    return { user: this.usersService.toSafeUser(user), token };
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Email ou mot de passe incorrect.');
    }
    // §14 : un compte banni/suspendu par un admin ne peut plus se connecter.
    if (user.bannedAt) {
      throw new ForbiddenException('Ce compte a été banni.');
    }
    if (user.suspendedAt) {
      throw new ForbiddenException('Ce compte est temporairement suspendu.');
    }
    return user;
  }

  async login(dto: LoginDto, request?: Request): Promise<{ user: SafeUser; token: string }> {
    const user = await this.validateUser(dto.email, dto.password);
    const token = this.issueToken(user.id, user.email, user.role);

    // Enregistrer la dernière connexion
    const ua = request?.headers['user-agent'];
    const ip = (request?.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      ?? request?.socket?.remoteAddress
      ?? null;
    const { os, browser } = parseUserAgent(ua);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ip,
        lastLoginUserAgent: ua ?? null,
        lastLoginOs: os,
        lastLoginBrowser: browser,
      },
    });

    return { user: this.usersService.toSafeUser(user), token };
  }

  /**
   * §10/Phase 11 : connexion Google/Facebook. Retrouve le compte lié via
   * `SocialAccount` ; à défaut, rattache le fournisseur à un compte existant
   * du même email (évite un doublon) ; sinon crée un nouveau compte. L'email
   * fourni par le fournisseur OAuth est considéré déjà vérifié — aucun envoi
   * de vérification. Le mot de passe est un hash aléatoire inutilisable :
   * ce compte ne se connecte qu'en repassant par le même fournisseur, sauf
   * s'il utilise "mot de passe oublié" pour s'en définir un.
   */
  async loginWithOAuth(profile: OAuthProfile): Promise<{ user: SafeUser; token: string }> {
    const existingAccount = await this.prisma.socialAccount.findUnique({
      where: { provider_providerId: { provider: profile.provider, providerId: profile.providerId } },
      include: { user: true },
    });

    let user = existingAccount?.user ?? null;

    if (!user && profile.email) {
      const byEmail = await this.prisma.user.findUnique({ where: { email: profile.email } });
      if (byEmail) {
        await this.prisma.socialAccount.create({
          data: { userId: byEmail.id, provider: profile.provider, providerId: profile.providerId },
        });
        user = byEmail;
      }
    }

    if (!user) {
      const email = profile.email ?? `${profile.provider}-${profile.providerId}@users.noreply.monstres.fbc.fr`;
      const randomPassword = await bcrypt.hash(randomBytes(32).toString('hex'), PASSWORD_SALT_ROUNDS);
      user = await this.prisma.user.create({
        data: {
          name: profile.name,
          email,
          password: randomPassword,
          avatar: profile.avatar,
          emailVerifiedAt: new Date(),
          socialAccounts: {
            create: { provider: profile.provider, providerId: profile.providerId },
          },
        },
      });
    }

    if (user.bannedAt) throw new ForbiddenException('Ce compte a été banni.');
    if (user.suspendedAt) throw new ForbiddenException('Ce compte est temporairement suspendu.');

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const token = this.issueToken(user.id, user.email, user.role);
    return { user: this.usersService.toSafeUser(user), token };
  }

  async verifyEmail(token: string): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({ where: { emailVerificationToken: token } });
    if (!user || !user.emailVerificationExpiresAt || user.emailVerificationExpiresAt < new Date()) {
      throw new BadRequestException('Lien de vérification invalide ou expiré.');
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifiedAt: new Date(),
        emailVerificationToken: null,
        emailVerificationExpiresAt: null,
      },
    });

    return this.usersService.toSafeUser(updated);
  }

  /** Ne révèle jamais si l'email existe ou non (anti-énumération). */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return;

    const passwordResetToken = randomBytes(32).toString('hex');
    const ttlMinutes = await this.settings.getNumber('password_reset_token_ttl_minutes', 60);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken,
        passwordResetExpiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000),
      },
    });

    try {
      await this.emailService.sendPasswordReset(user.email, user.name, passwordResetToken);
    } catch (error) {
      this.logger.error(`Échec envoi email de réinitialisation à ${user.email}`, error as Error);
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { passwordResetToken: token } });
    if (!user || !user.passwordResetExpiresAt || user.passwordResetExpiresAt < new Date()) {
      throw new BadRequestException('Lien de réinitialisation invalide ou expiré.');
    }

    const password = await bcrypt.hash(newPassword, PASSWORD_SALT_ROUNDS);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password, passwordResetToken: null, passwordResetExpiresAt: null },
    });
  }

  issueToken(sub: string, email: string, role: string): string {
    const payload: JwtPayload = { sub, email, role: role as JwtPayload['role'] };
    return this.jwtService.sign(payload);
  }

  getCookieOptions() {
    const secure = this.config.get<string>('JWT_COOKIE_SECURE', 'false') === 'true';
    const domain = this.config.get<string>('JWT_COOKIE_DOMAIN');
    return {
      httpOnly: true,
      secure,
      sameSite: this.config.get<string>('JWT_COOKIE_SAME_SITE', 'lax') as 'lax' | 'strict' | 'none',
      domain: domain === 'localhost' ? undefined : domain,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    };
  }

  getCookieName(): string {
    return this.config.get<string>('JWT_COOKIE_NAME', 'access_token');
  }
}
