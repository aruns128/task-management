import { Injectable, NotFoundException } from '@nestjs/common';

import { TaskStatus } from './task-status.enum';
import { CreateTaskDto } from './dto/create-task-dto';
import { GetTasksFilterDto } from './dto/get-filter-task-dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './task.entity';
import { User } from 'src/auth/user.entity';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly repository: Repository<Task>,
  ) {}

  async getTaskById(id: string, user: User): Promise<Task> {
    const found = await this.repository.findOne({
      where: {
        id,
        user,
      },
    });
    if (!found) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }
    return found;
  }
  async deleteTasksById(id: string, user: User): Promise<void> {
    const result = await this.repository.delete({ id, user });

    if (result.affected === 0) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }
  }

  async createTask(
    { title, description }: CreateTaskDto,
    user: User,
  ): Promise<Task> {
    const task: Task = this.repository.create({
      title,
      description,
      status: TaskStatus.OPEN,
      user,
    });
    await this.repository.save(task);
    return task;
  }

  async updateTaskStatus(id: string, status: TaskStatus, user: User) {
    const task = await this.getTaskById(id, user);
    task.status = status;
    await this.repository.save(task);
    return task;
  }

  async getTasksWithFilters(
    filterSto: GetTasksFilterDto,
    user: User,
  ): Promise<Task[]> {
    const { status, search } = filterSto;
    const query = this.repository.createQueryBuilder('task');
    query.where({ user });

    if (status) {
      query.andWhere('task.status =:status', { status });
    }
    if (search) {
      query.andWhere(
        'LOWER(task.title) LIKE  LOWER(:search) OR LOWER(task.description) LIKE  LOWER(:search)',
        { search: `%${search}%` },
      );
    }
    const task = await query.getMany();

    return task;
  }
}
