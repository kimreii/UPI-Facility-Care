import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { PetugasReport } from './PetugasIcons';
import { st } from './petugasStyles';

interface LaporanRiwayatScreenProps {
  reports: PetugasReport[];
  completedMonthCount: number;
  refreshing: boolean;
  onRefresh: () => void;
  onAddNewReport: () => void;
  onPreviewReportPhoto: (photoUri: string) => void;
  onPressCompletedTasks?: () => void;
}

export const LaporanRiwayatScreen: React.FC<LaporanRiwayatScreenProps> = ({
  reports,
  completedMonthCount,
  refreshing,
  onRefresh,
  onAddNewReport,
  onPreviewReportPhoto,
  onPressCompletedTasks,
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const isLaptop = screenWidth >= 900;

  return (
    <View style={[st.dashboardScroll, st.pelaporanListBg]}>
      <View
        style={{
          flex: 1,
          width: '100%',
          maxWidth: 1180,
          alignSelf: 'center',
          paddingHorizontal: 16,
          paddingTop: 22,
        }}
      >
        {/* Bagian Atas Tetap (Fixed) */}
        <Text style={st.pelaporanHeading}>Laporan dan Riwayat</Text>

        <TouchableOpacity
          style={st.btnTambahLaporanBaru}
          onPress={onAddNewReport}
          activeOpacity={0.85}
        >
          <Text style={st.btnTambahLaporanBaruText}>+ Tambah Laporan Baru</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={st.statsMonthBox}
          onPress={onPressCompletedTasks}
          activeOpacity={0.8}
        >
          <Text style={st.statsMonthLabel}>Selesai Bulan Ini :</Text>
          <Text style={st.statsMonthValue}>{completedMonthCount} Tugas ›</Text>
        </TouchableOpacity>

        <Text style={st.riwayatSectionTitle}>Riwayat Laporan</Text>

        {/* Hanya Daftar Kartu Riwayat Laporan yang Bisa Di-scroll */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            { gap: 14, paddingBottom: 110 },
            isLaptop && {
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
            },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {reports.map(rep => (
            <TouchableOpacity
              key={rep.id}
              style={[st.riwayatItemCard, isLaptop && { width: '49%' }]}
              onPress={() => onPreviewReportPhoto(rep.foto)}
              activeOpacity={0.88}
            >
              <Image source={{ uri: rep.foto }} style={st.riwayatItemThumb} resizeMode="cover" />
              <View style={{ flex: 1, justifyContent: 'space-between' }}>
                <View>
                  <Text style={st.riwayatItemTitle} numberOfLines={2}>
                    {rep.judul}
                  </Text>
                  <Text style={st.riwayatItemDate}>
                    {rep.tanggal}
                    {'\n'}
                    {rep.jam}
                  </Text>
                </View>

                <View
                  style={[
                    st.badgeDalamPeninjauan,
                    rep.status === 'Ditolak' && {
                      backgroundColor: '#FEE2E2',
                      borderColor: '#FCA5A5',
                    },
                    rep.status === 'Diproses' && {
                      backgroundColor: '#DBEAFE',
                      borderColor: '#93C5FD',
                    },
                    rep.status === 'Selesai' && {
                      backgroundColor: '#D1FAE5',
                      borderColor: '#6EE7B7',
                    },
                  ]}
                >
                  <Text
                    style={[
                      st.badgeDalamPeninjauanText,
                      rep.status === 'Ditolak' && { color: '#DC2626' },
                      rep.status === 'Diproses' && { color: '#1D4ED8' },
                      rep.status === 'Selesai' && { color: '#059669' },
                    ]}
                  >
                    {rep.status === 'Ditolak'
                      ? 'Ditolak Admin'
                      : rep.status === 'Diproses'
                      ? 'Diproses (Work Order)'
                      : rep.status}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};
