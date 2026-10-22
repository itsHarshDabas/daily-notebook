import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

/** Lets the user pick a square photo and shrinks it to 512 px so it stays small in Storage. */
export async function pickAvatar(): Promise<{ uri: string; base64: string; mimeType: string } | null> {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 1 });
  if (result.canceled) return null;
  const image = await ImageManipulator.manipulate(result.assets[0].uri).resize({ width: 512 }).renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: true });
  if (!saved.base64) throw new Error('Could not read the photo');
  return { uri: saved.uri, base64: saved.base64, mimeType: 'image/jpeg' };
}
