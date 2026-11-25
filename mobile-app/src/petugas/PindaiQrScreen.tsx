import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { CameraType } from 'expo-camera';
import { Task } from '../types';
import {
  ChecklistItem,
  TaskFacilityIcon,
  getFacilityMetadata,
  getChecklistForTask,
  INITIAL_PETUGAS_TASKS,
} from './PetugasIcons';
import { UniversalQrCamera } from './UniversalQrCamera';
import { st } from './petugasStyles';

interface PindaiQrScreenProps {
  qrScanStep: 'camera' | 'scanned';
  onSetQrScanStep: (step: 'camera' | 'scanned') => void;
  onBackToTugas: () => void;
  cameraFacing: CameraType;
  onToggleCameraFacing: () => void;
  isScanningQr: boolean;
  qrScanned: boolean;
  onResetQrScanned: () => void;
  onTriggerQrScan: (code: string) => void;
  onOpenHardwareFallback: () => void;
  scannedTask: Task | null;
  tasks: Task[];
  qrTargetCode: string;
  lastScannedCode: string;
  showAllAdminTasksInQr: boolean;
  onToggleShowAllAdminTasks: () => void;
  onSelectScannedTask: (task: Task, newChecklist: ChecklistItem[]) => void;
  checklist: ChecklistItem[];
  onToggleChecklist: (id: string) => void;
  onOpenTaskDetail: (task: Task, preserveChecklist: boolean) => void;
}

export const PindaiQrScreen: React.FC<PindaiQrScreenProps> = ({
  qrScanStep,
  onSetQrScanStep,
  onBackToTugas,
  cameraFacing,
  onToggleCameraFacing,
  isScanningQr,
  qrScanned,
  onResetQrScanned,
  onTriggerQrScan,
  onOpenHardwareFallback,
  scannedTask,
  tasks,
  qrTargetCode,
  lastScannedCode,
  showAllAdminTasksInQr,
  onToggleShowAllAdminTasks,
  onSelectScannedTask,
  checklist,
  onToggleChecklist,
  onOpenTaskDetail,
}) => {
  const activeQrTask = scannedTask || tasks[0] || INITIAL_PETUGAS_TASKS[0];
  const qrMeta = getFacilityMetadata(activeQrTask);
  const shortFacilityTitle = activeQrTask.judul;

  const cleanTarget = qrTargetCode.trim().toUpperCase();
  const matchedAdminTasks = tasks.filter(t => {
    const tAsset = (t.assetCode || '').toUpperCase();
    const tId = t.id.toUpperCase();
    const tJudul = t.judul.toLowerCase();
    const activeJudul = activeQrTask.judul.toLowerCase();
    if (
      t.id === activeQrTask.id ||
      (tAsset && tAsset === cleanTarget) ||
      tId === cleanTarget ||
      tJudul === activeJudul ||
      (activeJudul.length > 3 && tJudul.includes(activeJudul))
    ) {
      return true;
    }
    return false;
  });
  const displayedAdminTasks =
    showAllAdminTasksInQr || matchedAdminTasks.length === 0 ? tasks : matchedAdminTasks;

  if (qrScanStep === 'camera') {
    return (
      <View style={[st.pindaiQrScreen, { backgroundColor: '#CECFD2' }]}>
        <View style={[st.pindaiQrTopGreyArea, { flex: 1, paddingBottom: 0 }]}>
          <View style={st.pindaiQrHeaderRow}>
            <TouchableOpacity
              style={st.pindaiQrBackCircle}
              onPress={onBackToTugas}
              activeOpacity={0.75}
            >
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M19 12H5M5 12L11 18M5 12L11 6"
                  stroke="#1F2937"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </TouchableOpacity>

            <Text style={st.pindaiQrHeaderTitle}>Pindai QR</Text>

            <TouchableOpacity
              style={st.pindaiQrHelpBtn}
              onPress={onToggleCameraFacing}
              activeOpacity={0.75}
            >
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Circle cx="12" cy="12" r="9.5" stroke="#1F2937" strokeWidth="1.8" />
                <Path
                  d="M9.75 9.5C9.75 8.25736 10.7574 7.25 12 7.25C13.2426 7.25 14.25 8.25736 14.25 9.5C14.25 10.52 13.57 11.38 12.63 11.66C12.26 11.77 12 12.11 12 12.5V13.25"
                  stroke="#1F2937"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <Circle cx="12" cy="16.25" r="1" fill="#1F2937" />
              </Svg>
            </TouchableOpacity>
          </View>

          <Text style={st.pindaiQrInstructionBold}>Arahkan kamera ke kode QR</Text>
          <Text style={st.pindaiQrInstructionSub}>
            Posisikan kode di dalam bingkai untuk memindai secara otomatis.
          </Text>

          <View style={st.pindaiQrFullCameraCard}>
            <UniversalQrCamera
              facing={cameraFacing}
              disabled={isScanningQr || qrScanned}
              onQrScanned={onTriggerQrScan}
              onOpenHardwareFallback={onOpenHardwareFallback}
            />

            <View style={[st.pindaiQrFullReticleBox, { marginBottom: 0 }]} pointerEvents="none">
              <View style={st.pindaiQrGuideLineLeft} />
              <View style={st.pindaiQrGuideLineRight} />
              <View style={st.pindaiQrCornerTL} />
              <View style={st.pindaiQrCornerTR} />
              <View style={st.pindaiQrHorizontalLine} />
              <View style={st.pindaiQrFullCornerBL} />
              <View style={st.pindaiQrFullCornerBR} />
            </View>
          </View>

          {/* Baris Tombol Pintas Simulasi Scan QR per Ruangan */}
          <View style={{ paddingVertical: 12 }}>
            <Text
              style={{
                fontSize: 11.5,
                fontWeight: '700',
                color: '#374151',
                marginBottom: 8,
                textAlign: 'center',
              }}
            >
              Atau pilih kode QR fasilitas di bawah untuk langsung buka tugas:
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}
            >
              {tasks.map(t => {
                const code = t.assetCode || t.id;
                return (
                  <TouchableOpacity
                    key={`quick-qr-${t.id}`}
                    style={{
                      backgroundColor: '#FFFFFF',
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: '#D1D5DB',
                    }}
                    onPress={() => onTriggerQrScan(code)}
                    activeOpacity={0.8}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#1D4ED8' }}>
                      {code}
                    </Text>
                    <Text
                      style={{ fontSize: 11, fontWeight: '600', color: '#111827', maxWidth: 130 }}
                      numberOfLines={1}
                    >
                      {t.judul}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={st.pindaiQrScreen}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={st.pindaiQrTopGreyArea}>
          <View style={st.pindaiQrHeaderRow}>
            <TouchableOpacity
              style={st.pindaiQrBackCircle}
              onPress={() => onSetQrScanStep('camera')}
              activeOpacity={0.75}
            >
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M19 12H5M5 12L11 18M5 12L11 6"
                  stroke="#1F2937"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </TouchableOpacity>

            <Text style={st.pindaiQrHeaderTitle}>Pindai QR</Text>

            <TouchableOpacity
              style={st.pindaiQrHelpBtn}
              onPress={() => onSetQrScanStep('camera')}
              activeOpacity={0.75}
            >
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Circle cx="12" cy="12" r="9.5" stroke="#1F2937" strokeWidth="1.8" />
                <Path
                  d="M9.75 9.5C9.75 8.25736 10.7574 7.25 12 7.25C13.2426 7.25 14.25 8.25736 14.25 9.5C14.25 10.52 13.57 11.38 12.63 11.66C12.26 11.77 12 12.11 12 12.5V13.25"
                  stroke="#1F2937"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <Circle cx="12" cy="16.25" r="1" fill="#1F2937" />
              </Svg>
            </TouchableOpacity>
          </View>

          <Text style={st.pindaiQrInstructionBold}>Arahkan kamera ke kode QR</Text>
          <Text style={st.pindaiQrInstructionSub}>
            Posisikan kode di dalam bingkai untuk memindai secara otomatis.
          </Text>

          <TouchableOpacity
            style={st.pindaiQrViewfinderCard}
            activeOpacity={0.9}
            onPress={() => {
              onResetQrScanned();
              onSetQrScanStep('camera');
            }}
          >
            <UniversalQrCamera
              facing={cameraFacing}
              disabled={qrScanned}
              onQrScanned={onTriggerQrScan}
              onOpenHardwareFallback={onOpenHardwareFallback}
            />

            <View style={st.pindaiQrReticleFrame} pointerEvents="none">
              <View style={st.pindaiQrGuideLineLeft} />
              <View style={st.pindaiQrGuideLineRight} />
              <View style={st.pindaiQrCornerTL} />
              <View style={st.pindaiQrCornerTR} />
              <View style={st.pindaiQrHorizontalLine} />
              <View style={st.pindaiQrCornerBL} />
              <View style={st.pindaiQrCornerBR} />
            </View>

            <View style={st.pindaiQrRescanFloatingBadge}>
              <Text style={st.pindaiQrRescanFloatingText}>
                ✓ {lastScannedCode || qrMeta.qrCode} • Tap Kamera untuk Scan Ulang
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={st.pindaiQrWhiteSheet}>
          <View style={st.pindaiQrAdminTasksBox}>
            <View style={st.pindaiQrAdminTasksHeader}>
              <Text style={st.pindaiQrAdminTasksTitle}>
                Tugas dari Admin ({lastScannedCode || qrMeta.qrCode})
              </Text>
              <TouchableOpacity onPress={onToggleShowAllAdminTasks} activeOpacity={0.75}>
                <Text style={st.pindaiQrAdminTasksToggle}>
                  {showAllAdminTasksInQr
                    ? 'Filter Sesuai QR'
                    : `Lihat Semua Tugas (${tasks.length})`}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
            >
              {displayedAdminTasks.map(t => {
                const isChosen = activeQrTask.id === t.id;
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[
                      st.pindaiQrTaskChoiceChip,
                      isChosen && st.pindaiQrTaskChoiceChipActive,
                    ]}
                    onPress={() => onSelectScannedTask(t, getChecklistForTask(t))}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        st.pindaiQrTaskChoiceId,
                        isChosen && { color: '#FFFFFF' },
                      ]}
                    >
                      {t.id} • {t.prioritas}
                    </Text>
                    <Text
                      style={[
                        st.pindaiQrTaskChoiceTitle,
                        isChosen && { color: '#FFFFFF' },
                      ]}
                      numberOfLines={1}
                    >
                      {t.judul}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View style={st.pindaiQrFacilityRow}>
            <View style={st.pindaiQrFacilityIconBox}>
              <TaskFacilityIcon judul={activeQrTask.judul} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.pindaiQrFacilityTitle}>{shortFacilityTitle}</Text>
              <Text style={st.pindaiQrFacilitySub}>{qrMeta.shortSubtitle}</Text>
              <Text style={st.pindaiQrFacilitySchedule}>{qrMeta.jadwal}</Text>
            </View>
          </View>

          <Text style={st.pindaiQrChecklistHeading}>Checklist</Text>
          <View style={st.pindaiQrChecklistList}>
            {checklist.map(item => (
              <TouchableOpacity
                key={item.id}
                style={st.pindaiQrChecklistRow}
                onPress={() => onToggleChecklist(item.id)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    st.pindaiQrCheckbox,
                    item.checked && st.pindaiQrCheckboxChecked,
                  ]}
                >
                  {item.checked && (
                    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
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
                <Text style={st.pindaiQrChecklistLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={st.pindaiQrThinDivider} />

          <TouchableOpacity
            onPress={() => onOpenTaskDetail(activeQrTask, true)}
            activeOpacity={0.7}
            style={{ paddingVertical: 4, alignSelf: 'flex-start' }}
          >
            <Text style={st.pindaiQrDetailLink}>Lihat detail fasilitas</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={st.pindaiQrBottomBar}>
        <TouchableOpacity
          style={st.pindaiQrBtnSelanjutnya}
          onPress={() => onOpenTaskDetail(activeQrTask, true)}
          activeOpacity={0.85}
        >
          <Text style={st.pindaiQrBtnSelanjutnyaText}>Selanjutnya</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
