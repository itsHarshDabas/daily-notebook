import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/form';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

/** Camera barcode scanner for food packs (EAN/UPC). Works on phones and in browsers that allow camera access. */
export function BarcodeScanner({ onScanned, onCancel }: { onScanned: (code: string) => void; onCancel: () => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const done = useRef(false);

  if (!permission) return null;
  if (!permission.granted) {
    return (
      <View style={styles.box}>
        <ThemedText>Camera access is needed to scan barcodes.</ThemedText>
        <Button title="Allow camera" onPress={requestPermission} />
        <Button title="Cancel" variant="plain" onPress={onCancel} />
      </View>
    );
  }

  return (
    <View style={styles.box}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
        onBarcodeScanned={({ data }) => {
          // The callback fires repeatedly while the code is in view; take the first read only.
          if (done.current) return;
          done.current = true;
          onScanned(data);
        }}
      />
      <Button title="Cancel" variant="plain" onPress={onCancel} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: Spacing.two },
  camera: { width: '100%', aspectRatio: 1, borderRadius: Spacing.three, overflow: 'hidden' },
});
