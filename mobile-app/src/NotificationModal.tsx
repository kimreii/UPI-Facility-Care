import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

export interface UnifiedNotificationItem {
  key: string;
  code: string;
  statusLabel: string;
  statusType: 'baru' | 'proses' | 'selesai' | 'laporan';
  priorityLabel: string;
  isHighPriority: boolean;
  title: string;
  location: string;
  timeText?: string;
  actionLabel?: string;
  onPress: () => void;
}

export interface PopupBannerData {
  id: string;
  headerText: string;
  priorityLabel: string;
  isHighPriority: boolean;
  title: string;
  subtitle: string;
  onPress: () => void;
}

export const RealtimePopupBanner: React.FC<{
  banner: PopupBannerData | null;
  onDismiss: () => void;
}> = ({ banner, onDismiss }) => {
  if (!banner) return null;
  return (
    <View style={ns.popupWrapper} pointerEvents="box-none">
      <View
        style={[
          ns.popupCard,
          { borderLeftColor: banner.isHighPriority ? '#DC2626' : '#1D4ED8' },
        ]}
      >
        <View style={ns.popupTopRow}>
          <Text style={ns.popupHeaderBadge} numberOfLines={1}>
            {banner.headerText}
          </Text>

          <View style={ns.popupTopRight}>
            <Text
              style={[
                ns.popupPriorityText,
                { color: banner.isHighPriority ? '#DC2626' : '#059669' },
              ]}
            >
              {banner.priorityLabel}
            </Text>
            <TouchableOpacity
              style={ns.popupCloseBtn}
              onPress={onDismiss}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
            >
              <Text style={ns.popupCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => {
            onDismiss();
            banner.onPress();
          }}
          activeOpacity={0.8}
        >
          <Text style={ns.popupTitle} numberOfLines={1}>
            {banner.title}
          </Text>
          <Text style={ns.popupSubtitle} numberOfLines={1}>
            {banner.subtitle} • Ketuk untuk lihat ›
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

interface NotificationModalProps {
  visible: boolean;
  roleTitle: string;
  items: UnifiedNotificationItem[];
  onClose: () => void;
  onDismissItem: (key: string) => void;
  onDismissAll: () => void;
}

export const UnifiedBellButton: React.FC<{
  count: number;
  onPress: () => void;
}> = ({ count, onPress }) => (
  <TouchableOpacity style={ns.bellButton} onPress={onPress} activeOpacity={0.8}>
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
        stroke="#111827"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M13.73 21a2 2 0 0 1-3.46 0"
        stroke="#111827"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
    {count > 0 && (
      <View style={ns.bellBadge}>
        <Text style={ns.bellBadgeText}>{count > 9 ? '9+' : count}</Text>
      </View>
    )}
  </TouchableOpacity>
);

export const NotificationModal: React.FC<NotificationModalProps> = ({
  visible,
  items,
  onClose,
  onDismissItem,
  onDismissAll,
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={ns.overlay} activeOpacity={1} onPress={onClose}>
        <View style={ns.sheet} onStartShouldSetResponder={() => true}>
          {/* Header Bar: Rapi, lega, tidak bertumpuk */}
          <View style={ns.headerRow}>
            <Text style={ns.headerTitle}>Notifikasi ({items.length})</Text>

            <View style={ns.headerRightActions}>
              {items.length > 0 && (
                <TouchableOpacity
                  onPress={onDismissAll}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={ns.clearAllLink}>Hapus semua</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={ns.closeCircleBtn}
                onPress={onClose}
                activeOpacity={0.75}
              >
                <Text style={ns.closeCircleText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Daftar Kartu Notifikasi: Bersih & Lega */}
          <ScrollView
            style={{ maxHeight: 420 }}
            contentContainerStyle={{ gap: 12, paddingVertical: 4 }}
            showsVerticalScrollIndicator={false}
          >
            {items.length === 0 ? (
              <View style={ns.emptyContainer}>
                <Text style={ns.emptyTitle}>Tidak ada notifikasi baru</Text>
                <Text style={ns.emptySubtitle}>
                  Pembaruan tugas dan laporan akan muncul otomatis di sini.
                </Text>
              </View>
            ) : (
              items.map(item => (
                <TouchableOpacity
                  key={item.key}
                  style={ns.card}
                  onPress={item.onPress}
                  activeOpacity={0.75}
                >
                  {/* Baris Atas: Kode • Status di Kiri, Prioritas & Tombol X di Kanan */}
                  <View style={ns.cardTopRow}>
                    <Text style={ns.codeStatusText} numberOfLines={1}>
                      {item.code} • {item.statusLabel}
                    </Text>

                    <View style={ns.cardTopRight}>
                      <Text
                        style={[
                          ns.priorityText,
                          { color: item.isHighPriority ? '#DC2626' : '#059669' },
                        ]}
                      >
                        Prioritas {item.priorityLabel}
                      </Text>

                      <TouchableOpacity
                        style={ns.deleteCardBtn}
                        onPress={() => onDismissItem(item.key)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        activeOpacity={0.7}
                      >
                        <Text style={ns.deleteCardBtnText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Judul & Lokasi */}
                  <Text style={ns.cardTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={ns.locationText} numberOfLines={1}>
                    {item.location}
                    {item.timeText ? ` • ${item.timeText}` : ''}
                  </Text>

                  {/* Tombol aksi: jelas kalau kartu ini bisa dipencet */}
                  <View style={ns.actionRow}>
                    <Text style={ns.actionText}>{item.actionLabel || 'Buka'} ›</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const ns = StyleSheet.create({
  actionRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'flex-end',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  bellButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  bellBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  bellBadgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '800',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  clearAllLink: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
  closeCircleBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeCircleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
  },
  emptyContainer: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  codeStatusText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1D4ED8',
    flex: 1,
  },
  cardTopRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '700',
  },
  deleteCardBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteCardBtnText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#374151',
    lineHeight: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 3,
  },
  locationText: {
    fontSize: 12,
    color: '#6B7280',
  },
  popupWrapper: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    zIndex: 9999,
    alignItems: 'center',
  },
  popupCard: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderLeftWidth: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 10,
  },
  popupTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  popupHeaderBadge: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#1D4ED8',
    flex: 1,
  },
  popupTopRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  popupPriorityText: {
    fontSize: 11,
    fontWeight: '700',
  },
  popupCloseBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupCloseText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#374151',
    lineHeight: 12,
  },
  popupTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 2,
  },
  popupSubtitle: {
    fontSize: 11.5,
    color: '#4B5563',
    fontWeight: '500',
  },
});
