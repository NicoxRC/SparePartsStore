import { createHash } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { CloudinaryService, PRODUCT_IMAGES_FOLDER } from './cloudinary.service';

const env: Record<string, string> = {
  CLOUDINARY_CLOUD_NAME: 'demo-store',
  CLOUDINARY_API_KEY: '123456',
  CLOUDINARY_API_SECRET: 'secret',
};

describe('CloudinaryService', () => {
  let values: Record<string, string>;
  let service: CloudinaryService;

  beforeEach(() => {
    values = { ...env };
    service = new CloudinaryService({
      get: (key: string) => values[key],
    } as unknown as ConfigService);
  });

  it('signs folder and timestamp with the API secret', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);

    const result = service.signProductImageUpload();

    expect(result).toEqual({
      uploadUrl: 'https://api.cloudinary.com/v1_1/demo-store/image/upload',
      apiKey: '123456',
      timestamp: 1_700_000_000,
      folder: PRODUCT_IMAGES_FOLDER,
      signature: createHash('sha1')
        .update(`folder=${PRODUCT_IMAGES_FOLDER}&timestamp=1700000000secret`)
        .digest('hex'),
    });
  });

  it('fails loudly when a credential is missing', () => {
    delete values.CLOUDINARY_API_SECRET;
    expect(() => service.signProductImageUpload()).toThrow(
      'CLOUDINARY_API_SECRET is not configured',
    );
  });

  it('accepts only images from this account and product folder', () => {
    const own = `https://res.cloudinary.com/demo-store/image/upload/v1/${PRODUCT_IMAGES_FOLDER}/abc.jpg`;
    expect(service.isProductImageUrl(own)).toBe(true);
    expect(
      service.isProductImageUrl(
        `https://res.cloudinary.com/other/image/upload/v1/${PRODUCT_IMAGES_FOLDER}/abc.jpg`,
      ),
    ).toBe(false);
    expect(
      service.isProductImageUrl(
        'https://res.cloudinary.com/demo-store/image/upload/v1/elsewhere/abc.jpg',
      ),
    ).toBe(false);
    expect(service.isProductImageUrl('https://evil.example/abc.jpg')).toBe(
      false,
    );
  });
});
