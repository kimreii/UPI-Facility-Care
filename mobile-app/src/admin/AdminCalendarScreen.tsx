import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Task } from '../types';
import { buildRealtimeCalendarGrid } from './AdminIcons';
import { ui } from './adminStyles';

interface AdminCalendarScreenProps {
  selectedCalendarDate: number;
  onSelectDate: (day: number) => void;
  selectedCalendarMonth: string;
  selectedCalendarYear: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onOpenMonthDropdown: () => void;
  onOpenYearDropdown: () => void;
  currentScheduledItems: {
    time: string;
    title: string;
    location: string;
    taskId?: string;
    statusColor?: string;
  }[];
  tasks: Task[];
  onPressScheduleItem?: (item: {
    time: string;
    title: string;
    location: string;
    taskId?: string;
    statusColor?: string;
  }) => void;
}

export const AdminCalendarScreen: React.FC<AdminCalendarScreenProps> = ({
  selectedCalendarDate,
  onSelectDate,
  selectedCalendarMonth,
  selectedCalendarYear,
  onPrevMonth,
  onNextMonth,
  onOpenMonthDropdown,
  onOpenYearDropdown,
  currentScheduledItems,
  tasks,
  onPressScheduleItem,
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const isLaptop = screenWidth >= 900;

  const calendarCells = useMemo(
    () => buildRealtimeCalendarGrid(selectedCalendarMonth, selectedCalendarYear, tasks),
    [selectedCalendarMonth, selectedCalendarYear, tasks]
  );

  return (
    <View style={ui.calendarTabContainer}>
      {/* Header Title & Subtitle */}
      <View style={ui.calendarHeaderBlock}>
        <Text style={ui.calendarPageTitle}>Kalender Maintenance</Text>
        <Text style={ui.calendarPageSubtitle}>
          Lihat jadwal pemeliharaan fasilitas secara keseluruhan
        </Text>
      </View>

      <View
        style={
          isLaptop
            ? { flexDirection: 'row', gap: 16, alignItems: 'flex-start' }
            : undefined
        }
      >
        {/* Card 1: Interactive Monthly Calendar Grid */}
        <View style={[ui.calendarCardWrapper, isLaptop && { flex: 1.15 }]}>
        <View style={ui.monthNavRow}>
          <TouchableOpacity
            onPress={onPrevMonth}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={ui.arrowBtn}
          >
            <Text style={ui.arrowBtnText}>‹</Text>
          </TouchableOpacity>

          <View style={ui.selectorsCenterRow}>
            <TouchableOpacity
              style={ui.dateSelectPill}
              onPress={onOpenMonthDropdown}
              activeOpacity={0.8}
            >
              <Text style={ui.dateSelectPillText}>{selectedCalendarMonth}</Text>
              <Text style={ui.dateSelectPillChevron}>⌵</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={ui.dateSelectPill}
              onPress={onOpenYearDropdown}
              activeOpacity={0.8}
            >
              <Text style={ui.dateSelectPillText}>{selectedCalendarYear}</Text>
              <Text style={ui.dateSelectPillChevron}>⌵</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={onNextMonth}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={ui.arrowBtn}
          >
            <Text style={ui.arrowBtnText}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Day Names Row */}
        <View style={ui.weekDaysRow}>
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(dayName => (
            <View key={dayName} style={ui.weekDayCol}>
              <Text style={ui.weekDayText}>{dayName}</Text>
            </View>
          ))}
        </View>

        {/* Calendar Days Grid */}
        <View style={ui.daysGridContainer}>
          {calendarCells.map((cell, idx) => {
            if (!cell) {
              return <View key={`empty-${idx}`} style={ui.dayCellCol} />;
            }
            const isSelected = cell.isCurrentMonth && cell.day === selectedCalendarDate;
            return (
              <TouchableOpacity
                key={`day-${idx}-${cell.day}`}
                style={ui.dayCellCol}
                onPress={() => {
                  if (cell.isCurrentMonth) {
                    onSelectDate(cell.day);
                  }
                }}
                activeOpacity={cell.isCurrentMonth ? 0.7 : 1}
              >
                <View style={[ui.dayNumberBox, isSelected && ui.dayNumberBoxSelected]}>
                  <Text
                    style={[
                      ui.dayNumberText,
                      !cell.isCurrentMonth && ui.dayNumberTextMuted,
                      isSelected && ui.dayNumberTextSelected,
                    ]}
                  >
                    {cell.day}
                  </Text>
                </View>

                <View style={[ui.dayDotContainer, { flexDirection: 'row', gap: 3 }]}>
                  {cell.isCurrentMonth &&
                    (cell.dots && cell.dots.length > 0
                      ? cell.dots.slice(0, 3).map((dotColor, dIdx) => (
                          <View
                            key={`${cell.day}-dot-${dIdx}`}
                            style={[ui.dayIndicatorDot, { backgroundColor: dotColor }]}
                          />
                        ))
                      : cell.hasDot && (
                          <View
                            style={[ui.dayIndicatorDot, { backgroundColor: cell.hasDot }]}
                          />
                        ))}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

        {/* Card 2: Jadwal pada Tanggal Terpilih */}
        <View style={[ui.calendarCardWrapper, isLaptop && { flex: 1 }]}>
          <Text style={ui.scheduleCardTitle}>
            Jadwal • {selectedCalendarDate} {selectedCalendarMonth} {selectedCalendarYear}
          </Text>

          {currentScheduledItems.length === 0 ? (
            <View
              style={{
                paddingVertical: 26,
                paddingHorizontal: 14,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: 12.5,
                  color: '#9CA3AF',
                  fontWeight: '600',
                  textAlign: 'center',
                }}
              >
                Belum ada jadwal kegiatan pada tanggal ini.
              </Text>
            </View>
          ) : (
            <>
              <View style={{ gap: 10, marginTop: 12 }}>
                {currentScheduledItems.map((item, i) => (
                  <TouchableOpacity
                    key={i}
                    style={ui.scheduleItemCard}
                    onPress={() => onPressScheduleItem?.(item)}
                    activeOpacity={0.78}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {item.statusColor && (
                        <View
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: item.statusColor,
                          }}
                        />
                      )}
                      <Text style={ui.scheduleTimeText}>{item.time}</Text>
                    </View>
                    <View style={ui.scheduleVerticalDivider} />
                    <View style={{ flex: 1 }}>
                      <Text style={ui.scheduleTitleText}>{item.title}</Text>
                      <Text style={ui.scheduleSubtitleText}>{item.location}</Text>
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#9CA3AF' }}>›</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={ui.scheduleCardDivider} />

              <View style={ui.legendVerticalList}>
                <View style={ui.legendRowItem}>
                  <View style={[ui.legendCircle, { backgroundColor: '#38BDF8' }]} />
                  <Text style={ui.legendLabelText}>Belum Dimulai</Text>
                </View>
                <View style={ui.legendRowItem}>
                  <View style={[ui.legendCircle, { backgroundColor: '#FBBF24' }]} />
                  <Text style={ui.legendLabelText}>Dalam Proses</Text>
                </View>
                <View style={ui.legendRowItem}>
                  <View style={[ui.legendCircle, { backgroundColor: '#10B981' }]} />
                  <Text style={ui.legendLabelText}>Sudah Selesai</Text>
                </View>
                <View style={ui.legendRowItem}>
                  <View style={[ui.legendCircle, { backgroundColor: '#EF4444' }]} />
                  <Text style={ui.legendLabelText}>Perlu Peninjauan</Text>
                </View>
              </View>
            </>
          )}
        </View>
      </View>
    </View>
  );
};
