import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HospitalsService } from './hospitals.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';
import type { AuthUser } from '../../common/types/auth-user';
import {
  CreateHospitalRequestDto,
  HospitalDirectoryQueryDto,
  HospitalSearchQueryDto,
  SelectHospitalDto,
  UpdateHospitalRequestEtaDto,
} from './dto/hospital.dto';

@ApiTags('Hospitals & Pre-arrival Alerts')
@ApiBearerAuth()
@Controller()
export class HospitalsController {
  constructor(private readonly hospitals: HospitalsService) {}

  @Get('hospitals/integration/status')
  @RequirePermissions(PERMISSIONS.HOSPITAL_READ)
  @ApiOperation({ summary: 'Hospital integration status and data source' })
  integrationStatus() {
    return this.hospitals.status();
  }

  @Get('hospitals')
  @RequirePermissions(PERMISSIONS.HOSPITAL_READ)
  @ApiOperation({ summary: 'Browse cached hospital directory' })
  directory(@CurrentUser() user: AuthUser, @Query() query: HospitalDirectoryQueryDto) {
    return this.hospitals.directory(user, query);
  }

  @Get('hospitals/search')
  @RequirePermissions(PERMISSIONS.HOSPITAL_READ)
  @ApiOperation({ summary: 'Search nearby hospitals and refresh directory cache' })
  search(@CurrentUser() user: AuthUser, @Query() query: HospitalSearchQueryDto) {
    return this.hospitals.search(user, query);
  }

  @Get('hospitals/:id')
  @RequirePermissions(PERMISSIONS.HOSPITAL_READ)
  @ApiOperation({ summary: 'Get cached hospital profile' })
  getHospital(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.hospitals.getHospital(user, id);
  }

  @Get('hospitals/:id/capabilities')
  @RequirePermissions(PERMISSIONS.HOSPITAL_READ)
  @ApiOperation({ summary: 'Fetch hospital capabilities with freshness status' })
  capabilities(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.hospitals.capabilities(user, id);
  }

  @Post('hospitals/select-destination')
  @RequirePermissions(PERMISSIONS.RECOMMENDATION_SELECT)
  @ApiOperation({ summary: 'Select or change destination hospital (does not send alert)' })
  selectDestination(@CurrentUser() user: AuthUser, @Body() dto: SelectHospitalDto) {
    return this.hospitals.selectDestination(user, dto);
  }

  @Post('incidents/:incidentId/hospital-requests')
  @RequirePermissions(PERMISSIONS.HOSPITAL_REQUEST)
  @ApiOperation({ summary: 'Send a pre-arrival alert to a hospital' })
  createRequest(
    @CurrentUser() user: AuthUser,
    @Param('incidentId') incidentId: string,
    @Body() dto: CreateHospitalRequestDto,
  ) {
    return this.hospitals.requestEmergency(user, incidentId, dto);
  }

  @Get('incidents/:incidentId/hospital-requests')
  @RequirePermissions(PERMISSIONS.HOSPITAL_READ)
  @ApiOperation({ summary: 'List pre-arrival alerts for an emergency case' })
  listRequests(@CurrentUser() user: AuthUser, @Param('incidentId') incidentId: string) {
    return this.hospitals.listRequests(user, incidentId);
  }

  @Get('incidents/:incidentId/communications')
  @RequirePermissions(PERMISSIONS.HOSPITAL_READ)
  @ApiOperation({ summary: 'Hospital communication history for an emergency case' })
  communications(@CurrentUser() user: AuthUser, @Param('incidentId') incidentId: string) {
    return this.hospitals.communications(user, incidentId);
  }

  @Get('hospital-requests/:id')
  @RequirePermissions(PERMISSIONS.HOSPITAL_READ)
  @ApiOperation({ summary: 'Get pre-arrival alert details and status' })
  getRequest(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.hospitals.getRequest(user, id);
  }

  @Post('hospital-requests/:id/sync')
  @RequirePermissions(PERMISSIONS.HOSPITAL_REQUEST)
  @ApiOperation({ summary: 'Refresh alert status from Hospital Portal' })
  syncRequest(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.hospitals.syncRequest(user, id);
  }

  @Post('hospital-requests/:id/eta')
  @RequirePermissions(PERMISSIONS.HOSPITAL_REQUEST)
  @ApiOperation({ summary: 'Send an updated ETA to Hospital Portal' })
  updateEta(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateHospitalRequestEtaDto) {
    return this.hospitals.updateEta(user, id, dto.etaMinutes);
  }
}
