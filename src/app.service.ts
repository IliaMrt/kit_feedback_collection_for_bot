import { Injectable } from '@nestjs/common';
import { DbConnectorService } from './db.connector/db.connector.service';

@Injectable()
export class AppService {
  constructor(private dbConnector: DbConnectorService) {}
  async writeFeedback(feedback) {
    console.log('KIT - Main Service - writeFeedback at', new Date());

    return await this.dbConnector.writeFeedBack(feedback);
  }

  async getLessonsByUser(user) {
    console.log('KIT - Main Service - getLessonsByUser at', new Date());
    return await this.dbConnector.getLessonsByUser(user);
  }

  async getKidsByClasses(class_name) {
    console.log('KIT - Main Service - getKidsByClasses at', new Date());
    return await this.dbConnector.getKidsByClasses(class_name);
  }

  async getClassesByLesson(lessonName) {
    console.log('KIT - Main Service - getClassesByName at', new Date());
    return await this.dbConnector.getClassesByLesson(lessonName);
  }

  async getUserName(user) {
    console.log('KIT - Main Service - getUserName at', new Date());
    console.log(user);
    return await this.dbConnector.getUserByNick(user);
  }

  async getLastVisit(user) {
    console.log('KIT - Main Service - get Last Visit at', new Date());
    return await this.dbConnector.getLastVisit(user);
  }
}
