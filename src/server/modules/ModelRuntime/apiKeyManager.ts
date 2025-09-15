import { getLLMConfig } from '@/envs/llm';

interface KeyStore {
  index: number;
  keyLen: number;
  keys: string[];
}

export class ApiKeyManager {
  private _cache: Map<string, KeyStore> = new Map();

  private _mode: string;

  constructor() {
    const { API_KEY_SELECT_MODE: mode = 'random' } = getLLMConfig();

    this._mode = mode;
  }

  private getKeyStore(apiKeys: string) {
    let store = this._cache.get(apiKeys);

    if (!store) {
      const keys = apiKeys.split(',').filter((_) => !!_.trim());

      store = { index: 0, keyLen: keys.length, keys } as KeyStore;
      this._cache.set(apiKeys, store);
    }

    return store;
  }

  pick(apiKeys: string = '') {
    if (!apiKeys) return '';

    const store = this.getKeyStore(apiKeys);
    let index = 0;

    if (this._mode === 'turn') index = store.index++ % store.keyLen;
    if (this._mode === 'random') index = Math.floor(Math.random() * store.keyLen);

    const selectedKey = store.keys[index];

    // 输出日志显示当前使用的API key（只显示前8位和后4位，保护隐私）
    const maskedKey =
      selectedKey.length > 12
        ? `${selectedKey.slice(0, 8)}...${selectedKey.slice(-4)}`
        : `${selectedKey.slice(0, 4)}...`;

    console.log(
      `[API Key Manager] Selected key ${index + 1}/${store.keyLen} (${this._mode} mode): ${maskedKey}`,
    );

    return selectedKey;
  }
}

export default new ApiKeyManager();
