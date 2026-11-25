import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Task, AiInspectionResult } from '../types';
import { TaskFacilityIcon, getFacilityMetadata } from './PetugasIcons';
import { st } from './petugasStyles';

interface AiFlagScreenProps {
  task: Task;
  photo: string;
  aiResult?: AiInspectionResult | null;
  onViewPhoto: (photoUri: string) => void;
  onRetakePhoto: () => void;
  onReportDamage: () => void;
}

export const AiFlagScreen: React.FC<AiFlagScreenProps> = ({
  task,
  photo,
  aiResult,
  onViewPhoto,
  onRetakePhoto,
  onReportDamage,
}) => {
  const meta = getFacilityMetadata(task);
  const shortTitle =
    task.id === 'WO-001' || task.judul.toLowerCase().includes('toilet')
      ? 'Toilet Lt.1'
      : task.judul;
  const tanggalStr = meta.jadwal.replace('Jadwal:', 'Tanggal:');

  const cleanlinessScore =
    aiResult?.cleanliness_percentage !== undefined
      ? Math.round(aiResult.cleanliness_percentage)
      : task.cleanlinessPercentage !== undefined
      ? Math.round(task.cleanlinessPercentage)
      : 62;

  const locationCameraText = `${task.judul}${
    task.lokasi && !task.judul.toLowerCase().includes(task.lokasi.toLowerCase())
      ? ` - ${task.lokasi}`
      : ''
  }`;

  return (
    <ScrollView
      style={[st.scroll, { backgroundColor: '#FFFFFF' }]}
      contentContainerStyle={[
        st.detailScrollContent,
        { paddingTop: 42, paddingBottom: 40, alignItems: 'center' },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Lingkaran Merah-Oranye dengan Silang Putih */}
      <View style={af.redCircleBox}>
        <Svg width={44} height={44} viewBox="0 0 24 24" fill="none">
          <Path
            d="M18 6L6 18M6 6L18 18"
            stroke="#FFFFFF"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>

      {/* Judul & Subjudul AI Flag */}
      <Text style={af.titleText}>Area Bermasalah Terdeteksi</Text>
      <Text style={af.subtitleText}>
        Ambil ulang foto atau Laporkan Kerusakan{'\n'}
        <Text style={af.aiFlagHighlight}>AI Flag.</Text>
      </Text>

      {/* Kartu 1: Ringkasan Fasilitas (Sama dengan StatusSelesaiScreen) */}
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

      {/* Kartu 2: Hasil Deteksi Kamera AI dengan Kotak Area Kotor */}
      <TouchableOpacity
        style={af.aiPhotoOuterCard}
        onPress={() => onViewPhoto(photo)}
        activeOpacity={0.9}
      >
        <View style={af.aiPhotoInnerWrap}>
          <Image source={{ uri: photo }} style={af.aiPhotoImg} resizeMode="cover" />

          {/* Overlay Kiri Atas: Hasil Deteksi AI */}
          <View style={af.hudOverlayCard}>
            <Text style={af.hudHeaderLabel}>Hasil Deteksi AI</Text>
            <Text style={af.hudScoreRow}>
              Kebersihan Area:{' '}
              <Text style={af.hudScoreRed}>{cleanlinessScore}%</Text>
            </Text>
            <Text style={af.hudThresholdText}>Threshold: 80%</Text>
            <Text style={af.hudLocSmall}>Lokasi Kamera:</Text>
            <Text style={af.hudLocBold} numberOfLines={2}>
              {locationCameraText}
            </Text>
          </View>

          {/* Overlay Kotak Merah Area Kotor */}
          <View style={af.redBoundingBox} pointerEvents="none">
            <View style={af.redBoundingTag}>
              <Text style={af.redBoundingTagText}>Area Kotor</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {/* Tombol 1 (Hijau): Ambil Ulang Foto Ruangan */}
      <TouchableOpacity
        style={[st.btnGreenPrimary, { marginBottom: 12 }]}
        onPress={onRetakePhoto}
        activeOpacity={0.85}
      >
        <Text style={st.btnGreenPrimaryText}>Ambil Ulang Foto Ruangan</Text>
      </TouchableOpacity>

      {/* Tombol 2 (Merah Muda): Laporkan Kerusakan */}
      <TouchableOpacity
        style={af.btnPinkReport}
        onPress={onReportDamage}
        activeOpacity={0.85}
      >
        <Text style={af.btnPinkReportText}>Laporkan Kerusakan</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const af = StyleSheet.create({
  redCircleBox: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#EA3815',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  titleText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitleText: {
    fontSize: 13.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 22,
  },
  aiFlagHighlight: {
    color: '#EA3815',
    fontWeight: '800',
  },
  aiPhotoOuterCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 10,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  aiPhotoInnerWrap: {
    width: '100%',
    height: 185,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#1F2937',
  },
  aiPhotoImg: {
    width: '100%',
    height: '100%',
  },
  hudOverlayCard: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 142,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 10,
    padding: 8,
  },
  hudHeaderLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: 2,
  },
  hudScoreRow: {
    fontSize: 10,
    fontWeight: '700',
    color: '#111827',
  },
  hudScoreRed: {
    fontSize: 12,
    fontWeight: '800',
    color: '#EA3815',
  },
  hudThresholdText: {
    fontSize: 8.5,
    color: '#6B7280',
    marginBottom: 4,
  },
  hudLocSmall: {
    fontSize: 8.5,
    color: '#6B7280',
  },
  hudLocBold: {
    fontSize: 9,
    fontWeight: '700',
    color: '#111827',
  },
  redBoundingBox: {
    position: 'absolute',
    right: 18,
    bottom: 14,
    width: '42%',
    height: '52%',
    borderWidth: 1.8,
    borderColor: '#EA3815',
    backgroundColor: 'rgba(234, 56, 21, 0.12)',
    borderRadius: 4,
  },
  redBoundingTag: {
    position: 'absolute',
    top: -18,
    left: 0,
    backgroundColor: '#EA3815',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 99,
  },
  redBoundingTagText: {
    color: '#FFFFFF',
    fontSize: 8.5,
    fontWeight: '800',
  },
  btnPinkReport: {
    width: '100%',
    height: 46,
    borderRadius: 8,
    backgroundColor: '#F4B4C0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPinkReportText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
});
