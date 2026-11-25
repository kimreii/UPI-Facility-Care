import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  Platform,
  ScrollView,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { IncomingReport } from './AdminIcons';
import { ui } from './adminStyles';

interface AdminReportsScreenProps {
  activeReportDetail: IncomingReport | null;
  onSelectReportDetail: (rep: IncomingReport | null) => void;
  reportFilter: 'Semua' | 'Mendesak' | 'Tinggi' | 'Sedang';
  onChangeReportFilter: (f: 'Semua' | 'Mendesak' | 'Tinggi' | 'Sedang') => void;
  reportCounts: {
    Semua: number;
    Mendesak: number;
    Tinggi: number;
    Sedang: number;
  };
  reportSearchQuery: string;
  onChangeReportSearch: (q: string) => void;
  filteredReports: IncomingReport[];
  onCreateWoFromReport: (rep: IncomingReport) => void;
  onRejectReport: (rep: IncomingReport) => void;
  refreshing?: boolean;
  onRefresh?: () => void;
}

export const AdminReportsScreen: React.FC<AdminReportsScreenProps> = ({
  activeReportDetail,
  onSelectReportDetail,
  reportFilter,
  onChangeReportFilter,
  reportCounts,
  reportSearchQuery,
  onChangeReportSearch,
  filteredReports,
  onCreateWoFromReport,
  onRejectReport,
  refreshing = false,
  onRefresh,
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const isLaptop = screenWidth >= 900;
  const [previewPhotoModal, setPreviewPhotoModal] = useState<any>(null);
  const [extraPhotosByReport, setExtraPhotosByReport] = useState<Record<string, string>>({});

  const handlePickExtraPhoto = (reportId: string) => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const existing = document.getElementById('admin-report-extra-photo');
      if (existing) existing.remove();
      const input = document.createElement('input');
      input.id = 'admin-report-extra-photo';
      input.type = 'file';
      input.accept = 'image/*';
      input.style.display = 'none';
      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = () => {
            setExtraPhotosByReport(prev => ({
              ...prev,
              [reportId]: reader.result as string,
            }));
          };
          reader.readAsDataURL(file);
        }
      };
      document.body.appendChild(input);
      input.click();
    }
  };

  if (activeReportDetail) {
    const extraPhotoUri = extraPhotosByReport[activeReportDetail.id];
    return (
      <View style={ui.detailReportScreenContainer}>
        {/* Top Header Row: Back Button, Title & Status Badge */}
        <View style={ui.detailReportHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              style={ui.detailReportBackBtn}
              onPress={() => onSelectReportDetail(null)}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M19 12H5M5 12L12 19M5 12L12 5"
                  stroke="#111827"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </TouchableOpacity>
            <Text style={ui.detailReportHeaderTitle}>Detail Laporan</Text>
          </View>

          <View style={ui.detailReportStatusBadge}>
            <Text style={ui.detailReportStatusBadgeText}>Belum Ditinjau</Text>
          </View>
        </View>

        {/* Card 1: Summary Info Card */}
        <View style={ui.detailReportSummaryCard}>
          <View style={ui.detailReportSummaryRow}>
            <Text style={ui.detailReportSummaryLabel}>Nama Laporan</Text>
            <Text style={ui.detailReportSummaryValue} numberOfLines={1}>
              {activeReportDetail.title}
            </Text>
          </View>
          <View style={ui.detailReportSummaryRow}>
            <Text style={ui.detailReportSummaryLabel}>Pengirim</Text>
            <Text style={ui.detailReportSummaryValue}>{activeReportDetail.reporter}</Text>
          </View>
          <View style={ui.detailReportSummaryRow}>
            <Text style={ui.detailReportSummaryLabel}>Tanggal</Text>
            <Text style={ui.detailReportSummaryValue}>{activeReportDetail.date}</Text>
          </View>
        </View>

        {/* Section Title: Detail Masalah */}
        <Text style={ui.detailProblemSectionTitle}>Detail Masalah</Text>

        {/* Card 2: Main Problem Card */}
        <View style={ui.detailProblemCard}>
          <View style={ui.detailReportSummaryRow}>
            <Text style={ui.detailReportSummaryLabel}>Fasilitas</Text>
            <Text style={ui.detailReportSummaryValue}>
              {activeReportDetail.facility || 'Pompa Air Gedung A'}
            </Text>
          </View>

          <View style={[ui.detailReportSummaryRow, { marginTop: 8 }]}>
            <Text style={ui.detailReportSummaryLabel}>Lokasi</Text>
            <Text style={ui.detailReportSummaryValue}>{activeReportDetail.location}</Text>
          </View>

          <View style={[ui.detailReportSummaryRow, { marginTop: 8 }]}>
            <Text style={ui.detailReportSummaryLabel}>Kategori</Text>
            <View
              style={[
                ui.incomingReportBadge,
                activeReportDetail.urgency === 'Mendesak'
                  ? ui.badgeMendesak
                  : activeReportDetail.urgency === 'Tinggi'
                  ? ui.badgeTinggi
                  : ui.badgeSedang,
              ]}
            >
              <Text
                style={[
                  ui.incomingReportBadgeText,
                  activeReportDetail.urgency === 'Sedang'
                    ? ui.badgeSedangText
                    : ui.badgeWhiteText,
                ]}
              >
                {activeReportDetail.urgency}
              </Text>
            </View>
          </View>

          <Text style={ui.detailProblemSubheading}>Foto Bukti (Ketuk untuk memperbesar)</Text>
          <View style={ui.detailReportPhotosRow}>
            <TouchableOpacity
              onPress={() => setPreviewPhotoModal(activeReportDetail.image)}
              activeOpacity={0.85}
            >
              <Image
                source={activeReportDetail.image}
                style={ui.detailReportProofImage}
                resizeMode="cover"
              />
            </TouchableOpacity>

            {extraPhotoUri ? (
              <TouchableOpacity
                onPress={() => setPreviewPhotoModal({ uri: extraPhotoUri })}
                activeOpacity={0.85}
              >
                <Image
                  source={{ uri: extraPhotoUri }}
                  style={ui.detailReportProofImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={ui.detailReportAddPhotoBtn}
                onPress={() => handlePickExtraPhoto(activeReportDetail.id)}
                activeOpacity={0.8}
              >
                <Text style={ui.detailReportAddPhotoPlus}>+</Text>
                <Text style={ui.detailReportAddPhotoText}>Tambah Foto</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <Modal
          visible={!!previewPhotoModal}
          transparent
          animationType="fade"
          onRequestClose={() => setPreviewPhotoModal(null)}
        >
          <TouchableOpacity
            style={ui.modalOverlay}
            activeOpacity={1}
            onPress={() => setPreviewPhotoModal(null)}
          >
            <View
              style={[ui.modalSheet, { alignItems: 'center' }]}
              onStartShouldSetResponder={() => true}
            >
              <View style={ui.sheetHandle} />
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#111827', marginBottom: 10 }}>
                Foto Bukti Laporan ({activeReportDetail.id})
              </Text>
              {previewPhotoModal && (
                <Image
                  source={previewPhotoModal}
                  style={{
                    width: '100%',
                    height: 300,
                    borderRadius: 12,
                    backgroundColor: '#F3F4F6',
                    marginBottom: 14,
                  }}
                  resizeMode="contain"
                />
              )}
              <TouchableOpacity
                style={[ui.btnCloseModal, { width: '100%' }]}
                onPress={() => setPreviewPhotoModal(null)}
              >
                <Text style={ui.btnCloseModalText}>Tutup</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        <TouchableOpacity
          style={ui.btnJadikanWorkOrder}
          onPress={() => onCreateWoFromReport(activeReportDetail)}
          activeOpacity={0.85}
        >
          <Text style={ui.btnJadikanWorkOrderText}>Jadikan sebagai Work Order</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={ui.btnTolakLaporan}
          onPress={() => onRejectReport(activeReportDetail)}
          activeOpacity={0.85}
        >
          <Text style={ui.btnTolakLaporanText}>Tolak Laporan</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[ui.reportTabContainer, { flex: 1, paddingBottom: 0 }]}>
      <View style={ui.reportHeaderBlock}>
        <Text style={ui.reportPageTitle}>Laporan Masuk Petugas</Text>
        <Text style={ui.reportPageSubtitle}>
          Daftar semua laporan temuan dan masalah
        </Text>
      </View>

      <View style={ui.reportFilterRow}>
        {(['Semua', 'Mendesak', 'Tinggi', 'Sedang'] as const).map(f => {
          const isActive = reportFilter === f;
          const count = reportCounts[f];
          return (
            <TouchableOpacity
              key={f}
              style={[
                ui.reportFilterPill,
                isActive ? ui.reportFilterPillActive : ui.reportFilterPillInactive,
              ]}
              onPress={() => onChangeReportFilter(f)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  ui.reportFilterPillText,
                  isActive
                    ? ui.reportFilterPillTextActive
                    : ui.reportFilterPillTextInactive,
                ]}
                numberOfLines={1}
              >
                {f}
              </Text>
              <View
                style={[
                  ui.reportFilterCountBadge,
                  isActive
                    ? ui.reportFilterCountBadgeActive
                    : ui.reportFilterCountBadgeInactive,
                ]}
              >
                <Text style={ui.reportFilterCountText}>{count}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={ui.reportSearchContainer}>
        <TextInput
          style={ui.reportSearchInput}
          value={reportSearchQuery}
          onChangeText={onChangeReportSearch}
          placeholder="Cari laporan..."
          placeholderTextColor="#9CA3AF"
        />
        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
          <Circle cx="11" cy="11" r="7" stroke="#4B5563" strokeWidth="2.2" />
          <Path
            d="M20 20L16.5 16.5"
            stroke="#4B5563"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </Svg>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          ui.reportCardsList,
          { paddingBottom: 24 },
          isLaptop && {
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined
        }
      >
        {filteredReports.length === 0 ? (
          <View style={[ui.emptyReportsContainer, isLaptop && { width: '100%' }]}>
            <Text style={ui.emptyReportsText}>
              Tidak ada laporan yang sesuai kriteria pencarian
            </Text>
          </View>
        ) : (
          filteredReports.map(item => (
            <View
              key={item.id}
              style={[ui.incomingReportCard, isLaptop && { width: '49%' }]}
            >
              <Image
                source={item.image}
                style={ui.incomingReportImage}
                resizeMode="cover"
              />

              <View style={ui.incomingReportContent}>
                <Text style={ui.incomingReportTitle} numberOfLines={1}>
                  {item.title}
                </Text>

                <Text style={ui.incomingReportReporter} numberOfLines={1}>
                  Dilaporkan oleh:{' '}
                  <Text style={ui.incomingReportReporterName}>{item.reporter}</Text>
                </Text>

                <View style={ui.incomingReportMetaRow}>
                  <View>
                    <Text style={ui.incomingReportDateText}>{item.date}</Text>
                    <Text style={ui.incomingReportTimeText}>{item.time}</Text>
                  </View>

                  <View
                    style={[
                      ui.incomingReportBadge,
                      item.urgency === 'Mendesak'
                        ? ui.badgeMendesak
                        : item.urgency === 'Tinggi'
                        ? ui.badgeTinggi
                        : ui.badgeSedang,
                    ]}
                  >
                    <Text
                      style={[
                        ui.incomingReportBadgeText,
                        item.urgency === 'Sedang'
                          ? ui.badgeSedangText
                          : ui.badgeWhiteText,
                      ]}
                    >
                      {item.urgency}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={ui.incomingReportBtn}
                  onPress={() => onSelectReportDetail(item)}
                  activeOpacity={0.85}
                >
                  <Text style={ui.incomingReportBtnText}>Lihat Laporan</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};
