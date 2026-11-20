import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IncidentsService } from './incidents.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';
import type { AuthUser } from '../../common/types/auth-user';
import { CreateIncidentDto, UpdateIncidentDto } from './dto/incident.dto';

@ApiTags('Emergency Cases')
@ApiBearerAuth()
@Controller('incidents')
export class IncidentsController {
  constructor(private readonly incidents: IncidentsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.INCIDENT_READ)
  @ApiOperation({ summary: 'List emergency cases' })
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: { page?: string; pageSize?: string; search?: string },
  ) {
    return this.incidents.list(user, query);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.INCIDENT_CREATE)
  @ApiOperation({ summary: 'Create an emergency case' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateIncidentDto) {
    return this.incidents.create(user, dto);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.INCIDENT_READ)
  @ApiOperation({ summary: 'Get emergency case details' })
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.incidents.get(user, id);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.INCIDENT_UPDATE)
  @ApiOperation({ summary: 'Update emergency case details' })
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateIncidentDto) {
    return this.incidents.update(user, id, dto);
  }
}
