import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { UpdateNotificationPreferenceDto } from './dto/update-notification-preference.dto';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get notifications for the authenticated user' })
  findAll(@CurrentUser('id') userId: string, @Query() query: QueryNotificationsDto) {
    return this.notificationsService.findForUser(userId, query.unreadOnly, query.page, query.limit);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count for the authenticated user' })
  getUnreadCount(@CurrentUser('id') userId: string) {
    return this.notificationsService.getUnreadCount(userId);
  }

  @Get('unread/count')
  @ApiOperation({ summary: 'Get unread notification count for the authenticated user (alias)' })
  getUnreadCountAlias(@CurrentUser('id') userId: string) {
    return this.notificationsService.getUnreadCount(userId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  markRead(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.notificationsService.markRead(id, userId);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllRead(@CurrentUser('id') userId: string) {
    return this.notificationsService.markAllRead(userId);
  }

  @Post('devices/register')
  @ApiOperation({ summary: 'Register a mobile device token for push notifications' })
  registerDeviceToken(
    @CurrentUser('id') userId: string,
    @Body('token') token: string,
    @Body('platform') platform?: string,
  ) {
    return this.notificationsService.registerDeviceToken(userId, token, platform);
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get the current notification channel preferences' })
  getPreferences(@CurrentUser('id') userId: string) {
    return this.notificationsService.getCurrentPreferenceSettings(userId);
  }

  @Patch('preferences/:type')
  @ApiOperation({ summary: 'Update notification preferences for a specific notification type' })
  updatePreference(
    @CurrentUser('id') userId: string,
    @Param('type') type: NotificationType,
    @Body() preferences: UpdateNotificationPreferenceDto,
  ) {
    return this.notificationsService.updatePreference(userId, type, preferences);
  }

  @Patch('digest-preference')
  @ApiOperation({ summary: 'Enable or disable the daily digest email' })
  updateDigestPreference(@CurrentUser('id') userId: string, @Body('emailEnabled') emailEnabled: boolean) {
    return this.notificationsService.updateDigestPreference(userId, emailEnabled);
  }
}
