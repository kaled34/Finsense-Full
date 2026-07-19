import { Controller, Post, Body, Get, Patch, UseGuards, Req, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, RefreshDto } from './auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  getProfile(@Req() req: any) {
    return this.auth.getProfile(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('users')
  getAllUsers(@Req() req: any) {
    return this.auth.getAllUsers(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('users/search')
  searchUsers(@Req() req: any, @Query('q') q: string) {
    return this.auth.searchUsers(req.user.id, q);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('profile')
  updateProfile(@Req() req: any, @Body() dto: { name?: string; city?: string; avatar?: string }) {
    return this.auth.updateProfile(req.user.id, dto);
  }
}
