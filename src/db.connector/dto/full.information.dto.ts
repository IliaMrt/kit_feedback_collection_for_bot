export class FullInformationDto {
  users: [string, string][];
  lessonTeachers;//: [string, [string, string[]]][];//учитель предметы классы
  lastVisits: [string, string][];
  lessonClass: [string, string[]][];
  classStudents: [string, string[]][]; //Map<string, string[]>;
  // N:number;
}
