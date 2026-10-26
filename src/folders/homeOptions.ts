import { Settings } from '../storage/settings';

// What the home screen's folder row shows. Both start on; only a stored '0' hides one.
export interface HomeFolderOptions {
  filter: boolean;
  manage: boolean;
}

export const DEFAULT_HOME_FOLDERS: HomeFolderOptions = { filter: true, manage: true };

export async function loadHomeFolders(settings: Settings): Promise<HomeFolderOptions> {
  const [filter, manage] = await Promise.all([settings.get('homeFolderFilter'), settings.get('homeManageFolders')]);
  return { filter: filter !== '0', manage: manage !== '0' };
}

export async function saveHomeFolders(settings: Settings, options: HomeFolderOptions): Promise<void> {
  await Promise.all([
    settings.set('homeFolderFilter', options.filter ? '1' : '0'),
    settings.set('homeManageFolders', options.manage ? '1' : '0'),
  ]);
}
