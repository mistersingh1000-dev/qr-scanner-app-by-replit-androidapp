import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Platform,
  Linking,
  Alert,
  useColorScheme,
  Dimensions,
  Modal,
  ScrollView,
} from 'react-native';
import { CameraView, Camera, BarcodeScanningResult } from 'expo-camera';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import Colors, { GREEN } from '@/constants/colors';
import { useScanHistory, ScanType } from '@/lib/scan-history';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SCANNER_SIZE = SCREEN_WIDTH * 0.7;

function getTypeIcon(type: ScanType): { name: string; family: 'ionicons' | 'material' } {
  switch (type) {
    case 'url': return { name: 'link', family: 'ionicons' };
    case 'email': return { name: 'mail', family: 'ionicons' };
    case 'phone': return { name: 'call', family: 'ionicons' };
    case 'wifi': return { name: 'wifi', family: 'ionicons' };
    case 'text': return { name: 'text-box-outline', family: 'material' };
    default: return { name: 'qr-code', family: 'ionicons' };
  }
}

function getTypeLabel(type: ScanType): string {
  switch (type) {
    case 'url': return 'Website URL';
    case 'email': return 'Email Address';
    case 'phone': return 'Phone Number';
    case 'wifi': return 'WiFi Network';
    case 'text': return 'Text';
    default: return 'QR Code';
  }
}

function ScanLineAnimation() {
  const scanLineY = useSharedValue(0);

  useEffect(() => {
    scanLineY.value = withRepeat(
      withTiming(SCANNER_SIZE - 4, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLineY.value }],
  }));

  return <Animated.View style={[styles.scanLine, scanLineStyle]} />;
}

export default function ScannerScreen() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [canAskAgain, setCanAskAgain] = useState(true);
  const [scanned, setScanned] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [lastScan, setLastScan] = useState<{ data: string; type: ScanType } | null>(null);
  const [torch, setTorch] = useState(false);
  const { addScan } = useScanHistory();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    (async () => {
      const { status, canAskAgain: canAsk } = await Camera.getCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      setCanAskAgain(canAsk);
    })();
  }, []);

  const requestPermission = useCallback(async () => {
    const { status, canAskAgain: canAsk } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
    setCanAskAgain(canAsk);
  }, []);

  const handleBarCodeScanned = useCallback(async (result: BarcodeScanningResult) => {
    if (scanned) return;
    setScanned(true);

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    const scanItem = await addScan(result.data);
    setLastScan({ data: scanItem.data, type: scanItem.type });
    setShowResult(true);
  }, [scanned, addScan]);

  const handleCopy = async () => {
    if (lastScan) {
      await Clipboard.setStringAsync(lastScan.data);
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      Alert.alert('Copied', 'Content copied to clipboard');
    }
  };

  const handleOpen = async () => {
    if (!lastScan) return;
    let url = lastScan.data;
    if (lastScan.type === 'url') {
      if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) await Linking.openURL(url);
    } else if (lastScan.type === 'email') {
      const email = url.replace(/^mailto:/i, '');
      await Linking.openURL(`mailto:${email}`);
    } else if (lastScan.type === 'phone') {
      const phone = url.replace(/^tel:/i, '');
      await Linking.openURL(`tel:${phone}`);
    }
  };

  const handleDismiss = () => {
    setShowResult(false);
    setScanned(false);
    setLastScan(null);
  };

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  if (hasPermission === null) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading camera...</Text>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: webTopInset }]}>
        <View style={styles.permissionContainer}>
          <View style={[styles.permissionIconCircle, { backgroundColor: colors.accent + '20' }]}>
            <Ionicons name="camera" size={48} color={colors.accent} />
          </View>
          <Text style={[styles.permissionTitle, { color: colors.text }]}>Camera Access Required</Text>
          <Text style={[styles.permissionText, { color: colors.textSecondary }]}>
            Grant camera permission to scan QR codes and barcodes instantly
          </Text>
          {!canAskAgain ? (
            Platform.OS !== 'web' ? (
              <Pressable
                style={({ pressed }) => [styles.permissionButton, { backgroundColor: colors.accent, opacity: pressed ? 0.9 : 1 }]}
                onPress={() => { try { Linking.openSettings(); } catch {} }}
              >
                <Feather name="settings" size={20} color="#fff" />
                <Text style={styles.permissionButtonText}>Open Settings</Text>
              </Pressable>
            ) : null
          ) : (
            <Pressable
              style={({ pressed }) => [styles.permissionButton, { backgroundColor: colors.accent, opacity: pressed ? 0.9 : 1 }]}
              onPress={requestPermission}
            >
              <Ionicons name="camera" size={20} color="#fff" />
              <Text style={styles.permissionButtonText}>Enable Camera</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: '#000' }]}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{
          barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39', 'code93', 'upc_a', 'upc_e', 'pdf417', 'aztec', 'datamatrix'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />

      <View style={StyleSheet.absoluteFill}>
        <View style={styles.overlay}>
          <View style={[styles.topOverlay, { paddingTop: insets.top + webTopInset }]}>
            <Text style={styles.scanTitle}>Scan QR Code</Text>
            <Text style={styles.scanSubtitle}>Position code within the frame</Text>
          </View>

          <View style={styles.middleRow}>
            <View style={styles.sideOverlay} />
            <View style={styles.scannerFrame}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
              <ScanLineAnimation />
            </View>
            <View style={styles.sideOverlay} />
          </View>

          <View style={[styles.bottomOverlay, { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 80 }]}>
            <Pressable
              style={({ pressed }) => [
                styles.torchButton,
                { backgroundColor: torch ? colors.accent : 'rgba(255,255,255,0.2)', opacity: pressed ? 0.8 : 1 },
              ]}
              onPress={() => setTorch(!torch)}
            >
              <Ionicons name={torch ? 'flashlight' : 'flashlight-outline'} size={24} color="#fff" />
            </Pressable>
          </View>
        </View>
      </View>

      <Modal visible={showResult} transparent animationType="slide" onRequestClose={handleDismiss}>
        <View style={styles.resultOverlay}>
          <View style={[styles.resultSheet, { backgroundColor: isDark ? '#1A1A2E' : '#fff' }]}>
            <View style={styles.resultHandle} />
            {lastScan && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.resultContent}>
                <View style={[styles.resultIconCircle, { backgroundColor: colors.accent + '20' }]}>
                  {getTypeIcon(lastScan.type).family === 'ionicons' ? (
                    <Ionicons name={getTypeIcon(lastScan.type).name as any} size={32} color={colors.accent} />
                  ) : (
                    <MaterialCommunityIcons name={getTypeIcon(lastScan.type).name as any} size={32} color={colors.accent} />
                  )}
                </View>
                <Text style={[styles.resultTypeLabel, { color: colors.accent }]}>{getTypeLabel(lastScan.type)}</Text>
                <View style={[styles.resultDataBox, { backgroundColor: isDark ? '#0A0A0A' : '#F3F4F6' }]}>
                  <Text style={[styles.resultData, { color: colors.text }]} selectable>{lastScan.data}</Text>
                </View>

                <View style={styles.resultActions}>
                  <Pressable
                    style={({ pressed }) => [styles.actionButton, { backgroundColor: colors.accent, opacity: pressed ? 0.9 : 1 }]}
                    onPress={handleCopy}
                  >
                    <Ionicons name="copy-outline" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>Copy</Text>
                  </Pressable>

                  {(lastScan.type === 'url' || lastScan.type === 'email' || lastScan.type === 'phone') && (
                    <Pressable
                      style={({ pressed }) => [styles.actionButton, { backgroundColor: '#3B82F6', opacity: pressed ? 0.9 : 1 }]}
                      onPress={handleOpen}
                    >
                      <Ionicons name="open-outline" size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>Open</Text>
                    </Pressable>
                  )}
                </View>

                <Pressable
                  style={({ pressed }) => [styles.scanAgainButton, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
                  onPress={handleDismiss}
                >
                  <Ionicons name="scan" size={20} color={colors.text} />
                  <Text style={[styles.scanAgainText, { color: colors.text }]}>Scan Again</Text>
                </Pressable>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  permissionContainer: {
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  permissionIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  permissionText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  permissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  overlay: {
    flex: 1,
  },
  topOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 24,
  },
  scanTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  scanSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  middleRow: {
    flexDirection: 'row',
    height: SCANNER_SIZE,
  },
  sideOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  scannerFrame: {
    width: SCANNER_SIZE,
    height: SCANNER_SIZE,
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: GREEN,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 8,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 8,
  },
  scanLine: {
    width: '100%',
    height: 2,
    backgroundColor: GREEN,
  },
  bottomOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  torchButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  resultSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    paddingTop: 12,
  },
  resultHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 16,
  },
  resultContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  resultIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  resultTypeLabel: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  resultDataBox: {
    width: '100%',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  resultData: {
    fontSize: 15,
    lineHeight: 22,
  },
  resultActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    width: '100%',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scanAgainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    width: '100%',
  },
  scanAgainText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
