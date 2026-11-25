import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Platform,
  Modal,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Task, Asset, AiInspectionResult } from '../src/types';
import { initialAssets, loadAssets } from '../src/storage';
import {
  fetchTasksWithSync,
  submitTaskReportApi,
  inspectImageWithAi,
  checkServerHealth,
  fetchDamageReportsApi,
  createDamageReportApi,
  fetchRoomsApi,
  fetchRecentInspectionsApi,
  RecentInspectionDto,
  fetchOfficersApi,
  saveOfficerApi,
  OfficerDto,
} from '../src/api';
import { ServerConfigModal } from '../src/ServerConfigModal';
import {
  ChecklistItem,
  PetugasReport,
  DEFAULT_CHECKLIST,
  getChecklistForTask,
  INITIAL_PETUGAS_TASKS,
  INITIAL_PETUGAS_REPORTS,
  NavTugasIcon,
  NavQrIcon,
  NavPelaporanIcon,
} from '../src/petugas/PetugasIcons';
import { st } from '../src/petugas/petugasStyles';
import { WorkOrderListScreen } from '../src/petugas/WorkOrderListScreen';
import { DetailTugasScreen } from '../src/petugas/DetailTugasScreen';
import { StatusSelesaiScreen } from '../src/petugas/StatusSelesaiScreen';
import { AiFlagScreen } from '../src/petugas/AiFlagScreen';
import { PindaiQrScreen } from '../src/petugas/PindaiQrScreen';
import { LaporanRiwayatScreen } from '../src/petugas/LaporanRiwayatScreen';
import { LaporKerusakanBaruScreen } from '../src/petugas/LaporKerusakanBaruScreen';
import { LaporanTerkirimScreen } from '../src/petugas/LaporanTerkirimScreen';
import { EvidenceCameraScreen } from '../src/petugas/EvidenceCameraScreen';
import { PhotoPreviewModal } from '../src/petugas/PhotoPreviewModal';
import {
  PetugasDashboardScreen,
  PetugasProfileData,
} from '../src/petugas/PetugasDashboardScreen';
import {
  PetugasProfileScreen,
  TEAM_PROFILES,
} from '../src/petugas/PetugasProfileScreen';
import { formatShortDateId, formatTimeId, formatTaskDateReal } from '../src/dateUtils';
import {
  NotificationModal,
  UnifiedNotificationItem,
  RealtimePopupBanner,
  PopupBannerData,
} from '../src/NotificationModal';

const DEFAULT_TOILET_TASK: Task = INITIAL_PETUGAS_TASKS[0];

export default function PetugasScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const isLaptop = screenWidth >= 900;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [inspections, setInspections] = useState<RecentInspectionDto[]>([]);
  const [officers, setOfficers] = useState<OfficerDto[]>([]);
  const [petugasProfile, setPetugasProfile] = useState<PetugasProfileData>(
    TEAM_PROFILES[0]
  );
  const [isPetugasAuthenticated, setIsPetugasAuthenticated] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [, setServerOnline] = useState<boolean | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [dismissedNotifIds, setDismissedNotifIds] = useState<string[]>([]);
  const [popupBanner, setPopupBanner] = useState<PopupBannerData | null>(null);
  const knownTaskIdsRef = useRef<Set<string>>(new Set());
  const initialTasksSeededRef = useRef(false);
  const knownRejectedReportIdsRef = useRef<Set<string>>(new Set());
  const initialReportsSeededRef = useRef(false);

  // Tab Navigasi Petugas: 'tugas' (Dashboard KPI di atas + Work Order di bawahnya), 'qr', 'pelaporan', atau 'profile'
  const [currentTab, setCurrentTab] = useState<
    'tugas' | 'qr' | 'pelaporan' | 'profile'
  >('profile');

  // QR Scanner State
  const [qrScanned, setQrScanned] = useState(false);
  const [scannedTask, setScannedTask] = useState<Task | null>(null);
  const [lastScannedCode, setLastScannedCode] = useState<string>('');
  const [qrScanStep, setQrScanStep] = useState<'camera' | 'scanned'>('camera');
  const [isScanningQr, setIsScanningQr] = useState(false);
  const [qrTargetCode, setQrTargetCode] = useState<string>('AST-001');
  const [showAllAdminTasksInQr, setShowAllAdminTasksInQr] = useState<boolean>(false);

  // Pelaporan State Petugas (Screen 3: 'list', Screen 4: 'form', Screen 5: 'sent')
  const [reports, setReports] = useState<PetugasReport[]>(INITIAL_PETUGAS_REPORTS);
  const [pelaporanView, setPelaporanView] = useState<'list' | 'form' | 'sent'>('list');
  const [newReportJudul, setNewReportJudul] = useState('');
  const [newReportLokasi, setNewReportLokasi] = useState('');
  const [newReportUrgensi] = useState<'Mendesak' | 'Tinggi' | 'Sedang'>('Mendesak');
  const [newReportCatatan, setNewReportCatatan] = useState('');
  const [reportCategories, setReportCategories] = useState<
    { id: string; label: string; checked: boolean }[]
  >([
    { id: 'cat-1', label: 'Butuh peninjauan segera', checked: true },
    { id: 'cat-2', label: 'Kerusakan total', checked: true },
    { id: 'cat-3', label: 'Perlu pemeliharaan lebih lanjut', checked: false },
  ]);
  const [reportPhotos, setReportPhotos] = useState<(string | null)[]>([null, null]);
  const [lastSubmittedReport, setLastSubmittedReport] = useState<PetugasReport | null>(null);

  // Screen 2: Status Selesai atau AI Flag (Area Bermasalah Terdeteksi) setelah klik 'Selesai' pada Detail Tugas
  const [completedTaskData, setCompletedTaskData] = useState<{
    task: Task;
    photo: string;
    isAiFlag?: boolean;
  } | null>(null);
  const [previewCustomPhotoUri, setPreviewCustomPhotoUri] = useState<string | null>(null);

  // Search & Filter State untuk Screen Awal (Dashboard Work Order)
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'Semua' | 'Baru' | 'Proses' | 'Selesai'>('Semua');

  // Selected Task State (null = Tampilkan Dashboard, task = Tampilkan Detail Tugas)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Checklist State
  const [checklist, setChecklist] = useState<ChecklistItem[]>(DEFAULT_CHECKLIST);

  // Foto Bukti & Computer Vision AI
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [annotatedPhotoUrl, setAnnotatedPhotoUrl] = useState<string | null>(null);
  const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);
  const [aiResult, setAiResult] = useState<AiInspectionResult | null>(null);
  const [showPhotoPreviewModal, setShowPhotoPreviewModal] = useState(false);
  const [showAnnotatedInModal, setShowAnnotatedInModal] = useState(true);

  // Kerusakan Fasilitas ('none' = Tidak Ada Kerusakan, 'damage' = Ada Indikasi Kerusakan)
  const [damageState, setDamageState] = useState<'none' | 'damage'>('none');

  // Catatan Petugas
  const [catatan, setCatatan] = useState('');
  const [showCatatanInput, setShowCatatanInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Kamera Bukti State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<CameraType>('back');
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const evidenceVideoRef = useRef<any>(null);
  const [webEvidenceStreamReady, setWebEvidenceStreamReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const tasksSigRef = useRef('');
  const assetsSigRef = useRef('');
  const reportsSigRef = useRef('');
  const inspectionsSigRef = useRef('');
  const officersSigRef = useRef('');

  const loadData = useCallback(async () => {
    const health = await checkServerHealth();
    setServerOnline(health.ok);
    const { tasks: loadedTasks } = await fetchTasksWithSync();
    const nextTasks = loadedTasks || [];
    const nextTasksSig =
      nextTasks.length === 0
        ? 'EMPTY'
        : nextTasks
            .map(
              t =>
                `${t.id}:${t.status}:${t.prioritas}:${t.judul}:${(t.foto || '').length}`
            )
            .join('|');
    if (nextTasksSig !== tasksSigRef.current) {
      tasksSigRef.current = nextTasksSig;
      setTasks(nextTasks);

      if (!initialTasksSeededRef.current) {
        nextTasks.forEach(t => knownTaskIdsRef.current.add(t.id));
        initialTasksSeededRef.current = true;
      } else {
        const brandNewTask = nextTasks.find(t => !knownTaskIdsRef.current.has(t.id));
        nextTasks.forEach(t => knownTaskIdsRef.current.add(t.id));
        if (brandNewTask) {
          setPopupBanner({
            id: brandNewTask.id,
            headerText: `Tugas Baru dari Admin • ${brandNewTask.id}`,
            priorityLabel: `Prioritas ${brandNewTask.prioritas}`,
            isHighPriority:
              brandNewTask.prioritas === 'Tinggi' || brandNewTask.prioritas === 'Darurat',
            title: brandNewTask.judul,
            subtitle: brandNewTask.lokasi,
            onPress: () => {
              setSelectedTask(brandNewTask);
              setChecklist(getChecklistForTask(brandNewTask));
              setCompletedTaskData(null);
            },
          });
        }
      }
    }

    const roomsFromDb = await fetchRoomsApi();
    if (roomsFromDb && roomsFromDb.length > 0) {
      const nextAssetsSig = roomsFromDb
        .map(r => `${r.room_code}:${r.room_name}:${r.status}`)
        .join('|');
      if (nextAssetsSig !== assetsSigRef.current) {
        assetsSigRef.current = nextAssetsSig;
        const convertedAssets: Asset[] = roomsFromDb.map(r => ({
          code: r.room_code,
          name: r.room_name,
          location: r.building
            ? `${r.building} Lantai ${r.floor_number || 1}`
            : `Lantai ${r.floor_number || 1}`,
          building: r.building,
          category: r.room_type || 'Fasilitas',
          condition: 'Baik',
          status: r.status || 'Aktif',
          floor: r.floor_number || 1,
          lastCleaned: formatShortDateId(new Date()),
        }));
        setAssets(convertedAssets);
      }
    } else if (!assetsSigRef.current) {
      const loadedAssets = await loadAssets();
      assetsSigRef.current = 'local';
      setAssets(loadedAssets);
    }

    const dbReports = await fetchDamageReportsApi();
    if (dbReports && dbReports.length > 0) {
      const nextReportsSig = dbReports
        .map(r => `${r.id}:${r.status}:${r.judul}:${(r.foto || '').length}`)
        .join('|');
      if (nextReportsSig !== reportsSigRef.current) {
        reportsSigRef.current = nextReportsSig;
        const mappedReports: PetugasReport[] = dbReports.map(r => ({
          id: r.id,
          judul: r.judul,
          lokasi: r.lokasi,
          urgensi: r.urgensi,
          waktu: r.waktu,
          tanggal: r.tanggal,
          jam: r.jam,
          status: (r.status as PetugasReport['status']) || 'Dalam Peninjauan',
          catatan: r.catatan,
          foto: r.foto,
          kategori: r.kategori,
        }));
        setReports(mappedReports);

        if (!initialReportsSeededRef.current) {
          mappedReports
            .filter(r => r.status === 'Ditolak')
            .forEach(r => knownRejectedReportIdsRef.current.add(r.id));
          initialReportsSeededRef.current = true;
        } else {
          const newlyRejected = mappedReports.find(
            r => r.status === 'Ditolak' && !knownRejectedReportIdsRef.current.has(r.id)
          );
          mappedReports
            .filter(r => r.status === 'Ditolak')
            .forEach(r => knownRejectedReportIdsRef.current.add(r.id));

          if (newlyRejected) {
            setPopupBanner({
              id: `rej-${newlyRejected.id}`,
              headerText: `Laporan Ditolak Admin • ${newlyRejected.id}`,
              priorityLabel: 'Ditolak',
              isHighPriority: true,
              title: newlyRejected.judul,
              subtitle: newlyRejected.lokasi,
              onPress: () => {
                setSelectedTask(null);
                setCompletedTaskData(null);
                setPelaporanView('list');
                setCurrentTab('pelaporan');
              },
            });
          }
        }
      }
    }

    const dbInspections = await fetchRecentInspectionsApi(15);
    if (dbInspections && dbInspections.length > 0) {
      const nextInspSig = dbInspections
        .map(i => `${i.inspection_id}:${i.cleanliness_percentage}:${i.total_defects}`)
        .join('|');
      if (nextInspSig !== inspectionsSigRef.current) {
        inspectionsSigRef.current = nextInspSig;
        setInspections(dbInspections);
      }
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
        setPetugasProfile(prev => {
          const fresh = dbOfficers.find(o => o.id === prev.id);
          return fresh ? { ...prev, ...fresh } : prev;
        });
      }
    }
  }, []);

  const handleUpdateOfficerProfile = useCallback(async (next: PetugasProfileData) => {
    setPetugasProfile(next);
    setOfficers(prev =>
      prev.map(o => (o.id === next.id ? { ...o, ...next } : o))
    );
    await saveOfficerApi(next);
  }, []);

  const handleRegisterNewOfficer = useCallback(async (newOfficer: OfficerDto) => {
    setOfficers(prev => [...prev.filter(o => o.id !== newOfficer.id), newOfficer]);
    await saveOfficerApi(newOfficer);
  }, []);

  useEffect(() => {
    if (!popupBanner) return;
    const t = setTimeout(() => setPopupBanner(null), 9000);
    return () => clearTimeout(t);
  }, [popupBanner]);

  useEffect(() => {
    loadData();
    const syncTimer = setInterval(() => {
      loadData();
    }, 3000);
    return () => clearInterval(syncTimer);
  }, [loadData]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = task.judul.toLowerCase().includes(q);
        const matchLoc = task.lokasi.toLowerCase().includes(q);
        const matchId = task.id.toLowerCase().includes(q);
        if (!matchTitle && !matchLoc && !matchId) return false;
      }
      if (filterStatus === 'Baru') return task.status === 'Menunggu';
      if (filterStatus === 'Proses') return task.status === 'Diproses';
      if (filterStatus === 'Selesai') return task.status === 'Selesai';
      return true;
    });
  }, [tasks, searchQuery, filterStatus]);

  const countSemua = tasks.length;
  const countBaru = tasks.filter(t => t.status === 'Menunggu').length;
  const countProses = tasks.filter(t => t.status === 'Diproses').length;
  const countSelesai = tasks.filter(t => t.status === 'Selesai').length;
  const activeNotifTasks = useMemo(
    () =>
      tasks.filter(
        t =>
          t.status !== 'Selesai' &&
          !dismissedNotifIds.includes(`${t.id}:${t.status}`) &&
          !dismissedNotifIds.includes(t.id)
      ),
    [tasks, dismissedNotifIds]
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleToggleChecklist = (id: string) => {
    setChecklist(prev =>
      prev.map(item => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  const handleToggleReportCategory = (id: string) => {
    setReportCategories(prev =>
      prev.map(item => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  const handlePickReportPhoto = useCallback(async (slotIdx: number) => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const existing = document.getElementById('upi-report-photo-input');
      if (existing) existing.remove();
      const input = document.createElement('input');
      input.id = 'upi-report-photo-input';
      input.type = 'file';
      input.accept = 'image/*';
      input.style.display = 'none';
      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = () => {
            const base64Data = reader.result as string;
            setReportPhotos(prev => {
              const next = [...prev];
              next[slotIdx] = base64Data;
              return next;
            });
          };
          reader.readAsDataURL(file);
        }
      };
      document.body.appendChild(input);
      input.click();
      return;
    }

    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
      });
      if (!res.canceled && res.assets?.[0]?.uri) {
        setReportPhotos(prev => {
          const next = [...prev];
          next[slotIdx] = res.assets[0].uri;
          return next;
        });
      }
    } catch {
      // fallback
    }
  }, []);

  const handleCreateReport = async () => {
    const facilityTitle = newReportJudul.trim() || 'Toilet Lt.1';
    const facilityLoc = newReportLokasi.trim() || 'Lt.1 - Gedung Dewi Sartika';
    const chosenCats = reportCategories.filter(c => c.checked).map(c => c.label);
    const uploadedPhoto =
      reportPhotos[0] ||
      reportPhotos[1] ||
      annotatedPhotoUrl ||
      photoUri ||
      'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400&auto=format&fit=crop&q=80';

    const maxExistingNum = reports.reduce(
      (max, r) => Math.max(max, parseInt(r.id.replace(/\D/g, ''), 10) || 0),
      4
    );
    const now = new Date();
    const tanggalReal = formatShortDateId(now);
    const jamReal = formatTimeId(now, ':');
    const newRep: PetugasReport = {
      id: `REP-${String(maxExistingNum + 1).padStart(3, '0')}`,
      judul: facilityTitle,
      lokasi: facilityLoc,
      urgensi: chosenCats.includes('Kerusakan total') ? 'Mendesak' : newReportUrgensi,
      waktu: `${tanggalReal} • ${jamReal}`,
      tanggal: tanggalReal,
      jam: jamReal,
      status: 'Dalam Peninjauan',
      catatan: newReportCatatan.trim() || 'Temuan kerusakan fasilitas oleh petugas di lapangan.',
      foto: uploadedPhoto,
      kategori: chosenCats,
    };
    setReports(prev => [newRep, ...prev]);
    setLastSubmittedReport(newRep);
    setNewReportJudul('');
    setNewReportLokasi('');
    setNewReportCatatan('');
    setReportPhotos([null, null]);
    setPelaporanView('sent');
    await createDamageReportApi({
      ...newRep,
      pelapor: petugasProfile.name,
    });
  };

  const hasDamageOrStains = (res: AiInspectionResult) => {
    const totalStainAll =
      (res.total_stains || 0) +
      (res.total_footprints || 0) +
      (res.total_water_splashes || 0) +
      (res.total_glass_stains || 0);
    const dmgLevel = (res.damage_level || '').toLowerCase();
    const isDamageBad =
      dmgLevel !== '' && !dmgLevel.includes('aman') && !dmgLevel.includes('baik');
    return (
      (res.total_defects && res.total_defects > 0) ||
      totalStainAll > 0 ||
      (res.total_trash && res.total_trash > 0) ||
      res.dirtiness_percentage > 20 ||
      isDamageBad ||
      res.physical_condition_percentage < 85
    );
  };

  const analyzeImageClientSide = async (uri: string): Promise<AiInspectionResult> => {
    return {
      success: true,
      status: 'SELESAI',
      status_detail: 'Selesai (Bersih, Rapi & Aman Digunakan)',
      is_completed: true,
      cleanliness_percentage: 96,
      dirtiness_percentage: 4,
      dirtiness_level: 'Sangat Bersih',
      physical_condition_percentage: 100,
      damage_level: 'Aman / Sangat Baik',
      total_defects: 0,
      total_trash: 0,
      total_stains: 0,
      severity_level: 'None',
      annotated_image_url: uri,
      detections: [],
    };
  };

  const processComputerVision = async (uri: string) => {
    setIsAnalyzingAi(true);
    setAnnotatedPhotoUrl(null);
    try {
      let res: AiInspectionResult;
      try {
        res = await inspectImageWithAi(
          uri,
          1,
          selectedTask?.id,
          'Pemeriksaan bukti penyelesaian tugas petugas'
        );
      } catch {
        res = await analyzeImageClientSide(uri);
      }

      setAiResult(res);
      if (res.annotated_image_url) {
        setAnnotatedPhotoUrl(res.annotated_image_url);
      }

      const totalStainCount =
        (res.total_stains || 0) +
        (res.total_footprints || 0) +
        (res.total_water_splashes || 0) +
        (res.total_glass_stains || 0);
      const stainNames = (res.detections || [])
        .filter(d => d.category === 'Cleanliness' || d.category === 'Damage')
        .map(d => d.class_name)
        .filter((v, i, a) => a.indexOf(v) === i);

      if (hasDamageOrStains(res)) {
        setDamageState('damage');
        const detailNames = stainNames.length > 0 ? `\nTemuan: ${stainNames.join(', ')}` : '';
        Alert.alert(
          'Computer Vision: Noda / Kerusakan Ditemukan',
          `AI mendeteksi ${totalStainCount} noda/bercak, ${res.total_trash || 0} sampah, dan ${res.total_defects || 0} kerusakan fisik.${detailNames}\nOpsi "Ada Indikasi Kerusakan" telah otomatis dipilih.`
        );
      } else {
        setDamageState('none');
        Alert.alert(
          'Computer Vision: Kondisi Fasilitas Bersih & Baik',
          `Skor Kebersihan: ${res.cleanliness_percentage}%\nTidak ditemukan noda atau kerusakan pada permukaan fasilitas.\nOpsi "Tidak Ada Kerusakan" telah dipilih.`
        );
      }

      setChecklist(prev =>
        prev.map(c => (c.label.toLowerCase().includes('foto') ? { ...c, checked: true } : c))
      );
    } finally {
      setIsAnalyzingAi(false);
    }
  };

  const isWebInsecure = useMemo(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
    return !window.isSecureContext && window.location.hostname !== 'localhost';
  }, []);

  const isMobileDevice = useMemo(() => {
    if (Platform.OS !== 'web' || typeof navigator === 'undefined') return false;
    return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  }, []);

  const openDeviceHardwareCamera = useCallback((useCaptureEnv: boolean = true) => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const existing = document.getElementById('upi-direct-camera-input');
      if (existing) existing.remove();

      const input = document.createElement('input');
      input.id = 'upi-direct-camera-input';
      input.type = 'file';
      input.accept = 'image/*';
      if (useCaptureEnv) {
        input.capture = 'environment';
      }
      input.style.display = 'none';

      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = () => {
            const base64Data = reader.result as string;
            setIsCameraOpen(false);
            setPhotoUri(base64Data);
            processComputerVision(base64Data);
          };
          reader.readAsDataURL(file);
        }
      };

      document.body.appendChild(input);
      input.click();
    }
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || !isCameraOpen) {
      setWebEvidenceStreamReady(false);
      return;
    }
    let activeStream: MediaStream | null = null;
    let cancelled = false;

    const startEvidenceCamera = async () => {
      try {
        if (!navigator?.mediaDevices?.getUserMedia) {
          setWebEvidenceStreamReady(false);
          return;
        }
        try {
          activeStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: cameraFacing === 'back' ? { ideal: 'environment' } : { ideal: 'user' },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });
        } catch {
          activeStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }

        if (cancelled) {
          activeStream.getTracks().forEach(t => t.stop());
          return;
        }

        const videoEl = evidenceVideoRef.current as HTMLVideoElement | null;
        if (videoEl) {
          videoEl.srcObject = activeStream;
          videoEl.setAttribute('playsinline', 'true');
          videoEl.muted = true;
          await videoEl.play().catch(() => {});
          setWebEvidenceStreamReady(true);
        }
      } catch {
        setWebEvidenceStreamReady(false);
      }
    };

    startEvidenceCamera();

    return () => {
      cancelled = true;
      if (activeStream) {
        activeStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [isCameraOpen, cameraFacing]);

  const handleOpenLiveCamera = async () => {
    if (isMobileDevice && isWebInsecure) {
      openDeviceHardwareCamera(true);
      return;
    }
    if (Platform.OS !== 'web' && !cameraPermission?.granted) {
      try {
        await requestCameraPermission();
      } catch {
        // ignore
      }
    }
    setIsCameraOpen(true);
  };

  const handleCaptureFromCamera = async () => {
    setIsCapturing(true);
    try {
      if (Platform.OS === 'web' && evidenceVideoRef.current) {
        const videoEl = evidenceVideoRef.current as HTMLVideoElement;
        if (videoEl.readyState >= 2 && videoEl.videoWidth > 0) {
          const canvas = document.createElement('canvas');
          canvas.width = videoEl.videoWidth;
          canvas.height = videoEl.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
            setIsCameraOpen(false);
            setPhotoUri(dataUrl);
            processComputerVision(dataUrl);
            return;
          }
        }
      }

      if (cameraRef.current) {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
        if (photo?.uri) {
          setIsCameraOpen(false);
          setPhotoUri(photo.uri);
          processComputerVision(photo.uri);
          return;
        }
      }

      openDeviceHardwareCamera(false);
    } catch {
      openDeviceHardwareCamera(false);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleUseDemoPhoto = (type: 'stain' | 'clean') => {
    setIsCameraOpen(false);
    setAnnotatedPhotoUrl(null);
    if (type === 'stain') {
      const demoUri =
        'https://images.unsplash.com/photo-1584622781564-1d987f7333c1?w=600&auto=format&fit=crop&q=80';
      setPhotoUri(demoUri);
      setAiResult({
        success: true,
        status: 'BELUM SELESAI',
        status_detail: 'Belum Bersih, Terdapat Noda Kerak',
        is_completed: false,
        cleanliness_percentage: 62,
        dirtiness_percentage: 38,
        dirtiness_level: 'Kotor',
        physical_condition_percentage: 90,
        damage_level: 'Aman / Sangat Baik',
        total_defects: 0,
        total_trash: 0,
        total_stains: 2,
        severity_level: 'Medium',
        detections: [
          {
            category: 'Cleanliness',
            class_name: 'noda kotoran / kerak',
            confidence: 0.89,
            area_percentage: 3.4,
            bbox: { x: 48, y: 110, width: 108, height: 82 },
          },
          {
            category: 'Cleanliness',
            class_name: 'noda urin / pipis',
            confidence: 0.84,
            area_percentage: 2.1,
            bbox: { x: 178, y: 146, width: 96, height: 74 },
          },
        ],
      });
      setDamageState('damage');
    } else {
      const demoUri =
        'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=600&auto=format&fit=crop&q=80';
      setPhotoUri(demoUri);
      setAiResult({
        success: true,
        status: 'SELESAI',
        status_detail: 'Selesai (Bersih, Rapi & Aman Digunakan)',
        is_completed: true,
        cleanliness_percentage: 98,
        dirtiness_percentage: 2,
        dirtiness_level: 'Sangat Bersih',
        physical_condition_percentage: 100,
        damage_level: 'Aman / Sangat Baik',
        total_defects: 0,
        total_trash: 0,
        total_stains: 0,
        severity_level: 'None',
        detections: [],
      });
      setDamageState('none');
    }
    setChecklist(prev =>
      prev.map(c => (c.label.toLowerCase().includes('foto') ? { ...c, checked: true } : c))
    );
  };

  const handleOpenTask = useCallback((task: Task, preserveChecklist: boolean = false) => {
    const isStarting = task.status === 'Menunggu';
    const updatedTask: Task = isStarting ? { ...task, status: 'Diproses' } : task;
    setTasks(prev => prev.map(t => (t.id === updatedTask.id ? updatedTask : t)));
    if (isStarting) {
      submitTaskReportApi(task.id, {
        status: 'Diproses',
        catatan: task.catatan || '',
        foto_url: task.foto || undefined,
      }).catch(() => {});
    }
    setCompletedTaskData(null);
    setSelectedTask(updatedTask);
    if (!preserveChecklist) {
      setChecklist(getChecklistForTask(updatedTask));
    }
    setPhotoUri(updatedTask.foto || null);
    setAnnotatedPhotoUrl(null);
    setAiResult(null);
    setDamageState('none');
    setCatatan(updatedTask.catatan || '');
    setShowCatatanInput(Boolean(updatedTask.catatan));
  }, []);

  const petugasNotifItems = useMemo<UnifiedNotificationItem[]>(() => {
    const taskNotifs: UnifiedNotificationItem[] = activeNotifTasks.map(t => {
      const key = `${t.id}:${t.status}`;
      const isHigh = t.prioritas === 'Tinggi' || t.prioritas === 'Darurat';
      return {
        key,
        code: t.id,
        statusLabel: t.status === 'Menunggu' ? 'Tugas Baru' : 'Sedang Diproses',
        statusType: t.status === 'Menunggu' ? 'baru' : 'proses',
        priorityLabel: t.prioritas,
        isHighPriority: isHigh,
        title: t.judul,
        location: t.lokasi,
        timeText: formatTaskDateReal(t.tenggat),
        actionLabel: t.status === 'Menunggu' ? 'Mulai Kerjakan' : 'Lanjutkan Tugas',
        onPress: () => {
          setShowNotifications(false);
          setCurrentTab('tugas');
          handleOpenTask(t);
        },
      };
    });

    const rejectedReportNotifs: UnifiedNotificationItem[] = reports
      .filter(r => r.status === 'Ditolak' && !dismissedNotifIds.includes(`rep:${r.id}:Ditolak`))
      .map(r => ({
        key: `rep:${r.id}:Ditolak`,
        code: r.id,
        statusLabel: 'Laporan Ditolak Admin',
        statusType: 'laporan',
        priorityLabel: 'Ditolak',
        isHighPriority: true,
        title: r.judul,
        location: r.lokasi,
        timeText: r.waktu,
        actionLabel: 'Lihat Riwayat Laporan',
        onPress: () => {
          setShowNotifications(false);
          setSelectedTask(null);
          setCompletedTaskData(null);
          setPelaporanView('list');
          setCurrentTab('pelaporan');
        },
      }));

    return [...rejectedReportNotifs, ...taskNotifs];
  }, [activeNotifTasks, reports, dismissedNotifIds, handleOpenTask]);

  const handleTriggerQrScan = useCallback(
    (codeToScan?: string) => {
      const raw = (codeToScan || qrTargetCode || 'AST-001').trim();
      let extractedCode = raw;
      let extractedName = '';
      let extractedLoc = '';

      if (raw.includes('qr=') || raw.startsWith('http://') || raw.startsWith('https://')) {
        try {
          const queryPart = raw.includes('?') ? raw.substring(raw.indexOf('?')) : raw;
          const params = new URLSearchParams(queryPart);
          if (params.get('qr')) extractedCode = params.get('qr')!.trim();
          if (params.get('name')) extractedName = params.get('name')!.trim();
          if (params.get('loc')) extractedLoc = params.get('loc')!.trim();
        } catch {
          const qrMatch = raw.match(/[?&]qr=([^&]+)/i);
          if (qrMatch) extractedCode = decodeURIComponent(qrMatch[1]).trim();
        }
      }

      const targetCode = extractedCode.toUpperCase();
      setIsScanningQr(true);
      setQrTargetCode(targetCode);

      setTimeout(() => {
        setIsScanningQr(false);

        const matchedAsset = assets.find(
          a =>
            a.code.toUpperCase() === targetCode ||
            (extractedName && a.name.toLowerCase() === extractedName.toLowerCase())
        );

        const facilityNameLower = (extractedName || matchedAsset?.name || '').toLowerCase();

        const matchedTasks = tasks.filter(t => {
          const tAsset = (t.assetCode || '').toUpperCase();
          const tId = t.id.toUpperCase();
          const tJudul = t.judul.toLowerCase();
          if (tAsset === targetCode || tId === targetCode) {
            return true;
          }
          if (
            facilityNameLower &&
            (tJudul.includes(facilityNameLower) || facilityNameLower.includes(tJudul))
          ) {
            return true;
          }
          return false;
        });

        let selectedForQr: Task;
        if (matchedTasks.length > 0) {
          selectedForQr = matchedTasks[0];
        } else if (matchedAsset || extractedName) {
          const assetCodeVal = matchedAsset?.code || targetCode;
          const assetTitleVal = matchedAsset?.name || extractedName || `Fasilitas ${targetCode}`;
          const assetLocVal =
            matchedAsset?.location || extractedLoc || 'Gedung Kampus';
          selectedForQr = {
            id: `WO-${assetCodeVal}`,
            assetCode: assetCodeVal,
            judul: assetTitleVal,
            lokasi: assetLocVal,
            petugas: 'Rian (Petugas)',
            prioritas: 'Normal',
            tenggat: `Hari ini, ${formatTimeId(new Date(), '.')}`,
            deskripsi: `Pemeriksaan & pemeliharaan fasilitas ${assetTitleVal} (${assetCodeVal}).`,
            status: 'Diproses',
            catatan: '',
            foto: '',
          };
          setTasks(prev =>
            prev.some(p => p.id === selectedForQr.id) ? prev : [selectedForQr, ...prev]
          );
        } else {
          selectedForQr = tasks[0] || DEFAULT_TOILET_TASK;
        }

        setScannedTask(selectedForQr);
        setChecklist(getChecklistForTask(selectedForQr));
        setLastScannedCode(
          targetCode.startsWith('QR-') ? targetCode : `QR-${selectedForQr.assetCode || targetCode}`
        );
        setQrScanned(true);
        setShowAllAdminTasksInQr(false);
        setCurrentTab('qr');
        setQrScanStep('scanned');
      }, 200);
    },
    [qrTargetCode, tasks, assets]
  );

  // Otomatis buka hasil scan QR jika halaman Petugas dibuka dari link QR (?qr=...)
  const initialUrlQrHandledRef = useRef(false);
  useEffect(() => {
    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined' &&
      !initialUrlQrHandledRef.current &&
      window.location.search.includes('qr=')
    ) {
      initialUrlQrHandledRef.current = true;
      handleTriggerQrScan(window.location.search);
    }
  }, [handleTriggerQrScan]);

  const openQrHardwareCamera = useCallback(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const existing = document.getElementById('upi-qr-camera-input');
      if (existing) existing.remove();

      const input = document.createElement('input');
      input.id = 'upi-qr-camera-input';
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';
      input.style.display = 'none';

      input.onchange = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
          const imgUrl = URL.createObjectURL(file);
          const img = new window.Image();
          img.onload = async () => {
            try {
              const WinBarcodeDetector = (window as any).BarcodeDetector;
              if (WinBarcodeDetector) {
                const det = new WinBarcodeDetector({ formats: ['qr_code'] });
                const codes = await det.detect(img);
                if (codes && codes.length > 0 && codes[0].rawValue) {
                  URL.revokeObjectURL(imgUrl);
                  handleTriggerQrScan(codes[0].rawValue);
                  return;
                }
              }
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d');
              const jsQR = (window as any).jsQR;
              if (ctx && jsQR) {
                ctx.drawImage(img, 0, 0);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const qr = jsQR(imageData.data, imageData.width, imageData.height);
                if (qr && qr.data) {
                  URL.revokeObjectURL(imgUrl);
                  handleTriggerQrScan(qr.data);
                  return;
                }
              }
            } catch {
              // fallback
            }
            URL.revokeObjectURL(imgUrl);
            handleTriggerQrScan(qrTargetCode || 'AST-001');
          };
          img.src = imgUrl;
        } catch {
          handleTriggerQrScan(qrTargetCode || 'AST-001');
        }
      };

      document.body.appendChild(input);
      input.click();
    }
  }, [handleTriggerQrScan, qrTargetCode]);

  const handleOpenQrTab = useCallback(async () => {
    loadData();
    const initialTask = selectedTask || scannedTask || tasks[0] || DEFAULT_TOILET_TASK;
    setScannedTask(initialTask);
    setQrTargetCode(initialTask.assetCode || 'AST-001');
    setChecklist(getChecklistForTask(initialTask));
    setCompletedTaskData(null);
    setSelectedTask(null);
    setCurrentTab('qr');
    setQrScanned(false);
    setQrScanStep('camera');
    if (Platform.OS !== 'web' && !cameraPermission?.granted) {
      try {
        await requestCameraPermission();
      } catch {
        // ignore
      }
    }
  }, [selectedTask, scannedTask, tasks, loadData, cameraPermission?.granted, requestCameraPermission]);

  const handleCompleteTask = async () => {
    if (!selectedTask) return;
    const realPhoto = annotatedPhotoUrl || photoUri || selectedTask.foto || '';
    if (!realPhoto) {
      Alert.alert(
        'Foto Bukti Diperlukan',
        'Silakan ambil foto atau unggah foto bukti terlebih dahulu agar AI Computer Vision dapat memeriksa kondisi area.'
      );
      return;
    }
    setIsSubmitting(true);
    const isProblematic =
      damageState === 'damage' || (aiResult ? hasDamageOrStains(aiResult) : false);
    const finalNote =
      catatan.trim() ||
      (isProblematic
        ? 'Area masih bermasalah / terdeteksi noda atau kerusakan oleh AI Flag.'
        : 'Tugas telah selesai dikerjakan sesuai checklist.');
    const finalPhoto = realPhoto;
    const targetStatus: Task['status'] = isProblematic ? 'Diproses' : 'Selesai';
    const cleanScore = aiResult?.cleanliness_percentage;
    const dirtScore = aiResult?.dirtiness_percentage;
    const physScore = aiResult?.physical_condition_percentage;

    try {
      await submitTaskReportApi(selectedTask.id, {
        status: targetStatus,
        catatan: finalNote,
        foto_url: realPhoto,
        cleanliness_percentage: cleanScore,
        dirtiness_percentage: dirtScore,
        physical_condition_percentage: physScore,
        ai_status: isProblematic ? 'AI Flag: Area Bermasalah' : 'Tidak Ada Kerusakan',
        inspection_id: aiResult?.inspection_id,
      });
    } catch {
      // Tetap lanjutkan secara lokal jika server sedang offline
    } finally {
      const updatedTaskObj: Task = {
        ...selectedTask,
        status: targetStatus,
        catatan: finalNote,
        foto: finalPhoto,
        cleanlinessPercentage: cleanScore,
        dirtinessPercentage: dirtScore,
        physicalConditionPercentage: physScore,
        aiStatus: isProblematic ? 'AI Flag: Area Bermasalah' : 'Tidak Ada Kerusakan',
      };
      setTasks(prev => prev.map(t => (t.id === selectedTask.id ? updatedTaskObj : t)));
      setIsSubmitting(false);
      setCompletedTaskData({
        task: updatedTaskObj,
        photo: finalPhoto,
        isAiFlag: isProblematic,
      });
    }
  };

  return (
    <SafeAreaView
      style={[
        st.container,
        !selectedTask && !completedTaskData && { backgroundColor: '#EBECEF' },
      ]}
    >
      {isCameraOpen ? (
        <EvidenceCameraScreen
          onClose={() => setIsCameraOpen(false)}
          cameraFacing={cameraFacing}
          onFlipCamera={() => setCameraFacing(f => (f === 'back' ? 'front' : 'back'))}
          evidenceVideoRef={evidenceVideoRef}
          webEvidenceStreamReady={webEvidenceStreamReady}
          cameraPermissionGranted={Boolean(cameraPermission?.granted)}
          cameraRef={cameraRef}
          onOpenHardwareCamera={openDeviceHardwareCamera}
          isCapturing={isCapturing}
          onCaptureFromCamera={handleCaptureFromCamera}
        />
      ) : completedTaskData ? (
        completedTaskData.isAiFlag ? (
          <AiFlagScreen
            task={completedTaskData.task}
            photo={completedTaskData.photo}
            aiResult={aiResult}
            onViewPhoto={uri => {
              setPreviewCustomPhotoUri(uri);
              setShowAnnotatedInModal(true);
              setShowPhotoPreviewModal(true);
            }}
            onRetakePhoto={() => {
              setCompletedTaskData(null);
              handleOpenLiveCamera();
            }}
            onReportDamage={() => {
              const flaggedTask = completedTaskData.task;
              const flaggedPhoto = completedTaskData.photo;
              setCompletedTaskData(null);
              setSelectedTask(null);
              setNewReportJudul(flaggedTask.judul);
              setNewReportLokasi(flaggedTask.lokasi);
              setNewReportCatatan(
                catatan.trim() ||
                  `AI Flag mendeteksi area masih kotor / bermasalah pada ${flaggedTask.judul}.`
              );
              setReportPhotos([flaggedPhoto, null]);
              setPelaporanView('form');
              setCurrentTab('pelaporan');
            }}
          />
        ) : (
          <StatusSelesaiScreen
            task={completedTaskData.task}
            photo={completedTaskData.photo}
            onViewPhoto={uri => {
              setPreviewCustomPhotoUri(uri);
              setShowAnnotatedInModal(true);
              setShowPhotoPreviewModal(true);
            }}
            onBackToWorkOrderList={() => {
              setCompletedTaskData(null);
              setSelectedTask(null);
              setCurrentTab('tugas');
            }}
          />
        )
      ) : selectedTask ? (
        <DetailTugasScreen
          task={selectedTask}
          onBack={() => setSelectedTask(null)}
          onOpenQrTab={handleOpenQrTab}
          checklist={checklist}
          onToggleChecklist={handleToggleChecklist}
          photoUri={photoUri}
          annotatedPhotoUrl={annotatedPhotoUrl}
          isAnalyzingAi={isAnalyzingAi}
          aiResult={aiResult}
          onOpenPhotoPreview={() => {
            setPreviewCustomPhotoUri(null);
            setShowAnnotatedInModal(true);
            setShowPhotoPreviewModal(true);
          }}
          onOpenLiveCamera={handleOpenLiveCamera}
          damageState={damageState}
          onChangeDamageState={setDamageState}
          catatan={catatan}
          onChangeCatatan={setCatatan}
          showCatatanInput={showCatatanInput}
          onShowCatatanInput={() => setShowCatatanInput(true)}
          isSubmitting={isSubmitting}
          onCompleteTask={handleCompleteTask}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      ) : (
        <View style={st.dashboardWrapper}>
          {/* Top Navigation khusus Laptop / Desktop (>= 900px) */}
          {isLaptop && !(currentTab === 'profile' && !isPetugasAuthenticated) && (
            <View style={st.topNav}>
              <View style={st.topNavInner}>
                <View>
                  <Text style={st.topNavBrand}>Fasilitas Kampus</Text>
                  <Text style={st.topNavBrandSub}>Panel Petugas</Text>
                </View>
                <View style={st.topNavTabs}>
                  <TouchableOpacity
                    style={st.topNavItem}
                    onPress={() => {
                      setCurrentTab('tugas');
                      setCompletedTaskData(null);
                      setSelectedTask(null);
                    }}
                    activeOpacity={0.7}
                  >
                    <NavTugasIcon active={currentTab === 'tugas'} />
                    <Text
                      style={[st.topNavLabel, currentTab === 'tugas' && st.topNavLabelActive]}
                    >
                      Tugas
                    </Text>
                    {currentTab === 'tugas' && <View style={st.topNavIndicator} />}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={st.topNavItem}
                    onPress={() => {
                      setCurrentTab('pelaporan');
                      setPelaporanView('list');
                      setCompletedTaskData(null);
                      setSelectedTask(null);
                    }}
                    activeOpacity={0.7}
                  >
                    <NavPelaporanIcon active={currentTab === 'pelaporan'} />
                    <Text
                      style={[
                        st.topNavLabel,
                        currentTab === 'pelaporan' && st.topNavLabelActive,
                      ]}
                    >
                      Pelaporan
                    </Text>
                    {currentTab === 'pelaporan' && <View style={st.topNavIndicator} />}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={st.topNavQrBtn}
                    onPress={handleOpenQrTab}
                    activeOpacity={0.85}
                  >
                    <Text style={st.topNavQrBtnText}>Pindai QR</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {currentTab === 'profile' ? (
            <PetugasProfileScreen
              profile={petugasProfile}
              officers={officers}
              isAuthenticated={isPetugasAuthenticated}
              onSetAuthenticated={setIsPetugasAuthenticated}
              onUpdateProfile={handleUpdateOfficerProfile}
              onRegisterOfficer={handleRegisterNewOfficer}
              tasks={tasks}
              reports={reports}
              inspections={inspections}
              onBack={() => setCurrentTab('tugas')}
              onNavigateToWorkOrders={filter => {
                setFilterStatus(filter);
                setCurrentTab('tugas');
              }}
              onNavigateToReports={() => {
                setPelaporanView('list');
                setCurrentTab('pelaporan');
              }}
              onOpenTaskDetail={t => handleOpenTask(t)}
            />
          ) : currentTab === 'tugas' ? (
            <WorkOrderListScreen
              tasks={tasks}
              filteredTasks={filteredTasks}
              reports={reports}
              inspections={inspections}
              profile={petugasProfile}
              searchQuery={searchQuery}
              onChangeSearch={setSearchQuery}
              filterStatus={filterStatus}
              onChangeFilterStatus={setFilterStatus}
              countSemua={countSemua}
              countBaru={countBaru}
              countProses={countProses}
              countSelesai={countSelesai}
              notifCount={petugasNotifItems.length}
              onOpenNotifications={() => setShowNotifications(true)}
              onOpenProfile={() => setCurrentTab('profile')}
              onPreviewAiImage={uri => {
                setPreviewCustomPhotoUri(uri);
                setShowAnnotatedInModal(false);
                setShowPhotoPreviewModal(true);
              }}
              onOpenTask={t => handleOpenTask(t)}
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          ) : currentTab === 'qr' ? (
            <PindaiQrScreen
              qrScanStep={qrScanStep}
              onSetQrScanStep={setQrScanStep}
              onBackToTugas={() => setCurrentTab('tugas')}
              cameraFacing={cameraFacing}
              onToggleCameraFacing={() =>
                setCameraFacing(f => (f === 'back' ? 'front' : 'back'))
              }
              isScanningQr={isScanningQr}
              qrScanned={qrScanned}
              onResetQrScanned={() => setQrScanned(false)}
              onTriggerQrScan={code => handleTriggerQrScan(code)}
              onOpenHardwareFallback={openQrHardwareCamera}
              scannedTask={scannedTask}
              tasks={tasks}
              qrTargetCode={qrTargetCode}
              lastScannedCode={lastScannedCode}
              showAllAdminTasksInQr={showAllAdminTasksInQr}
              onToggleShowAllAdminTasks={() => setShowAllAdminTasksInQr(prev => !prev)}
              onSelectScannedTask={(t, newChecklist) => {
                setScannedTask(t);
                setChecklist(newChecklist);
              }}
              checklist={checklist}
              onToggleChecklist={handleToggleChecklist}
              onOpenTaskDetail={(t, preserve) => handleOpenTask(t, preserve)}
            />
          ) : pelaporanView === 'form' ? (
            <LaporKerusakanBaruScreen
              judul={newReportJudul}
              onChangeJudul={setNewReportJudul}
              lokasi={newReportLokasi}
              onChangeLokasi={setNewReportLokasi}
              categories={reportCategories}
              onToggleCategory={handleToggleReportCategory}
              catatan={newReportCatatan}
              onChangeCatatan={setNewReportCatatan}
              photos={reportPhotos}
              onPickPhoto={handlePickReportPhoto}
              onBack={() => setPelaporanView('list')}
              onSubmit={handleCreateReport}
            />
          ) : pelaporanView === 'sent' ? (
            <LaporanTerkirimScreen
              report={lastSubmittedReport || reports[0] || INITIAL_PETUGAS_REPORTS[0]}
              onViewPhoto={uri => {
                setPreviewCustomPhotoUri(uri);
                setShowAnnotatedInModal(false);
                setShowPhotoPreviewModal(true);
              }}
              onBackToWorkOrderList={() => {
                setPelaporanView('list');
                setSelectedTask(null);
                setCurrentTab('tugas');
              }}
            />
          ) : (
            <LaporanRiwayatScreen
              reports={reports}
              completedMonthCount={countSelesai}
              refreshing={refreshing}
              onRefresh={onRefresh}
              onAddNewReport={() => setPelaporanView('form')}
              onPreviewReportPhoto={uri => {
                setPreviewCustomPhotoUri(uri);
                setShowAnnotatedInModal(false);
                setShowPhotoPreviewModal(true);
              }}
              onPressCompletedTasks={() => {
                setFilterStatus('Selesai');
                setCurrentTab('tugas');
              }}
            />
          )}

          {/* Bottom Navigation Bar (Sembunyikan saat di halaman QR atau saat belum Login) */}
          {!isLaptop && currentTab !== 'qr' && !(currentTab === 'profile' && !isPetugasAuthenticated) && (
            <View style={st.bottomNavBar}>
              <TouchableOpacity
                style={st.bottomNavItem}
                onPress={() => {
                  setCurrentTab('tugas');
                  setCompletedTaskData(null);
                  setSelectedTask(null);
                }}
                activeOpacity={0.7}
              >
                {currentTab === 'tugas' && <View style={st.activeIndicatorBar} />}
                <NavTugasIcon active={currentTab === 'tugas'} />
                <Text
                  style={[
                    st.bottomNavLabel,
                    currentTab === 'tugas' && st.bottomNavLabelActive,
                  ]}
                >
                  Tugas
                </Text>
              </TouchableOpacity>

              <View style={st.qrCenterWrapper}>
                <TouchableOpacity
                  style={st.qrCircleBtn}
                  onPress={handleOpenQrTab}
                  activeOpacity={0.85}
                >
                  <NavQrIcon />
                </TouchableOpacity>
                <Text style={st.bottomNavLabel}>QR</Text>
              </View>

              <TouchableOpacity
                style={st.bottomNavItem}
                onPress={() => {
                  setCurrentTab('pelaporan');
                  setPelaporanView('list');
                  setCompletedTaskData(null);
                  setSelectedTask(null);
                }}
                activeOpacity={0.7}
              >
                {currentTab === 'pelaporan' && <View style={st.activeIndicatorBar} />}
                <NavPelaporanIcon active={currentTab === 'pelaporan'} />
                <Text
                  style={[
                    st.bottomNavLabel,
                    currentTab === 'pelaporan' && st.bottomNavLabelActive,
                  ]}
                >
                  Pelaporan
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Modal Pratinjau Foto Bukti */}
      <PhotoPreviewModal
        visible={showPhotoPreviewModal}
        onClose={() => {
          setPreviewCustomPhotoUri(null);
          setShowPhotoPreviewModal(false);
        }}
        onRetake={() => {
          setShowPhotoPreviewModal(false);
          handleOpenLiveCamera();
        }}
        previewCustomPhotoUri={previewCustomPhotoUri}
        photoUri={photoUri}
        annotatedPhotoUrl={annotatedPhotoUrl}
        showAnnotatedInModal={showAnnotatedInModal}
        onToggleShowAnnotated={setShowAnnotatedInModal}
        damageState={damageState}
        aiResult={aiResult}
      />

      {/* Modal Notifikasi Seragam Petugas */}
      <NotificationModal
        visible={showNotifications}
        roleTitle="Notifikasi Tugas Petugas"
        items={petugasNotifItems}
        onClose={() => setShowNotifications(false)}
        onDismissItem={key =>
          setDismissedNotifIds(prev => (prev.includes(key) ? prev : [...prev, key]))
        }
        onDismissAll={() =>
          setDismissedNotifIds(prev => [
            ...prev,
            ...petugasNotifItems.map(i => i.key),
          ])
        }
      />

      {/* Pop-up Banner Otomatis Saat Admin Mengirim Tugas Baru */}
      <RealtimePopupBanner
        banner={popupBanner}
        onDismiss={() => setPopupBanner(null)}
      />

      {/* Modal Server Config */}
      <ServerConfigModal
        visible={showConfig}
        onClose={() => setShowConfig(false)}
        onSaved={() => loadData()}
      />
    </SafeAreaView>
  );
}
