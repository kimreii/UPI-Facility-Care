import React from 'react';
import { View, Text, Modal, TouchableOpacity, Image } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { AiInspectionResult } from '../types';
import { st } from './petugasStyles';

interface PhotoPreviewModalProps {
  visible: boolean;
  onClose: () => void;
  onRetake: () => void;
  previewCustomPhotoUri: string | null;
  photoUri: string | null;
  annotatedPhotoUrl: string | null;
  showAnnotatedInModal: boolean;
  onToggleShowAnnotated: (show: boolean) => void;
  damageState: 'none' | 'damage';
  aiResult: AiInspectionResult | null;
}

export const PhotoPreviewModal: React.FC<PhotoPreviewModalProps> = ({
  visible,
  onClose,
  onRetake,
  previewCustomPhotoUri,
  photoUri,
  annotatedPhotoUrl,
  showAnnotatedInModal,
  onToggleShowAnnotated,
  damageState,
  aiResult,
}) => {
  const dirtyItems = (aiResult?.detections || []).filter(
    d => d.category === 'Cleanliness' || d.category === 'Damage'
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(17, 24, 39, 0.45)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 16,
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 460,
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: '#E5E7EB',
          }}
        >
          {/* Header Modal */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: '#E5E7EB',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity
                onPress={onClose}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M15 18L9 12L15 6"
                    stroke="#111827"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </TouchableOpacity>
              <Text style={{ color: '#111827', fontSize: 15, fontWeight: '700' }}>Foto Bukti</Text>
            </View>

            <View
              style={[
                st.aiStatusBadge,
                damageState === 'damage' ? st.aiBadgeDamage : st.aiBadgeClean,
              ]}
            >
              <Text
                style={[
                  st.aiStatusBadgeText,
                  damageState === 'damage' ? st.textRedDark : st.textGreenDark,
                ]}
              >
                {damageState === 'damage' ? 'Ada Bagian Kotor' : 'Bersih'}
              </Text>
            </View>
          </View>

          {/* Tab Pilihan: Penanda Kotor vs Foto Asli */}
          {!previewCustomPhotoUri && (
            <View
              style={{
                flexDirection: 'row',
                gap: 8,
                paddingHorizontal: 16,
                paddingTop: 12,
                paddingBottom: 8,
              }}
            >
              <TouchableOpacity
                onPress={() => onToggleShowAnnotated(true)}
                activeOpacity={0.85}
                style={{
                  flex: 1,
                  height: 34,
                  borderRadius: 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: showAnnotatedInModal ? '#1D70F7' : '#F3F4F6',
                }}
              >
                <Text
                  style={{
                    color: showAnnotatedInModal ? '#FFFFFF' : '#4B5563',
                    fontSize: 12,
                    fontWeight: '600',
                  }}
                >
                  Titik Bagian Kotor
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onToggleShowAnnotated(false)}
                activeOpacity={0.85}
                style={{
                  flex: 1,
                  height: 34,
                  borderRadius: 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: !showAnnotatedInModal ? '#1D70F7' : '#F3F4F6',
                }}
              >
                <Text
                  style={{
                    color: !showAnnotatedInModal ? '#FFFFFF' : '#4B5563',
                    fontSize: 12,
                    fontWeight: '600',
                  }}
                >
                  Foto Asli
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Area Foto Keseluruhan (resizeMode="contain") */}
          <View
            style={{
              width: '100%',
              height: 310,
              backgroundColor: '#F3F4F6',
              marginVertical: 4,
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            {(previewCustomPhotoUri || photoUri) && (
              <View
                style={{
                  width: '100%',
                  height: '100%',
                  position: 'relative',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Image
                  source={{
                    uri:
                      previewCustomPhotoUri ||
                      (showAnnotatedInModal ? annotatedPhotoUrl || photoUri! : photoUri!),
                  }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="contain"
                />

                {!previewCustomPhotoUri &&
                  showAnnotatedInModal &&
                  !annotatedPhotoUrl &&
                  dirtyItems
                    .filter(d => d.bbox)
                    .map((det, idx) => {
                      const b = det.bbox!;
                      const leftPct = Math.min(80, Math.max(5, (b.x / 320) * 100));
                      const topPct = Math.min(75, Math.max(10, (b.y / 320) * 100));
                      const widthPct = Math.min(55, Math.max(18, (b.width / 320) * 100));
                      const heightPct = Math.min(50, Math.max(18, (b.height / 320) * 100));
                      const isUrine = det.class_name.toLowerCase().includes('urin');
                      const boxColor = isUrine ? '#D97706' : '#EF4444';
                      return (
                        <View
                          key={`modal-box-${idx}`}
                          pointerEvents="none"
                          style={{
                            position: 'absolute',
                            left: `${leftPct}%`,
                            top: `${topPct}%`,
                            width: `${widthPct}%`,
                            height: `${heightPct}%`,
                            borderWidth: 2,
                            borderColor: boxColor,
                            backgroundColor: 'rgba(239, 68, 68, 0.12)',
                            borderRadius: 6,
                          }}
                        >
                          <View
                            style={{
                              backgroundColor: boxColor,
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              alignSelf: 'flex-start',
                              borderBottomRightRadius: 4,
                            }}
                          >
                            <Text style={{ color: '#FFFFFF', fontSize: 10.5, fontWeight: '700' }}>
                              {det.class_name}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
              </View>
            )}
          </View>

          {/* Keterangan Bagian Kotor */}
          <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 }}>
            {!previewCustomPhotoUri && (
              <>
                <Text style={{ color: '#111827', fontSize: 13, fontWeight: '700', marginBottom: 8 }}>
                  Keterangan Bagian yang Perlu Dibersihkan
                </Text>

                {dirtyItems.length === 0 ? (
                  <View
                    style={{
                      backgroundColor: '#F9FAFB',
                      borderWidth: 1,
                      borderColor: '#E5E7EB',
                      borderRadius: 8,
                      padding: 10,
                      marginBottom: 14,
                    }}
                  >
                    <Text style={{ color: '#4B5563', fontSize: 12 }}>
                      Tidak ada bagian yang kotor atau rusak pada foto ini.
                    </Text>
                  </View>
                ) : (
                  <View style={{ gap: 6, marginBottom: 14 }}>
                    {dirtyItems.map((item, idx) => (
                      <View
                        key={`dirty-item-${idx}`}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          backgroundColor: '#F9FAFB',
                          borderWidth: 1,
                          borderColor: '#E5E7EB',
                          borderRadius: 8,
                          paddingHorizontal: 10,
                          paddingVertical: 8,
                        }}
                      >
                        <Text style={{ color: '#111827', fontSize: 12, fontWeight: '600' }}>
                          {idx + 1}. {item.class_name}
                        </Text>
                        <Text style={{ color: '#6B7280', fontSize: 11.5, fontWeight: '500' }}>
                          Area {item.area_percentage}%
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}

            <View style={{ flexDirection: 'row', gap: 10 }}>
              {!previewCustomPhotoUri && (
                <TouchableOpacity
                  onPress={onRetake}
                  activeOpacity={0.85}
                  style={{
                    flex: 1,
                    height: 40,
                    backgroundColor: '#F3F4F6',
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#111827', fontSize: 12.5, fontWeight: '600' }}>
                    Ambil Ulang
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={onClose}
                activeOpacity={0.85}
                style={{
                  flex: 1,
                  height: 40,
                  backgroundColor: '#1D70F7',
                  borderRadius: 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '700' }}>Tutup</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};
