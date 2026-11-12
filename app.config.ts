import { ConfigContext, ExpoConfig } from 'expo/config';

// Keep GitHub APK updates for direct installs; Play builds update through Google Play instead.
export default ({ config }: ConfigContext): ExpoConfig => {
  const distribution = process.env.DOC_KEEPER_DISTRIBUTION === 'play' ? 'play' : 'github';
  return {
    ...config,
    name: config.name ?? 'Doc Keeper',
    slug: config.slug ?? 'cardholder',
    extra: { ...config.extra, distribution },
    android: {
      ...config.android,
      blockedPermissions: [
        ...(config.android?.blockedPermissions ?? []),
        ...(distribution === 'play' ? ['android.permission.REQUEST_INSTALL_PACKAGES'] : []),
      ],
    },
  };
};
