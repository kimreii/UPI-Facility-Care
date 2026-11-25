import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Image } from 'react-native';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { st } from './petugasStyles';

interface LaporKerusakanBaruScreenProps {
  judul: string;
  onChangeJudul: (val: string) => void;
  lokasi: string;
  onChangeLokasi: (val: string) => void;
  categories: { id: string; label: string; checked: boolean }[];
  onToggleCategory: (id: string) => void;
  catatan: string;
  onChangeCatatan: (val: string) => void;
  photos: (string | null)[];
  onPickPhoto: (slotIdx: number) => void;
  onBack: () => void;
  onSubmit: () => void;
}

export const LaporKerusakanBaruScreen: React.FC<LaporKerusakanBaruScreenProps> = ({
  judul,
  onChangeJudul,
  lokasi,
  onChangeLokasi,
  categories,
  onToggleCategory,
  catatan,
  onChangeCatatan,
  photos,
  onPickPhoto,
  onBack,
  onSubmit,
}) => {
  return (
    <ScrollView
      style={[st.dashboardScroll, { backgroundColor: '#FFFFFF' }]}
      contentContainerStyle={[
        st.dashboardScrollContent,
        { paddingTop: 18, paddingBottom: 110 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Bar: < Lapor Kerusakan Baru & Badge Laporan untuk Admin */}
      <View style={st.formTopHeaderRow}>
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path
              d="M15 18L9 12L15 6"
              stroke="#111827"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#111827' }}>
            Lapor Kerusakan Baru
          </Text>
        </TouchableOpacity>

        <View style={st.badgeLaporanAdmin}>
          <Text style={st.badgeLaporanAdminText}>Laporan untuk Admin</Text>
        </View>
      </View>

      {/* Judul & Deskripsi Form */}
      <Text style={st.formMainTitle}>Lapor Kerusakan</Text>
      <Text style={st.formMainSubtitle}>
        Laporkan fasilitas/sistem yang rusak atau butuh peninjauan langsung dari admin
      </Text>

      {/* Pilihan Cepat Fasilitas Kampus */}
      <Text style={st.formFieldLabel}>Pilih Cepat Fasilitas</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingBottom: 12 }}
      >
        {[
          { name: 'Toilet Gedung A', loc: 'Lt.1 - Gedung A' },
          { name: 'Koridor Gedung A', loc: 'Lt.3 - Gedung A' },
          { name: 'Perpustakaan Pusat', loc: 'Lt.1 - Gedung Perpustakaan' },
          { name: 'Ballroom Gedung A', loc: 'Lt.5 - Gedung A' },
          { name: 'Lab IOT', loc: 'Lt.2 - Gedung Teknik' },
        ].map(preset => {
          const isSelected = judul === preset.name;
          return (
            <TouchableOpacity
              key={preset.name}
              onPress={() => {
                onChangeJudul(preset.name);
                onChangeLokasi(preset.loc);
              }}
              activeOpacity={0.8}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 99,
                backgroundColor: isSelected ? '#1D4ED8' : '#F3F4F6',
                borderWidth: 1,
                borderColor: isSelected ? '#1D4ED8' : '#E5E7EB',
              }}
            >
              <Text
                style={{
                  fontSize: 11.5,
                  fontWeight: '700',
                  color: isSelected ? '#FFFFFF' : '#374151',
                }}
              >
                {preset.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Field 1: Nama Fasilitas */}
      <Text style={st.formFieldLabel}>Nama Fasilitas</Text>
      <TextInput
        style={st.formOutlinedInput}
        placeholder="Nama fasilitas atau sistem yang perlu ditinjau..."
        placeholderTextColor="#9CA3AF"
        value={judul}
        onChangeText={onChangeJudul}
      />

      {/* Field 2: Lokasi */}
      <Text style={st.formFieldLabel}>Lokasi</Text>
      <TextInput
        style={st.formOutlinedInput}
        placeholder="Lokasi gedung dan lantai fasilitas..."
        placeholderTextColor="#9CA3AF"
        value={lokasi}
        onChangeText={onChangeLokasi}
      />

      {/* Field 3: Kategori Masalah */}
      <Text style={[st.formFieldLabel, { marginBottom: 10 }]}>Kategori Masalah</Text>
      <View style={{ gap: 10, marginBottom: 18 }}>
        {categories.map(cat => (
          <TouchableOpacity
            key={cat.id}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
            onPress={() => onToggleCategory(cat.id)}
            activeOpacity={0.75}
          >
            <View style={[st.checkboxBox, cat.checked && st.checkboxBoxChecked]}>
              {cat.checked && (
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
            <Text style={{ fontSize: 11.5, color: '#6B7280', fontWeight: '500' }}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Field 4: Deskripsi / Catatan untuk admin */}
      <Text style={st.formFieldLabel}>Deskripsi / Catatan untuk admin</Text>
      <TextInput
        style={[st.formOutlinedInput, { marginBottom: 18 }]}
        placeholder="Deskripsi kerusakan fasilitas..."
        placeholderTextColor="#9CA3AF"
        value={catatan}
        onChangeText={onChangeCatatan}
      />

      {/* Field 5: Unggah Foto Kerusakan (2 Kotak Abu-abu Persis Mockup) */}
      <Text style={[st.formFieldLabel, { marginBottom: 10 }]}>Unggah Foto Kerusakan</Text>
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 22 }}>
        {/* Slot 1 */}
        <TouchableOpacity
          style={st.uploadPhotoSlot}
          onPress={() => onPickPhoto(0)}
          activeOpacity={0.8}
        >
          {photos[0] ? (
            <Image
              source={{ uri: photos[0] }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : (
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
              <Rect x="3" y="3" width="18" height="18" rx="2" stroke="#111827" strokeWidth="1.8" />
              <Circle cx="8.5" cy="8.5" r="1.5" fill="#111827" />
              <Path
                d="M21 15L16 10L5 21"
                stroke="#111827"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          )}
        </TouchableOpacity>

        {/* Slot 2 */}
        <TouchableOpacity
          style={st.uploadPhotoSlot}
          onPress={() => onPickPhoto(1)}
          activeOpacity={0.8}
        >
          {photos[1] ? (
            <Image
              source={{ uri: photos[1] }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : null}
        </TouchableOpacity>
      </View>

      {/* Tombol Hijau: Kirim Laporan Ke Admin */}
      <TouchableOpacity
        style={[st.btnGreenPrimary, { height: 44 }]}
        onPress={onSubmit}
        activeOpacity={0.85}
      >
        <Text style={[st.btnGreenPrimaryText, { fontSize: 13 }]}>
          Kirim Laporan Ke Admin
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};
