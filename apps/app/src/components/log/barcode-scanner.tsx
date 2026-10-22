import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';

/** Camera barcode scanner for food packs (EAN/UPC). Works on phones and in browsers that allow camera access. */
export function BarcodeScanner({ onScanned, onCancel }: { onScanned: (code: string) => void; onCancel: () => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const done = useRef(false);

  if (!permission) return null;
  if (!permission.granted) {
    return (
      <View style={styles.box}>
        <Text color="textSecondary">Camera access is needed to scan barcodes.</Text>
        <Button title="Allow camera" icon="camera-outline" onPress={requestPermission} />
        <Button title="Cancel" variant="ghost" onPress={onCancel} />
      </View>
    );
  }

  return (
    <View style={styles.box}>
      <View style={styles.frame}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
          onBarcodeScanned={({ data }) => {
            // The callback fires repeatedly while the code is in view; take the first read only.
            if (done.current) return;
            done.current = true;
            onScanned(data);
          }}
        />
        <View style={styles.reticle} pointerEvents="none" />
      </View>
      <Text variant="caption" color="textSecondary" style={{ textAlign: 'center' }}>
        Point the camera at the barcode on the pack.
      </Text>
      <Button title="Cancel" variant="ghost" onPress={onCancel} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: Spacing.two },
  frame: { width: '100%', aspectRatio: 4 / 3, borderRadius: Radius.md, overflow: 'hidden', backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  reticle: { width: '70%', height: '35%', borderWidth: 2, borderColor: '#ffffffcc', borderRadius: Radius.sm },
});
