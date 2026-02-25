import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Pressable,
  Platform,
  Linking,
  Alert,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { useScanHistory, ScanItem, ScanType } from '@/lib/scan-history';

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

function getTypeColor(type: ScanType): string {
  switch (type) {
    case 'url': return '#3B82F6';
    case 'email': return '#8B5CF6';
    case 'phone': return '#10B981';
    case 'wifi': return '#F59E0B';
    case 'text': return '#EF4444';
    default: return '#6B7280';
  }
}

function formatTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

function HistoryItem({ item, colors, isDark, onCopy, onOpen, onDelete }: {
  item: ScanItem;
  colors: typeof Colors.light;
  isDark: boolean;
  onCopy: (data: string) => void;
  onOpen: (item: ScanItem) => void;
  onDelete: (id: string) => void;
}) {
  const icon = getTypeIcon(item.type);
  const typeColor = getTypeColor(item.type);

  return (
    <View style={[styles.historyItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.itemHeader}>
        <View style={[styles.typeIconCircle, { backgroundColor: typeColor + '20' }]}>
          {icon.family === 'ionicons' ? (
            <Ionicons name={icon.name as any} size={18} color={typeColor} />
          ) : (
            <MaterialCommunityIcons name={icon.name as any} size={18} color={typeColor} />
          )}
        </View>
        <View style={styles.itemInfo}>
          <Text style={[styles.itemData, { color: colors.text }]} numberOfLines={2}>{item.data}</Text>
          <Text style={[styles.itemTime, { color: colors.textSecondary }]}>{formatTime(item.timestamp)}</Text>
        </View>
      </View>
      <View style={styles.itemActions}>
        <Pressable
          style={({ pressed }) => [styles.itemAction, { opacity: pressed ? 0.6 : 1 }]}
          onPress={() => onCopy(item.data)}
          hitSlop={8}
        >
          <Ionicons name="copy-outline" size={18} color={colors.textSecondary} />
        </Pressable>
        {(item.type === 'url' || item.type === 'email' || item.type === 'phone') && (
          <Pressable
            style={({ pressed }) => [styles.itemAction, { opacity: pressed ? 0.6 : 1 }]}
            onPress={() => onOpen(item)}
            hitSlop={8}
          >
            <Ionicons name="open-outline" size={18} color={colors.accent} />
          </Pressable>
        )}
        <Pressable
          style={({ pressed }) => [styles.itemAction, { opacity: pressed ? 0.6 : 1 }]}
          onPress={() => onDelete(item.id)}
          hitSlop={8}
        >
          <Feather name="trash-2" size={16} color={colors.danger} />
        </Pressable>
      </View>
    </View>
  );
}

export default function HistoryScreen() {
  const { history, removeScan, clearHistory, isLoading } = useScanHistory();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;

  const handleCopy = useCallback(async (data: string) => {
    await Clipboard.setStringAsync(data);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Alert.alert('Copied', 'Content copied to clipboard');
  }, []);

  const handleOpen = useCallback(async (item: ScanItem) => {
    let url = item.data;
    if (item.type === 'url') {
      if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) await Linking.openURL(url);
    } else if (item.type === 'email') {
      const email = url.replace(/^mailto:/i, '');
      await Linking.openURL(`mailto:${email}`);
    } else if (item.type === 'phone') {
      const phone = url.replace(/^tel:/i, '');
      await Linking.openURL(`tel:${phone}`);
    }
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    await removeScan(id);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [removeScan]);

  const handleClearAll = useCallback(() => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to delete all scan history? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await clearHistory();
            if (Platform.OS !== 'web') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          },
        },
      ]
    );
  }, [clearHistory]);

  const renderItem = useCallback(({ item }: { item: ScanItem }) => (
    <HistoryItem
      item={item}
      colors={colors}
      isDark={isDark}
      onCopy={handleCopy}
      onOpen={handleOpen}
      onDelete={handleDelete}
    />
  ), [colors, isDark, handleCopy, handleOpen, handleDelete]);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {history.length > 0 && (
        <View style={[styles.headerBar, { paddingTop: Platform.OS === 'web' ? webTopInset + 12 : 12 }]}>
          <Text style={[styles.countText, { color: colors.textSecondary }]}>
            {history.length} {history.length === 1 ? 'scan' : 'scans'}
          </Text>
          <Pressable
            style={({ pressed }) => [styles.clearButton, { opacity: pressed ? 0.7 : 1 }]}
            onPress={handleClearAll}
          >
            <Feather name="trash-2" size={14} color={colors.danger} />
            <Text style={[styles.clearText, { color: colors.danger }]}>Clear All</Text>
          </Pressable>
        </View>
      )}

      <FlatList
        data={history}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + webBottomInset + 80 },
          history.length === 0 && styles.emptyListContent,
        ]}
        scrollEnabled={!!history.length}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconCircle, { backgroundColor: colors.accent + '15' }]}>
              <Ionicons name="scan-outline" size={48} color={colors.accent} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Scans Yet</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Scanned QR codes and barcodes will appear here
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  countText: {
    fontSize: 14,
    fontWeight: '500',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  clearText: {
    fontSize: 14,
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  emptyListContent: {
    flex: 1,
    justifyContent: 'center',
  },
  historyItem: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  typeIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
    gap: 4,
  },
  itemData: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 20,
  },
  itemTime: {
    fontSize: 12,
  },
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.2)',
  },
  itemAction: {
    padding: 4,
  },
  emptyState: {
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});
