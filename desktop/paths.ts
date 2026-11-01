// Location of the Vite build (dist/) for the desktop shell (AP-121) and the phone server (AP-122).
// Pure: the caller passes app.getAppPath(). In development this is the project root, in the
// packaged .exe it is resources/app.asar; dist/ sits directly below it in both cases.
import { join } from 'node:path';

export const DIST_DIR_NAME = 'dist';

export function distDir(appPath: string): string {
  if (typeof appPath !== 'string' || appPath.length === 0) {
    throw new Error('distDir: appPath must be a non-empty string');
  }
  return join(appPath, DIST_DIR_NAME);
}
