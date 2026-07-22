import { Controller, Get, Body, HttpCode, HttpStatus, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { FacebookAuthGuard } from './guards/facebook-auth.guard';
import type { AuthenticatedUser } from './jwt.strategy';
import type { OAuthProfile } from './google.strategy';
import { UsersService } from '../users/users.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { user, token } = await this.authService.register(dto, req);
    this.setAuthCookie(res, token);
    return user;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { user, token } = await this.authService.login(dto, req);
    this.setAuthCookie(res, token);
    return user;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(this.authService.getCookieName(), { path: '/' });
    return { loggedOut: true };
  }

  @Get('verify-email')
  async verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    return { message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.' };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.password);
    return { message: 'Mot de passe réinitialisé.' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.usersService.findSafeById(currentUser.id);
  }

  /** Déclenche la redirection vers l'écran de consentement Google. */
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleLogin() {}

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    await this.handleOAuthCallback(req, res);
  }

  /** Déclenche la redirection vers l'écran de consentement Facebook. */
  @Get('facebook')
  @UseGuards(FacebookAuthGuard)
  facebookLogin() {}

  @Get('facebook/callback')
  @UseGuards(FacebookAuthGuard)
  async facebookCallback(@Req() req: Request, @Res() res: Response) {
    await this.handleOAuthCallback(req, res);
  }

  private async handleOAuthCallback(req: Request, res: Response) {
    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:5173');
    const redirectPath = typeof req.query.state === 'string' ? req.query.state : '/profil';

    try {
      const { token } = await this.authService.loginWithOAuth(req.user as OAuthProfile);
      this.setAuthCookie(res, token);
      res.redirect(`${frontendUrl}${redirectPath}`);
    } catch {
      res.redirect(`${frontendUrl}/connexion?error=oauth_failed`);
    }
  }

  private setAuthCookie(res: Response, token: string) {
    res.cookie(this.authService.getCookieName(), token, this.authService.getCookieOptions());
  }
}
