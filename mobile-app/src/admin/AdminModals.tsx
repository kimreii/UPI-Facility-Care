import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Image,
} from 'react-native';
import { Task, TaskPriority, Asset } from '../types';
import { OfficerDto } from '../api';
import { FacilityRepairStat } from './facilityRepairStats';
import {
  LOKASI_OPTIONS,
  PETUGAS_OPTIONS,
  PRIORITAS_OPTIONS,
  MONTHS_LIST,
  YEARS_LIST,
} from './AdminIcons';
import { ui } from './adminStyles';
import { DraggableSheet } from '../DraggableSheet';

interface AdminModalsProps {
  selectedTaskDetail: Task | null;
  onCloseTaskDetail: () => void;
  showLokasi: boolean;
  onCloseLokasi: () => void;
  onSelectLokasi: (val: string) => void;
  showPetugas: boolean;
  onClosePetugas: () => void;
  onSelectPetugas: (val: string) => void;
  officers?: OfficerDto[];
  showPrioritas: boolean;
  onClosePrioritas: () => void;
  onSelectPrioritas: (val: TaskPriority) => void;
  showAssetPicker: boolean;
  onCloseAssetPicker: () => void;
  onOpenAddAssetFromPicker?: () => void;
  assets: Asset[];
  onSelectAssetForForm: (code: string, location: string) => void;
  showMonthDropdown: boolean;
  onCloseMonthDropdown: () => void;
  selectedCalendarMonth: string;
  onSelectCalendarMonth: (m: string) => void;
  showYearDropdown: boolean;
  onCloseYearDropdown: () => void;
  selectedCalendarYear: number;
  onSelectCalendarYear: (y: number) => void;
  showCategoryDropdown: boolean;
  onCloseCategoryDropdown: () => void;
  assetCategoryFilter: string;
  onSelectCategoryFilter: (cat: string) => void;
  selectedAssetMenu: Asset | null;
  repairStatsByAsset?: Record<string, FacilityRepairStat>;
  onCloseAssetMenu: () => void;
  onToggleAssetStatus: (asset: Asset) => void;
  onCreateTaskForAsset: (asset: Asset) => void;
  showAddAssetModal: boolean;
  onCloseAddAssetModal: () => void;
  newAssetCode: string;
  onChangeNewAssetCode: (val: string) => void;
  newAssetName: string;
  onChangeNewAssetName: (val: string) => void;
  newAssetBuilding: string;
  onChangeNewAssetBuilding: (val: string) => void;
  newAssetFloor: string;
  onChangeNewAssetFloor: (val: string) => void;
  newAssetCategory: string;
  onChangeNewAssetCategory: (val: string) => void;
  newAssetStatus: string;
  onChangeNewAssetStatus: (val: string) => void;
  submittingAsset: boolean;
  onCreateAsset: () => void;
}

export const AdminModals: React.FC<AdminModalsProps> = ({
  selectedTaskDetail,
  onCloseTaskDetail,
  showLokasi,
  onCloseLokasi,
  onSelectLokasi,
  showPetugas,
  onClosePetugas,
  onSelectPetugas,
  officers = [],
  showPrioritas,
  onClosePrioritas,
  onSelectPrioritas,
  showAssetPicker,
  onCloseAssetPicker,
  onOpenAddAssetFromPicker,
  assets,
  onSelectAssetForForm,
  showMonthDropdown,
  onCloseMonthDropdown,
  selectedCalendarMonth,
  onSelectCalendarMonth,
  showYearDropdown,
  onCloseYearDropdown,
  selectedCalendarYear,
  onSelectCalendarYear,
  showCategoryDropdown,
  onCloseCategoryDropdown,
  assetCategoryFilter,
  onSelectCategoryFilter,
  selectedAssetMenu,
  repairStatsByAsset = {},
  onCloseAssetMenu,
  onToggleAssetStatus,
  onCreateTaskForAsset,
  showAddAssetModal,
  onCloseAddAssetModal,
  newAssetCode,
  onChangeNewAssetCode,
  newAssetName,
  onChangeNewAssetName,
  newAssetBuilding,
  onChangeNewAssetBuilding,
  newAssetFloor,
  onChangeNewAssetFloor,
  newAssetCategory,
  onChangeNewAssetCategory,
  newAssetStatus,
  onChangeNewAssetStatus,
  submittingAsset,
  onCreateAsset,
}) => {
  const [qrAssetModal, setQrAssetModal] = React.useState<Asset | null>(null);

  return (
    <>
      {/* Modal Detail Tugas saat klik 'Cek Detail' */}
      <Modal
        visible={!!selectedTaskDetail}
        transparent
        animationType="slide"
        onRequestClose={onCloseTaskDetail}
      >
        <View style={ui.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onCloseTaskDetail} />
          <DraggableSheet style={ui.modalSheet} onClose={onCloseTaskDetail}>
            {selectedTaskDetail && (
              <View style={{ flexShrink: 1 }}>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ gap: 10, paddingBottom: 10 }}
                >
                  <View style={ui.modalTitleRow}>
                    <Text style={ui.modalWoId}>{selectedTaskDetail.id}</Text>
                    <View style={ui.priorityPill}>
                      <View style={ui.priorityGreenDot} />
                      <Text style={ui.priorityPillText}>{selectedTaskDetail.prioritas}</Text>
                    </View>
                  </View>

                  <Text style={ui.modalTaskTitle}>{selectedTaskDetail.judul}</Text>
                  <Text style={ui.modalTaskLoc}>Lokasi: {selectedTaskDetail.lokasi}</Text>
                  <Text style={ui.modalTaskPetugas}>
                    Ditugaskan kepada: {selectedTaskDetail.petugas}
                  </Text>

                  <View style={ui.statusRowModal}>
                    <Text style={ui.statusLabelModal}>Status Pekerjaan:</Text>
                    <Text style={ui.statusValModal}>{selectedTaskDetail.status}</Text>
                  </View>

                  {Boolean(selectedTaskDetail.deskripsi && selectedTaskDetail.deskripsi.trim()) && (
                    <View
                      style={{
                        backgroundColor: '#F8FAFC',
                        borderWidth: 1,
                        borderColor: '#E2E8F0',
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11.5,
                          fontWeight: '700',
                          color: '#475569',
                          marginBottom: 4,
                        }}
                      >
                        Instruksi Tambahan
                      </Text>
                      <Text style={{ fontSize: 12.5, color: '#1F2937', lineHeight: 18 }}>
                        {selectedTaskDetail.deskripsi.trim()}
                      </Text>
                    </View>
                  )}

                  {typeof selectedTaskDetail.cleanlinessPercentage === 'number' && (
                    <View style={ui.aiVerifiedCard}>
                      <Text style={ui.aiVerifiedTitle}>Verifikasi AI Computer Vision</Text>
                      <Text style={ui.aiVerifiedScore}>
                        Skor Kebersihan: {selectedTaskDetail.cleanlinessPercentage}%
                      </Text>
                    </View>
                  )}

                  {Boolean(selectedTaskDetail.foto) && (
                    <View style={{ marginTop: 4 }}>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '700',
                          color: '#111827',
                          marginBottom: 6,
                        }}
                      >
                        Foto Bukti Petugas:
                      </Text>
                      <Image
                        source={{ uri: selectedTaskDetail.foto }}
                        style={{
                          width: '100%',
                          height: 190,
                          borderRadius: 10,
                          backgroundColor: '#F3F4F6',
                        }}
                        resizeMode="contain"
                      />
                    </View>
                  )}
                </ScrollView>

                <TouchableOpacity style={ui.btnCloseModal} onPress={onCloseTaskDetail}>
                  <Text style={ui.btnCloseModalText}>Tutup</Text>
                </TouchableOpacity>
              </View>
            )}
          </DraggableSheet>
        </View>
      </Modal>

      {/* Picker Modals */}
      {[
        {
          visible: showLokasi,
          close: onCloseLokasi,
          options: LOKASI_OPTIONS,
          onSelect: onSelectLokasi,
          title: 'Pilih Lokasi Fasilitas',
        },
        {
          visible: showPetugas,
          close: onClosePetugas,
          options: officers.map(o => `${o.name} (${o.id})`),
          onSelect: onSelectPetugas,
          title: 'Pilih Petugas Lapangan',
        },
        {
          visible: showPrioritas,
          close: onClosePrioritas,
          options: PRIORITAS_OPTIONS,
          onSelect: (v: string) => onSelectPrioritas(v as TaskPriority),
          title: 'Pilih Prioritas Pekerjaan',
        },
      ].map(({ visible, close, options, onSelect, title }) => (
        <Modal
          key={title}
          visible={visible}
          transparent
          animationType="slide"
          onRequestClose={close}
        >
          <View style={ui.modalOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={close} />
            <DraggableSheet style={ui.modalSheet} onClose={close}>
              <Text style={ui.sheetTitle}>{title}</Text>
              <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                {options.length === 0 ? (
                  <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                    <Text style={{ fontSize: 12.5, color: '#9CA3AF', fontWeight: '600' }}>
                      Belum ada data terdaftar.
                    </Text>
                  </View>
                ) : (
                  options.map(opt => (
                    <TouchableOpacity
                      key={opt}
                      style={ui.sheetOption}
                      onPress={() => {
                        onSelect(opt);
                        close();
                      }}
                    >
                      <Text style={ui.sheetOptionText}>{opt}</Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </DraggableSheet>
          </View>
        </Modal>
      ))}

      {/* Asset Picker Modal */}
      <Modal
        visible={showAssetPicker}
        transparent
        animationType="slide"
        onRequestClose={onCloseAssetPicker}
      >
        <View style={ui.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onCloseAssetPicker} />
          <DraggableSheet style={ui.modalSheet} onClose={onCloseAssetPicker}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <Text style={[ui.sheetTitle, { marginBottom: 0 }]}>Pilih Fasilitas / Aset</Text>
              {onOpenAddAssetFromPicker && (
                <TouchableOpacity
                  onPress={() => {
                    onCloseAssetPicker();
                    onOpenAddAssetFromPicker();
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: '#1D4ED8' }}>
                    + Tambah Tempat
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
              {assets.map(a => (
                <TouchableOpacity
                  key={a.code}
                  style={ui.sheetOption}
                  onPress={() => {
                    onSelectAssetForForm(a.code, a.location);
                    onCloseAssetPicker();
                  }}
                >
                  <Text style={ui.sheetOptionText}>
                    [{a.code}] {a.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </DraggableSheet>
        </View>
      </Modal>

      {/* Modal Dropdown Bulan Kalender */}
      <Modal
        visible={showMonthDropdown}
        transparent
        animationType="fade"
        onRequestClose={onCloseMonthDropdown}
      >
        <TouchableOpacity
          style={ui.modalOverlay}
          onPress={onCloseMonthDropdown}
          activeOpacity={1}
        >
          <View style={ui.dropdownModalSheet}>
            <Text style={ui.dropdownModalTitle}>Pilih Bulan</Text>
            {MONTHS_LIST.map(m => (
              <TouchableOpacity
                key={m}
                style={[
                  ui.dropdownOptionItem,
                  selectedCalendarMonth === m && ui.dropdownOptionItemActive,
                ]}
                onPress={() => {
                  onSelectCalendarMonth(m);
                  onCloseMonthDropdown();
                }}
              >
                <Text
                  style={[
                    ui.dropdownOptionText,
                    selectedCalendarMonth === m && ui.dropdownOptionTextActive,
                  ]}
                >
                  {m}
                </Text>
                {selectedCalendarMonth === m && <Text style={ui.dropdownCheckmark}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal Dropdown Tahun Kalender */}
      <Modal
        visible={showYearDropdown}
        transparent
        animationType="fade"
        onRequestClose={onCloseYearDropdown}
      >
        <TouchableOpacity
          style={ui.modalOverlay}
          onPress={onCloseYearDropdown}
          activeOpacity={1}
        >
          <View style={ui.dropdownModalSheet}>
            <Text style={ui.dropdownModalTitle}>Pilih Tahun</Text>
            {YEARS_LIST.map(y => (
              <TouchableOpacity
                key={y}
                style={[
                  ui.dropdownOptionItem,
                  selectedCalendarYear === y && ui.dropdownOptionItemActive,
                ]}
                onPress={() => {
                  onSelectCalendarYear(y);
                  onCloseYearDropdown();
                }}
              >
                <Text
                  style={[
                    ui.dropdownOptionText,
                    selectedCalendarYear === y && ui.dropdownOptionTextActive,
                  ]}
                >
                  {y}
                </Text>
                {selectedCalendarYear === y && <Text style={ui.dropdownCheckmark}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal Filter Kategori Fasilitas */}
      <Modal
        visible={showCategoryDropdown}
        transparent
        animationType="fade"
        onRequestClose={onCloseCategoryDropdown}
      >
        <TouchableOpacity
          style={ui.modalOverlay}
          onPress={onCloseCategoryDropdown}
          activeOpacity={1}
        >
          <View style={ui.dropdownModalSheet}>
            <Text style={ui.dropdownModalTitle}>Pilih Jenis Fasilitas</Text>
            {[
              'Semua Jenis',
              'Toilet',
              'Ballroom',
              'Koridor',
              'Perpustakaan',
              'Laboratorium',
              'Classroom',
            ].map(cat => (
              <TouchableOpacity
                key={cat}
                style={[
                  ui.dropdownOptionItem,
                  assetCategoryFilter === cat && ui.dropdownOptionItemActive,
                ]}
                onPress={() => {
                  onSelectCategoryFilter(cat);
                  onCloseCategoryDropdown();
                }}
              >
                <Text
                  style={[
                    ui.dropdownOptionText,
                    assetCategoryFilter === cat && ui.dropdownOptionTextActive,
                  ]}
                >
                  {cat}
                </Text>
                {assetCategoryFilter === cat && <Text style={ui.dropdownCheckmark}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal Menu Aksi Aset (Three dots ⋮) */}
      <Modal
        visible={!!selectedAssetMenu}
        transparent
        animationType="slide"
        onRequestClose={onCloseAssetMenu}
      >
        <View style={ui.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onCloseAssetMenu} />
          <DraggableSheet style={ui.modalSheet} onClose={onCloseAssetMenu}>
            {selectedAssetMenu && (
              <View>
                {/* Header Fasilitas */}
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingBottom: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: '#F3F4F6',
                  }}
                >
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={ui.modalSheetTitle}>{selectedAssetMenu.name}</Text>
                    <Text style={[ui.modalSheetSub, { marginBottom: 0, marginTop: 2 }]}>
                      {selectedAssetMenu.code} · {selectedAssetMenu.location}
                    </Text>
                  </View>
                  <View
                    style={[
                      ui.assetStatusPill,
                      selectedAssetMenu.status !== 'Tutup'
                        ? ui.assetStatusPillAktif
                        : ui.assetStatusPillTutup,
                    ]}
                  >
                    <Text
                      style={[
                        ui.assetStatusPillText,
                        selectedAssetMenu.status !== 'Tutup'
                          ? ui.assetStatusPillTextAktif
                          : ui.assetStatusPillTextTutup,
                      ]}
                    >
                      {selectedAssetMenu.status !== 'Tutup' ? 'Aktif' : 'Tutup'}
                    </Text>
                  </View>
                </View>

                {/* Ringkasan Riwayat Perbaikan & Penggantian Fasilitas */}
                {(() => {
                  const stat = repairStatsByAsset[selectedAssetMenu.code];
                  const replaced = stat?.replacedCount ?? 0;
                  const activeDmg = stat?.activeDamageCount ?? 0;
                  const maintDone = stat?.totalMaintenanceDone ?? 0;
                  const hist = stat?.history ?? [];
                  return (
                    <View
                      style={{
                        backgroundColor: '#F8FAFC',
                        borderRadius: 12,
                        padding: 12,
                        marginTop: 12,
                        marginBottom: 8,
                        borderWidth: 1,
                        borderColor: '#E5E7EB',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '800',
                          color: '#1E293B',
                          marginBottom: 8,
                        }}
                      >
                        Riwayat Perbaikan & Penggantian
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <View
                          style={{
                            flex: 1,
                            backgroundColor: '#EEF2FF',
                            borderRadius: 10,
                            paddingVertical: 8,
                            paddingHorizontal: 8,
                            alignItems: 'center',
                          }}
                        >
                          <Text style={{ fontSize: 16, fontWeight: '800', color: '#3730A3' }}>
                            {replaced}x
                          </Text>
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: '700',
                              color: '#4338CA',
                              textAlign: 'center',
                            }}
                          >
                            Diganti / Diperbaiki
                          </Text>
                        </View>
                        <View
                          style={{
                            flex: 1,
                            backgroundColor: activeDmg > 0 ? '#FEF2F2' : '#ECFDF5',
                            borderRadius: 10,
                            paddingVertical: 8,
                            paddingHorizontal: 8,
                            alignItems: 'center',
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 16,
                              fontWeight: '800',
                              color: activeDmg > 0 ? '#DC2626' : '#059669',
                            }}
                          >
                            {activeDmg}
                          </Text>
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: '700',
                              color: activeDmg > 0 ? '#B91C1C' : '#047857',
                              textAlign: 'center',
                            }}
                          >
                            Kerusakan Aktif
                          </Text>
                        </View>
                        <View
                          style={{
                            flex: 1,
                            backgroundColor: '#FFFFFF',
                            borderRadius: 10,
                            paddingVertical: 8,
                            paddingHorizontal: 8,
                            alignItems: 'center',
                            borderWidth: 1,
                            borderColor: '#E5E7EB',
                          }}
                        >
                          <Text style={{ fontSize: 16, fontWeight: '800', color: '#111827' }}>
                            {maintDone}x
                          </Text>
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: '700',
                              color: '#6B7280',
                              textAlign: 'center',
                            }}
                          >
                            WO Selesai
                          </Text>
                        </View>
                      </View>
                      {hist.length > 0 && (
                        <View style={{ marginTop: 8, gap: 4 }}>
                          {hist.slice(0, 3).map(h => (
                            <View
                              key={`${h.source}-${h.id}`}
                              style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                paddingTop: 4,
                                borderTopWidth: 1,
                                borderTopColor: '#E5E7EB',
                              }}
                            >
                              <Text
                                style={{ fontSize: 11.5, color: '#374151', flex: 1, paddingRight: 8 }}
                                numberOfLines={1}
                              >
                                {h.title}
                              </Text>
                              <Text style={{ fontSize: 10.5, color: '#6B7280', fontWeight: '600' }}>
                                {h.date}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })()}

                {/* Daftar Aksi Bersih (Human Action Sheet tanpa emoticon) */}
                <View style={{ marginTop: 4, marginBottom: 14 }}>
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingVertical: 14,
                      borderBottomWidth: 1,
                      borderBottomColor: '#F3F4F6',
                    }}
                    onPress={() => {
                      const asset = selectedAssetMenu;
                      onCloseAssetMenu();
                      onCreateTaskForAsset(asset);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>
                      Terbitkan Work Order
                    </Text>
                    <Text style={{ fontSize: 16, color: '#9CA3AF', fontWeight: '600' }}>›</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingVertical: 14,
                      borderBottomWidth: 1,
                      borderBottomColor: '#F3F4F6',
                    }}
                    onPress={() => {
                      const asset = selectedAssetMenu;
                      onCloseAssetMenu();
                      setQrAssetModal(asset);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>
                      Lihat QR Code Fasilitas
                    </Text>
                    <Text style={{ fontSize: 16, color: '#9CA3AF', fontWeight: '600' }}>›</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingVertical: 14,
                    }}
                    onPress={() => onToggleAssetStatus(selectedAssetMenu)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: selectedAssetMenu.status === 'Aktif' ? '#DC2626' : '#059669',
                      }}
                    >
                      {selectedAssetMenu.status === 'Aktif'
                        ? 'Tutup Sementara Fasilitas'
                        : 'Aktifkan Kembali Fasilitas'}
                    </Text>
                    <Text style={{ fontSize: 16, color: '#9CA3AF', fontWeight: '600' }}>›</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={ui.actionSheetBtnCancel}
                  onPress={onCloseAssetMenu}
                  activeOpacity={0.75}
                >
                  <Text style={ui.actionSheetBtnCancelText}>Batal</Text>
                </TouchableOpacity>
              </View>
            )}
          </DraggableSheet>
        </View>
      </Modal>

      {/* Modal Tambah Fasilitas / Aset Baru ke Microsoft SQL Server */}
      <Modal
        visible={showAddAssetModal}
        transparent
        animationType="slide"
        onRequestClose={onCloseAddAssetModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <View style={ui.modalOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={onCloseAddAssetModal} />
            <DraggableSheet style={ui.addAssetModalSheet} onClose={onCloseAddAssetModal}>
              <Text style={ui.addAssetModalTitle}>Tambah Fasilitas / Aset Baru</Text>
              <Text style={ui.addAssetModalSub}>
                Lengkapi informasi ruangan atau fasilitas kampus di bawah ini.
              </Text>

              <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                <View style={{ gap: 10, paddingVertical: 8 }}>
                  <View>
                    <Text style={ui.inputFieldLabel}>Kode Aset</Text>
                    <TextInput
                      style={ui.inputField}
                      placeholder="e.g. AST-007"
                      placeholderTextColor="#9CA3AF"
                      value={newAssetCode}
                      onChangeText={onChangeNewAssetCode}
                    />
                  </View>

                  <View>
                    <Text style={ui.inputFieldLabel}>Nama Fasilitas *</Text>
                    <TextInput
                      style={ui.inputField}
                      placeholder="e.g. Toilet Gedung B, Ballroom Lantai 3"
                      placeholderTextColor="#9CA3AF"
                      value={newAssetName}
                      onChangeText={onChangeNewAssetName}
                    />
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={ui.inputFieldLabel}>Gedung *</Text>
                      <TextInput
                        style={ui.inputField}
                        placeholder="e.g. Gedung A, Gedung B"
                        placeholderTextColor="#9CA3AF"
                        value={newAssetBuilding}
                        onChangeText={onChangeNewAssetBuilding}
                      />
                    </View>
                    <View style={{ width: 80 }}>
                      <Text style={ui.inputFieldLabel}>Lantai *</Text>
                      <TextInput
                        style={ui.inputField}
                        placeholder="1"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="numeric"
                        value={newAssetFloor}
                        onChangeText={onChangeNewAssetFloor}
                      />
                    </View>
                  </View>

                  <View>
                    <Text style={ui.inputFieldLabel}>Jenis / Kategori Fasilitas</Text>
                    <View style={ui.categoryPillsRow}>
                      {['Toilet', 'Ballroom', 'Koridor', 'Perpustakaan', 'Classroom', 'Lab'].map(
                        cat => (
                          <TouchableOpacity
                            key={cat}
                            style={[
                              ui.categoryPillChoice,
                              newAssetCategory === cat && ui.categoryPillChoiceActive,
                            ]}
                            onPress={() => onChangeNewAssetCategory(cat)}
                          >
                            <Text
                              style={[
                                ui.categoryPillChoiceText,
                                newAssetCategory === cat && ui.categoryPillChoiceTextActive,
                              ]}
                            >
                              {cat}
                            </Text>
                          </TouchableOpacity>
                        )
                      )}
                    </View>
                  </View>

                  <View>
                    <Text style={ui.inputFieldLabel}>Status Fasilitas</Text>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TouchableOpacity
                        style={[
                          ui.statusChoiceBtn,
                          newAssetStatus === 'Aktif' && ui.statusChoiceBtnAktif,
                        ]}
                        onPress={() => onChangeNewAssetStatus('Aktif')}
                      >
                        <Text
                          style={[
                            ui.statusChoiceBtnText,
                            newAssetStatus === 'Aktif' && ui.statusChoiceBtnTextAktif,
                          ]}
                        >
                          Aktif
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          ui.statusChoiceBtn,
                          newAssetStatus === 'Tutup' && ui.statusChoiceBtnTutup,
                        ]}
                        onPress={() => onChangeNewAssetStatus('Tutup')}
                      >
                        <Text
                          style={[
                            ui.statusChoiceBtnText,
                            newAssetStatus === 'Tutup' && ui.statusChoiceBtnTextTutup,
                          ]}
                        >
                          Tutup
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </ScrollView>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                <TouchableOpacity
                  style={ui.btnCancelAddAsset}
                  onPress={onCloseAddAssetModal}
                >
                  <Text style={ui.btnCancelAddAssetText}>Batal</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[ui.btnSaveAddAsset, submittingAsset && { opacity: 0.6 }]}
                  onPress={onCreateAsset}
                  disabled={submittingAsset}
                >
                  <Text style={ui.btnSaveAddAssetText}>
                    {submittingAsset ? 'Menyimpan...' : 'Simpan Fasilitas'}
                  </Text>
                </TouchableOpacity>
              </View>
            </DraggableSheet>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      {/* Modal QR Code Generator Otomatis untuk Setiap Aset */}
      <Modal
        visible={!!qrAssetModal}
        transparent
        animationType="slide"
        onRequestClose={() => setQrAssetModal(null)}
      >
        <View style={ui.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setQrAssetModal(null)} />
          <DraggableSheet style={ui.modalSheet} onClose={() => setQrAssetModal(null)}>
            {qrAssetModal && (
              <View style={{ flexShrink: 1, width: '100%' }}>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ alignItems: 'center', paddingBottom: 12 }}
                >
                  <Text
                    style={{
                      fontSize: 17,
                      fontWeight: '800',
                      color: '#111827',
                      marginBottom: 4,
                    }}
                  >
                    QR Code Fasilitas
                  </Text>
                  <Text
                    style={{
                      fontSize: 13.5,
                      fontWeight: '700',
                      color: '#1D4ED8',
                      marginBottom: 2,
                    }}
                  >
                    {qrAssetModal.name}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 16 }}>
                    Kode: {qrAssetModal.code} · {qrAssetModal.location}
                  </Text>

                  <View
                    style={{
                      padding: 16,
                      backgroundColor: '#FFFFFF',
                      borderRadius: 16,
                      borderWidth: 1.5,
                      borderColor: '#E5E7EB',
                      marginBottom: 14,
                      alignItems: 'center',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.05,
                      shadowRadius: 6,
                      elevation: 2,
                    }}
                  >
                    {(() => {
                      let origin = 'http://10.62.247.203:8081';
                      if (typeof window !== 'undefined' && window.location) {
                        const proto = window.location.protocol;
                        const host = window.location.hostname;
                        const port = window.location.port;
                        if (proto === 'https:') {
                          origin = window.location.origin;
                        } else if (host && host !== 'localhost' && host !== '127.0.0.1') {
                          origin = `${proto}//${host}${port ? `:${port}` : ''}`;
                        } else {
                          origin = `http://10.62.247.203:${port || '8081'}`;
                        }
                      }
                      const qrTargetUrl = `${origin}/petugas?qr=${encodeURIComponent(
                        qrAssetModal.code
                      )}&name=${encodeURIComponent(
                        qrAssetModal.name
                      )}&loc=${encodeURIComponent(qrAssetModal.location)}`;

                      return (
                        <>
                          <Image
                            source={{
                              uri: `https://quickchart.io/qr?size=220&margin=1&text=${encodeURIComponent(
                                qrTargetUrl
                              )}`,
                            }}
                            style={{ width: 185, height: 185, backgroundColor: '#F9FAFB' }}
                            resizeMode="contain"
                          />
                          <Text
                            style={{
                              marginTop: 10,
                              fontSize: 14,
                              fontWeight: '800',
                              color: '#111827',
                              letterSpacing: 1,
                            }}
                          >
                            {qrAssetModal.code}
                          </Text>
                        </>
                      );
                    })()}
                  </View>

                  <Text
                    style={{
                      fontSize: 12,
                      color: '#6B7280',
                      textAlign: 'center',
                      lineHeight: 17,
                      paddingHorizontal: 10,
                    }}
                  >
                    Scan QR ini menggunakan kamera &quot;Pindai QR&quot; atau kamera HP untuk
                    membuka tugas dan checklist fasilitas ini.
                  </Text>
                </ScrollView>

                <View style={{ width: '100%', gap: 8, marginTop: 6 }}>
                  {Platform.OS === 'web' && (
                    <TouchableOpacity
                      style={[
                        ui.actionSheetBtnPrimary,
                        {
                          width: '100%',
                          height: 44,
                          justifyContent: 'center',
                          paddingHorizontal: 14,
                          backgroundColor: '#1D4ED8',
                        },
                      ]}
                      onPress={() => {
                        const code = qrAssetModal.code;
                        const name = qrAssetModal.name;
                        const loc = qrAssetModal.location;
                        setQrAssetModal(null);
                        if (typeof window !== 'undefined') {
                          window.location.href = `/petugas?qr=${encodeURIComponent(
                            code
                          )}&name=${encodeURIComponent(name)}&loc=${encodeURIComponent(loc)}`;
                        }
                      }}
                    >
                      <Text
                        style={[ui.actionSheetBtnPrimaryText, { textAlign: 'center' }]}
                        numberOfLines={1}
                      >
                        Buka di Halaman Petugas
                      </Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[ui.btnCloseModal, { width: '100%', marginTop: 0, height: 44 }]}
                    onPress={() => setQrAssetModal(null)}
                  >
                    <Text style={ui.btnCloseModalText}>Tutup</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </DraggableSheet>
        </View>
      </Modal>
    </>
  );
};
