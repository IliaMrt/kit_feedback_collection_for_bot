import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { FeedbackForWriteDto } from './dto/feedback.for.write.dto';
// import { UserDto } from "../auth/dto/user.dto";
import * as process from 'process';
import { FullInformationDto } from './dto/full.information.dto';

@Injectable()
export class DbConnectorService {
  private async docInit(docUrl: string, sheetName: string | number) {
    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const doc = new GoogleSpreadsheet(docUrl, serviceAccountAuth);
    await doc.loadInfo();
    return doc.sheetsByTitle[sheetName];
  }

  async getLessonsByUser(user) {
    console.log('KIT - DbConnector Service - getLessonsByUser at', new Date());

    const sheet = await this.docInit(
      process.env.SCHEDULE_URL,
      process.env.TEACHER_SHEET_NAME,
    );

    const rows = await sheet.getRows();

    await sheet.loadCells({
      startRowIndex: 0,
      endRowIndex: 1,
      startColumnIndex: 0,
      endColumnIndex: rows.length - 1,
    });
    await sheet.loadCells();

    const teacher = await this.getUserByNick(user);
    console.log(teacher);
    const lessons = {
      mainLessons: [],
      restLessons: [],
    };

    const mainSet = new Set();
    const restSet = new Set();

    for (let i = 1; i < rows.length - 1; i++) {
      const currentTeacher = sheet.getCell(i, 1).value;
      const currentLesson = sheet.getCell(i, 0).value;
      if (currentTeacher)
        if (currentTeacher == teacher) mainSet.add(currentLesson);
        else restSet.add(currentLesson);
    }

    mainSet.forEach((v) => {
      if (restSet.has(v)) restSet.delete(v);
    });

    lessons.mainLessons = Array.from(mainSet);
    lessons.restLessons = Array.from(restSet);
    return lessons;
  }

  async getTeacherByEmail(user) {
    console.log(
      'KIT - DbConnector Service - Get Teacher By Email at',
      new Date(),
    );

    const sheet = await this.docInit(
      process.env.USERS_LIST_URL,
      process.env.USERS_SHEET_NAME,
    );
    const rows = await sheet.getRows();
    for (const row of rows) {
      if (row.get('email') == user) return row.get('name');
    }
    return null;
  }

  async getClassesByLesson(lessonName) {
    console.log(
      'KIT - DbConnector Service - Get Classes By Lesson at',
      new Date(),
    );

    const sheet = await this.docInit(
      process.env.LESSONS_LIST_URL,
      process.env.LESSON_SHEET_NAME,
    );

    const result = new Set();

    const rows = await sheet.getRows();
    for (const row of rows) {
      if (row.get('Предмет') == lessonName) result.add(row.get('Класс'));
    }

    return Array.from(result);
  }

  async getKidsByClasses(class_name) {
    console.log('KIT - DbConnector Service - getKidsByClasses at', new Date());
    const sheet = await this.docInit(
      process.env.CLASSES_LIST_URL,
      process.env.KIDS_SHEET_NAME,
    );
    const rows = await sheet.getRows();
    if (sheet.headerValues.findIndex((v) => v == class_name) < 0)
      throw new HttpException('Класс не найден', HttpStatus.NOT_FOUND);
    const res = [];
    rows.forEach((row) => {
      if (row.get(class_name))
        // предустанавливаем attended, hard и soft для того, чтобы переключатели были в правильном положении
        res.push({
          id: res.length + 1,
          student: row.get(class_name),
          attended: true,
          hard: true,
          soft: true,
        });
    });
    return res;
  }

  async writeLastVisit(user: string) {
    const sheet = await this.docInit(
      process.env.USERS_LIST_URL,
      process.env.USERS_SHEET_NAME,
    );
    const rows = await sheet.getRows();
    for (const row of rows) {
      if (row.get('name') == user) {
        row.set(
          'lastVisit',
          `${new Date().toLocaleDateString(
            'ru-Ru',
            {},
          )} в ${new Date().toLocaleTimeString('ru-RU', {
            timeZone: 'Europe/Moscow',
          })}`,
        );
        await row.save();
        return;
      }
    }
  }

  async writeFeedBack(feedback: FeedbackForWriteDto) {
    console.log('KIT - DbConnector Service - writeFeedBack', new Date());
    console.log(JSON.stringify(feedback));
    const teacher = feedback.form.teacher;

    await this.writeLastVisit(teacher);

    const sheet = await this.docInit(
      process.env.WRITE_LIST_URL,
      process.env.WRITE_SHEET_NAME,
    );
    const result = [];
    const date = `${new Date().getDate()}/${
      new Date().getMonth() + 1
    }/${new Date().getFullYear()}`;
    const tempDate = new Date(feedback.form.date);
    const lessonDate = `${tempDate.getDate() + 1}/${
      tempDate.getMonth() + 1
    }/${tempDate.getFullYear()}`;
    const time = `${new Date().getHours()}:${new Date().getMinutes()}:${new Date().getSeconds()}`;
    feedback.personalFeedbacks.forEach((personal) =>
      result.push({
        teacher: teacher,
        lesson: feedback.form.mainLessons,
        theme: feedback.form.theme,
        lessonDate: feedback.form.date,
        className: feedback.form.class,
        student: personal.student,
        hard: personal.hard || false,
        attended: personal.attended || false,
        commentary: personal.commentary ? personal.commentary : '',
        soft: personal.soft || false,
        homework: feedback.form.homework,
        date: date,
        time: time,
        createdAt: new Date().toLocaleString(),
      }),
    );
    // console.log(JSON.stringify(result));
    await sheet.addRows(result);
  }

  async saveUser(user) {
    console.log('KIT - DbConnector Service - Save User at', new Date());

    const sheet = await this.docInit(
      process.env.USERS_LIST_URL,
      process.env.USERS_SHEET_NAME,
    );
    await sheet.addRow(user);
  }

  async findUser(userDto: any) {
    console.log(
      'KIT - DbConnector Service - Find User By Email at',
      new Date(),
    );
    const sheet = await this.docInit(
      process.env.USERS_LIST_URL,
      process.env.USERS_SHEET_NAME,
    );
    const rows = await sheet.getRows();
    for (const row of rows) {
      if (row.get('email') == userDto.email)
        return {
          password: row.get('password'),
          activated: row.get('activated') === 'TRUE',
        };
    }
    return null;
  }

  async findUserByLink(activationLink: string) {
    console.log('KIT - DbConnector Service - Find User By Link at', new Date());

    const sheet = await this.docInit(
      process.env.USERS_LIST_URL,
      process.env.USERS_SHEET_NAME,
    );
    const rows = await sheet.getRows();
    for (const row of rows) {
      if (row.get('activationLink') == activationLink)
        return row.get('email').toString();
    }
    return null;
  }

  async saveActivatedUser(email: string) {
    console.log(
      'KIT - DbConnector Service - Save Activated User at',
      new Date(),
    );

    const sheet = await this.docInit(
      process.env.USERS_LIST_URL,
      process.env.USERS_SHEET_NAME,
    );
    const rows = await sheet.getRows();
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].get('email') == email) {
        await rows[i].set('activated', true);
        await rows[i].save();
        return;
      }
    }
  }

  async deleteUser(email: string) {
    const sheet = await this.docInit(
      process.env.USERS_LIST_URL,
      process.env.USERS_SHEET_NAME,
    );
    const rows = await sheet.getRows();
    for (const row of rows) {
      if (row.get('email') == email) await row.delete();
    }
  }

  async getLastVisit(nick) {
    console.log('KIT - DbConnector Service - Get Last Visit at', new Date());
    // console.log(userName);
    const sheet = await this.docInit(
      process.env.USERS_LIST_URL,
      process.env.USERS_SHEET_NAME,
    );
    const rows = await sheet.getRows();

    for (const row of rows) {
      if (row.get('nick') == nick)
        return row.get('lastVisit') == '' ? 'не найден' : row.get('lastVisit');
    }

    return 'не найден';
  }

  async getUserByNick(user) {
    const sheet = await this.docInit(
      process.env.USERS_LIST_URL,
      process.env.USERS_SHEET_NAME,
    );
    console.log(user);
    const rows = await sheet.getRows();
    for (const row of rows) {
      if (row.get('nick') == user) return row.get('name');
    }
    return null;
  }

  async getClassStudents() {
    console.log('KIT - DbConnector Service - getClassStudents at', new Date());
    const sheet = await this.docInit(
      process.env.CLASSES_LIST_URL,
      process.env.KIDS_SHEET_NAME,
    );
    const rows = await sheet.getRows();
    // const res = [];
    const res = new Map<string, string[]>();
    const headers = sheet.headerValues;
    // console.log(headers);
    rows.forEach((row) => {
      headers.forEach((header) => {
        if (!res.has(header)) {
          res.set(header, []);
        }
        const currValue = row.get(header);
        if (currValue) res.get(header).push(currValue);
      });
    });
    /*    rows.forEach((row) => {
      headers.forEach(header=>{

      })
    });*/
    console.log(res.size);
    // return res;
    // res.set('aaa',headers)
    return Array.from(res);
  }

  async getUpdate(): Promise<FullInformationDto> {
    const res = new FullInformationDto();
    res.classStudents = await this.getClassStudents();
    res.lastVisits = await this.getLastVisits();
    res.lessonClass = await this.getLessonClass();
    res.users = await this.getUsers();
    res.lessonTeachers = await this.getLessonTeachers();
    return res;
  }

  private async getLastVisits() {
    console.log('KIT - DbConnector Service - Get Last Visits at', new Date());
    const sheet = await this.docInit(
      process.env.USERS_LIST_URL,
      process.env.USERS_SHEET_NAME,
    );
    const rows = await sheet.getRows();
    const res = new Map();
    for (const row of rows) {
      if (row.get('nick')) res.set(row.get('nick'), row.get('lastVisit'));
    }

    return Array.from(res);
  }

  private async getLessonClass() {
    console.log(
      'KIT - DbConnector Service - Get Classes By Lessons at',
      new Date(),
    );

    const sheet = await this.docInit(
      process.env.LESSONS_LIST_URL,
      process.env.LESSON_SHEET_NAME,
    );

    const result = new Map();

    const rows = await sheet.getRows();
    for (const row of rows) {
      const currLesson = row.get('Предмет');
      const currClass = row.get('Класс');
      if (result.has(currLesson)) {
        result.get(currLesson).push(currClass);
      } else {
        result.set(currLesson, [currClass]);
      }
    }

    return Array.from(result);
  }

  private async getUsers() {
    console.log('KIT - DbConnector Service - Get Users', new Date());
    const sheet = await this.docInit(
      process.env.USERS_LIST_URL,
      process.env.USERS_SHEET_NAME,
    );
    const rows = await sheet.getRows();
    const res = new Map();
    for (const row of rows) {
      res.set(row.get('nick'), row.get('name'));
    }

    return Array.from(res);
  }

  private async getLessonTeachers() {
    console.log(
      'KIT - DbConnector Service - getLessonsTeachers at',
      new Date(),
    );

    const sheet = await this.docInit(
      process.env.SCHEDULE_URL,
      process.env.TEACHER_SHEET_NAME,
    );

    const rows = await sheet.getRows();
    const res = new Map();
    for (const row of rows) {
      const currTeacher = row.get('ФИО');
      const currClass = row.get('Класс');
      const currLesson = row.get('Предмет');
      if (res.has(currTeacher)) {
        if (res.get(currTeacher).has(currLesson)) {
          res.get(currTeacher).get(currLesson).push(currClass);
        } else {
          res.get(currTeacher).set(currLesson, [currClass]);
        }
      } else {
        res.set(currTeacher, new Map([[currLesson, [currClass]]]));
      }
    }
    const r = Array.from(res.entries()).map((v) => [
      v[0],
      Array.from(v[1].entries()).map((e) => e),
    ]);
    return Array.from(r);
  }
}
