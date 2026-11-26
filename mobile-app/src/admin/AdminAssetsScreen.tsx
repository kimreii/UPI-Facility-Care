import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Asset } from '../types';
import { renderFacilityIcon } from './AdminIcons';
import { FacilityRepairStat } from './facilityRepairStats';
import { ui } from './adminStyles';

interface AdminAssetsScreenProps {
  filteredAssets: Asset[];
  repairStatsByAsset?: Record<string, FacilityRepairStat>;
  assetSearchQuery: string;
  onChangeSearch: (q: string) => void;
  assetCategoryFilter: string;
  onOpenCategoryDropdown: () => void;
  onOpenAddAssetModal: () => void;
  onToggleAssetStatus: (asset: Asset) => void;
  onSelectAssetMenu: (asset: Asset) => void;
  refreshing?: boolean;
  onRefresh?: () => void;
}

export const AdminAssetsScreen: React.FC<AdminAssetsScreenProps> = ({
  filteredAssets,
  repairStatsByAsset = {},
  assetSearchQuery,
  onChangeSearch,
  assetCategoryFilter,
  onOpenCategoryDropdown,
  onOpenAddAssetModal,
  onToggleAssetStatus,
  onSelectAssetMenu,
  refreshing = false,
  onRefresh,
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const isLaptop = screenWidth >= 900;

  return (
    <View style={[ui.assetTabContainer, { flex: 1, paddingBottom: 0 }]}>
      {/* Header: Title and + Tambah Aset Button */}
      <View style={ui.assetHeaderRow}>
        <Text style={ui.assetPageTitle}>Daftar Aset</Text>
        <TouchableOpacity
          style={ui.btnAddAsset}
          onPress={onOpenAddAssetModal}
          activeOpacity={0.85}
        >
          <Text style={ui.btnAddAssetText}>+ Tambah Aset</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar Input */}
      <View style={ui.searchBarContainer}>
        <View style={{ marginRight: 8 }}>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <Circle cx="11" cy="11" r="7" stroke="#9CA3AF" strokeWidth="2.2" />
            <Path d="M20 20L16.5 16.5" stroke="#9CA3AF" strokeWidth="2.2" strokeLinecap="round" />
          </Svg>
        </View>
        <TextInput
          style={ui.searchBarInput}
          placeholder="Cari aset (nama, lokasi, jenis...)"
          placeholderTextColor="#9CA3AF"
          value={assetSearchQuery}
          onChangeText={onChangeSearch}
        />
        {assetSearchQuery ? (
          <TouchableOpacity onPress={() => onChangeSearch('')}>
            <Text style={ui.clearSearchText}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filter Dropdown */}
      <TouchableOpacity
        style={ui.filterDropdownBtn}
        onPress={onOpenCategoryDropdown}
        activeOpacity={0.8}
      >
        <Text style={ui.filterDropdownText}>{assetCategoryFilter}</Text>
        <Text style={ui.filterDropdownChevron}>⌵</Text>
      </TouchableOpacity>

      {/* Section Title: Fasilitas (Tetap di atas, hanya daftar di bawah yang di-scroll) */}
      <Text style={ui.facilitiesSectionTitle}>Fasilitas</Text>

      {/* Asset Cards List (Area Scroll Mandiri) */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          { gap: 12, paddingBottom: 24 },
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
        {filteredAssets.length === 0 ? (
          <View style={[ui.emptyStateContainer, isLaptop && { width: '100%' }]}>
            <Text style={ui.emptyStateText}>
              Tidak ada aset yang sesuai kriteria pencarian.
            </Text>
          </View>
        ) : (
          filteredAssets.map(asset => {
            const isAktif = asset.status !== 'Tutup';
            const rStat = repairStatsByAsset[asset.code];
            const replacedCount = rStat?.replacedCount ?? 0;
            const activeDmg = rStat?.activeDamageCount ?? 0;
            return (
              <TouchableOpacity
                key={asset.code}
                style={[ui.assetCardItem, isLaptop && { width: '49%' }]}
                onPress={() => onSelectAssetMenu(asset)}
                activeOpacity={0.85}
              >
                <View style={ui.assetCardIconBox}>
                  {renderFacilityIcon(asset.category, asset.name)}
                </View>

                <View style={{ flex: 1, justifyContent: 'center' }}>
                  <Text style={ui.assetCardTitle}>{asset.name}</Text>
                  <Text style={ui.assetCardSubtitle}>
                    {asset.code} • {asset.location}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                    <View
                      style={{
                        backgroundColor: replacedCount > 0 ? '#EEF2FF' : '#F3F4F6',
                        paddingHorizontal: 7,
                        paddingVertical: 2,
                        borderRadius: 6,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10.5,
                          fontWeight: '700',
                          color: replacedCount > 0 ? '#3730A3' : '#6B7280',
                        }}
                      >
                        Diganti / Diperbaiki: {replacedCount}x
                      </Text>
                    </View>
                    {activeDmg > 0 && (
                      <View
                        style={{
                          backgroundColor: '#FEF2F2',
                          paddingHorizontal: 7,
                          paddingVertical: 2,
                          borderRadius: 6,
                        }}
                      >
                        <Text style={{ fontSize: 10.5, fontWeight: '700', color: '#DC2626' }}>
                          {activeDmg} Kerusakan Aktif
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={ui.assetCardRightActions}>
                  <TouchableOpacity
                    style={[
                      ui.assetStatusPill,
                      isAktif ? ui.assetStatusPillAktif : ui.assetStatusPillTutup,
                    ]}
                    onPress={() => onToggleAssetStatus(asset)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        ui.assetStatusPillText,
                        isAktif
                          ? ui.assetStatusPillTextAktif
                          : ui.assetStatusPillTextTutup,
                      ]}
                    >
                      {isAktif ? 'Aktif' : 'Tutup'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={ui.assetDotsBtn}
                    onPress={() => onSelectAssetMenu(asset)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={ui.assetDotsText}>⋮</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};
