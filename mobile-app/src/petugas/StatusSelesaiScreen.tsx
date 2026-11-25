import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Task } from '../types';
import { TaskFacilityIcon, getFacilityMetadata } from './PetugasIcons';
import { st } from './petugasStyles';

interface StatusSelesaiScreenProps {
  task: Task;
  photo: string;
  onViewPhoto: (photoUri: string) => void;
  onBackToWorkOrderList: () => void;
}

export const StatusSelesaiScreen: React.FC<StatusSelesaiScreenProps> = ({
  task,
  photo,
  onViewPhoto,
  onBackToWorkOrderList,
}) => {
  const meta = getFacilityMetadata(task);
  const shortTitle =
    task.id === 'WO-001' || task.judul.toLowerCase().includes('toilet')
      ? 'Toilet Lt.1'
      : task.judul;
  const tanggalStr = meta.jadwal.replace('Jadwal:', 'Tanggal:');

  return (
    <ScrollView
      style={st.scroll}
      contentContainerStyle={[
        st.detailScrollContent,
        { paddingTop: 48, alignItems: 'center' },
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

      {/* Judul & Subjudul Status Selesai */}
      <Text style={st.successTitleText}>Tugas Berhasil Diselesaikan!</Text>
      <Text style={st.successSubtitleText}>
        Status work order telah diperbarui menjadi{'\n'}
        <Text style={st.successGreenHighlight}>Selesai.</Text>
      </Text>

      {/* Kartu 1: Ringkasan Fasilitas */}
      <View style={st.summaryCardBox}>
        <View style={st.taskIconContainer}>
          <TaskFacilityIcon judul={task.judul} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#111827', marginBottom: 2 }}>
            {shortTitle}
          </Text>
          <Text style={{ fontSize: 11.5, color: '#6B7280', marginBottom: 2 }}>
            {meta.shortSubtitle}
          </Text>
          <Text style={{ fontSize: 11, color: '#9CA3AF' }}>{tanggalStr}</Text>
        </View>
      </View>

      {/* Kartu 2: Foto perbaikan telah diunggah */}
      <View style={[st.summaryCardBox, { marginBottom: 26, gap: 14 }]}>
        <Image source={{ uri: photo }} style={st.uploadedPhotoThumb} resizeMode="cover" />
        <View style={{ flex: 1, alignItems: 'flex-start' }}>
          <Text
            style={{
              fontSize: 12.5,
              fontWeight: '700',
              color: '#111827',
              marginBottom: 8,
            }}
          >
            Foto perbaikan telah diunggah
          </Text>
          <TouchableOpacity
            style={st.btnLihatFotoPill}
            onPress={() => onViewPhoto(photo)}
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
