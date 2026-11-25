import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Task, TaskPriority, Asset } from '../src/types';
import { initialAssets, loadAssets } from '../src/storage';
import {
  fetchTasksWithSync,
  createTaskApi,
  checkServerHealth,
  fetchRoomsApi,
  createRoomApi,
  updateRoomStatusApi,
  fetchDamageReportsApi,
  updateDamageReportStatusApi,
  fetchOfficersApi,
  saveOfficerApi,
  OfficerDto,
} from '../src/api';
import { TEAM_PROFILES } from '../src/petugas/PetugasProfileScreen';
import { ServerConfigModal } from '../src/ServerConfigModal';
import {
  AdminTab,
  TABS,
  IncomingReport,
  INITIAL_INCOMING_REPORTS,
  MONTHS_LIST,
  SCHEDULED_TASKS_BY_DATE,
  resolveTaskCalendarYMD,
  getTaskStatusColor,
  NavHomeIcon,
  NavClipboardIcon,
  NavCalendarIcon,
  NavBriefcaseIcon,
  NavReportIcon,
} from '../src/admin/AdminIcons';
import { ui } from '../src/admin/adminStyles';
import { DraggableSheet } from '../src/DraggableSheet';
import { AdminDashboardScreen } from '../src/admin/AdminDashboardScreen';
import { AdminAssetsScreen } from '../src/admin/AdminAssetsScreen';
import { AdminCalendarScreen } from '../src/admin/AdminCalendarScreen';
import { AdminWorkOrdersScreen } from '../src/admin/AdminWorkOrdersScreen';
import { AdminReportsScreen } from '../src/admin/AdminReportsScreen';
import { AdminModals } from '../src/admin/AdminModals';
import { formatIsoDate, formatTaskDateReal } from '../src/dateUtils';
import {
  NotificationModal,
  UnifiedNotificationItem,
  RealtimePopupBanner,
  PopupBannerData,
} from '../src/NotificationModal';

export default function AdminScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const isLaptop = screenWidth >= 900;
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [officers, setOfficers] = useState<OfficerDto[]>([]);
  const [selectedOfficerDetail, setSelectedOfficerDetail] = useState<OfficerDto | null>(null);
  const [showAddOfficerModal, setShowAddOfficerModal] = useState(false);
  const [newOfficerName, setNewOfficerName] = useState('');
  const [newOfficerEmail, setNewOfficerEmail] = useState('');
  const [newOfficerPassword, setNewOfficerPassword] = useState('');
  const [newOfficerRole, setNewOfficerRole] = useState('');
  const [newOfficerShift, setNewOfficerShift] = useState('');
  const [newOfficerArea, setNewOfficerArea] = useState('');
  const [newOfficerPhone, setNewOfficerPhone] = useState('');
  const [submittingOfficer, setSubmittingOfficer] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showAdminNotifications, setShowAdminNotifications] = useState(false);
  const [dismissedAdminNotifKeys, setDismissedAdminNotifKeys] = useState<string[]>([]);
  const [adminPopupBanner, setAdminPopupBanner] = useState<PopupBannerData | null>(null);
  const knownAdminReportIdsRef = useRef<Set<string>>(new Set());
  const knownAdminDoneTaskIdsRef = useRef<Set<string>>(new Set());
  const initialAdminSeededRef = useRef(false);
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<Task | null>(null);

  // Tab Daftar Aset State
  const [assetSearchQuery, setAssetSearchQuery] = useState('');
  const [assetCategoryFilter, setAssetCategoryFilter] = useState('Semua Jenis');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [selectedAssetMenu, setSelectedAssetMenu] = useState<Asset | null>(null);

  // Tab Kalender State (Default ke tanggal hari ini secara real-time)
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<number>(() =>
    new Date().getDate()
  );
  const [selectedCalendarMonth, setSelectedCalendarMonth] = useState<string>(
    () => MONTHS_LIST[new Date().getMonth()] || 'Nov'
  );
  const [selectedCalendarYear, setSelectedCalendarYear] = useState<number>(() =>
    new Date().getFullYear()
  );
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);

  // Form Tambah Aset Baru
  const [showAddAssetModal, setShowAddAssetModal] = useState(false);
  const [newAssetCode, setNewAssetCode] = useState('');
  const [newAssetName, setNewAssetName] = useState('');
  const [newAssetBuilding, setNewAssetBuilding] = useState('');
  const [newAssetFloor, setNewAssetFloor] = useState('');
  const [newAssetCategory, setNewAssetCategory] = useState('Toilet');
  const [newAssetStatus, setNewAssetStatus] = useState('Aktif');
  const [submittingAsset, setSubmittingAsset] = useState(false);

  // Form Work Order
  const [formJudul, setFormJudul] = useState('');
  const [formAssetCode, setFormAssetCode] = useState('');
  const [formLokasi, setFormLokasi] = useState('Toilet Gedung B');
  const [formPetugas, setFormPetugas] = useState('Rian (Petugas)');
  const [formPrioritas, setFormPrioritas] = useState<TaskPriority>('Tinggi');
  const [formTenggat, setFormTenggat] = useState('11 Okt 2026, 17:00 WIB');
  const [formDeskripsi, setFormDeskripsi] = useState('');

  // Work Order Tab State
  const [woFilter, setWoFilter] = useState<'Semua' | 'Baru' | 'Proses' | 'Selesai'>('Semua');
  const [woSearchQuery, setWoSearchQuery] = useState('');
  const [isCreatingWorkOrder, setIsCreatingWorkOrder] = useState(false);

  // Tab Laporan Masuk Petugas State
  const [incomingReports, setIncomingReports] = useState<IncomingReport[]>(
    INITIAL_INCOMING_REPORTS
  );
  const [reportFilter, setReportFilter] = useState<'Semua' | 'Mendesak' | 'Tinggi' | 'Sedang'>(
    'Semua'
  );
  const [reportSearchQuery, setReportSearchQuery] = useState('');
  const [activeReportDetail, setActiveReportDetail] = useState<IncomingReport | null>(null);

  // Picker modals
  const [showLokasi, setShowLokasi] = useState(false);
  const [showPetugas, setShowPetugas] = useState(false);
  const [showPrioritas, setShowPrioritas] = useState(false);
  const [showAssetPicker, setShowAssetPicker] = useState(false);

  const handlePrevMonth = () => {
    const idx = MONTHS_LIST.indexOf(selectedCalendarMonth);
    if (idx > 0) {
      setSelectedCalendarMonth(MONTHS_LIST[idx - 1]);
    } else {
      setSelectedCalendarMonth('Des');
      setSelectedCalendarYear(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    const idx = MONTHS_LIST.indexOf(selectedCalendarMonth);
    if (idx < MONTHS_LIST.length - 1) {
      setSelectedCalendarMonth(MONTHS_LIST[idx + 1]);
    } else {
      setSelectedCalendarMonth('Jan');
      setSelectedCalendarYear(prev => prev + 1);
    }
  };

  const currentScheduledItems = useMemo(() => {
    const monthIdx = Math.max(0, MONTHS_LIST.indexOf(selectedCalendarMonth));
    const now = new Date();

    const matchingServerTasks = tasks
      .map((t, idx) => ({ task: t, idx, ymd: resolveTaskCalendarYMD(t, idx, now) }))
      .filter(
        x =>
          x.ymd &&
          x.ymd.year === selectedCalendarYear &&
          x.ymd.monthIdx === monthIdx &&
          x.ymd.day === selectedCalendarDate
      );

    return matchingServerTasks.map(({ task: t, idx }) => {
      const timeMatch = t.tenggat?.match(/(\d{2}[.:]\d{2})/)?.[1]?.replace(':', '.');
      return {
        time: timeMatch || `${String(8 + (idx % 9)).padStart(2, '0')}.00`,
        title: `${t.judul} (${t.status})`,
        location: t.lokasi,
        taskId: t.id,
        statusColor: getTaskStatusColor(t),
      };
    });
  }, [selectedCalendarDate, selectedCalendarMonth, selectedCalendarYear, tasks]);

  const reportCounts = useMemo(() => {
    return {
      Semua: incomingReports.length,
      Mendesak: incomingReports.filter(r => r.urgency === 'Mendesak').length,
      Tinggi: incomingReports.filter(r => r.urgency === 'Tinggi').length,
      Sedang: incomingReports.filter(r => r.urgency === 'Sedang').length,
    };
  }, [incomingReports]);

  const filteredReports = useMemo(() => {
    return incomingReports.filter(item => {
      if (reportFilter !== 'Semua' && item.urgency !== reportFilter) {
        return false;
      }
      if (reportSearchQuery.trim()) {
        const q = reportSearchQuery.toLowerCase().trim();
        return (
          item.title.toLowerCase().includes(q) ||
          item.reporter.toLowerCase().includes(q) ||
          item.location.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [incomingReports, reportFilter, reportSearchQuery]);

  const handleCreateWoFromReport = async (rep: IncomingReport) => {
    await updateDamageReportStatusApi(rep.id, 'Diproses');
    setFormJudul(rep.title);
    setFormLokasi(rep.location);
    setFormPetugas(rep.reporter);
    setFormPrioritas(
      rep.urgency === 'Mendesak' ? 'Darurat' : rep.urgency === 'Tinggi' ? 'Tinggi' : 'Normal'
    );
    setFormDeskripsi(`Laporan temuan oleh ${rep.reporter}: ${rep.description}`);
    setActiveReportDetail(null);
    setActiveTab('workorders');
    setIsCreatingWorkOrder(true);
  };

  const handleRejectReport = async (rep: IncomingReport) => {
    await updateDamageReportStatusApi(rep.id, 'Ditolak');
    setIncomingReports(prev => prev.filter(r => r.id !== rep.id));
    Alert.alert('Laporan Ditolak', `Laporan "${rep.title}" telah ditolak.`, [
      {
        text: 'OK',
        onPress: () => setActiveReportDetail(null),
      },
    ]);
  };

  const tasksSigRef = useRef('');
  const reportsSigRef = useRef('');
  const assetsSigRef = useRef('');
  const officersSigRef = useRef('');

  const loadData = useCallback(async () => {
    await checkServerHealth();
    const { tasks: syncedTasks } = await fetchTasksWithSync();
    const nextTasksSig =
      syncedTasks.length === 0
        ? 'EMPTY'
        : syncedTasks
            .map(
              t =>
                `${t.id}:${t.status}:${t.prioritas}:${t.judul}:${(t.foto || '').length}:${t.catatan || ''}`
            )
            .join('|');
    if (nextTasksSig !== tasksSigRef.current) {
      tasksSigRef.current = nextTasksSig;
      setTasks(syncedTasks);

      if (initialAdminSeededRef.current) {
        const newlyDone = syncedTasks.find(
          t => t.status === 'Selesai' && !knownAdminDoneTaskIdsRef.current.has(t.id)
        );
        if (newlyDone) {
          setAdminPopupBanner({
            id: newlyDone.id,
            headerText: `Tugas Selesai Dikerjakan • ${newlyDone.id}`,
            priorityLabel: `Prioritas ${newlyDone.prioritas}`,
            isHighPriority:
              newlyDone.prioritas === 'Tinggi' || newlyDone.prioritas === 'Darurat',
            title: newlyDone.judul,
            subtitle: newlyDone.lokasi,
            onPress: () => setSelectedTaskDetail(newlyDone),
          });
        }
      }
      syncedTasks
        .filter(t => t.status === 'Selesai')
        .forEach(t => knownAdminDoneTaskIdsRef.current.add(t.id));
    }

    const dbReports = await fetchDamageReportsApi();
    if (dbReports && dbReports.length > 0) {
      const activeDbReports = dbReports.filter(r => r.status !== 'Ditolak');
      const nextReportsSig = activeDbReports
        .map(r => `${r.id}:${r.status}:${r.judul}:${(r.foto || '').length}`)
        .join('|');
      if (nextReportsSig !== reportsSigRef.current) {
        reportsSigRef.current = nextReportsSig;
        const mappedReports: IncomingReport[] = activeDbReports.map(r => {
          const matchedDefault = INITIAL_INCOMING_REPORTS.find(d => d.id === r.id);
          const isCorridorReport = (r.judul || '').toLowerCase().includes('koridor');
          return {
            id: r.id,
            title: r.judul,
            reporter: r.pelapor || 'Rian (Petugas)',
            date: r.tanggal,
            time: r.jam.replace(':', '.'),
            urgency: r.urgensi,
            image: isCorridorReport
              ? {
                  uri:
                    r.foto && !r.foto.includes('report_corridor')
                      ? r.foto
                      : 'https://images.unsplash.com/photo-1562774053-701939374585?w=400&auto=format&fit=crop&q=80',
                }
              : matchedDefault && (!r.foto || r.foto.includes('unsplash.com'))
              ? matchedDefault.image
              : { uri: r.foto },
            facility: r.judul,
            location: r.lokasi,
            description: r.catatan,
          };
        });
        setIncomingReports(mappedReports);

        if (initialAdminSeededRef.current) {
          const brandNewRep = mappedReports.find(
            r => !knownAdminReportIdsRef.current.has(r.id)
          );
          if (brandNewRep) {
            setAdminPopupBanner({
              id: brandNewRep.id,
              headerText: `Laporan Baru dari Petugas • ${brandNewRep.id}`,
              priorityLabel: `Urgensi ${brandNewRep.urgency}`,
              isHighPriority:
                brandNewRep.urgency === 'Mendesak' || brandNewRep.urgency === 'Tinggi',
              title: brandNewRep.title,
              subtitle: `${brandNewRep.location} • ${brandNewRep.reporter}`,
              onPress: () => {
                setActiveTab('reports');
                setActiveReportDetail(brandNewRep);
              },
            });
          }
        }
        mappedReports.forEach(r => knownAdminReportIdsRef.current.add(r.id));
      }
    }
    initialAdminSeededRef.current = true;

    const roomsFromDb = await fetchRoomsApi();
    if (roomsFromDb && roomsFromDb.length > 0) {
      const nextAssetsSig = roomsFromDb
        .map(r => `${r.room_code}:${r.room_name}:${r.status}`)
        .join('|');
      if (nextAssetsSig !== assetsSigRef.current) {
        assetsSigRef.current = nextAssetsSig;
        const convertedAssets: Asset[] = roomsFromDb.map(r => {
          let loc = '';
          if (r.building && r.room_name.toLowerCase().includes(r.building.toLowerCase())) {
            loc = `Lantai ${r.floor_number || 1}`;
          } else if (r.building) {
            loc = `${r.building} Lantai ${r.floor_number || 1}`;
          } else {
            loc = `Lantai ${r.floor_number || 1}`;
          }
          return {
            code: r.room_code,
            name: r.room_name,
            location: loc,
            building: r.building,
            category: r.room_type || 'Fasilitas',
            condition: 'Baik',
            status: r.status || 'Aktif',
            floor: r.floor_number || 1,
            lastCleaned: '2026-10-27',
          };
        });
        setAssets(convertedAssets);
      }
    } else if (!assetsSigRef.current) {
      const loadedAssets = await loadAssets();
      assetsSigRef.current = 'local';
      setAssets(loadedAssets);
    }

    const dbOfficers = await fetchOfficersApi();
    if (Array.isArray(dbOfficers)) {
      const nextOffSig =
        dbOfficers.length === 0
          ? 'EMPTY'
          : dbOfficers
              .map(
                o =>
                  `${o.id}:${o.name}:${o.statusText}:${o.shift}:${o.area}:${(o.avatarUri || '').length}`
              )
              .join('|');
      if (nextOffSig !== officersSigRef.current) {
        officersSigRef.current = nextOffSig;
        setOfficers(dbOfficers);
      }
    }
  }, []);

  const nextAutoOfficerId = useMemo(() => {
    const maxNum = officers.reduce((max, o) => {
      const num = parseInt(o.id.replace(/\D/g, ''), 10) || 0;
      return Math.max(max, num);
    }, 0);
    return `PTG-${String(maxNum + 1).padStart(3, '0')}`;
  }, [officers]);

  const handleCreateOfficer = async () => {
    if (!newOfficerName.trim()) {
      Alert.alert('Form Belum Lengkap', 'Nama lengkap petugas wajib diisi.');
      return;
    }
    const cleanName = newOfficerName.trim();
    const autoEmail =
      newOfficerEmail.trim() ||
      `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@kampus.ac.id`;

    setSubmittingOfficer(true);
    const res = await saveOfficerApi({
      id: nextAutoOfficerId,
      name: cleanName,
      email: autoEmail,
      password: newOfficerPassword.trim() || '123',
      role: newOfficerRole.trim() || 'Petugas Pemeliharaan Fasilitas',
      shift: newOfficerShift.trim() || 'Shift Pagi (07:00 - 15:00)',
      area: newOfficerArea.trim() || 'Gedung A',
      phone: newOfficerPhone.trim() || '0812-3456-7890',
      statusText: 'Aktif Bertugas',
    });
    setSubmittingOfficer(false);

    const createdOfficer: OfficerDto = res.data || {
      id: nextAutoOfficerId,
      name: cleanName,
      email: autoEmail,
      password: newOfficerPassword.trim() || '123',
      role: newOfficerRole.trim() || 'Petugas Pemeliharaan Fasilitas',
      shift: newOfficerShift.trim() || 'Shift Pagi (07:00 - 15:00)',
      area: newOfficerArea.trim() || 'Gedung A',
      phone: newOfficerPhone.trim() || '0812-3456-7890',
      avatarUri:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
      statusText: 'Aktif Bertugas',
      completionRate: 95,
    };

    setOfficers(prev => [...prev.filter(o => o.id !== createdOfficer.id), createdOfficer]);
    setShowAddOfficerModal(false);
    setNewOfficerName('');
    setNewOfficerEmail('');
    setNewOfficerPassword('');
    setNewOfficerRole('');
    setNewOfficerShift('');
    setNewOfficerArea('');
    setNewOfficerPhone('');
    await loadData();
    Alert.alert(
      'Akun Petugas Berhasil Dibuat',
      `ID Petugas Otomatis: ${createdOfficer.id}\nNama: ${createdOfficer.name}\nEmail: ${createdOfficer.email}\nKata Sandi: ${createdOfficer.password}\n\nPetugas sudah bisa login menggunakan ID ini di halaman Petugas.`
    );
  };

  useEffect(() => {
    if (!adminPopupBanner) return;
    const t = setTimeout(() => setAdminPopupBanner(null), 9000);
    return () => clearTimeout(t);
  }, [adminPopupBanner]);

  useEffect(() => {
    loadData();
    const today = new Date();
    setFormTenggat(formatIsoDate(today));
    const syncTimer = setInterval(() => {
      loadData();
    }, 3000);
    return () => clearInterval(syncTimer);
  }, [loadData]);

  // Sinkronkan detail tugas yang sedang dibuka jika ada update real-time dari Petugas
  useEffect(() => {
    if (selectedTaskDetail) {
      const fresh = tasks.find(t => t.id === selectedTaskDetail.id);
      if (
        fresh &&
        (fresh.status !== selectedTaskDetail.status ||
          fresh.foto !== selectedTaskDetail.foto ||
          fresh.catatan !== selectedTaskDetail.catatan)
      ) {
        setSelectedTaskDetail(fresh);
      }
    }
  }, [tasks, selectedTaskDetail]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const adminNotifItems = useMemo<UnifiedNotificationItem[]>(() => {
    const reportNotifs: UnifiedNotificationItem[] = incomingReports.map(rep => ({
      key: `rep:${rep.id}`,
      code: rep.id,
      statusLabel: 'Laporan Masuk',
      statusType: 'laporan',
      priorityLabel: rep.urgency,
      isHighPriority: rep.urgency === 'Mendesak' || rep.urgency === 'Tinggi',
      title: rep.title,
      location: `${rep.location} • ${rep.reporter}`,
      timeText: `${rep.date} ${rep.time}`,
      actionLabel: 'Tinjau Laporan',
      onPress: () => {
        setShowAdminNotifications(false);
        setIsCreatingWorkOrder(false);
        setActiveTab('reports');
        setActiveReportDetail(rep);
      },
    }));

    const taskNotifs: UnifiedNotificationItem[] = tasks
      .filter(t => t.status === 'Selesai' || t.status === 'Diproses')
      .map(t => ({
        key: `task:${t.id}:${t.status}`,
        code: t.id,
        statusLabel: t.status === 'Selesai' ? 'Tugas Selesai' : 'Sedang Diproses',
        statusType: t.status === 'Selesai' ? 'selesai' : 'proses',
        priorityLabel: t.prioritas,
        isHighPriority: t.prioritas === 'Tinggi' || t.prioritas === 'Darurat',
        title: t.judul,
        location: t.lokasi,
        timeText: formatTaskDateReal(t.tenggat),
        actionLabel: 'Lihat Detail Tugas',
        onPress: () => {
          setShowAdminNotifications(false);
          setIsCreatingWorkOrder(false);
          setWoFilter('Semua');
          setWoSearchQuery('');
          setActiveTab('workorders');
          setSelectedTaskDetail(t);
        },
      }));

    return [...reportNotifs, ...taskNotifs].filter(
      item => !dismissedAdminNotifKeys.includes(item.key)
    );
  }, [incomingReports, tasks, dismissedAdminNotifKeys]);

  const stats = useMemo(() => {
    const selesai = tasks.filter(t => t.status === 'Selesai').length;
    const dalamProses = tasks.filter(t => t.status === 'Diproses').length;
    const belumDimulai = tasks.filter(t => t.status === 'Menunggu').length;
    const perluPeninjauan = incomingReports.length;
    return {
      totalAsset: assets.length,
      maintenanceHariIni: tasks.length,
      dalamProses,
      selesai,
      belumDimulai,
      perluPeninjauan,
    };
  }, [assets, tasks, incomingReports]);

  const handleSubmit = useCallback(async () => {
    if (!formJudul.trim() || !formLokasi || !formPetugas || !formTenggat) {
      Alert.alert(
        'Form Belum Lengkap',
        'Mohon isi nama tugas, lokasi, petugas, dan tanggal tenggat.'
      );
      return;
    }
    const finalJudul = formJudul.trim() || 'Kebocoran Pipa Toilet Gedung B';
    const finalLokasi = formLokasi.trim() || 'Toilet Gedung B';
    const finalPetugas = formPetugas.trim() || 'Rian (Petugas)';
    const finalTenggat = formTenggat.trim() || '2026-10-11';
    const finalDeskripsi =
      formDeskripsi.trim() ||
      'Silahkan cek kondisi dinamo dan kemungkinan adanya kebocoran pipa seperti yang dilaporkan sebelumnya. Siapkan spare part cadangan jika diperlukan.';

    const matchedAssetForTask = assets.find(
      a =>
        finalJudul.toLowerCase().includes(a.name.toLowerCase()) ||
        a.name.toLowerCase().includes(finalJudul.toLowerCase()) ||
        finalLokasi.toLowerCase().includes(a.name.toLowerCase())
    );

    const newTask: Task = {
      id: 'WO-' + Date.now().toString().slice(-3),
      assetCode: formAssetCode || matchedAssetForTask?.code || 'AST-001',
      judul: finalJudul,
      lokasi: finalLokasi,
      petugas: finalPetugas,
      prioritas: formPrioritas,
      tenggat: finalTenggat.includes('Okt') ? '2026-10-11' : finalTenggat,
      deskripsi: finalDeskripsi,
      status: 'Menunggu',
      catatan: '',
      foto: '',
    };

    const res = await createTaskApi(newTask);
    if (res.success) {
      await loadData();
      setFormJudul('');
      setFormAssetCode('');
      setFormLokasi('Toilet Gedung B');
      setFormPetugas('Rian (Petugas)');
      setFormPrioritas('Tinggi');
      setFormDeskripsi('');
      setIsCreatingWorkOrder(false);
      Alert.alert(
        'Work Order Berhasil Diterbitkan',
        res.fromServer
          ? 'Tugas berhasil dibuat dan dikirim ke petugas!'
          : 'Tugas tersimpan secara offline di perangkat.'
      );
    }
  }, [
    formJudul,
    formAssetCode,
    formLokasi,
    formPetugas,
    formPrioritas,
    formTenggat,
    formDeskripsi,
    loadData,
  ]);

  const handleCreateTaskForAsset = (asset: Asset) => {
    setFormAssetCode(asset.code);
    setFormLokasi(asset.location);
    setFormJudul(`Pembersihan & Inspeksi ${asset.name}`);
    setActiveTab('workorders');
    setIsCreatingWorkOrder(true);
  };

  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      const q = assetSearchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        asset.name.toLowerCase().includes(q) ||
        asset.code.toLowerCase().includes(q) ||
        asset.location.toLowerCase().includes(q) ||
        asset.category.toLowerCase().includes(q);

      const matchesCategory =
        assetCategoryFilter === 'Semua Jenis' ||
        asset.category.toLowerCase() === assetCategoryFilter.toLowerCase() ||
        asset.name.toLowerCase().includes(assetCategoryFilter.toLowerCase());

      return matchesSearch && matchesCategory;
    });
  }, [assets, assetSearchQuery, assetCategoryFilter]);

  const handleCreateAsset = async () => {
    if (!newAssetName.trim() || !newAssetBuilding.trim()) {
      Alert.alert('Form Belum Lengkap', 'Nama Fasilitas dan Gedung wajib diisi.');
      return;
    }
    const code = newAssetCode.trim() || `AST-00${assets.length + 1}`;
    setSubmittingAsset(true);
    const res = await createRoomApi({
      room_code: code,
      room_name: newAssetName.trim(),
      building: newAssetBuilding.trim(),
      floor_number: parseInt(newAssetFloor) || 1,
      room_type: newAssetCategory,
      status: newAssetStatus,
    });
    setSubmittingAsset(false);

    if (res.success) {
      const savedName = newAssetName.trim();
      const savedLoc = `${newAssetBuilding.trim()} Lantai ${parseInt(newAssetFloor) || 1}`;
      if (isCreatingWorkOrder) {
        setFormAssetCode(code);
        setFormLokasi(savedLoc);
      }
      Alert.alert(
        'Aset Berhasil Ditambahkan',
        `Fasilitas "${savedName}" berhasil disimpan!`
      );
      setShowAddAssetModal(false);
      setNewAssetCode('');
      setNewAssetName('');
      setNewAssetBuilding('');
      setNewAssetFloor('');
      setNewAssetCategory('Toilet');
      setNewAssetStatus('Aktif');
      await loadData();
    } else {
      Alert.alert('Gagal Menyimpan', res.error || 'Terjadi kesalahan saat menyimpan fasilitas.');
    }
  };

  const handleToggleAssetStatus = async (asset: Asset) => {
    const nextStatus = asset.status === 'Aktif' ? 'Tutup' : 'Aktif';
    setSelectedAssetMenu(null);
    const success = await updateRoomStatusApi(asset.code, nextStatus);
    setAssets(prev =>
      prev.map(a => (a.code === asset.code ? { ...a, status: nextStatus } : a))
    );
    Alert.alert(
      success ? 'Status Fasilitas Berubah' : 'Status Diperbarui',
      `${asset.name} kini berstatus: ${nextStatus}`
    );
  };

  const itemMatchesBaru = (status?: string) => status === 'Menunggu' || status === 'Baru';
  const itemMatchesProses = (status?: string) => status === 'Diproses' || status === 'Proses';

  const filteredWorkOrders = useMemo(() => {
    return tasks.filter(t => {
      if (woFilter === 'Baru' && !itemMatchesBaru(t.status)) return false;
      if (woFilter === 'Proses' && !itemMatchesProses(t.status)) return false;
      if (woFilter === 'Selesai' && t.status !== 'Selesai') return false;

      const q = woSearchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        t.id.toLowerCase().includes(q) ||
        t.judul.toLowerCase().includes(q) ||
        (t.lokasi && t.lokasi.toLowerCase().includes(q)) ||
        (t.petugas && t.petugas.toLowerCase().includes(q)) ||
        (t.prioritas && t.prioritas.toLowerCase().includes(q))
      );
    });
  }, [tasks, woFilter, woSearchQuery]);

  return (
    <SafeAreaView style={ui.container}>
      {/* TOP NAVIGATION khusus Laptop / Desktop (>= 900px) */}
      {isLaptop && !isCreatingWorkOrder && (
        <View style={ui.topNav}>
          <View style={ui.topNavInner}>
            <View>
              <Text style={ui.topNavBrand}>Fasilitas Kampus</Text>
              <Text style={ui.topNavBrandSub}>Panel Admin</Text>
            </View>
            <View style={ui.topNavTabs}>
              {TABS.map(tab => {
                const isActive = activeTab === tab.key;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={ui.topNavItem}
                    onPress={() => setActiveTab(tab.key)}
                    activeOpacity={0.7}
                  >
                    {tab.key === 'dashboard' && <NavHomeIcon active={isActive} />}
                    {tab.key === 'assets' && <NavClipboardIcon active={isActive} />}
                    {tab.key === 'calendar' && <NavCalendarIcon active={isActive} />}
                    {tab.key === 'workorders' && <NavBriefcaseIcon active={isActive} />}
                    {tab.key === 'reports' && <NavReportIcon active={isActive} />}
                    <Text style={[ui.topNavLabel, isActive && ui.topNavLabelActive]}>
                      {tab.label}
                    </Text>
                    {isActive && <View style={ui.topNavIndicator} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      )}

      {activeTab === 'assets' ? (
        <View
          style={{
            flex: 1,
            width: '100%',
            maxWidth: 1180,
            alignSelf: 'center',
            paddingHorizontal: 16,
            paddingTop: 16,
          }}
        >
          <AdminAssetsScreen
            filteredAssets={filteredAssets}
            assetSearchQuery={assetSearchQuery}
            onChangeSearch={setAssetSearchQuery}
            assetCategoryFilter={assetCategoryFilter}
            onOpenCategoryDropdown={() => setShowCategoryDropdown(true)}
            onOpenAddAssetModal={() => {
              setNewAssetCode(`AST-00${assets.length + 1}`);
              setShowAddAssetModal(true);
            }}
            onToggleAssetStatus={handleToggleAssetStatus}
            onSelectAssetMenu={setSelectedAssetMenu}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        </View>
      ) : activeTab === 'workorders' && !isCreatingWorkOrder ? (
        <View
          style={{
            flex: 1,
            width: '100%',
            maxWidth: 1180,
            alignSelf: 'center',
            paddingHorizontal: 16,
            paddingTop: 16,
          }}
        >
          <AdminWorkOrdersScreen
            isCreatingWorkOrder={isCreatingWorkOrder}
            onSetCreatingWorkOrder={setIsCreatingWorkOrder}
            formJudul={formJudul}
            onChangeFormJudul={setFormJudul}
            formLokasi={formLokasi}
            formAssetCode={formAssetCode}
            onOpenAssetPicker={() => setShowAssetPicker(true)}
            formPetugas={formPetugas}
            onOpenPetugasPicker={() => {
              loadData();
              setShowPetugas(true);
            }}
            formPrioritas={formPrioritas}
            onOpenPrioritasPicker={() => setShowPrioritas(true)}
            formTenggat={formTenggat}
            onChangeFormTenggat={setFormTenggat}
            formDeskripsi={formDeskripsi}
            onChangeFormDeskripsi={setFormDeskripsi}
            onSubmitWorkOrder={handleSubmit}
            tasks={tasks}
            filteredWorkOrders={filteredWorkOrders}
            woFilter={woFilter}
            onChangeWoFilter={setWoFilter}
            woSearchQuery={woSearchQuery}
            onChangeWoSearch={setWoSearchQuery}
            onSelectTaskDetail={setSelectedTaskDetail}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        </View>
      ) : activeTab === 'reports' && !activeReportDetail ? (
        <View
          style={{
            flex: 1,
            width: '100%',
            maxWidth: 1180,
            alignSelf: 'center',
            paddingHorizontal: 16,
            paddingTop: 16,
          }}
        >
          <AdminReportsScreen
            activeReportDetail={activeReportDetail}
            onSelectReportDetail={setActiveReportDetail}
            reportFilter={reportFilter}
            onChangeReportFilter={setReportFilter}
            reportCounts={reportCounts}
            reportSearchQuery={reportSearchQuery}
            onChangeReportSearch={setReportSearchQuery}
            filteredReports={filteredReports}
            onCreateWoFromReport={handleCreateWoFromReport}
            onRejectReport={handleRejectReport}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        </View>
      ) : (
      <ScrollView
        style={ui.scroll}
        contentContainerStyle={ui.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {activeTab === 'dashboard' && (
          <AdminDashboardScreen
            stats={stats}
            tasks={tasks}
            reportDates={incomingReports.map(r => r.date)}
            officers={officers}
            notifCount={adminNotifItems.length}
            onOpenNotifications={() => setShowAdminNotifications(true)}
            onSelectTaskDetail={setSelectedTaskDetail}
            onSelectOfficer={setSelectedOfficerDetail}
            onOpenAddOfficer={() => setShowAddOfficerModal(true)}
            onNavigateToAssets={() => setActiveTab('assets')}
            onNavigateToWorkOrders={filter => {
              setWoFilter(filter);
              setIsCreatingWorkOrder(false);
              setActiveTab('workorders');
            }}
            onNavigateToReports={() => {
              setActiveReportDetail(null);
              setActiveTab('reports');
            }}
          />
        )}

        {activeTab === 'calendar' && (
          <AdminCalendarScreen
            selectedCalendarDate={selectedCalendarDate}
            onSelectDate={setSelectedCalendarDate}
            selectedCalendarMonth={selectedCalendarMonth}
            selectedCalendarYear={selectedCalendarYear}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
            onOpenMonthDropdown={() => setShowMonthDropdown(true)}
            onOpenYearDropdown={() => setShowYearDropdown(true)}
            currentScheduledItems={currentScheduledItems}
            tasks={tasks}
            onPressScheduleItem={item => {
              const foundTask = item.taskId
                ? tasks.find(t => t.id === item.taskId)
                : tasks.find(t =>
                    t.judul.toLowerCase().includes(item.title.toLowerCase()) ||
                    item.title.toLowerCase().includes(t.judul.toLowerCase())
                  );
              if (foundTask) {
                setSelectedTaskDetail(foundTask);
              } else {
                setFormJudul(item.title);
                setFormLokasi(item.location);
                setActiveTab('workorders');
                setIsCreatingWorkOrder(true);
              }
            }}
          />
        )}

        {activeTab === 'workorders' && isCreatingWorkOrder && (
          <AdminWorkOrdersScreen
            isCreatingWorkOrder={isCreatingWorkOrder}
            onSetCreatingWorkOrder={setIsCreatingWorkOrder}
            formJudul={formJudul}
            onChangeFormJudul={setFormJudul}
            formLokasi={formLokasi}
            formAssetCode={formAssetCode}
            onOpenAssetPicker={() => setShowAssetPicker(true)}
            formPetugas={formPetugas}
            onOpenPetugasPicker={() => {
              loadData();
              setShowPetugas(true);
            }}
            formPrioritas={formPrioritas}
            onOpenPrioritasPicker={() => setShowPrioritas(true)}
            formTenggat={formTenggat}
            onChangeFormTenggat={setFormTenggat}
            formDeskripsi={formDeskripsi}
            onChangeFormDeskripsi={setFormDeskripsi}
            onSubmitWorkOrder={handleSubmit}
            tasks={tasks}
            filteredWorkOrders={filteredWorkOrders}
            woFilter={woFilter}
            onChangeWoFilter={setWoFilter}
            woSearchQuery={woSearchQuery}
            onChangeWoSearch={setWoSearchQuery}
            onSelectTaskDetail={setSelectedTaskDetail}
          />
        )}

        {activeTab === 'reports' && !!activeReportDetail && (
          <AdminReportsScreen
            activeReportDetail={activeReportDetail}
            onSelectReportDetail={setActiveReportDetail}
            reportFilter={reportFilter}
            onChangeReportFilter={setReportFilter}
            reportCounts={reportCounts}
            reportSearchQuery={reportSearchQuery}
            onChangeReportSearch={setReportSearchQuery}
            filteredReports={filteredReports}
            onCreateWoFromReport={handleCreateWoFromReport}
            onRejectReport={handleRejectReport}
          />
        )}
      </ScrollView>
      )}

      {/* BOTTOM NAVIGATION khusus HP (Sama persis dengan Petugas, lengkap dengan activeIndicatorBar di atas tab aktif) */}
      {!isCreatingWorkOrder && !isLaptop && (
        <View style={ui.bottomNav}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={ui.navItem}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.7}
              >
                {isActive && <View style={ui.activeIndicatorBar} />}
                <View style={{ position: 'relative', alignItems: 'center' }}>
                  {tab.key === 'dashboard' && <NavHomeIcon active={isActive} />}
                  {tab.key === 'assets' && <NavClipboardIcon active={isActive} />}
                  {tab.key === 'calendar' && <NavCalendarIcon active={isActive} />}
                  {tab.key === 'workorders' && <NavBriefcaseIcon active={isActive} />}
                  {tab.key === 'reports' && <NavReportIcon active={isActive} />}
                </View>
                <Text style={[ui.navLabel, isActive && ui.navLabelActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Seluruh Modal Admin */}
      <AdminModals
        selectedTaskDetail={selectedTaskDetail}
        onCloseTaskDetail={() => setSelectedTaskDetail(null)}
        showLokasi={showLokasi}
        onCloseLokasi={() => setShowLokasi(false)}
        onSelectLokasi={setFormLokasi}
        showPetugas={showPetugas}
        onClosePetugas={() => setShowPetugas(false)}
        onSelectPetugas={setFormPetugas}
        officers={officers}
        showPrioritas={showPrioritas}
        onClosePrioritas={() => setShowPrioritas(false)}
        onSelectPrioritas={setFormPrioritas}
        showAssetPicker={showAssetPicker}
        onCloseAssetPicker={() => setShowAssetPicker(false)}
        onOpenAddAssetFromPicker={() => {
          setNewAssetCode(`AST-${String(assets.length + 1).padStart(3, '0')}`);
          setShowAddAssetModal(true);
        }}
        assets={assets}
        onSelectAssetForForm={(code, loc) => {
          setFormAssetCode(code);
          setFormLokasi(loc);
        }}
        showMonthDropdown={showMonthDropdown}
        onCloseMonthDropdown={() => setShowMonthDropdown(false)}
        selectedCalendarMonth={selectedCalendarMonth}
        onSelectCalendarMonth={setSelectedCalendarMonth}
        showYearDropdown={showYearDropdown}
        onCloseYearDropdown={() => setShowYearDropdown(false)}
        selectedCalendarYear={selectedCalendarYear}
        onSelectCalendarYear={setSelectedCalendarYear}
        showCategoryDropdown={showCategoryDropdown}
        onCloseCategoryDropdown={() => setShowCategoryDropdown(false)}
        assetCategoryFilter={assetCategoryFilter}
        onSelectCategoryFilter={setAssetCategoryFilter}
        selectedAssetMenu={selectedAssetMenu}
        onCloseAssetMenu={() => setSelectedAssetMenu(null)}
        onToggleAssetStatus={handleToggleAssetStatus}
        onCreateTaskForAsset={handleCreateTaskForAsset}
        showAddAssetModal={showAddAssetModal}
        onCloseAddAssetModal={() => setShowAddAssetModal(false)}
        newAssetCode={newAssetCode}
        onChangeNewAssetCode={setNewAssetCode}
        newAssetName={newAssetName}
        onChangeNewAssetName={setNewAssetName}
        newAssetBuilding={newAssetBuilding}
        onChangeNewAssetBuilding={setNewAssetBuilding}
        newAssetFloor={newAssetFloor}
        onChangeNewAssetFloor={setNewAssetFloor}
        newAssetCategory={newAssetCategory}
        onChangeNewAssetCategory={setNewAssetCategory}
        newAssetStatus={newAssetStatus}
        onChangeNewAssetStatus={setNewAssetStatus}
        submittingAsset={submittingAsset}
        onCreateAsset={handleCreateAsset}
      />

      {/* Modal Detail Profil & Kinerja Petugas di Admin */}
      <Modal
        visible={!!selectedOfficerDetail}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedOfficerDetail(null)}
      >
        <View style={ui.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setSelectedOfficerDetail(null)}
          />
          <DraggableSheet style={ui.modalSheet} onClose={() => setSelectedOfficerDetail(null)}>
            {selectedOfficerDetail && (
              <View style={{ flexShrink: 1 }}>
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ gap: 10, paddingBottom: 10 }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Image
                      source={{ uri: selectedOfficerDetail.avatarUri }}
                      style={{
                        width: 54,
                        height: 54,
                        borderRadius: 27,
                        backgroundColor: '#E5E7EB',
                        borderWidth: 1,
                        borderColor: '#D1D5DB',
                      }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={ui.modalWoId}>
                        ID Petugas: {selectedOfficerDetail.id}
                      </Text>
                      <Text style={ui.modalTaskTitle}>{selectedOfficerDetail.name}</Text>
                      <Text style={{ fontSize: 12, color: '#6B7280' }}>
                        {selectedOfficerDetail.role}
                      </Text>
                    </View>
                    <View
                      style={[
                        ui.priorityPill,
                        selectedOfficerDetail.statusText !== 'Aktif Bertugas' && {
                          backgroundColor: '#FEF3C7',
                        },
                      ]}
                    >
                      <View
                        style={[
                          ui.priorityGreenDot,
                          selectedOfficerDetail.statusText !== 'Aktif Bertugas' && {
                            backgroundColor: '#D97706',
                          },
                        ]}
                      />
                      <Text
                        style={[
                          ui.priorityPillText,
                          selectedOfficerDetail.statusText !== 'Aktif Bertugas' && {
                            color: '#B45309',
                          },
                        ]}
                      >
                        {selectedOfficerDetail.statusText}
                      </Text>
                    </View>
                  </View>

                  <View style={ui.statusRowModal}>
                    <Text style={ui.statusLabelModal}>Email Login:</Text>
                    <Text style={ui.statusValModal}>{selectedOfficerDetail.email}</Text>
                  </View>

                  <View style={ui.statusRowModal}>
                    <Text style={ui.statusLabelModal}>Jadwal Shift:</Text>
                    <Text style={ui.statusValModal}>{selectedOfficerDetail.shift}</Text>
                  </View>

                  <View style={ui.statusRowModal}>
                    <Text style={ui.statusLabelModal}>Area Gedung:</Text>
                    <Text style={ui.statusValModal}>{selectedOfficerDetail.area}</Text>
                  </View>

                  <View style={ui.statusRowModal}>
                    <Text style={ui.statusLabelModal}>No. Telepon:</Text>
                    <Text style={ui.statusValModal}>{selectedOfficerDetail.phone}</Text>
                  </View>
                </ScrollView>

                <View style={{ gap: 6, marginTop: 4 }}>
                  <TouchableOpacity
                    style={ui.actionSheetBtnPrimary}
                    onPress={() => {
                      const officer = selectedOfficerDetail;
                      setSelectedOfficerDetail(null);
                      setFormPetugas(`${officer.name} (${officer.id})`);
                      setActiveTab('workorders');
                      setIsCreatingWorkOrder(true);
                    }}
                  >
                    <Text style={ui.actionSheetBtnPrimaryText}>
                      Tugaskan Work Order ke {selectedOfficerDetail.name}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[ui.btnCloseModal, { marginTop: 2 }]}
                    onPress={() => setSelectedOfficerDetail(null)}
                  >
                    <Text style={ui.btnCloseModalText}>Tutup</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </DraggableSheet>
        </View>
      </Modal>

      {/* Modal Tambah Petugas Baru (ID Petugas PTG-xxx Dibuat Otomatis oleh Sistem) */}
      <Modal
        visible={showAddOfficerModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddOfficerModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <View style={ui.modalOverlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setShowAddOfficerModal(false)}
            />
            <DraggableSheet style={ui.addAssetModalSheet} onClose={() => setShowAddOfficerModal(false)}>
              <Text style={ui.addAssetModalTitle}>Daftarkan Petugas Baru</Text>
              <Text style={ui.addAssetModalSub}>
                ID Petugas dibuat otomatis oleh sistem untuk login petugas.
              </Text>

              <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                <View style={{ gap: 10, paddingVertical: 8 }}>
                  <View>
                    <Text style={ui.inputFieldLabel}>ID Petugas (Dibuat Otomatis)</Text>
                    <View
                      style={[
                        ui.inputField,
                        {
                          backgroundColor: '#EFF6FF',
                          borderColor: '#BFDBFE',
                          justifyContent: 'center',
                        },
                      ]}
                    >
                      <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#1D4ED8' }}>
                        {nextAutoOfficerId}
                      </Text>
                    </View>
                  </View>

                  <View>
                    <Text style={ui.inputFieldLabel}>Nama Lengkap Petugas *</Text>
                    <TextInput
                      style={ui.inputField}
                      placeholder="Contoh: Budi Santoso"
                      placeholderTextColor="#9CA3AF"
                      value={newOfficerName}
                      onChangeText={setNewOfficerName}
                    />
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={ui.inputFieldLabel}>Email Login</Text>
                      <TextInput
                        style={ui.inputField}
                        placeholder="budi@kampus.ac.id"
                        placeholderTextColor="#9CA3AF"
                        value={newOfficerEmail}
                        onChangeText={setNewOfficerEmail}
                        autoCapitalize="none"
                      />
                    </View>
                    <View style={{ width: 110 }}>
                      <Text style={ui.inputFieldLabel}>Kata Sandi</Text>
                      <TextInput
                        style={ui.inputField}
                        placeholder="123"
                        placeholderTextColor="#9CA3AF"
                        value={newOfficerPassword}
                        onChangeText={setNewOfficerPassword}
                      />
                    </View>
                  </View>

                  <View>
                    <Text style={ui.inputFieldLabel}>Bagian / Jabatan</Text>
                    <TextInput
                      style={ui.inputField}
                      placeholder="Contoh: Petugas Pemeliharaan Fasilitas"
                      placeholderTextColor="#9CA3AF"
                      value={newOfficerRole}
                      onChangeText={setNewOfficerRole}
                    />
                  </View>

                  <View>
                    <Text style={ui.inputFieldLabel}>Jadwal Shift</Text>
                    <TextInput
                      style={ui.inputField}
                      placeholder="Contoh: Shift Pagi (07:00 - 15:00)"
                      placeholderTextColor="#9CA3AF"
                      value={newOfficerShift}
                      onChangeText={setNewOfficerShift}
                    />
                  </View>

                  <View>
                    <Text style={ui.inputFieldLabel}>Area Gedung Tugas</Text>
                    <TextInput
                      style={ui.inputField}
                      placeholder="Contoh: Gedung A & Perpustakaan"
                      placeholderTextColor="#9CA3AF"
                      value={newOfficerArea}
                      onChangeText={setNewOfficerArea}
                    />
                  </View>

                  <View>
                    <Text style={ui.inputFieldLabel}>Nomor Telepon</Text>
                    <TextInput
                      style={ui.inputField}
                      placeholder="0812-3456-7890"
                      placeholderTextColor="#9CA3AF"
                      value={newOfficerPhone}
                      onChangeText={setNewOfficerPhone}
                    />
                  </View>
                </View>
              </ScrollView>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                <TouchableOpacity
                  style={ui.btnCancelAddAsset}
                  onPress={() => setShowAddOfficerModal(false)}
                >
                  <Text style={ui.btnCancelAddAssetText}>Batal</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[ui.btnSaveAddAsset, submittingOfficer && { opacity: 0.6 }]}
                  onPress={handleCreateOfficer}
                  disabled={submittingOfficer}
                >
                  <Text style={ui.btnSaveAddAssetText}>
                    {submittingOfficer ? 'Menyimpan...' : `Simpan (${nextAutoOfficerId})`}
                  </Text>
                </TouchableOpacity>
              </View>
            </DraggableSheet>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Notifikasi Real-Time Seragam Admin */}
      <NotificationModal
        visible={showAdminNotifications}
        roleTitle="Notifikasi Admin"
        items={adminNotifItems}
        onClose={() => setShowAdminNotifications(false)}
        onDismissItem={key =>
          setDismissedAdminNotifKeys(prev => (prev.includes(key) ? prev : [...prev, key]))
        }
        onDismissAll={() =>
          setDismissedAdminNotifKeys(prev => [
            ...prev,
            ...adminNotifItems.map(i => i.key),
          ])
        }
      />

      {/* Pop-up Banner Otomatis Saat Petugas Mengirim Laporan atau Menyelesaikan Tugas */}
      <RealtimePopupBanner
        banner={adminPopupBanner}
        onDismiss={() => setAdminPopupBanner(null)}
      />

      {/* Server Config Modal */}
      <ServerConfigModal
        visible={showConfig}
        onClose={() => setShowConfig(false)}
        onSaved={() => loadData()}
      />
    </SafeAreaView>
  );
}
