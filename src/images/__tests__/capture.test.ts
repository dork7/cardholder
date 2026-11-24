const mockOpenPicker = jest.fn();
const mockOpenCropper = jest.fn();
jest.mock('react-native-image-crop-picker', () => ({
  __esModule: true,
  default: {
    openPicker: (...a: unknown[]) => mockOpenPicker(...a),
    openCropper: (...a: unknown[]) => mockOpenCropper(...a),
    clean: () => Promise.resolve(),
  },
}));
const mockDetect = jest.fn();
jest.mock('../smartCrop', () => ({ detectCardBounds: (uri: string) => mockDetect(uri), cropRect: () => null }));
jest.mock('expo', () => ({ requireOptionalNativeModule: () => null }));
jest.mock('expo-file-system', () => {
  class File { exists = false; uri: string; constructor(uri: string) { this.uri = uri; } delete() {} }
  class Directory { exists = false; delete() {} }
  return { File, Directory, Paths: { cache: '/cache' } };
});
jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg' },
  ImageManipulator: {
    manipulate: () => ({
      resize: () => ({ renderAsync: async () => ({ saveAsync: async () => ({ uri: 'file:///thumb.jpg', base64: 'THUMB' }) }) }),
    }),
  },
}));

import { cropSharedImage, pickImage } from '../capture';

beforeEach(() => {
  jest.clearAllMocks();
  mockOpenPicker.mockResolvedValue({ path: '/picked.jpg' });
  mockOpenCropper.mockResolvedValue({ path: '/cropped.jpg', data: 'JPEG', width: 800, height: 800 });
  mockDetect.mockResolvedValue(null);
});

test('a document photo is cropped freely, starting around the document', async () => {
  await pickImage();
  expect(mockDetect).toHaveBeenCalled();
  expect(mockOpenCropper.mock.calls[0][0]).toMatchObject({ freeStyleCropEnabled: true });
  expect(mockOpenCropper.mock.calls[0][0]).not.toHaveProperty('width');
});

test('a square crop is held to 1:1 and starts from the whole photo', async () => {
  const picked = await pickImage('square');
  expect(mockDetect).not.toHaveBeenCalled();
  expect(mockOpenCropper.mock.calls[0][0]).toMatchObject({ path: 'file:///picked.jpg', freeStyleCropEnabled: false, width: 800, height: 800 });
  expect(picked).toEqual({ image: { jpegBase64: 'JPEG', aspect: 1, thumbJpegBase64: 'THUMB' }, original: null });
});

test('a camera photo for a profile uses the same square crop', async () => {
  await cropSharedImage('file:///shot.jpg', 'square');
  expect(mockDetect).not.toHaveBeenCalled();
  expect(mockOpenCropper.mock.calls[0][0]).toMatchObject({ path: 'file:///shot.jpg', freeStyleCropEnabled: false, width: 800, height: 800 });
});
