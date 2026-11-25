import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Task, AiInspectionResult } from '../types';
import {
  ChecklistItem,
  TaskFacilityIcon,
  getFacilityMetadata,
} from './PetugasIcons';
import { st } from './petugasStyles';

interface DetailTugasScreenProps {
  task: Task;
  onBack: () => void;
  onOpenQrTab: () => void;
  checklist: ChecklistItem[];
  onToggleChecklist: (id: string) => void;
  photoUri: string | null;
  annotatedPhotoUrl: string | null;
  isAnalyzingAi: boolean;
  aiResult: AiInspectionResult | null;
  onOpenPhotoPreview: () => void;
  onOpenLiveCamera: () => void;
  damageState: 'none' | 'damage';
  onChangeDamageState: (state: 'none' | 'damage') => void;
  catatan: string;
  onChangeCatatan: (val: string) => void;
  showCatatanInput: boolean;
  onShowCatatanInput: () => void;
  isSubmitting: boolean;
  onCompleteTask: () => void;
  refreshing: boolean;
  onRefresh: () => void;
}

export const DetailTugasScreen: React.FC<DetailTugasScreenProps> = ({
  task,
  onBack,
  onOpenQrTab,
  checklist,
  onToggleChecklist,
  photoUri,
  annotatedPhotoUrl,
  isAnalyzingAi,
  aiResult,
  onOpenPhotoPreview,
  onOpenLiveCamera,
  damageState,
  onChangeDamageState,
  catatan,
  onChangeCatatan,
  showCatatanInput,
  onShowCatatanInput,
  isSubmitting,
  onCompleteTask,
  refreshing,
  onRefresh,
}) => {
  const meta = getFacilityMetadata(task);
  const stainTotal =
    (aiResult?.total_stains || 0) +
    (aiResult?.total_footprints || 0) +
    (aiResult?.total_water_splashes || 0) +
    (aiResult?.total_glass_stains || 0);
  const trashTotal = aiResult?.total_trash || 0;
  const defectTotal = aiResult?.total_defects || 0;
  const stainLabels = (aiResult?.detections || [])
    .filter(d => d.category === 'Cleanliness' || d.category === 'Damage')
    .map(d => d.class_name);

  return (
    <ScrollView
      style={st.scroll}
      contentContainerStyle={st.detailScrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header Row: Back button, Title & Status Badge */}
      <View style={st.headerRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <TouchableOpacity
            style={st.backBtn}
            onPress={onBack}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path
                d="M15 18L9 12L15 6"
                stroke="#111827"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </TouchableOpacity>
          <Text style={st.headerTitle}>Detail Tugas</Text>
        </View>

        <View
          style={[
            st.statusBadgeDalamProses,
            task.status === 'Selesai' && st.badgeSelesai,
          ]}
        >
          <Text
            style={[
              st.statusBadgeDalamProsesText,
              task.status === 'Selesai' && st.badgeSelesaiText,
            ]}
          >
            {task.status === 'Selesai' ? 'Selesai' : 'Dalam Proses'}
          </Text>
        </View>
      </View>

      {/* Task Summary Card with Dynamic Facility Icon */}
      <View style={st.taskHeaderCard}>
        <View style={st.taskIconContainer}>
          <TaskFacilityIcon judul={task.judul} />
        </View>
        <View style={st.taskHeaderTexts}>
          <Text style={st.taskHeaderTitle}>{task.judul}</Text>
          <Text style={st.taskHeaderSubtitle}>{meta.shortSubtitle}</Text>
          <Text style={st.taskHeaderSchedule}>{meta.jadwal}</Text>
        </View>
      </View>

      {/* Section 1: Informasi Fasilitas */}
      <View style={st.sectionBlock}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <Text style={[st.sectionTitle, { marginBottom: 0 }]}>Informasi Fasilitas</Text>
          <TouchableOpacity style={st.qrScanMiniBtn} onPress={onOpenQrTab} activeOpacity={0.8}>
            <Text style={st.qrScanMiniBtnText}>Scan QR Aset Lain</Text>
          </TouchableOpacity>
        </View>
        <View style={st.infoRowsList}>
          <View style={st.infoRow}>
            <Text style={st.infoLabel}>Jenis</Text>
            <Text style={st.infoValue}>{meta.jenis}</Text>
          </View>
          <View style={st.infoRow}>
            <Text style={st.infoLabel}>Lokasi</Text>
            <Text style={st.infoValue}>{task.lokasi}</Text>
          </View>
          <View style={st.infoRow}>
            <Text style={st.infoLabel}>ID Aset</Text>
            <Text style={st.infoValue}>{meta.assetCode}</Text>
          </View>
          <View style={st.infoRow}>
            <Text style={st.infoLabel}>QR Code</Text>
            <Text style={st.infoValue}>{meta.qrCode} ✓</Text>
          </View>
        </View>
      </View>

      <View style={st.horizontalDivider} />

      {/* Instruksi Tambahan dari Admin (jika diisi saat pembuatan Work Order) */}
      {Boolean(task.deskripsi && task.deskripsi.trim()) && (
        <>
          <View style={st.sectionBlock}>
            <Text style={st.sectionTitle}>Instruksi Tambahan</Text>
            <View
              style={{
                backgroundColor: '#F8FAFC',
                borderWidth: 1,
                borderColor: '#E2E8F0',
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 12,
              }}
            >
              <Text style={{ fontSize: 13, color: '#1F2937', lineHeight: 20 }}>
                {task.deskripsi.trim()}
              </Text>
            </View>
          </View>
          <View style={st.horizontalDivider} />
        </>
      )}

      {/* Section 2: Checklist */}
      <View style={st.sectionBlock}>
        <Text style={st.sectionTitle}>Checklist</Text>
        <View style={st.checklistContainer}>
          {checklist.map(item => (
            <TouchableOpacity
              key={item.id}
              style={st.checklistItemRow}
              onPress={() => onToggleChecklist(item.id)}
              activeOpacity={0.7}
            >
              <View style={[st.checkboxBox, item.checked && st.checkboxBoxChecked]}>
                {item.checked && (
                  <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M20 6L9 17L4 12"
                      stroke="#FFFFFF"
                      strokeWidth="3.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                )}
              </View>
              <Text
                style={[
                  st.checklistItemLabel,
                  item.checked && st.checklistItemLabelChecked,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={st.horizontalDivider} />

      {/* Section 3: Foto Bukti */}
      <View style={st.sectionBlock}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
          }}
        >
          <Text style={[st.sectionTitle, { marginBottom: 0 }]}>Foto Bukti</Text>
          {photoUri && (
            <TouchableOpacity onPress={onOpenPhotoPreview} activeOpacity={0.75}>
              <Text style={{ fontSize: 11.5, fontWeight: '600', color: '#1D70F7' }}>
                Lihat ukuran penuh
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {photoUri ? (
          <View style={st.photoResultWrapper}>
            <TouchableOpacity
              style={st.photoBox}
              activeOpacity={0.88}
              onPress={onOpenPhotoPreview}
            >
              <Image
                source={{ uri: annotatedPhotoUrl || photoUri }}
                style={st.photoImage}
                resizeMode="cover"
              />

              {!annotatedPhotoUrl &&
                !isAnalyzingAi &&
                (aiResult?.detections || [])
                  .filter(d => d.bbox && (d.category === 'Cleanliness' || d.category === 'Damage'))
                  .map((det, idx) => {
                    const b = det.bbox!;
                    const leftPct = Math.min(82, Math.max(4, (b.x / 320) * 100));
                    const topPct = Math.min(75, Math.max(8, (b.y / 320) * 100));
                    const widthPct = Math.min(60, Math.max(18, (b.width / 320) * 100));
                    const heightPct = Math.min(55, Math.max(18, (b.height / 320) * 100));
                    const isUrine = det.class_name.toLowerCase().includes('urin');
                    const boxColor = isUrine ? '#D97706' : '#EF4444';
                    return (
                      <View
                        key={`thumb-box-${idx}`}
                        pointerEvents="none"
                        style={{
                          position: 'absolute',
                          left: `${leftPct}%`,
                          top: `${topPct}%`,
                          width: `${widthPct}%`,
                          height: `${heightPct}%`,
                          borderWidth: 2,
                          borderColor: boxColor,
                          backgroundColor: 'rgba(239, 68, 68, 0.10)',
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
                          <Text
                            style={{ color: '#FFFFFF', fontSize: 9.5, fontWeight: '700' }}
                            numberOfLines={1}
                          >
                            {det.class_name}
                          </Text>
                        </View>
                      </View>
                    );
                  })}

              {!isAnalyzingAi && (
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    bottom: 8,
                    right: 8,
                    backgroundColor: 'rgba(255, 255, 255, 0.92)',
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                  }}
                >
                  <Text style={{ color: '#111827', fontSize: 10.5, fontWeight: '600' }}>
                    Ketuk untuk lihat foto penuh
                  </Text>
                </View>
              )}

              {isAnalyzingAi && (
                <View style={st.aiLoadingOverlay}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={st.aiLoadingText}>Memeriksa foto...</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Kartu Ringkasan Kondisi Foto */}
            <View style={st.aiResultCard}>
              <View style={st.aiResultHeader}>
                <Text style={st.aiResultTitle}>Hasil Pemeriksaan Foto</Text>
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
                    {damageState === 'damage' ? 'Perlu Dibersihkan' : 'Bersih & Baik'}
                  </Text>
                </View>
              </View>

              <View style={st.aiMetricsGrid}>
                <View style={st.aiMetricBox}>
                  <Text style={st.aiMetricValue}>
                    {aiResult?.cleanliness_percentage ?? (damageState === 'damage' ? 65 : 98)}%
                  </Text>
                  <Text style={st.aiMetricLabel}>Kebersihan</Text>
                </View>
                <View style={st.aiMetricBox}>
                  <Text
                    style={[
                      st.aiMetricValue,
                      { color: damageState === 'damage' ? '#DC2626' : '#16A34A' },
                    ]}
                  >
                    {aiResult?.dirtiness_percentage ?? (damageState === 'damage' ? 35 : 2)}%
                  </Text>
                  <Text style={st.aiMetricLabel}>Kekotoran</Text>
                </View>
                <View style={st.aiMetricBox}>
                  <Text style={st.aiMetricValue}>
                    {aiResult?.physical_condition_percentage ?? 100}%
                  </Text>
                  <Text style={st.aiMetricLabel}>Kondisi Fisik</Text>
                </View>
              </View>

              <View style={st.aiSummaryRow}>
                <Text style={st.aiSummaryText}>
                  Temuan: <Text style={{ fontWeight: '700' }}>{stainTotal} noda</Text>,{' '}
                  <Text style={{ fontWeight: '700' }}>{trashTotal} sampah</Text>,{' '}
                  <Text style={{ fontWeight: '700' }}>{defectTotal} kerusakan</Text>.
                  {stainLabels.length > 0
                    ? `\nBagian kotor: ${stainLabels.join(', ')}`
                    : '\nTidak ada noda atau kerusakan yang ditemukan.'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={st.btnChangePhoto}
              onPress={onOpenLiveCamera}
              activeOpacity={0.8}
            >
              <Text style={st.btnChangePhotoText}>Ambil Ulang Foto</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={st.addPhotoBtn}
            onPress={onOpenLiveCamera}
            activeOpacity={0.8}
          >
            <Text style={st.addPhotoPlus}>+</Text>
            <Text style={st.addPhotoText}>Tambah Foto</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Section 4: Kerusakan Fasilitas */}
      <View style={st.sectionBlock}>
        <Text style={st.sectionTitle}>Kerusakan Fasilitas</Text>
        <Text style={st.sectionSubtitle}>Pilih jika ada indikasi kerusakan fasilitas</Text>

        <View style={st.damageButtonsRow}>
          <TouchableOpacity
            style={[
              st.damageOptionBtn,
              damageState === 'none' ? st.damageBtnNoneActive : st.damageBtnNoneInactive,
            ]}
            onPress={() => onChangeDamageState('none')}
            activeOpacity={0.85}
          >
            <Text
              style={[
                st.damageOptionText,
                damageState === 'none'
                  ? st.damageOptionTextActive
                  : st.damageBtnNoneTextInactive,
              ]}
            >
              Tidak Ada Kerusakan
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              st.damageOptionBtn,
              damageState === 'damage' ? st.damageBtnDamageActive : st.damageBtnDamageInactive,
            ]}
            onPress={() => onChangeDamageState('damage')}
            activeOpacity={0.85}
          >
            <Text
              style={[
                st.damageOptionText,
                damageState === 'damage'
                  ? st.damageBtnDamageTextActive
                  : st.damageBtnDamageTextInactive,
              ]}
            >
              Ada Indikasi Kerusakan
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Section 5: Catatan Petugas */}
      <View style={st.sectionBlock}>
        <Text style={st.sectionTitle}>Catatan Petugas</Text>
        {showCatatanInput || catatan ? (
          <TextInput
            style={st.catatanTextInput}
            placeholder="Tuliskan catatan kondisi fasilitas..."
            placeholderTextColor="#9CA3AF"
            value={catatan}
            onChangeText={onChangeCatatan}
            multiline
          />
        ) : (
          <TouchableOpacity
            style={st.addCatatanBtn}
            onPress={onShowCatatanInput}
            activeOpacity={0.8}
          >
            <Text style={st.addCatatanBtnText}>Tambah Catatan</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Bottom Action Button: Selesai */}
      <TouchableOpacity
        style={st.btnSelesai}
        onPress={onCompleteTask}
        activeOpacity={0.85}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={st.btnSelesaiText}>Selesai</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};
