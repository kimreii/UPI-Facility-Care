import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  RefreshControl,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Task, TaskPriority } from '../types';
import { renderFacilityIcon } from './AdminIcons';
import { ui } from './adminStyles';
import { formatTaskDateReal } from '../dateUtils';

interface AdminWorkOrdersScreenProps {
  isCreatingWorkOrder: boolean;
  onSetCreatingWorkOrder: (creating: boolean) => void;
  formJudul: string;
  onChangeFormJudul: (val: string) => void;
  formLokasi?: string;
  formAssetCode?: string;
  onOpenAssetPicker?: () => void;
  formPetugas: string;
  onOpenPetugasPicker: () => void;
  formPrioritas: TaskPriority;
  onOpenPrioritasPicker: () => void;
  formTenggat: string;
  onChangeFormTenggat: (val: string) => void;
  formDeskripsi: string;
  onChangeFormDeskripsi: (val: string) => void;
  onSubmitWorkOrder: () => void;
  tasks: Task[];
  filteredWorkOrders: Task[];
  woFilter: 'Semua' | 'Baru' | 'Proses' | 'Selesai';
  onChangeWoFilter: (filter: 'Semua' | 'Baru' | 'Proses' | 'Selesai') => void;
  woSearchQuery: string;
  onChangeWoSearch: (q: string) => void;
  onSelectTaskDetail: (task: Task) => void;
  refreshing?: boolean;
  onRefresh?: () => void;
}

const itemMatchesBaru = (status?: string) => status === 'Menunggu' || status === 'Baru';
const itemMatchesProses = (status?: string) => status === 'Diproses' || status === 'Proses';

const getParsedTitleAndLoc = (item: Task) => {
  let title = item.judul || 'Aset Fasilitas';
  let loc = item.lokasi || '';

  if (title.includes(' Lantai ') && (!loc || title.includes(loc))) {
    const parts = title.split(' Lantai ');
    title = parts[0].trim();
    loc = 'Lantai ' + parts[1].trim();
  } else if (loc && title.toLowerCase().endsWith(loc.toLowerCase())) {
    title = title.substring(0, title.length - loc.length).trim();
  }
  return { title, loc };
};

const formatTaskDate = (dateStr?: string) => {
  return formatTaskDateReal(dateStr);
};

const formatTaskTime = (index: number) => {
  const baseHour = 6 + (index % 12);
  const hourStr = String(baseHour).padStart(2, '0');
  return `${hourStr}.00`;
};

export const AdminWorkOrdersScreen: React.FC<AdminWorkOrdersScreenProps> = ({
  isCreatingWorkOrder,
  onSetCreatingWorkOrder,
  formJudul,
  onChangeFormJudul,
  formLokasi,
  formAssetCode,
  onOpenAssetPicker,
  formPetugas,
  onOpenPetugasPicker,
  formPrioritas,
  onOpenPrioritasPicker,
  formTenggat,
  onChangeFormTenggat,
  formDeskripsi,
  onChangeFormDeskripsi,
  onSubmitWorkOrder,
  tasks,
  filteredWorkOrders,
  woFilter,
  onChangeWoFilter,
  woSearchQuery,
  onChangeWoSearch,
  onSelectTaskDetail,
  refreshing = false,
  onRefresh,
}) => {
  if (isCreatingWorkOrder) {
    return (
      <View style={ui.createWoScreenContainer}>
        {/* Top Header with Circular Back Button */}
        <View style={ui.createWoTopHeader}>
          <TouchableOpacity
            style={ui.createWoRoundBackBtn}
            onPress={() => onSetCreatingWorkOrder(false)}
            activeOpacity={0.8}
          >
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path
                d="M19 12H5M5 12L12 19M5 12L12 5"
                stroke="#111827"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </TouchableOpacity>
          <View style={{ flex: 1, paddingLeft: 4 }}>
            <Text style={ui.createWoHeaderMainTitle}>Buat Work Order</Text>
            <Text style={ui.createWoHeaderSubTitle} numberOfLines={1}>
              {formJudul || 'Kebocoran Pipa Toilet Gedung B'}
            </Text>
          </View>
        </View>

        {/* Main White Card: Form Penugasan Admin */}
        <View style={ui.createWoCard}>
          <Text style={ui.createWoCardTitle}>Form Penugasan Admin</Text>

          <View style={ui.createWoField}>
            <Text style={ui.createWoFieldLabel}>Judul Tugas</Text>
            <TextInput
              style={ui.createWoInput}
              value={formJudul}
              onChangeText={onChangeFormJudul}
              placeholder="Kebocoran Pipa Toilet Gedung B"
              placeholderTextColor="#8592A6"
            />
          </View>

          {onOpenAssetPicker && (
            <View style={ui.createWoField}>
              <Text style={ui.createWoFieldLabel}>Fasilitas / Lokasi Aset</Text>
              <TouchableOpacity
                style={ui.createWoDropdownInput}
                onPress={onOpenAssetPicker}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 13, color: '#111827' }}>
                  {formAssetCode ? `[${formAssetCode}] ` : ''}
                  {formLokasi || 'Pilih Fasilitas Kampus'}
                </Text>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M6 9L12 15L18 9"
                    stroke="#6B7280"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </TouchableOpacity>
            </View>
          )}

          <View style={ui.createWoField}>
            <Text style={ui.createWoFieldLabel}>Petugas</Text>
            <TouchableOpacity
              style={ui.createWoDropdownInput}
              onPress={onOpenPetugasPicker}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 13, color: formPetugas ? '#111827' : '#8592A6' }}>
                {formPetugas || 'Rian (Petugas)'}
              </Text>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M6 9L12 15L18 9"
                  stroke="#6B7280"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </TouchableOpacity>
          </View>

          <View style={ui.createWoField}>
            <Text style={ui.createWoFieldLabel}>Tingkat Prioritas</Text>
            <TouchableOpacity
              style={ui.createWoDropdownInput}
              onPress={onOpenPrioritasPicker}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={[
                    ui.createWoPrioDot,
                    {
                      backgroundColor:
                        formPrioritas === 'Tinggi' || formPrioritas === 'Darurat'
                          ? '#EF4444'
                          : '#10B981',
                    },
                  ]}
                />
                <Text style={{ fontSize: 13, color: '#111827', fontWeight: '500' }}>
                  {formPrioritas === 'Tinggi'
                    ? 'Tinggi (Urgent)'
                    : formPrioritas === 'Darurat'
                    ? 'Darurat (Critical)'
                    : 'Normal (Rutin)'}
                </Text>
              </View>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M6 9L12 15L18 9"
                  stroke="#6B7280"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </TouchableOpacity>
          </View>

          <View style={ui.createWoField}>
            <Text style={ui.createWoFieldLabel}>Batas Waktu (Deadline)</Text>
            <TextInput
              style={ui.createWoInput}
              value={formTenggat}
              onChangeText={onChangeFormTenggat}
              placeholder="11 Okt 2026, 17:00 WIB"
              placeholderTextColor="#8592A6"
            />
          </View>

          <View style={ui.createWoField}>
            <Text style={ui.createWoFieldLabel}>Instruksi Tambahan</Text>
            <TextInput
              style={[ui.createWoInput, ui.createWoTextarea]}
              value={formDeskripsi}
              onChangeText={onChangeFormDeskripsi}
              placeholder="Silahkan cek kondisi dinamo dan kemungkinan adanya kebocoran pipa seperti yang dilaporkan sebelumnya. Siapkan spare part cadangan jika diperlukan."
              placeholderTextColor="#8592A6"
              multiline
              numberOfLines={4}
            />
          </View>
        </View>

        <View style={ui.createWoActionContainer}>
          <TouchableOpacity
            style={ui.btnKirimTugaskan}
            onPress={onSubmitWorkOrder}
            activeOpacity={0.85}
          >
            <Text style={ui.btnKirimTugaskanText}>Kirim & Tugaskan</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[ui.woTabContainer, { flex: 1 }]}>
      {/* Header Row */}
      <View style={ui.woHeaderRow}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={ui.woPageTitle}>Work Order</Text>
          <Text style={ui.woPageSubtitle}>
            Daftar tugas maintenance yang perlu dikerjakan
          </Text>
        </View>
        <TouchableOpacity
          style={ui.woAddBtn}
          onPress={() => onSetCreatingWorkOrder(true)}
          activeOpacity={0.85}
        >
          <Text style={ui.woAddBtnText}>+ Tambah Tugas</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Pills */}
      <View style={ui.woPillsRow}>
        <TouchableOpacity
          style={[ui.woPill, woFilter === 'Semua' ? ui.woPillActive : ui.woPillInactive]}
          onPress={() => onChangeWoFilter('Semua')}
          activeOpacity={0.8}
        >
          <Text style={ui.woPillText}>Semua</Text>
          <View
            style={[
              ui.woPillBadge,
              woFilter === 'Semua' ? ui.woPillBadgeActive : ui.woPillBadgeInactive,
            ]}
          >
            <Text style={ui.woPillBadgeText}>{tasks.length}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[ui.woPill, woFilter === 'Baru' ? ui.woPillActive : ui.woPillInactive]}
          onPress={() => onChangeWoFilter('Baru')}
          activeOpacity={0.8}
        >
          <Text style={ui.woPillText}>Baru</Text>
          <View
            style={[
              ui.woPillBadge,
              woFilter === 'Baru' ? ui.woPillBadgeActive : ui.woPillBadgeInactive,
            ]}
          >
            <Text style={ui.woPillBadgeText}>
              {tasks.filter(t => itemMatchesBaru(t.status)).length}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[ui.woPill, woFilter === 'Proses' ? ui.woPillActive : ui.woPillInactive]}
          onPress={() => onChangeWoFilter('Proses')}
          activeOpacity={0.8}
        >
          <Text style={ui.woPillText}>Proses</Text>
          <View
            style={[
              ui.woPillBadge,
              woFilter === 'Proses' ? ui.woPillBadgeActive : ui.woPillBadgeInactive,
            ]}
          >
            <Text style={ui.woPillBadgeText}>
              {tasks.filter(t => itemMatchesProses(t.status)).length}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[ui.woPill, woFilter === 'Selesai' ? ui.woPillActive : ui.woPillInactive]}
          onPress={() => onChangeWoFilter('Selesai')}
          activeOpacity={0.8}
        >
          <Text style={ui.woPillText}>Selesai</Text>
          <View
            style={[
              ui.woPillBadge,
              woFilter === 'Selesai' ? ui.woPillBadgeActive : ui.woPillBadgeInactive,
            ]}
          >
            <Text style={ui.woPillBadgeText}>
              {tasks.filter(t => t.status === 'Selesai').length}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={ui.woSearchContainer}>
        <TextInput
          style={ui.woSearchInput}
          placeholder="Cari work order..."
          placeholderTextColor="#9CA3AF"
          value={woSearchQuery}
          onChangeText={onChangeWoSearch}
        />
        <View style={ui.woSearchIconWrap}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Circle cx="11" cy="11" r="7" stroke="#4B5563" strokeWidth="2.2" />
            <Path
              d="M20 20L16.2 16.2"
              stroke="#4B5563"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </Svg>
        </View>
      </View>

      {/* Table Column Header Strip */}
      <View style={ui.woTableHeaderStrip}>
        <Text style={[ui.woTableHeaderText, { flex: 2.2 }]}>Nama Aset</Text>
        <Text style={[ui.woTableHeaderText, { flex: 1, textAlign: 'center' }]}>Tipe</Text>
        <Text style={[ui.woTableHeaderText, { flex: 1.2, textAlign: 'center' }]}>
          Prioritas
        </Text>
        <Text style={[ui.woTableHeaderText, { flex: 1.2, textAlign: 'right' }]}>
          Tanggal
        </Text>
      </View>

      {/* White Card List Container (Hanya daftar Work Order yang di-scroll) */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined
        }
      >
      <View style={ui.woCardContainer}>
        {filteredWorkOrders.length === 0 ? (
          <View style={{ paddingVertical: 24, alignItems: 'center' }}>
            <Text style={{ color: '#6B7280', fontSize: 13, textAlign: 'center' }}>
              Tidak ada work order yang sesuai filter.
            </Text>
          </View>
        ) : (
          filteredWorkOrders.map((item, idx) => {
            const isBaru = itemMatchesBaru(item.status);
            const isProses = itemMatchesProses(item.status);
            const isTinggi = item.prioritas === 'Tinggi' || item.prioritas === 'Darurat';

            const { title, loc } = getParsedTitleAndLoc(item);
            const dateStr = item.tenggat ? formatTaskDate(item.tenggat) : '01 Sep 2026';
            const timeStr = formatTaskTime(idx);

            return (
              <React.Fragment key={item.id}>
                {idx > 0 && <View style={ui.woItemDivider} />}
                <TouchableOpacity
                  style={ui.woItemRow}
                  onPress={() => onSelectTaskDetail(item)}
                  activeOpacity={0.8}
                >
                  <View style={ui.woColAset}>
                    <View style={ui.woIconBox}>
                      {renderFacilityIcon(undefined, item.judul || item.lokasi)}
                    </View>
                    <View style={ui.woInfoWrap}>
                      <Text style={ui.woCodeText}>{item.id}</Text>
                      <Text style={ui.woTitleText} numberOfLines={1}>
                        {title}
                      </Text>
                      {loc ? (
                        <Text style={ui.woLocText} numberOfLines={1}>
                          {loc}
                        </Text>
                      ) : null}
                      <View
                        style={[
                          ui.woStatusBadge,
                          isBaru
                            ? ui.woStatusBadgeBaru
                            : isProses
                            ? ui.woStatusBadgeProses
                            : ui.woStatusBadgeSelesai,
                        ]}
                      >
                        <Text
                          style={[
                            ui.woStatusBadgeText,
                            isBaru
                              ? ui.woStatusBadgeTextBaru
                              : isProses
                              ? ui.woStatusBadgeTextProses
                              : ui.woStatusBadgeTextSelesai,
                          ]}
                        >
                          {isBaru ? 'Baru' : isProses ? 'Proses' : 'Selesai'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={ui.woColTipe}>
                    <Text style={ui.woTipeText}>Rutin</Text>
                  </View>

                  <View style={ui.woColPrioritas}>
                    <View
                      style={[
                        ui.woPrioPill,
                        isTinggi ? ui.woPrioPillTinggi : ui.woPrioPillNormal,
                      ]}
                    >
                      <Text
                        style={[
                          ui.woPrioPillText,
                          isTinggi ? ui.woPrioPillTextTinggi : ui.woPrioPillTextNormal,
                        ]}
                      >
                        {isTinggi ? 'Tinggi' : 'Normal'}
                      </Text>
                    </View>
                  </View>

                  <View style={ui.woColTanggal}>
                    <Text style={ui.woDateText}>{dateStr}</Text>
                    <Text style={ui.woTimeText}>{timeStr}</Text>
                  </View>
                </TouchableOpacity>
              </React.Fragment>
            );
          })
        )}
      </View>
      </ScrollView>
    </View>
  );
};
