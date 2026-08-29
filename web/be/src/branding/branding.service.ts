import {
  Injectable,
  OnModuleInit,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Branding, BrandingAppType, BrandingStatus } from './branding.entity';
import { join, resolve, basename } from 'path';
import { existsSync, mkdirSync, copyFileSync, writeFileSync } from 'fs';
import { unlink } from 'fs/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFilePromise = promisify(execFile);

@Injectable()
export class BrandingService implements OnModuleInit {
  private readonly uploadDir = join(process.cwd(), 'uploads', 'branding');
  private readonly defaultsDir = join(this.uploadDir, 'defaults');

  constructor(
    @InjectRepository(Branding)
    private readonly brandingRepository: Repository<Branding>,
  ) {}

  async onModuleInit() {
    // 1. Ensure folders exist
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
    }
    if (!existsSync(this.defaultsDir)) {
      mkdirSync(this.defaultsDir, { recursive: true });
    }

    // 2. Copy defaults from mobile/delivery-partner if missing at destination
    const customerDefaultDest = join(this.defaultsDir, 'default-customer.png');
    const customerPrepDefaultDest = join(this.defaultsDir, 'default-prepared-customer.png');
    const deliveryDefaultDest = join(this.defaultsDir, 'default-delivery-partner.png');
    const deliveryPrepDefaultDest = join(this.defaultsDir, 'default-prepared-delivery-partner.png');

    // Seeding default notification icons paths
    const customerNotificationDefaultDest = join(this.defaultsDir, 'default-notification-customer.png');
    const customerPrepNotificationDefaultDest = join(this.defaultsDir, 'default-prepared-notification-customer.png');
    const deliveryNotificationDefaultDest = join(this.defaultsDir, 'default-notification-delivery-partner.png');
    const deliveryPrepNotificationDefaultDest = join(this.defaultsDir, 'default-prepared-notification-delivery-partner.png');

    try {
      const customerSrc = resolve(process.cwd(), '..', '..', 'mobile', 'assets', 'quickbite-logo.png');
      if (existsSync(customerSrc) && !existsSync(customerDefaultDest)) {
        copyFileSync(customerSrc, customerDefaultDest);
      }
      const customerPrepSrc = resolve(process.cwd(), '..', '..', 'mobile', 'assets', 'quickbite-icon-foreground.png');
      if (existsSync(customerPrepSrc) && !existsSync(customerPrepDefaultDest)) {
        copyFileSync(customerPrepSrc, customerPrepDefaultDest);
      }
    } catch (e) {
      console.warn(`[BrandingService] Seeding default customer icons failed: ${e.message}`);
    }

    try {
      const customerNotificationSrc = resolve(process.cwd(), '..', '..', 'mobile', 'assets', 'notifications', 'notification-icon.png');
      if (existsSync(customerNotificationSrc)) {
        if (!existsSync(customerNotificationDefaultDest)) {
          copyFileSync(customerNotificationSrc, customerNotificationDefaultDest);
        }
        if (!existsSync(customerPrepNotificationDefaultDest)) {
          copyFileSync(customerNotificationSrc, customerPrepNotificationDefaultDest);
        }
      }
    } catch (e) {
      console.warn(`[BrandingService] Seeding default customer notification icons failed: ${e.message}`);
    }

    try {
      const deliverySrc = resolve(process.cwd(), '..', '..', 'delivery-partner', 'assets', 'delivery-partner-logo.png');
      if (existsSync(deliverySrc) && !existsSync(deliveryDefaultDest)) {
        copyFileSync(deliverySrc, deliveryDefaultDest);
      }
      const deliveryPrepSrc = resolve(process.cwd(), '..', '..', 'delivery-partner', 'assets', 'delivery-partner-icon-foreground.png');
      if (existsSync(deliveryPrepSrc) && !existsSync(deliveryPrepDefaultDest)) {
        copyFileSync(deliveryPrepSrc, deliveryPrepDefaultDest);
      }
    } catch (e) {
      console.warn(`[BrandingService] Seeding default delivery partner icons failed: ${e.message}`);
    }

    try {
      const deliveryNotificationSrc = resolve(process.cwd(), '..', '..', 'delivery-partner', 'assets', 'notifications', 'notification-icon.png');
      if (existsSync(deliveryNotificationSrc)) {
        if (!existsSync(deliveryNotificationDefaultDest)) {
          copyFileSync(deliveryNotificationSrc, deliveryNotificationDefaultDest);
        }
        if (!existsSync(deliveryPrepNotificationDefaultDest)) {
          copyFileSync(deliveryNotificationSrc, deliveryPrepNotificationDefaultDest);
        }
      }
    } catch (e) {
      console.warn(`[BrandingService] Seeding default delivery partner notification icons failed: ${e.message}`);
    }

    // 3. Seed database records
    let customerBranding = await this.brandingRepository.findOne({
      where: { appType: BrandingAppType.CUSTOMER },
    });
    if (!customerBranding) {
      customerBranding = this.brandingRepository.create({
        appType: BrandingAppType.CUSTOMER,
        currentIconUrl: '/uploads/branding/defaults/default-customer.png',
        currentPreparedIconUrl: '/uploads/branding/defaults/default-prepared-customer.png',
        currentNotificationIconUrl: '/uploads/branding/defaults/default-notification-customer.png',
        currentPreparedNotificationIconUrl: '/uploads/branding/defaults/default-prepared-notification-customer.png',
        currentAppName: 'QuickBite',
        currentScale: 1.0,
        currentOffsetX: 0.0,
        currentOffsetY: 0.0,
        currentPadding: 0.0,
        status: BrandingStatus.CURRENT,
      });
      await this.brandingRepository.save(customerBranding);
      console.log('[BrandingService] Initialized database entry for CUSTOMER app icon.');
    } else {
      let changed = false;
      if (!customerBranding.currentAppName) {
        customerBranding.currentAppName = 'QuickBite';
        changed = true;
      }
      if (!customerBranding.currentNotificationIconUrl || !customerBranding.currentPreparedNotificationIconUrl) {
        customerBranding.currentNotificationIconUrl = '/uploads/branding/defaults/default-notification-customer.png';
        customerBranding.currentPreparedNotificationIconUrl = '/uploads/branding/defaults/default-prepared-notification-customer.png';
        changed = true;
      }
      if (customerBranding.currentScale === undefined || customerBranding.currentScale === null) {
        customerBranding.currentScale = 1.0;
        customerBranding.currentOffsetX = 0.0;
        customerBranding.currentOffsetY = 0.0;
        customerBranding.currentPadding = 0.0;
        changed = true;
      }
      if (changed) {
        await this.brandingRepository.save(customerBranding);
      }
    }

    let deliveryBranding = await this.brandingRepository.findOne({
      where: { appType: BrandingAppType.DELIVERY_PARTNER },
    });
    if (!deliveryBranding) {
      deliveryBranding = this.brandingRepository.create({
        appType: BrandingAppType.DELIVERY_PARTNER,
        currentIconUrl: '/uploads/branding/defaults/default-delivery-partner.png',
        currentPreparedIconUrl: '/uploads/branding/defaults/default-prepared-delivery-partner.png',
        currentNotificationIconUrl: '/uploads/branding/defaults/default-notification-delivery-partner.png',
        currentPreparedNotificationIconUrl: '/uploads/branding/defaults/default-prepared-notification-delivery-partner.png',
        currentAppName: 'QuickBite Partner',
        currentScale: 1.0,
        currentOffsetX: 0.0,
        currentOffsetY: 0.0,
        currentPadding: 0.0,
        status: BrandingStatus.CURRENT,
      });
      await this.brandingRepository.save(deliveryBranding);
      console.log('[BrandingService] Initialized database entry for DELIVERY_PARTNER app icon.');
    } else {
      let changed = false;
      if (!deliveryBranding.currentAppName) {
        deliveryBranding.currentAppName = 'QuickBite Partner';
        changed = true;
      }
      if (!deliveryBranding.currentNotificationIconUrl || !deliveryBranding.currentPreparedNotificationIconUrl) {
        deliveryBranding.currentNotificationIconUrl = '/uploads/branding/defaults/default-notification-delivery-partner.png';
        deliveryBranding.currentPreparedNotificationIconUrl = '/uploads/branding/defaults/default-prepared-notification-delivery-partner.png';
        changed = true;
      }
      if (deliveryBranding.currentScale === undefined || deliveryBranding.currentScale === null) {
        deliveryBranding.currentScale = 1.0;
        deliveryBranding.currentOffsetX = 0.0;
        deliveryBranding.currentOffsetY = 0.0;
        deliveryBranding.currentPadding = 0.0;
        changed = true;
      }
      if (changed) {
        await this.brandingRepository.save(deliveryBranding);
      }
    }
  }

  async getAppIcons(): Promise<Branding[]> {
    return await this.brandingRepository.find({
      order: { appType: 'ASC' },
    });
  }

  private calculateStatus(branding: Branding): BrandingStatus {
    const hasPending = 
      !!branding.pendingAppName ||
      !!branding.pendingIconUrl ||
      !!branding.pendingPreparedIconUrl ||
      !!branding.pendingNotificationIconUrl ||
      !!branding.pendingPreparedNotificationIconUrl ||
      (branding.pendingScale !== null && branding.pendingScale !== undefined) ||
      (branding.pendingOffsetX !== null && branding.pendingOffsetX !== undefined) ||
      (branding.pendingOffsetY !== null && branding.pendingOffsetY !== undefined) ||
      (branding.pendingPadding !== null && branding.pendingPadding !== undefined);
    return hasPending ? BrandingStatus.PENDING_UPDATE : BrandingStatus.CURRENT;
  }

  // Helper method to execute the python process script
  private async runPythonProcessImage(
    inputPath: string,
    outputOriginalPath: string,
    outputPreparedPath: string,
    scale: number,
    offsetX: number,
    offsetY: number,
    padding: number
  ): Promise<void> {
    const scriptPath = join(process.cwd(), 'src', 'branding', 'process_uploaded_icon.py');
    const pythonExec = process.env.PYTHON_EXECUTABLE || 'python';

    const { stdout, stderr } = await execFilePromise(
      pythonExec,
      [
        scriptPath,
        inputPath,
        outputOriginalPath,
        outputPreparedPath,
        scale.toString(),
        offsetX.toString(),
        offsetY.toString(),
        padding.toString(),
      ],
      {
        timeout: 15000,
        windowsHide: true,
      }
    );
    console.log(`[BrandingService] Python stdout:\n${stdout}`);
    if (stderr && stderr.trim().length > 0) {
      console.warn(`[BrandingService] Python stderr:\n${stderr}`);
    }
  }

  async uploadIcon(appType: BrandingAppType, file: Express.Multer.File): Promise<Branding> {
    // 1. Enforce size limit (10MB)
    const maxSizeBytes = 10 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      throw new BadRequestException('File size exceeds the limit of 10MB.');
    }

    // 2. Enforce MIME type
    const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only PNG, JPG, and JPEG are supported.');
    }

    // Get existing DB entry first to read current scale/offsets/padding
    const branding = await this.brandingRepository.findOne({
      where: { appType },
    });
    if (!branding) {
      throw new NotFoundException(`Branding entry for ${appType} not found.`);
    }

    const scale = branding.currentScale ?? 1.0;
    const offsetX = branding.currentOffsetX ?? 0.0;
    const offsetY = branding.currentOffsetY ?? 0.0;
    const padding = branding.currentPadding ?? 0.0;

    // 3. Write temp file securely to disk using unique name
    const timestamp = Date.now();
    const cleanExt = file.mimetype === 'image/png' ? '.png' : '.jpg';
    const tempFilename = `temp_${appType}_${timestamp}${cleanExt}`;
    const tempInputPath = join(this.uploadDir, tempFilename);

    try {
      writeFileSync(tempInputPath, file.buffer);
    } catch (e) {
      throw new BadRequestException(`Failed to write uploaded file to disk: ${e.message}`);
    }

    // 4. Define original and prepared output paths
    const origFilename = `original_${appType}_${timestamp}.png`;
    const preparedFilename = `prepared_${appType}_${timestamp}.png`;
    
    const outputOriginalPath = join(this.uploadDir, origFilename);
    const outputPreparedPath = join(this.uploadDir, preparedFilename);

    try {
      // 5. Run Python process script via helper
      await this.runPythonProcessImage(
        tempInputPath,
        outputOriginalPath,
        outputPreparedPath,
        scale,
        offsetX,
        offsetY,
        padding
      );
    } catch (err: any) {
      // Cleanup files on failure
      await this.deleteLocalFile(tempInputPath);
      await this.deleteLocalFile(outputOriginalPath);
      await this.deleteLocalFile(outputPreparedPath);
      
      const errMsg = err.stderr || err.message || 'Image processing failed';
      throw new BadRequestException(`Image processing failed: ${errMsg}`);
    } finally {
      // Cleanup temp input file on completion
      await this.deleteLocalFile(tempInputPath);
    }

    // Delete previous pending files safely if they exist
    await this.deleteFileByUrl(branding.pendingIconUrl);
    await this.deleteFileByUrl(branding.pendingPreparedIconUrl);

    // Save new pending paths and pending transform settings (current values remain unchanged)
    branding.pendingIconUrl = `/uploads/branding/${origFilename}`;
    branding.pendingPreparedIconUrl = `/uploads/branding/${preparedFilename}`;
    branding.pendingScale = scale;
    branding.pendingOffsetX = offsetX;
    branding.pendingOffsetY = offsetY;
    branding.pendingPadding = padding;

    branding.status = this.calculateStatus(branding);
    
    return await this.brandingRepository.save(branding);
  }

  async uploadNotificationIcon(appType: BrandingAppType, file: Express.Multer.File): Promise<Branding> {
    // 1. Enforce size limit (10MB)
    const maxSizeBytes = 10 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      throw new BadRequestException('File size exceeds the limit of 10MB.');
    }

    // 2. Enforce MIME type
    const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only PNG, JPG, and JPEG are supported.');
    }

    // 3. Write temp file securely to disk using unique name
    const timestamp = Date.now();
    const cleanExt = file.mimetype === 'image/png' ? '.png' : '.jpg';
    const tempFilename = `temp_notification_${appType}_${timestamp}${cleanExt}`;
    const tempInputPath = join(this.uploadDir, tempFilename);

    try {
      writeFileSync(tempInputPath, file.buffer);
    } catch (e) {
      throw new BadRequestException(`Failed to write uploaded file to disk: ${e.message}`);
    }

    // 4. Define original and prepared output paths
    const origFilename = `original_notification_${appType}_${timestamp}.png`;
    const preparedFilename = `prepared_notification_${appType}_${timestamp}.png`;
    
    const outputOriginalPath = join(this.uploadDir, origFilename);
    const outputPreparedPath = join(this.uploadDir, preparedFilename);

    const scriptPath = join(process.cwd(), 'src', 'branding', 'process_notification_icon.py');
    const pythonExec = process.env.PYTHON_EXECUTABLE || 'python';

    try {
      // 5. Run Python process script via execFile securely
      const { stdout, stderr } = await execFilePromise(
        pythonExec,
        [scriptPath, tempInputPath, outputOriginalPath, outputPreparedPath],
        {
          timeout: 15000, // 15 seconds timeout
          windowsHide: true,
        }
      );
      console.log(`[BrandingService] Notification Python stdout:\n${stdout}`);
      if (stderr && stderr.trim().length > 0) {
        console.warn(`[BrandingService] Notification Python stderr:\n${stderr}`);
      }
    } catch (err: any) {
      // Cleanup files on failure
      await this.deleteLocalFile(tempInputPath);
      await this.deleteLocalFile(outputOriginalPath);
      await this.deleteLocalFile(outputPreparedPath);
      
      const errMsg = err.stderr || err.message || 'Notification image processing failed';
      throw new BadRequestException(`Image processing failed: ${errMsg}`);
    } finally {
      // Cleanup temp input file on completion
      await this.deleteLocalFile(tempInputPath);
    }

    // 6. Update database entry
    const branding = await this.brandingRepository.findOne({
      where: { appType },
    });
    if (!branding) {
      throw new NotFoundException(`Branding entry for ${appType} not found.`);
    }

    // Delete previous pending files safely if they exist
    await this.deleteFileByUrl(branding.pendingNotificationIconUrl);
    await this.deleteFileByUrl(branding.pendingPreparedNotificationIconUrl);

    // Save new pending paths
    branding.pendingNotificationIconUrl = `/uploads/branding/${origFilename}`;
    branding.pendingPreparedNotificationIconUrl = `/uploads/branding/${preparedFilename}`;
    branding.status = this.calculateStatus(branding);
    
    return await this.brandingRepository.save(branding);
  }

  async activateForNextUpdate(appType: BrandingAppType): Promise<Branding> {
    const branding = await this.brandingRepository.findOne({
      where: { appType },
    });
    if (!branding) {
      throw new NotFoundException(`Branding entry for ${appType} not found.`);
    }

    // If there is a pending original launcher icon or transform changes, regenerate the prepared icon
    const isTransformPending = 
      (branding.pendingScale !== null && branding.pendingScale !== undefined) ||
      (branding.pendingOffsetX !== null && branding.pendingOffsetX !== undefined) ||
      (branding.pendingOffsetY !== null && branding.pendingOffsetY !== undefined) ||
      (branding.pendingPadding !== null && branding.pendingPadding !== undefined);

    if (branding.pendingIconUrl || isTransformPending) {
      let origLocalPath = branding.pendingIconUrl ? this.getLocalFilePath(branding.pendingIconUrl) : null;
      
      const timestamp = Date.now();
      // If pending icon is missing but transform is pending, copy current icon as a pending draft
      if (!origLocalPath && branding.currentIconUrl) {
        const currentLocalPath = this.getLocalFilePath(branding.currentIconUrl);
        if (currentLocalPath && existsSync(currentLocalPath)) {
          const origFilename = `original_${appType}_${timestamp}.png`;
          const outputOrigPath = join(this.uploadDir, origFilename);
          copyFileSync(currentLocalPath, outputOrigPath);
          branding.pendingIconUrl = `/uploads/branding/${origFilename}`;
          origLocalPath = outputOrigPath;
        }
      }

      if (origLocalPath && existsSync(origLocalPath)) {
        const preparedFilename = `prepared_${appType}_${timestamp}.png`;
        const outputPreparedPath = join(this.uploadDir, preparedFilename);

        const scale = branding.pendingScale ?? branding.currentScale ?? 1.0;
        const offsetX = branding.pendingOffsetX ?? branding.currentOffsetX ?? 0.0;
        const offsetY = branding.pendingOffsetY ?? branding.currentOffsetY ?? 0.0;
        const padding = branding.pendingPadding ?? branding.currentPadding ?? 0.0;

        try {
          await this.runPythonProcessImage(
            origLocalPath,
            origLocalPath,
            outputPreparedPath,
            scale,
            offsetX,
            offsetY,
            padding
          );

          // Delete previous pending prepared file safely
          await this.deleteFileByUrl(branding.pendingPreparedIconUrl);

          branding.pendingPreparedIconUrl = `/uploads/branding/${preparedFilename}`;
        } catch (err: any) {
          throw new BadRequestException(`Failed to generate prepared adaptive icon: ${err.message}`);
        }
      }
    }

    // Local asset synchronization in safe development mode
    const isSyncEnabled = process.env.BRANDING_LOCAL_SYNC_ENABLED === 'true';
    if (isSyncEnabled) {
      const appRoot = appType === BrandingAppType.CUSTOMER 
        ? process.env.CUSTOMER_APP_ROOT 
        : process.env.DELIVERY_PARTNER_APP_ROOT;

      if (appRoot) {
        try {
          if (existsSync(appRoot)) {
            // 1. Sync App Name
            const nameToSync = branding.pendingAppName || branding.currentAppName;
            if (nameToSync) {
              const jsonPath = join(appRoot, 'branding.generated.json');
              writeFileSync(jsonPath, JSON.stringify({ appName: nameToSync }, null, 2), 'utf8');
              console.log(`[BrandingService] Local sync success: wrote appName "${nameToSync}" to ${jsonPath}`);
            }

            // 2. Sync Icons (only if they exist)
            const assetsDir = join(appRoot, 'assets');
            if (branding.pendingIconUrl && branding.pendingPreparedIconUrl && existsSync(assetsDir)) {
              const logoFilename = appType === BrandingAppType.CUSTOMER 
                ? 'quickbite-logo.png' 
                : 'delivery-partner-logo.png';
              
              const foregroundFilename = appType === BrandingAppType.CUSTOMER 
                ? 'quickbite-icon-foreground.png' 
                : 'delivery-partner-icon-foreground.png';

              const srcLogo = join(this.uploadDir, basename(branding.pendingIconUrl));
              const srcForeground = join(this.uploadDir, basename(branding.pendingPreparedIconUrl));
              
              const destLogo = join(assetsDir, logoFilename);
              const destForeground = join(assetsDir, foregroundFilename);

              if (existsSync(srcLogo)) {
                copyFileSync(srcLogo, destLogo);
                console.log(`[BrandingService] Local sync success: copied ${srcLogo} to ${destLogo}`);
              }
              if (existsSync(srcForeground)) {
                copyFileSync(srcForeground, destForeground);
                console.log(`[BrandingService] Local sync success: copied ${srcForeground} to ${destForeground}`);
              }
            }

            // 3. Sync Notification Icons (only if they exist)
            const notificationAssetsDir = join(appRoot, 'assets', 'notifications');
            if (branding.pendingPreparedNotificationIconUrl && existsSync(notificationAssetsDir)) {
              const srcNotification = join(this.uploadDir, basename(branding.pendingPreparedNotificationIconUrl));
              const destNotification = join(notificationAssetsDir, 'notification-icon.png');
              if (existsSync(srcNotification)) {
                copyFileSync(srcNotification, destNotification);
                console.log(`[BrandingService] Local sync success: copied notification icon ${srcNotification} to ${destNotification}`);
              }
            }
          } else {
            console.warn(`[BrandingService] Local sync skipped: app root does not exist at ${appRoot}`);
          }
        } catch (copyErr) {
          console.error(`[BrandingService] Local sync failed: ${copyErr.message}`);
          // Safe Local Development Mode: Do not fail the transaction on local sync failure.
        }
      } else {
        console.warn(`[BrandingService] Local sync skipped: app root environment variable not set for ${appType}`);
      }
    }

    // Only set status to PENDING_UPDATE. Do not promote files yet.
    branding.status = this.calculateStatus(branding);
    return await this.brandingRepository.save(branding);
  }

  async setAppName(appType: BrandingAppType, appName: string): Promise<Branding> {
    const branding = await this.brandingRepository.findOne({
      where: { appType },
    });
    if (!branding) {
      throw new NotFoundException(`Branding entry for ${appType} not found.`);
    }

    const trimmed = appName ? appName.trim() : '';
    if (!trimmed || trimmed.length < 2 || trimmed.length > 30) {
      throw new BadRequestException('App name must be between 2 and 30 characters.');
    }

    branding.pendingAppName = trimmed;
    branding.status = this.calculateStatus(branding);
    const saved = await this.brandingRepository.save(branding);

    // Synchronize locally if sync is enabled
    const isSyncEnabled = process.env.BRANDING_LOCAL_SYNC_ENABLED === 'true';
    if (isSyncEnabled) {
      const appRoot = appType === BrandingAppType.CUSTOMER 
        ? process.env.CUSTOMER_APP_ROOT 
        : process.env.DELIVERY_PARTNER_APP_ROOT;

      if (appRoot) {
        const jsonPath = join(appRoot, 'branding.generated.json');
        try {
          if (existsSync(appRoot)) {
            writeFileSync(jsonPath, JSON.stringify({ appName: trimmed }, null, 2), 'utf8');
            console.log(`[BrandingService] Local sync success: wrote appName "${trimmed}" to ${jsonPath}`);
          }
        } catch (jsonErr) {
          console.error(`[BrandingService] Local sync failed to write appName to JSON: ${jsonErr.message}`);
        }
      }
    }

    return saved;
  }

  async deletePending(appType: BrandingAppType): Promise<Branding> {
    const branding = await this.brandingRepository.findOne({
      where: { appType },
    });
    if (!branding) {
      throw new NotFoundException(`Branding entry for ${appType} not found.`);
    }

    // 1. Perform local restoration if sync is enabled
    const isSyncEnabled = process.env.BRANDING_LOCAL_SYNC_ENABLED === 'true';
    if (isSyncEnabled) {
      const appRoot = appType === BrandingAppType.CUSTOMER 
        ? process.env.CUSTOMER_APP_ROOT 
        : process.env.DELIVERY_PARTNER_APP_ROOT;

      if (appRoot) {
        try {
          if (existsSync(appRoot)) {
            // Restore App Name to current released name
            const currentName = branding.currentAppName;
            if (currentName) {
              const jsonPath = join(appRoot, 'branding.generated.json');
              writeFileSync(jsonPath, JSON.stringify({ appName: currentName }, null, 2), 'utf8');
              console.log(`[BrandingService] Local restore: restored appName "${currentName}" to ${jsonPath}`);
            }

            // Restore icons to current released icons
            const assetsDir = join(appRoot, 'assets');
            if (branding.currentIconUrl && branding.currentPreparedIconUrl && existsSync(assetsDir)) {
              const logoFilename = appType === BrandingAppType.CUSTOMER 
                ? 'quickbite-logo.png' 
                : 'delivery-partner-logo.png';
              
              const foregroundFilename = appType === BrandingAppType.CUSTOMER 
                ? 'quickbite-icon-foreground.png' 
                : 'delivery-partner-icon-foreground.png';

              const srcLogo = this.getLocalFilePath(branding.currentIconUrl);
              const srcForeground = this.getLocalFilePath(branding.currentPreparedIconUrl);
              
              const destLogo = join(assetsDir, logoFilename);
              const destForeground = join(assetsDir, foregroundFilename);

              if (srcLogo && existsSync(srcLogo)) {
                copyFileSync(srcLogo, destLogo);
                console.log(`[BrandingService] Local restore success: restored icon ${srcLogo} to ${destLogo}`);
              }
              if (srcForeground && existsSync(srcForeground)) {
                copyFileSync(srcForeground, destForeground);
                console.log(`[BrandingService] Local restore success: restored foreground ${srcForeground} to ${destForeground}`);
              }
            }

            // Restore notification icon to current released prepared notification icon
            const notificationAssetsDir = join(appRoot, 'assets', 'notifications');
            if (branding.currentPreparedNotificationIconUrl && existsSync(notificationAssetsDir)) {
              const srcNotification = this.getLocalFilePath(branding.currentPreparedNotificationIconUrl);
              const destNotification = join(notificationAssetsDir, 'notification-icon.png');
              if (srcNotification && existsSync(srcNotification)) {
                copyFileSync(srcNotification, destNotification);
                console.log(`[BrandingService] Local restore success: restored notification icon ${srcNotification} to ${destNotification}`);
              }
            }
          }
        } catch (restoreErr) {
          console.error(`[BrandingService] Local restore failed: ${restoreErr.message}`);
          // Safe Local Development Mode: Do not fail the transaction on local sync failure.
        }
      }
    }

    // 2. Delete pending files
    await this.deleteFileByUrl(branding.pendingIconUrl);
    await this.deleteFileByUrl(branding.pendingPreparedIconUrl);
    await this.deleteFileByUrl(branding.pendingNotificationIconUrl);
    await this.deleteFileByUrl(branding.pendingPreparedNotificationIconUrl);

    branding.pendingIconUrl = null;
    branding.pendingPreparedIconUrl = null;
    branding.pendingAppName = null;
    branding.pendingNotificationIconUrl = null;
    branding.pendingPreparedNotificationIconUrl = null;
    branding.pendingScale = null;
    branding.pendingOffsetX = null;
    branding.pendingOffsetY = null;
    branding.pendingPadding = null;
    branding.status = this.calculateStatus(branding);

    return await this.brandingRepository.save(branding);
  }

  async markCurrent(appType: BrandingAppType): Promise<Branding> {
    const branding = await this.brandingRepository.findOne({
      where: { appType },
    });
    if (!branding) {
      throw new NotFoundException(`Branding entry for ${appType} not found.`);
    }

    if (
      !branding.pendingPreparedIconUrl &&
      !branding.pendingIconUrl &&
      !branding.pendingAppName &&
      !branding.pendingNotificationIconUrl &&
      !branding.pendingPreparedNotificationIconUrl
    ) {
      throw new BadRequestException('No pending changes to promote.');
    }

    // Keep references to old files to clean them up AFTER DB promotion succeeds
    const oldCurrentIcon = branding.pendingIconUrl ? branding.currentIconUrl : null;
    const oldCurrentPreparedIcon = branding.pendingPreparedIconUrl ? branding.currentPreparedIconUrl : null;
    const oldCurrentNotificationIcon = branding.pendingNotificationIconUrl ? branding.currentNotificationIconUrl : null;
    const oldCurrentPreparedNotificationIcon = branding.pendingPreparedNotificationIconUrl ? branding.currentPreparedNotificationIconUrl : null;

    // Promote pending paths/names
    branding.currentAppName = branding.pendingAppName ?? branding.currentAppName;
    branding.currentIconUrl = branding.pendingIconUrl ?? branding.currentIconUrl;
    branding.currentPreparedIconUrl = branding.pendingPreparedIconUrl ?? branding.currentPreparedIconUrl;
    branding.currentNotificationIconUrl = branding.pendingNotificationIconUrl ?? branding.currentNotificationIconUrl;
    branding.currentPreparedNotificationIconUrl = branding.pendingPreparedNotificationIconUrl ?? branding.currentPreparedNotificationIconUrl;
    
    // Promote pending transform settings
    branding.currentScale = branding.pendingScale ?? branding.currentScale;
    branding.currentOffsetX = branding.pendingOffsetX ?? branding.currentOffsetX;
    branding.currentOffsetY = branding.pendingOffsetY ?? branding.currentOffsetY;
    branding.currentPadding = branding.pendingPadding ?? branding.currentPadding;

    // Clear pending database values and set status to CURRENT
    branding.pendingAppName = null;
    branding.pendingIconUrl = null;
    branding.pendingPreparedIconUrl = null;
    branding.pendingNotificationIconUrl = null;
    branding.pendingPreparedNotificationIconUrl = null;
    branding.pendingScale = null;
    branding.pendingOffsetX = null;
    branding.pendingOffsetY = null;
    branding.pendingPadding = null;
    branding.status = this.calculateStatus(branding);

    const saved = await this.brandingRepository.save(branding);

    // Clean up old current files safely now that promotion succeeded
    if (oldCurrentIcon) {
      await this.deleteFileByUrl(oldCurrentIcon);
    }
    if (oldCurrentPreparedIcon) {
      await this.deleteFileByUrl(oldCurrentPreparedIcon);
    }
    if (oldCurrentNotificationIcon) {
      await this.deleteFileByUrl(oldCurrentNotificationIcon);
    }
    if (oldCurrentPreparedNotificationIcon) {
      await this.deleteFileByUrl(oldCurrentPreparedNotificationIcon);
    }

    return saved;
  }

  async updateTransform(
    appType: BrandingAppType,
    scale: number,
    offsetX: number,
    offsetY: number,
    padding: number
  ): Promise<Branding> {
    const branding = await this.brandingRepository.findOne({
      where: { appType },
    });
    if (!branding) {
      throw new NotFoundException(`Branding entry for ${appType} not found.`);
    }

    branding.pendingScale = scale !== undefined ? scale : (branding.pendingScale ?? branding.currentScale ?? 1.0);
    branding.pendingOffsetX = offsetX !== undefined ? offsetX : (branding.pendingOffsetX ?? branding.currentOffsetX ?? 0.0);
    branding.pendingOffsetY = offsetY !== undefined ? offsetY : (branding.pendingOffsetY ?? branding.currentOffsetY ?? 0.0);
    branding.pendingPadding = padding !== undefined ? padding : (branding.pendingPadding ?? branding.currentPadding ?? 0.0);

    branding.status = this.calculateStatus(branding);
    return await this.brandingRepository.save(branding);
  }

  // --- Helpers for Safe File Deletions ---

  private async deleteLocalFile(filePath: string) {
    if (!filePath) return;
    try {
      if (existsSync(filePath)) {
        await unlink(filePath);
      }
    } catch (e) {
      console.error(`[BrandingService] Failed to delete file: ${filePath}`, e);
    }
  }

  private async deleteFileByUrl(urlPath: string) {
    if (!urlPath) return;
    // Safety check: Never delete default assets
    if (urlPath.includes('/defaults/')) return;

    // Extract filename and resolve path to prevent directory traversal
    const safeFilename = basename(urlPath);
    if (!safeFilename || safeFilename === '.' || safeFilename === '..') {
      return;
    }
    
    const fullPath = resolve(this.uploadDir, safeFilename);

    // Enforce that the file is in uploads/branding and not outside
    const safeBaseDir = resolve(this.uploadDir);
    if (!fullPath.startsWith(safeBaseDir)) {
      console.warn(`[BrandingService] Path traversal attempt blocked: ${fullPath}`);
      return;
    }

    await this.deleteLocalFile(fullPath);
  }

  private getLocalFilePath(urlPath: string): string {
    if (!urlPath) return null;
    const filename = basename(urlPath);
    if (urlPath.includes('/defaults/')) {
      return join(this.defaultsDir, filename);
    }
    return join(this.uploadDir, filename);
  }
}
