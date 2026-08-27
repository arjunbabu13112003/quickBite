import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  Res,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join, resolve, relative, isAbsolute } from 'path';
import { existsSync, mkdirSync } from 'fs';
import * as crypto from 'crypto';
import { DeliveryPartnersService } from './delivery-partners.service';
import { CreateDeliveryPartnerDto } from './dto/create-delivery-partner.dto';
import { AdminCreateDeliveryPartnerDto } from './dto/admin-create-delivery-partner.dto';
import { UpdateDeliveryPartnerStatusDto } from './dto/update-delivery-partner-status.dto';
import { VerifyDeliveryPartnerDto } from './dto/verify-delivery-partner.dto';
import { AssignDeliveryPartnerDto } from './dto/assign-delivery-partner.dto';
import { UpdateDeliveryOrderStatusDto } from './dto/update-delivery-order-status.dto';
import { VerifyDocumentDto } from './dto/verify-document.dto';
import { UpdatePartnerStatusDto } from './dto/update-partner-status.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { UpdateActiveDeliveryLocationDto } from './dto/update-active-delivery-location.dto';
import { VerifyActiveDeliveryPinDto } from './dto/verify-active-delivery-pin.dto';
import { PaymentsService } from '../payments/payments.service';
import { DeliveryPartnerLoginDto } from './dto/delivery-partner-login.dto';
import { UpdateOnlineStatusDto } from './dto/update-online-status.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../users/jwt-auth.guard';
import { RolesGuard } from '../users/roles.guard';
import { Roles } from '../users/roles.decorator';
import { UserRole } from '../users/user-role.enum';

const SECURE_UPLOAD_DIR = join(process.cwd(), 'secure_uploads', 'delivery-partners', 'documents');

const multerStorage = diskStorage({
  destination: (_req, _file, cb) => {
    if (!existsSync(SECURE_UPLOAD_DIR)) {
      mkdirSync(SECURE_UPLOAD_DIR, { recursive: true });
    }
    cb(null, SECURE_UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const fileUuid = crypto.randomUUID();
    cb(null, `${fileUuid}${extname(file.originalname).toLowerCase()}`);
  },
});

const multerOptions = {
  storage: multerStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
  fileFilter: (_req, file, cb) => {
    const allowedProfileMimes = ['image/jpeg', 'image/png'];
    const allowedDocumentMimes = ['application/pdf', 'image/jpeg', 'image/png'];

    if (file.fieldname === 'profilePhoto') {
      if (allowedProfileMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new BadRequestException(`Unsupported file format for Profile Photo. Allowed formats: JPEG, PNG.`), false);
      }
    } else {
      if (allowedDocumentMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new BadRequestException(`Unsupported file format for ${file.fieldname}. Allowed formats: PDF, JPEG, PNG.`), false);
      }
    }
  },
};

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class DeliveryPartnersController {
  constructor(
    private readonly partnersService: DeliveryPartnersService,
    private readonly paymentsService: PaymentsService,
  ) {}

  // --- DELIVERY_PARTNER ROUTES ---

  @Roles(UserRole.DELIVERY_PARTNER)
  @Get('delivery-partners/me')
  getMe(@Request() req) {
    if (req.user?.role !== UserRole.DELIVERY_PARTNER) {
      throw new ForbiddenException('Forbidden resource');
    }
    return this.partnersService.getProfile(req.user.userId);
  }

  @Roles(UserRole.DELIVERY_PARTNER)
  @Patch('delivery-partners/me')
  updateProfile(@Body() dto: UpdateProfileDto, @Request() req) {
    if (req.user?.role !== UserRole.DELIVERY_PARTNER) {
      throw new ForbiddenException('Forbidden resource');
    }
    return this.partnersService.updateProfile(req.user.userId, dto);
  }

  @Roles(UserRole.DELIVERY_PARTNER)
  @Get('delivery-partners/me/documents/:documentId')
  async getMyDocument(
    @Param('documentId', ParseIntPipe) documentId: number,
    @Request() req,
    @Res() res,
  ) {
    if (req.user?.role !== UserRole.DELIVERY_PARTNER) {
      throw new ForbiddenException('Forbidden resource');
    }
    const document = await this.partnersService.getDocumentForPartner(req.user.userId, documentId);
    const absolutePath = resolve(SECURE_UPLOAD_DIR, document.storageKey);
    const rel = relative(SECURE_UPLOAD_DIR, absolutePath);
    
    if (rel.startsWith('..') || isAbsolute(rel) || absolutePath.slice(0, SECURE_UPLOAD_DIR.length) !== SECURE_UPLOAD_DIR) {
      throw new ForbiddenException('Access denied');
    }

    if (!existsSync(absolutePath)) {
      throw new NotFoundException('Document file not found');
    }

    res.sendFile(absolutePath);
  }

  @Roles(UserRole.DELIVERY_PARTNER)
  @Get('delivery-partners/me/dashboard')
  getDashboardStats(@Request() req) {
    if (req.user?.role !== UserRole.DELIVERY_PARTNER) {
      throw new ForbiddenException('Forbidden resource');
    }
    return this.partnersService.getDashboardStats(req.user.userId);
  }

  @Roles(UserRole.DELIVERY_PARTNER)
  @Patch('delivery-partners/me/online-status')
  updateOnlineStatus(@Body() dto: UpdateOnlineStatusDto, @Request() req) {
    if (req.user?.role !== UserRole.DELIVERY_PARTNER) {
      throw new ForbiddenException('Forbidden resource');
    }
    return this.partnersService.updateOnlineStatus(req.user.userId, dto.isOnline);
  }

  @Roles(UserRole.DELIVERY_PARTNER)
  @Post('delivery-partners/me/heartbeat')
  registerHeartbeat(@Request() req) {
    if (req.user?.role !== UserRole.DELIVERY_PARTNER) {
      throw new ForbiddenException('Forbidden resource');
    }
    return this.partnersService.registerHeartbeat(req.user.userId);
  }

  @Roles(UserRole.DELIVERY_PARTNER)
  @Get('delivery-partners/me/incoming-assignment')
  getIncomingAssignment(@Request() req) {
    if (req.user?.role !== UserRole.DELIVERY_PARTNER) {
      throw new ForbiddenException('Forbidden resource');
    }
    return this.partnersService.getIncomingAssignment(req.user.userId);
  }

  @Roles(UserRole.DELIVERY_PARTNER)
  @Post('delivery-partners/me/assignments/:assignmentId/accept')
  acceptAssignment(@Param('assignmentId', ParseIntPipe) assignmentId: number, @Request() req) {
    if (req.user?.role !== UserRole.DELIVERY_PARTNER) {
      throw new ForbiddenException('Forbidden resource');
    }
    return this.partnersService.acceptAssignment(req.user.userId, assignmentId);
  }

  @Roles(UserRole.DELIVERY_PARTNER)
  @Post('delivery-partners/me/assignments/:assignmentId/decline')
  declineAssignment(
    @Param('assignmentId', ParseIntPipe) assignmentId: number,
    @Body() body: { declineReason?: string },
    @Request() req
  ) {
    if (req.user?.role !== UserRole.DELIVERY_PARTNER) {
      throw new ForbiddenException('Forbidden resource');
    }
    return this.partnersService.declineAssignment(req.user.userId, assignmentId, body.declineReason);
  }

  @Roles(UserRole.DELIVERY_PARTNER)
  @Get('delivery-partners/me/active-delivery')
  getActiveDelivery(@Request() req) {
    if (req.user?.role !== UserRole.DELIVERY_PARTNER) {
      throw new ForbiddenException('Forbidden resource');
    }
    return this.partnersService.getActiveDelivery(req.user.userId);
  }

  @Roles(UserRole.DELIVERY_PARTNER)
  @Patch('delivery-partners/me/status')
  updateStatus(@Body() dto: UpdateDeliveryPartnerStatusDto, @Request() req) {
    if (req.user?.role !== UserRole.DELIVERY_PARTNER) {
      throw new ForbiddenException('Forbidden resource');
    }
    return this.partnersService.updateStatus(req.user.userId, dto);
  }

  @Roles(UserRole.DELIVERY_PARTNER)
  @Patch('delivery-partners/me/location')
  updateLocation(@Body() dto: UpdateLocationDto, @Request() req) {
    if (req.user?.role !== UserRole.DELIVERY_PARTNER) {
      throw new ForbiddenException('Forbidden resource');
    }
    return this.partnersService.updateLocation(req.user.userId, dto.latitude, dto.longitude);
  }

  @Roles(UserRole.DELIVERY_PARTNER)
  @Patch('delivery-partners/me/active-delivery/location')
  updateActiveDeliveryLocation(@Body() dto: UpdateActiveDeliveryLocationDto, @Request() req) {
    if (req.user?.role !== UserRole.DELIVERY_PARTNER) {
      throw new ForbiddenException('Forbidden resource');
    }
    return this.partnersService.updateActiveDeliveryLocation(req.user.userId, dto);
  }

  @Roles(UserRole.DELIVERY_PARTNER)
  @Post('delivery-partners/me/active-delivery/verify-pin')
  verifyActiveDeliveryPin(@Body() dto: VerifyActiveDeliveryPinDto, @Request() req) {
    if (req.user?.role !== UserRole.DELIVERY_PARTNER) {
      throw new ForbiddenException('Forbidden resource');
    }
    return this.partnersService.verifyActiveDeliveryPin(
      req.user.userId,
      dto.pin,
      dto.bypassLatitude,
      dto.bypassLongitude,
      dto.bypassDistance,
      dto.bypassTimestamp
    );
  }

  @Roles(UserRole.DELIVERY_PARTNER)
  @Get('delivery-partners/me/orders')
  getAssignedOrders(@Request() req) {
    if (req.user?.role !== UserRole.DELIVERY_PARTNER) {
      throw new ForbiddenException('Forbidden resource');
    }
    return this.partnersService.getAssignedOrders(req.user.userId);
  }

  @Roles(UserRole.DELIVERY_PARTNER)
  @Get('delivery-partners/me/orders/history')
  getDeliveryHistory(@Request() req) {
    if (req.user?.role !== UserRole.DELIVERY_PARTNER) {
      throw new ForbiddenException('Forbidden resource');
    }
    return this.partnersService.getDeliveryHistory(req.user.userId);
  }

  @Roles(UserRole.DELIVERY_PARTNER)
  @Get('delivery-partners/me/available-orders')
  getAvailableOrders(@Request() req) {
    if (req.user?.role !== UserRole.DELIVERY_PARTNER) {
      throw new ForbiddenException('Forbidden resource');
    }
    return this.partnersService.getAvailableOrders(req.user.userId);
  }

  @Roles(UserRole.DELIVERY_PARTNER)
  @Post('delivery-partners/me/orders/:orderId/claim')
  claimAvailableOrder(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Request() req,
  ) {
    if (req.user?.role !== UserRole.DELIVERY_PARTNER) {
      throw new ForbiddenException('Forbidden resource');
    }
    return this.partnersService.claimAvailableOrder(req.user.userId, orderId);
  }

  @Roles(UserRole.DELIVERY_PARTNER)
  @Get('delivery-partners/me/orders/:orderId')
  getAssignedOrderDetails(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Request() req,
  ) {
    if (req.user?.role !== UserRole.DELIVERY_PARTNER) {
      throw new ForbiddenException('Forbidden resource');
    }
    return this.partnersService.getAssignedOrderDetails(
      req.user.userId,
      orderId,
    );
  }

  @Roles(UserRole.DELIVERY_PARTNER)
  @Patch('delivery-partners/me/orders/:orderId/status')
  updateDeliveryOrderStatus(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() dto: UpdateDeliveryOrderStatusDto,
    @Request() req,
  ) {
    if (req.user?.role !== UserRole.DELIVERY_PARTNER) {
      throw new ForbiddenException('Forbidden resource');
    }
    return this.partnersService.updateDeliveryOrderStatus(
      req.user.userId,
      orderId,
      dto.status,
      dto.deliveryPin,
    );
  }

  /**
   * POST /orders/:orderId/cod/collect
   *
   * Allows the assigned delivery partner to confirm COD cash collection.
   *
   * Authorization:
   *   - JWT must belong to a DELIVERY_PARTNER user
   *   - Partner identity is derived from the JWT (req.user.userId), NOT from the request body
   *   - The backend verifies the partner was assigned to this order
   *
   * Body: none (no amount, no partnerId, no paymentStatus accepted from client)
   */
  @Roles(UserRole.DELIVERY_PARTNER)
  @Post('orders/:orderId/cod/collect')
  collectCodCash(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Request() req,
  ) {
    if (req.user?.role !== UserRole.DELIVERY_PARTNER) {
      throw new ForbiddenException('Forbidden resource');
    }
    return this.paymentsService.collectCodCash(req.user.userId, orderId);
  }

  // --- SUPER_ADMIN ROUTES ---

  @Roles(UserRole.SUPER_ADMIN)
  @Post('delivery-partners/admin-create')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'profilePhoto', maxCount: 1 },
      { name: 'drivingLicense', maxCount: 1 },
      { name: 'vehicleRc', maxCount: 1 },
      { name: 'vehicleInsurance', maxCount: 1 },
    ], multerOptions)
  )
  adminCreate(
    @UploadedFiles() files: {
      profilePhoto?: Express.Multer.File[];
      drivingLicense?: Express.Multer.File[];
      vehicleRc?: Express.Multer.File[];
      vehicleInsurance?: Express.Multer.File[];
    },
    @Body() dto: AdminCreateDeliveryPartnerDto,
  ) {
    return this.partnersService.adminCreate(dto, files);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Get('delivery-partners/:id/documents/:documentId')
  async getDocument(
    @Param('id', ParseIntPipe) id: number,
    @Param('documentId', ParseIntPipe) documentId: number,
    @Res() res,
  ) {
    const document = await this.partnersService.getDocumentForAdmin(id, documentId);
    const absolutePath = resolve(SECURE_UPLOAD_DIR, document.storageKey);
    const rel = relative(SECURE_UPLOAD_DIR, absolutePath);
    
    if (rel.startsWith('..') || isAbsolute(rel) || absolutePath.slice(0, SECURE_UPLOAD_DIR.length) !== SECURE_UPLOAD_DIR) {
      throw new ForbiddenException('Access denied');
    }

    if (!existsSync(absolutePath)) {
      throw new NotFoundException('Document file not found');
    }

    res.sendFile(absolutePath);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Post('delivery-partners')
  createProfile(@Body() dto: CreateDeliveryPartnerDto) {
    return this.partnersService.createProfile(dto);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Patch('delivery-partners/:partnerId/documents/:documentId/verification')
  verifyDocument(
    @Param('partnerId', ParseIntPipe) partnerId: number,
    @Param('documentId', ParseIntPipe) documentId: number,
    @Body() dto: VerifyDocumentDto,
  ) {
    return this.partnersService.verifyDocument(partnerId, documentId, dto);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Patch('delivery-partners/:id/status')
  updatePartnerAccountStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePartnerStatusDto,
  ) {
    return this.partnersService.updatePartnerAccountStatus(id, dto);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Get('delivery-partners')
  findAll(
    @Query('online') online?: string,
    @Query('available') available?: string,
    @Query('verified') verified?: string,
    @Query('active') active?: string,
    @Query('status') status?: string,
  ) {
    const isOnline = online !== undefined ? online === 'true' : undefined;
    const isAvailable =
      available !== undefined ? available === 'true' : undefined;
    const isVerified =
      verified !== undefined ? verified === 'true' : undefined;
    const isActive = active !== undefined ? active === 'true' : undefined;

    return this.partnersService.listPartners(
      isOnline,
      isAvailable,
      isVerified,
      isActive,
      status,
    );
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Patch('delivery-partners/:partnerId/verify')
  verify(
    @Param('partnerId', ParseIntPipe) partnerId: number,
    @Body() dto: VerifyDeliveryPartnerDto,
  ) {
    return this.partnersService.verifyPartner(partnerId, dto.isVerified);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Post('orders/:orderId/delivery-assignment')
  assignOrder(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() dto: AssignDeliveryPartnerDto,
  ) {
    return this.partnersService.assignOrder(orderId, dto.deliveryPartnerId);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Get('orders/:orderId/delivery-assignment')
  getActiveAssignment(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.partnersService.getActiveAssignment(orderId);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Get('delivery-partners/:id')
  getPartnerDetailsForAdmin(@Param('id', ParseIntPipe) id: number) {
    return this.partnersService.getPartnerDetailsForAdmin(id);
  }


}

@Controller('delivery-partners')
export class DeliveryPartnersLoginController {
  constructor(private readonly partnersService: DeliveryPartnersService) {}

  @Post('login')
  async login(@Body() dto: DeliveryPartnerLoginDto) {
    return this.partnersService.login(dto);
  }
}
