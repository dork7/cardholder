import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import appConfig from '../../app.config';

// Take photo goes through the phone's own camera app, which needs no permission while CAMERA is
// left undeclared. Declaring it would make that intent fail without a runtime grant.
const root = join(__dirname, '..', '..');

test('the app blocks the camera permission, in every distribution', () => {
  const base = JSON.parse(readFileSync(join(root, 'app.json'), 'utf8')).expo;
  for (const distribution of ['github', 'play']) {
    process.env.DOC_KEEPER_DISTRIBUTION = distribution;
    const config = appConfig({ config: base, projectRoot: root, staticConfigPath: null, packageJsonPath: null } as never);
    expect(config.android?.blockedPermissions).toContain('android.permission.CAMERA');
  }
  delete process.env.DOC_KEEPER_DISTRIBUTION;
});

test("no local module's manifest asks for the camera permission", () => {
  const modules = readdirSync(join(root, 'modules'));
  expect(modules).toContain('photo-capture');
  for (const name of modules) {
    let manifest: string;
    try {
      manifest = readFileSync(join(root, 'modules', name, 'android', 'src', 'main', 'AndroidManifest.xml'), 'utf8');
    } catch {
      continue;
    }
    expect(manifest).not.toMatch(/uses-permission[^>]*android\.permission\.CAMERA/);
  }
});
