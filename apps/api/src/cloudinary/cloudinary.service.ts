import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';

/** Every product photo lands in this Cloudinary folder. */
export const PRODUCT_IMAGES_FOLDER = 'casarespuestos/products';

export interface ImageUploadSignature {
  uploadUrl: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
}

/**
 * Signed direct uploads: the phone sends the photo straight to Cloudinary
 * with a signature made here, so the API secret never reaches the browser
 * and the photo never passes through this server. Cloudinary rejects a
 * signature older than one hour, and the signed `folder` can't be changed
 * by the client without breaking it.
 */
@Injectable()
export class CloudinaryService {
  constructor(private readonly configService: ConfigService) {}

  signProductImageUpload(): ImageUploadSignature {
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = PRODUCT_IMAGES_FOLDER;
    return {
      uploadUrl: `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
      apiKey: this.required('CLOUDINARY_API_KEY'),
      timestamp,
      folder,
      signature: this.sign({ folder, timestamp }),
    };
  }

  /** True only for an image uploaded to this store's account and product folder. */
  isProductImageUrl(url: string): boolean {
    return (
      url.startsWith(
        `https://res.cloudinary.com/${this.cloudName}/image/upload/`,
      ) && url.includes(`/${PRODUCT_IMAGES_FOLDER}/`)
    );
  }

  /**
   * Cloudinary's signing scheme: params sorted by name as `key=value`
   * joined with `&`, the API secret appended, SHA-1 hex.
   */
  private sign(params: Record<string, string | number>): string {
    const toSign = Object.keys(params)
      .sort()
      .map((key) => `${key}=${params[key]}`)
      .join('&');
    return createHash('sha1')
      .update(toSign + this.required('CLOUDINARY_API_SECRET'))
      .digest('hex');
  }

  private get cloudName(): string {
    return this.required('CLOUDINARY_CLOUD_NAME');
  }

  private required(key: string): string {
    const value = this.configService.get<string>(key);
    if (!value) {
      throw new Error(
        `${key} is not configured — set it in .env, see docs/ENVIRONMENT_VARIABLES.md`,
      );
    }
    return value;
  }
}
