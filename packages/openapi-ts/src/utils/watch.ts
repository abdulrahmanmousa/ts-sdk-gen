import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { URL } from 'node:url';

import type { Config } from '../types/config';

const isUrl = (path: string): boolean => {
  try {
    new URL(path);
    return path.startsWith('http://') || path.startsWith('https://');
  } catch {
    return false;
  }
};

interface FileMetadata {
  lastContentHash: string;
  lastEtag: string;
  lastModified: number;
}

const CACHE_DIR = '.openapi-ts-cache';

const getCacheFilePath = (filePath: string): string => {
  const cacheDir = path.resolve(process.cwd(), CACHE_DIR);

  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  const fileId = crypto.createHash('md5').update(filePath).digest('hex');
  return path.join(cacheDir, `${fileId}.json`);
};

const loadCachedMetadata = (filePath: string): FileMetadata => {
  const cacheFilePath = getCacheFilePath(filePath);

  if (fs.existsSync(cacheFilePath)) {
    try {
      const data = fs.readFileSync(cacheFilePath, 'utf8');
      return JSON.parse(data) as FileMetadata;
    } catch (error) {
      console.warn(`⚠️ Failed to read cache file: ${error}`);
    }
  }

  return {
    lastContentHash: '',
    lastEtag: '',
    lastModified: 0,
  };
};

const saveCachedMetadata = (filePath: string, metadata: FileMetadata): void => {
  const cacheFilePath = getCacheFilePath(filePath);

  try {
    fs.writeFileSync(cacheFilePath, JSON.stringify(metadata, null, 2));
  } catch (error) {
    console.warn(`⚠️ Failed to write cache file: ${error}`);
  }
};

/**
 * Watch a file for changes and invoke a callback when it changes
 *
 * @param config Config object containing watch settings
 * @param callback Function to call when file changes
 * @param onTimeout Function to call when watch timeout is reached
 * @returns Cleanup function to stop watching
 */
export const watchFile = ({
  callback,
  config,
  onTimeout,
}: {
  callback: () => Promise<void>;
  config: Config;
  onTimeout?: () => void;
}): (() => void) => {
  if (!config.watch.enabled || typeof config.input.path !== 'string') {
    return () => {};
  }

  const filePath = config.input.path;
  const isRemote = isUrl(filePath);

  if (!isRemote) {
    const localPath = path.resolve(process.cwd(), filePath);

    try {
      fs.accessSync(localPath, fs.constants.R_OK);
    } catch (error) {
      console.error(`🚫 Error: Cannot access file ${localPath}`);
      return () => {};
    }
  }

  const metadata = loadCachedMetadata(filePath);
  let { lastContentHash, lastEtag, lastModified } = metadata;

  let isRunning = false;
  let timeoutId: NodeJS.Timeout | null = null;

  if (config.watch.timeout > 0) {
    timeoutId = setTimeout(() => {
      console.log(`⏱️ Watch timeout after ${config.watch.timeout}ms`);
      clearInterval(intervalId);
      if (onTimeout) {
        onTimeout();
      }
    }, config.watch.timeout);
  }

  if (isRemote) {
    console.log(`👀 Watching remote spec ${filePath} for changes...`);
  } else {
    const localPath = path.resolve(process.cwd(), filePath);
    const stats = fs.statSync(localPath);

    if (lastModified === 0) {
      lastModified = stats.mtimeMs;
      saveCachedMetadata(filePath, { lastContentHash, lastEtag, lastModified });
    }

    console.log(`👀 Watching local file ${localPath} for changes...`);
  }

  const createContentHash = (content: string): string => {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      hash = (hash << 5) - hash + content.charCodeAt(i);
      hash |= 0;
    }
    return String(hash);
  };

  const checkRemoteFile = async (): Promise<boolean> => {
    try {
      const headResponse = await fetch(filePath, { method: 'HEAD' });
      const etag = headResponse.headers.get('etag');
      const modifiedHeader = headResponse.headers.get('last-modified');

      // Initialize lastEtag if it's empty
      if (etag && lastEtag === '') {
        lastEtag = etag;
        saveCachedMetadata(filePath, {
          lastContentHash,
          lastEtag,
          lastModified,
        });
        return false;
      }

      if (etag && etag !== lastEtag) {
        lastEtag = etag;
        saveCachedMetadata(filePath, {
          lastContentHash,
          lastEtag,
          lastModified,
        });
        return true;
      }

      if (modifiedHeader) {
        const modifiedTime = new Date(modifiedHeader).getTime();
        if (modifiedTime > lastModified) {
          lastModified = modifiedTime;
          saveCachedMetadata(filePath, {
            lastContentHash,
            lastEtag,
            lastModified,
          });
          return true;
        }
      }

      const response = await fetch(filePath);
      const content = await response.text();
      const contentHash = createContentHash(content);

      // Initialize lastContentHash if it's empty
      if (lastContentHash === '') {
        lastContentHash = contentHash;
        saveCachedMetadata(filePath, {
          lastContentHash,
          lastEtag,
          lastModified,
        });
        return false;
      }

      if (contentHash !== lastContentHash) {
        lastContentHash = contentHash;
        saveCachedMetadata(filePath, {
          lastContentHash,
          lastEtag,
          lastModified,
        });
        return true;
      }

      return false;
    } catch (error) {
      console.error(`❌ Error checking remote file ${filePath}:`, error);
      return false;
    }
  };

  const checkLocalFile = (): boolean => {
    try {
      const localPath = path.resolve(process.cwd(), filePath);
      const stats = fs.statSync(localPath);

      if (stats.mtimeMs > lastModified) {
        lastModified = stats.mtimeMs;
        saveCachedMetadata(filePath, {
          lastContentHash,
          lastEtag,
          lastModified,
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error(`❌ Error checking local file ${filePath}:`, error);
      return false;
    }
  };

  const intervalId = setInterval(async () => {
    if (isRunning) {
      return;
    }

    let hasChanged = false;

    if (isRemote) {
      hasChanged = await checkRemoteFile();
    } else {
      hasChanged = checkLocalFile();
    }

    if (hasChanged) {
      isRunning = true;
      console.log(
        `🔄 ${isRemote ? 'Remote spec' : 'File'} ${filePath} changed, regenerating client...`,
      );

      try {
        await callback();
        console.log('✅ Client regenerated successfully');
      } catch (error) {
        console.error('❌ Error regenerating client:', error);
      } finally {
        isRunning = false;
      }
    }
  }, config.watch.interval);

  return () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    clearInterval(intervalId);
    console.log('👋 Stopped watching for changes');
  };
};
