import { WalletId, CredentialFormat } from '../types/index.js';
import { getKeys, CryptoKeyPair } from '../crypto/keys.js';

export interface WalletModuleInfo {
  id: WalletId;
  name: string;
  version: string;
  type: 'inji' | 'external';
  description: string;
  supportedFormats: CredentialFormat[];
  capabilities: {
    selectiveDisclosure: boolean;
    crossDeviceQR: boolean;
    sameDeviceDeepLink: boolean;
    pixelPassCompression: boolean;
  };
  getKey: () => CryptoKeyPair;
}

export const WALLET_MODULES: Record<WalletId, WalletModuleInfo> = {
  'inji-web': {
    id: 'inji-web',
    name: 'Inji Web (Browser Wallet)',
    version: 'v0.9.1',
    type: 'inji',
    description: 'React browser-based wallet client holding credentials in local keystore, providing selective disclosure controls and presentation assembly.',
    supportedFormats: ['ldp_vc', 'vc+sd-jwt', 'mso_mdoc'],
    capabilities: {
      selectiveDisclosure: true,
      crossDeviceQR: true,
      sameDeviceDeepLink: true,
      pixelPassCompression: false
    },
    getKey: () => getKeys().injiWalletHolder
  },
  'inji-mobile': {
    id: 'inji-mobile',
    name: 'Inji Wallet Mobile (Mimoto BFF)',
    version: 'v1.1.0',
    type: 'inji',
    description: 'React Native mobile wallet with Mimoto backend, QR cross-device scanning, Tuvali BLE offline transfer, and PixelPass QR decompression.',
    supportedFormats: ['ldp_vc', 'vc+sd-jwt', 'mso_mdoc'],
    capabilities: {
      selectiveDisclosure: true,
      crossDeviceQR: true,
      sameDeviceDeepLink: true,
      pixelPassCompression: true
    },
    getKey: () => getKeys().injiWalletHolder
  },
  'generic-wallet': {
    id: 'generic-wallet',
    name: 'External Standards Wallet (Walt.id / EUDI)',
    version: 'v2.1.0',
    type: 'external',
    description: 'External standards-compliant wallet mock testing interoperability across non-MOSIP wallet architectures.',
    supportedFormats: ['ldp_vc', 'vc+sd-jwt'],
    capabilities: {
      selectiveDisclosure: true,
      crossDeviceQR: true,
      sameDeviceDeepLink: true,
      pixelPassCompression: false
    },
    getKey: () => getKeys().injiWalletHolder
  }
};
