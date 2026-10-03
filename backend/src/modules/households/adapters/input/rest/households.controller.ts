import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../../../../auth/adapters/input/rest/current-user.decorator';
import { JwtAuthGuard } from '../../../../auth/adapters/input/rest/jwt-auth.guard';
import type { AuthenticatedUser } from '../../../../auth/application/authenticated-user';
import {
  USER_REPOSITORY,
  type UserRepositoryPort,
} from '../../../../users/application/ports/user-repository.port';
import { AlreadyHouseholdMemberError } from '../../../application/errors/already-household-member.error';
import { HouseholdAccessDeniedError } from '../../../application/errors/household-access-denied.error';
import { HouseholdNotFoundError } from '../../../application/errors/household-not-found.error';
import { HouseholdOwnerRequiredError } from '../../../application/errors/household-owner-required.error';
import { InvalidInviteCodeError } from '../../../application/errors/invalid-invite-code.error';
import {
  CREATE_HOUSEHOLD_USE_CASE,
  type CreateHouseholdUseCase,
} from '../../../application/ports/input/create-household.use-case';
import {
  DELETE_HOUSEHOLD_USE_CASE,
  type DeleteHouseholdUseCase,
} from '../../../application/ports/input/delete-household.use-case';
import {
  GET_HOUSEHOLD_USE_CASE,
  type GetHouseholdUseCase,
} from '../../../application/ports/input/get-household.use-case';
import {
  JOIN_HOUSEHOLD_USE_CASE,
  type JoinHouseholdUseCase,
} from '../../../application/ports/input/join-household.use-case';
import {
  LIST_HOUSEHOLD_MEMBERS_USE_CASE,
  type ListHouseholdMembersUseCase,
} from '../../../application/ports/input/list-household-members.use-case';
import {
  LIST_USER_HOUSEHOLDS_USE_CASE,
  type ListUserHouseholdsUseCase,
} from '../../../application/ports/input/list-user-households.use-case';
import type { HouseholdMember } from '../../../domain/household-member';
import { CreateHouseholdDto } from './dto/create-household.dto';
import { JoinHouseholdDto } from './dto/join-household.dto';

type HouseholdMemberResponse = {
  id: string;
  householdId: string;
  userId: string;
  userName: string;
  userEmail: string | null;
  role: HouseholdMember['role'];
  joinedAt: Date;
};

/**
 * Stellt die REST-Endpunkte für Wohnungsverwaltung und Mitgliedschaften bereit.
 */
@Controller('households')
@UseGuards(JwtAuthGuard)
export class HouseholdsController {
  constructor(
    @Inject(CREATE_HOUSEHOLD_USE_CASE)
    private readonly createHouseholdUseCase: CreateHouseholdUseCase,
    @Inject(JOIN_HOUSEHOLD_USE_CASE)
    private readonly joinHouseholdUseCase: JoinHouseholdUseCase,
    @Inject(LIST_USER_HOUSEHOLDS_USE_CASE)
    private readonly listUserHouseholdsUseCase: ListUserHouseholdsUseCase,
    @Inject(GET_HOUSEHOLD_USE_CASE)
    private readonly getHouseholdUseCase: GetHouseholdUseCase,
    @Inject(LIST_HOUSEHOLD_MEMBERS_USE_CASE)
    private readonly listHouseholdMembersUseCase: ListHouseholdMembersUseCase,
    @Inject(DELETE_HOUSEHOLD_USE_CASE)
    private readonly deleteHouseholdUseCase: DeleteHouseholdUseCase,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryPort,
  ) {}

  /**
   * Erstellt eine neue Wohnung für den angemeldeten Benutzer.
   */
  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateHouseholdDto,
  ) {
    return this.createHouseholdUseCase.execute({
      name: dto.name,
      userId: user.id,
    });
  }

  /**
   * Fügt einen Benutzer über einen Einladungscode hinzu.
   */
  @Post('join')
  @HttpCode(HttpStatus.OK)
  async join(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: JoinHouseholdDto,
  ) {
    try {
      return await this.joinHouseholdUseCase.execute({
        inviteCode: dto.inviteCode,
        userId: user.id,
      });
    } catch (error) {
      this.throwHttpError(error);
    }
  }

  /**
   * Liefert alle Wohnungen des angemeldeten Benutzers.
   */
  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.listUserHouseholdsUseCase.execute(user.id);
  }

  /**
   * Liefert eine einzelne Wohnung nach erfolgreicher Zugriffsprüfung.
   */
  @Get(':id')
  async getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') householdId: string,
  ) {
    try {
      return await this.getHouseholdUseCase.execute({
        householdId,
        userId: user.id,
      });
    } catch (error) {
      this.throwHttpError(error);
    }
  }

  /**
   * Löscht eine Wohnung, sofern der angemeldete Benutzer ihr Eigentümer ist.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') householdId: string,
  ): Promise<void> {
    try {
      await this.deleteHouseholdUseCase.execute({
        householdId,
        userId: user.id,
      });
    } catch (error) {
      this.throwHttpError(error);
    }
  }

  /**
   * Liefert die Mitglieder der ausgewählten Wohnung.
   */
  @Get(':id/members')
  async listMembers(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') householdId: string,
  ): Promise<HouseholdMemberResponse[]> {
    try {
      const members = await this.listHouseholdMembersUseCase.execute({
        householdId,
        userId: user.id,
      });

      return await Promise.all(
        members.map(async (member) => {
          const memberUser = await this.userRepository.findById(member.userId);

          return {
            id: member.id,
            householdId: member.householdId,
            userId: member.userId,
            userName: memberUser?.name ?? member.userId,
            userEmail: memberUser?.email ?? null,
            role: member.role,
            joinedAt: member.joinedAt,
          };
        }),
      );
    } catch (error) {
      this.throwHttpError(error);
    }
  }

  /**
   * Übersetzt fachliche Fehler in passende HTTP-Fehler.
   */
  private throwHttpError(error: unknown): never {
    if (error instanceof InvalidInviteCodeError) {
      throw new BadRequestException(error.message);
    }

    if (error instanceof AlreadyHouseholdMemberError) {
      throw new ConflictException(error.message);
    }

    if (error instanceof HouseholdNotFoundError) {
      throw new NotFoundException(error.message);
    }

    if (error instanceof HouseholdAccessDeniedError) {
      throw new ForbiddenException(error.message);
    }

    if (error instanceof HouseholdOwnerRequiredError) {
      throw new ForbiddenException(error.message);
    }

    throw error;
  }
}
