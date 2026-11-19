import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';
import type { AuthUser } from '../../common/types/auth-user';
import { RecommendationsService } from './recommendations.service';
import {
  GenerateRecommendationsDto,
  SelectRecommendationDto,
} from './dto/recommendation.dto';

@ApiTags('Hospital Recommendations')
@ApiBearerAuth()
@Controller()
export class RecommendationsController {
  constructor(private readonly recommendations: RecommendationsService) {}

  @Post('incidents/:incidentId/recommendations')
  @RequirePermissions(PERMISSIONS.RECOMMENDATION_READ)
  @ApiOperation({ summary: 'Generate hospital recommendations for an emergency case' })
  generate(
    @CurrentUser() user: AuthUser,
    @Param('incidentId') incidentId: string,
    @Body() dto: GenerateRecommendationsDto,
  ) {
    return this.recommendations.generate(user, incidentId, dto);
  }

  @Get('incidents/:incidentId/recommendations')
  @RequirePermissions(PERMISSIONS.RECOMMENDATION_READ)
  list(
    @CurrentUser() user: AuthUser,
    @Param('incidentId') incidentId: string,
    @Query() query: { page?: string; pageSize?: string },
  ) {
    return this.recommendations.list(user, incidentId, query);
  }

  @Get('incidents/:incidentId/recommendations/latest')
  @RequirePermissions(PERMISSIONS.RECOMMENDATION_READ)
  latest(@CurrentUser() user: AuthUser, @Param('incidentId') incidentId: string) {
    return this.recommendations.latest(user, incidentId);
  }

  @Get('recommendations/:id')
  @RequirePermissions(PERMISSIONS.RECOMMENDATION_READ)
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.recommendations.get(user, id);
  }

  @Post('recommendations/:id/select')
  @RequirePermissions(PERMISSIONS.RECOMMENDATION_SELECT)
  @ApiOperation({ summary: 'Select destination hospital (records decision; does not send alert)' })
  select(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SelectRecommendationDto,
  ) {
    return this.recommendations.select(user, id, dto);
  }
}
