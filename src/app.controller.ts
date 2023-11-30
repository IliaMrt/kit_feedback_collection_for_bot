import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { User } from './auth/Decorator/user';
import { AuthGuard } from './auth/Decorator/auth.guard';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from './auth/Decorator/jwt-auth.guard';

@Controller('kit')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @ApiOperation({
    summary: 'Returns lesson by user.',
    description:
      'Returns an object with the lessons of the current user and the rest of the lessons.',
  })
  @ApiTags('Main functionality')
  @Post('get-lessons-by-user')
  async getLessonsByTeacher(@Body() user) {
    console.log('KIT - Main Controller - getLessonsByUser at', new Date());
    return await this.appService.getLessonsByUser(user.nick);
  }

  @Post('write-feedback')
  @ApiTags('Main functionality')
  async writeFeedback(@Body() feedback) {
    return await this.appService.writeFeedback(feedback);
  }
  @ApiOperation({
    summary: 'Returns kids by class or group name.',
    description: 'Returns list of kids by class or group name.',
  })
  @ApiParam({
    name: '1 класс',
    required: true,
    description: 'Name of a class or of a group.',
  })
  @ApiTags('Main functionality')
  @Get('get-kids-by-classes/:class')
  async getKidsByClasses(@Param('class') className) {
    console.log(className);
    return await this.appService.getKidsByClasses(className);
  }

  @ApiOperation({
    summary: 'Returns name of user.',
    description: 'Returns name of user',
  })
  @ApiTags('Main functionality')
  @Post('get-user-name')
  async getUserName(@Body() user) {
    console.log(JSON.stringify(user));
    return await this.appService.getUserName(user.nick);
  }

  @ApiOperation({
    summary: 'Returns date and time of last users visit.',
    description: 'Returns date and time of last users visit.',
  })
  @ApiTags('Main functionality')
  @Post('get-last-visit')
  async getLastVisit(@Body() user) {
    return await this.appService.getLastVisit(user.nick);
  }

  @ApiTags('Main functionality')
  @ApiOperation({
    summary: 'Returns classes by lesson.',
    description: 'Returns classes by lesson name.',
  })
  @ApiParam({
    name: 'Словесность',
    required: true,
    description: 'Name of a lesson.',
  })
  @Get('get-classes-by-lesson/:lesson')
  async getClassesByLesson(@Param('lesson') lessonName) {
    return await this.appService.getClassesByLesson(lessonName);
  }
}
