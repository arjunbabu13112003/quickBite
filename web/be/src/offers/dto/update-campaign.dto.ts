import { PartialType } from '@nestjs/mapped-types';
import { CreateStore99CampaignDto } from './create-campaign.dto';

export class UpdateStore99CampaignDto extends PartialType(CreateStore99CampaignDto) {}
