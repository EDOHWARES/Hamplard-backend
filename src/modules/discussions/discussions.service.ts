import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EnrollmentStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { CreateAnswerDto } from './dto/create-answer.dto';

const AUTHOR_SELECT = { id: true, name: true, avatarUrl: true } as const;

const LESSON_COURSE_INCLUDE = {
  module: {
    include: {
      course: { include: { instructor: { select: { id: true } } } },
    },
  },
} as const;

type CourseWithInstructor = {
  id: string;
  instructorAddress: string;
  instructor: { id: string } | null;
};

@Injectable()
export class DiscussionsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Post a new question on a lesson. Only enrolled students, the instructor or admins may post. */
  async createQuestion(
    lessonId: string,
    userId: string,
    role: UserRole | undefined,
    dto: CreateQuestionDto,
  ) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: LESSON_COURSE_INCLUDE,
    });
    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    await this.assertCanPost(lesson.module.course, userId, role);

    return this.prisma.question.create({
      data: {
        lessonId,
        authorId: userId,
        title: dto.title,
        content: dto.content,
      },
      include: { author: { select: AUTHOR_SELECT } },
    });
  }

  /** Paginated list of question threads for a lesson, newest first. */
  async listThreads(lessonId: string, page = 1, limit = 20) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.question.findMany({
        where: { lessonId },
        include: {
          author: { select: AUTHOR_SELECT },
          answers: {
            where: { isBestAnswer: true },
            include: { author: { select: AUTHOR_SELECT } },
            take: 1,
          },
          _count: { select: { answers: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.question.count({ where: { lessonId } }),
    ]);

    return {
      data: data.map(({ answers, _count, ...question }) => ({
        ...question,
        bestAnswer: answers[0] ?? null,
        answerCount: _count.answers,
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /** A single question with its answer thread (best answer first, then oldest first), paginated. */
  async getThread(questionId: string, page = 1, limit = 20) {
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      include: { author: { select: AUTHOR_SELECT } },
    });
    if (!question) {
      throw new NotFoundException('Question not found');
    }

    const [answers, total] = await this.prisma.$transaction([
      this.prisma.answer.findMany({
        where: { questionId },
        include: { author: { select: AUTHOR_SELECT } },
        orderBy: [{ isBestAnswer: 'desc' }, { createdAt: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.answer.count({ where: { questionId } }),
    ]);

    return {
      question,
      answers: {
        data: answers,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      },
    };
  }

  /** Reply to a question. Only enrolled students, the instructor or admins may answer. */
  async createAnswer(
    questionId: string,
    userId: string,
    role: UserRole | undefined,
    dto: CreateAnswerDto,
  ) {
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      include: { lesson: { include: LESSON_COURSE_INCLUDE } },
    });
    if (!question) {
      throw new NotFoundException('Question not found');
    }

    await this.assertCanPost(question.lesson.module.course, userId, role);

    return this.prisma.answer.create({
      data: {
        questionId,
        authorId: userId,
        content: dto.content,
      },
      include: { author: { select: AUTHOR_SELECT } },
    });
  }

  /** Mark an answer as the best one for its question. Restricted to the course instructor or an admin. */
  async markBestAnswer(answerId: string, userId: string, role: UserRole | undefined) {
    const answer = await this.prisma.answer.findUnique({
      where: { id: answerId },
      include: {
        question: { include: { lesson: { include: LESSON_COURSE_INCLUDE } } },
      },
    });
    if (!answer) {
      throw new NotFoundException('Answer not found');
    }

    const course = answer.question.lesson.module.course;
    if (!this.isCourseInstructor(course, userId) && role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only the course instructor can mark the best answer');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.answer.updateMany({
        where: { questionId: answer.questionId, isBestAnswer: true, NOT: { id: answerId } },
        data: { isBestAnswer: false },
      });

      return tx.answer.update({
        where: { id: answerId },
        data: { isBestAnswer: true },
        include: { author: { select: AUTHOR_SELECT } },
      });
    });
  }

  private isCourseInstructor(course: CourseWithInstructor, userId: string) {
    return course.instructor?.id === userId || course.instructorAddress === userId;
  }

  private async assertCanPost(course: CourseWithInstructor, userId: string, role: UserRole | undefined) {
    if (role === UserRole.ADMIN || this.isCourseInstructor(course, userId)) {
      return;
    }

    const enrollment = await this.prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId: userId, courseId: course.id } },
      select: { status: true },
    });

    if (!enrollment || enrollment.status === EnrollmentStatus.REFUNDED) {
      throw new ForbiddenException('You must be enrolled in this course to post in its discussions');
    }
  }
}
