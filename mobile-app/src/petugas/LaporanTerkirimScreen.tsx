import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { PetugasReport, TaskFacilityIcon } from './PetugasIcons';
import { st } from './petugasStyles';

interface LaporanTerkirimScreenProps {
  report: PetugasReport;
  onViewPhoto: (photoUri: string) => void;
  onBackToWorkOrderList: () => void;
}

export const LaporanTerkirimScreen: React.FC<LaporanTerkirimScreenProps> = ({
  report,
  onViewPhoto,
  onBackToWorkOrderList,
}) => {
  const shortRepTitle =
    report.judul.toLowerCase().includes('toilet') && report.judul.length > 18
      ? 'Toilet Lt.1'
      : report.judul;

  return (
    <ScrollView
      style={[st.dashboardScroll, { backgroundColor: '#FFFFFF' }]}
      contentContainerStyle={[
        st.dashboardScrollContent,
        { paddingTop: 48, paddingBottom: 110, alignItems: 'center' },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Lingkaran Hijau dengan Centang Putih */}
      <View style={st.successCircleGreen}>
        <Svg width={42} height={42} viewBox="0 0 24 24" fill="none">
          <Path
            d="M20 6L9 17L4 12"
            stroke="#FFFFFF"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>

      {/* Judul & Subjudul Laporan Terkirim */}
      <Text style={[st.successTitleText, { marginBottom: 6 }]}>Laporan Terkirim</Text>
      <Text style={st.successSubtitleText}>
        Laporan Kerusakan Sudah Diterima{'\n'}
        <Text style={st.successGreenHighlight}>Selesai.</Text>
      </Text>

      {/* Kartu 1: Ringkasan Fasilitas yang Dilaporkan */}
      <View style={st.summaryCardBox}>
        <View style={st.taskIconContainer}>
          <TaskFacilityIcon judul={report.judul} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#111827', marginBottom: 2 }}>
            {shortRepTitle}
          </Text>
          <Text style={{ fontSize: 11.5, color: '#6B7280', marginBottom: 2 }}>
            {report.lokasi || 'Toilet • Lt.1'}
          </Text>
          <Text style={{ fontSize: 11, color: '#9CA3AF' }}>
            Tanggal: {report.tanggal} • {report.jam}
          </Text>
        </View>
      </View>

      {/* Kartu 2: Foto kerusakan telah diunggah */}
      <View style={[st.summaryCardBox, { marginBottom: 26, gap: 14 }]}>
        <Image source={{ uri: report.foto }} style={st.uploadedPhotoThumb} resizeMode="cover" />
        <View style={{ flex: 1, alignItems: 'flex-start' }}>
          <Text
            style={{
              fontSize: 12.5,
              fontWeight: '700',
              color: '#111827',
              marginBottom: 8,
            }}
          >
            Foto kerusakan telah diunggah
          </Text>
          <TouchableOpacity
            style={st.btnLihatFotoPill}
            onPress={() => onViewPhoto(report.foto)}
            activeOpacity={0.8}
          >
            <Text style={st.btnLihatFotoText}>Lihat Foto</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tombol Hijau: Kembali ke Daftar Work Order */}
      <TouchableOpacity
        style={st.btnGreenPrimary}
        onPress={onBackToWorkOrderList}
        activeOpacity={0.85}
      >
        <Text style={st.btnGreenPrimaryText}>Kembali ke Daftar Work Order</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};
