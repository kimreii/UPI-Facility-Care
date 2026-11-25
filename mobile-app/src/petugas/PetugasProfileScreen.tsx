import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Platform,
  Alert,
  StyleSheet,
} from 'react-native';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { Task } from '../types';
import { PetugasReport, TaskFacilityIcon } from './PetugasIcons';
import { RecentInspectionDto, OfficerDto } from '../api';
import { PetugasProfileData } from './PetugasDashboardScreen';
import { formatTaskDateReal } from '../dateUtils';
import { st } from './petugasStyles';

export interface OfficerAccount extends PetugasProfileData {
  email: string;
  password: string;
}

export const TEAM_PROFILES: OfficerAccount[] = [
  {
    id: 'PTG-001',
    name: 'Amel Imiarti',
    email: 'amel@kampus.ac.id',
    password: '123',
    role: 'Petugas Pemeliharaan Fasilitas',
    shift: 'Shift Pagi (07:00 - 15:00)',
    area: 'Gedung A & Perpustakaan',
    phone: '0812-3456-7890',
    avatarUri:
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80',
    statusText: 'Aktif Bertugas',
    completionRate: 98,
  },
  {
    id: 'PTG-002',
    name: 'Rian',
    email: 'rian@kampus.ac.id',
    password: '123',
    role: 'Petugas Kebersihan & Sanitasi',
    shift: 'Shift Pagi (07:00 - 15:00)',
    area: 'Gedung A & Gedung Dewi Sartika',
    phone: '0813-8899-1122',
    avatarUri:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
    statusText: 'Aktif Bertugas',
    completionRate: 95,
  },
  {
    id: 'PTG-003',
    name: 'Ali',
    email: 'ali@kampus.ac.id',
    password: '123',
    role: 'Teknisi Fasilitas & Laboratorium',
    shift: 'Shift Siang (13:00 - 21:00)',
    area: 'Gedung Teknik & Lab IOT',
    phone: '0812-9988-7766',
    avatarUri:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    statusText: 'Aktif Bertugas',
    completionRate: 94,
  },
];

const EyeIcon = ({ off }: { off: boolean }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M1.5 12S5.5 5 12 5s10.5 7 10.5 7-4 7-10.5 7S1.5 12 1.5 12Z"
      stroke="#6B7280"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle cx="12" cy="12" r="3" stroke="#6B7280" strokeWidth="1.8" />
    {off && (
      <Path d="M4 4L20 20" stroke="#6B7280" strokeWidth="1.8" strokeLinecap="round" />
    )}
  </Svg>
);

interface PetugasProfileScreenProps {
  profile: PetugasProfileData;
  officers?: OfficerDto[];
  isAuthenticated?: boolean;
  onSetAuthenticated?: (auth: boolean) => void;
  onUpdateProfile: (next: PetugasProfileData) => void;
  onRegisterOfficer?: (newOfficer: OfficerDto) => Promise<void> | void;
  tasks: Task[];
  reports: PetugasReport[];
  inspections: RecentInspectionDto[];
  onBack: () => void;
  onNavigateToWorkOrders: (filter: 'Semua' | 'Baru' | 'Proses' | 'Selesai') => void;
  onNavigateToReports: () => void;
  onOpenTaskDetail: (task: Task) => void;
}

export const PetugasProfileScreen: React.FC<PetugasProfileScreenProps> = ({
  profile,
  officers = [],
  isAuthenticated = true,
  onSetAuthenticated,
  onUpdateProfile,
  onRegisterOfficer,
  tasks,
  reports,
  inspections,
  onBack,
  onNavigateToWorkOrders,
  onNavigateToReports,
  onOpenTaskDetail,
}) => {
  const [localAuth, setLocalAuth] = useState(true);
  const isLoggedIn = onSetAuthenticated ? isAuthenticated : localAuth;
  const setLoggedIn = (val: boolean) => {
    setLocalAuth(val);
    onSetAuthenticated?.(val);
  };

  // Mode Auth: 'login' (Masuk) atau 'signup' (Daftar Akun Baru)
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [forgotIdOrEmail, setForgotIdOrEmail] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [loginIdOrEmail, setLoginIdOrEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  // State Form Sign Up (Daftar Akun Petugas Baru)
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPhone, setSignUpPhone] = useState('');
  const [signUpArea, setSignUpArea] = useState('');
  const [signUpShift, setSignUpShift] = useState<'Shift Pagi (07:00 - 15:00)' | 'Shift Siang (13:00 - 21:00)'>(
    'Shift Pagi (07:00 - 15:00)'
  );
  const [signUpPassword, setSignUpPassword] = useState('');

  // State Edit Profil
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(profile.name);
  const [editRole, setEditRole] = useState(profile.role);
  const [editShift, setEditShift] = useState(profile.shift);
  const [editArea, setEditArea] = useState(profile.area);
  const [editPhone, setEditPhone] = useState(profile.phone);

  const allAccounts: OfficerAccount[] = useMemo(() => {
    return officers.map(o => ({
      ...o,
      password: o.password || '123',
    }));
  }, [officers]);

  const nextAutoOfficerId = useMemo(() => {
    const maxNum = allAccounts.reduce((max, o) => {
      const num = parseInt(o.id.replace(/\D/g, ''), 10) || 0;
      return Math.max(max, num);
    }, 0);
    return `PTG-${String(maxNum + 1).padStart(3, '0')}`;
  }, [allAccounts]);

  // Perhitungan Kinerja Real-Time langsung dari data Microsoft SQL Server
  const totalTasks = Math.max(1, tasks.length);
  const countSelesai = tasks.filter(t => t.status === 'Selesai').length;
  const countProses = tasks.filter(t => t.status === 'Diproses').length;
  const countMenunggu = tasks.filter(t => t.status === 'Menunggu').length;

  const realCompletionRate = Math.min(
    100,
    Math.round(((countSelesai + countProses * 0.5) / totalTasks) * 100) || 0
  );

  const scoredTasks = tasks.filter(t => typeof t.cleanlinessPercentage === 'number');
  const avgAiCleanliness =
    inspections.length > 0
      ? Math.round(
          inspections.reduce((acc, i) => acc + (i.cleanliness_percentage || 0), 0) /
            inspections.length
        )
      : scoredTasks.length > 0
      ? Math.round(
          scoredTasks.reduce((acc, t) => acc + (t.cleanlinessPercentage || 0), 0) /
            scoredTasks.length
        )
      : 95;

  const completedTasksList = tasks.filter(t => t.status === 'Selesai');

  const handleChangeAvatarPhoto = () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const existing = document.getElementById('petugas-profile-avatar-input');
      if (existing) existing.remove();
      const input = document.createElement('input');
      input.id = 'petugas-profile-avatar-input';
      input.type = 'file';
      input.accept = 'image/*';
      input.style.display = 'none';
      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = () => {
            onUpdateProfile({
              ...profile,
              avatarUri: reader.result as string,
            });
          };
          reader.readAsDataURL(file);
        }
      };
      document.body.appendChild(input);
      input.click();
    }
  };

  const handleSaveProfile = () => {
    const updated: PetugasProfileData = {
      ...profile,
      name: editName.trim() || profile.name,
      role: editRole.trim() || profile.role,
      shift: editShift.trim() || profile.shift,
      area: editArea.trim() || profile.area,
      phone: editPhone.trim() || profile.phone,
    };
    onUpdateProfile(updated);
    setIsEditing(false);
    Alert.alert('Berhasil Disimpan', 'Data profil petugas telah diperbarui.');
  };

  const handleLoginSubmit = () => {
    const q = loginIdOrEmail.trim().toLowerCase();
    const pwd = loginPassword.trim();
    if (!q || !pwd) {
      setAuthError('Mohon isi Email / ID Petugas dan Kata Sandi.');
      return;
    }

    const matched = allAccounts.find(
      acc =>
        acc.id.toLowerCase() === q ||
        acc.email.toLowerCase() === q ||
        acc.name.toLowerCase() === q
    );

    if (!matched) {
      setAuthError('Akun tidak ditemukan. Silakan periksa kembali atau Daftar Akun baru.');
      return;
    }

    if (matched.password && matched.password !== pwd) {
      setAuthError('Kata sandi yang Anda masukkan salah.');
      return;
    }

    onUpdateProfile(matched);
    setEditName(matched.name);
    setEditRole(matched.role);
    setEditShift(matched.shift);
    setEditArea(matched.area);
    setEditPhone(matched.phone);
    setAuthError('');
    setAuthSuccess('');
    setLoginPassword('');
    setLoggedIn(true);
    onBack();
  };

  const handleForgotSubmit = async () => {
    const q = forgotIdOrEmail.trim().toLowerCase();
    const newPwd = forgotNewPassword.trim();
    if (!q || !newPwd) {
      setAuthError('Mohon isi Email / ID Petugas dan Kata Sandi Baru.');
      return;
    }
    if (newPwd.length < 3) {
      setAuthError('Kata sandi baru minimal 3 karakter.');
      return;
    }
    const matched = allAccounts.find(
      acc => acc.id.toLowerCase() === q || acc.email.toLowerCase() === q
    );
    if (!matched) {
      setAuthError('Akun tidak ditemukan. Periksa kembali Email / ID Petugas Anda.');
      return;
    }
    const updated: OfficerDto = { ...matched, password: newPwd } as OfficerDto;
    await onRegisterOfficer?.(updated);
    setLoginIdOrEmail(matched.email);
    setLoginPassword('');
    setForgotNewPassword('');
    setAuthError('');
    setAuthMode('login');
    Alert.alert('Kata Sandi Diperbarui', 'Silakan masuk dengan kata sandi baru Anda.');
  };

  const handleSignUpSubmit = async () => {
    const nameClean = signUpName.trim();
    const emailClean = signUpEmail.trim().toLowerCase();
    const pwdClean = signUpPassword.trim();
    if (!nameClean || !emailClean || !pwdClean) {
      setAuthError('Nama lengkap, Email, dan Kata Sandi wajib diisi.');
      return;
    }

    const emailExists = allAccounts.some(a => a.email.toLowerCase() === emailClean);
    if (emailExists) {
      setAuthError('Email tersebut sudah terdaftar. Silakan masuk melalui tab Masuk.');
      return;
    }

    const newOfficer: OfficerDto = {
      id: nextAutoOfficerId,
      name: nameClean,
      email: emailClean,
      password: pwdClean,
      role: 'Petugas Pemeliharaan Fasilitas',
      shift: signUpShift,
      area: signUpArea.trim() || 'Gedung A',
      phone: signUpPhone.trim() || '0812-3456-7890',
      avatarUri:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
      statusText: 'Aktif Bertugas',
      completionRate: 95,
    };

    if (onRegisterOfficer) {
      await onRegisterOfficer(newOfficer);
    } else {
      onUpdateProfile(newOfficer);
    }

    setSignUpName('');
    setSignUpEmail('');
    setSignUpPhone('');
    setSignUpArea('');
    setSignUpPassword('');
    setAuthError('');
    setLoginIdOrEmail(newOfficer.email);
    setLoginPassword('');
    setAuthSuccess(
      `Akun berhasil dibuat (ID: ${newOfficer.id}). Silakan masuk menggunakan email/ID dan kata sandi Anda.`
    );
    setAuthMode('login');
  };

  // ============================================================================
  // TAMPILAN LOGIN & SIGN UP (Full Auth Screen tanpa Bottom Navigation Bar)
  // ============================================================================
  if (!isLoggedIn) {
    return (
      <ScrollView
        style={au.authScroll}
        contentContainerStyle={au.authScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Judul Selamat Datang */}
        <View style={au.brandHeader}>
          <Text style={au.brandTitle}>
            {authMode === 'login'
              ? 'Selamat Datang Kembali'
              : authMode === 'signup'
              ? 'Buat Akun Petugas'
              : 'Atur Ulang Kata Sandi'}
          </Text>
          <Text style={au.brandSubtitle}>
            {authMode === 'login'
              ? 'Masuk untuk mengelola work order & inspeksi fasilitas kampus'
              : authMode === 'signup'
              ? 'Daftarkan akun petugas baru ke sistem manajemen fasilitas'
              : 'Masukkan Email / ID Petugas lalu buat kata sandi baru'}
          </Text>
        </View>

        {/* Auth White Card */}
        <View style={au.authCard}>
          {/* Tab Switcher: Masuk | Daftar Akun */}
          {authMode !== 'forgot' && (
          <View style={au.tabSwitchContainer}>
            <TouchableOpacity
              style={[au.tabSwitchBtn, authMode === 'login' && au.tabSwitchBtnActive]}
              onPress={() => {
                setAuthMode('login');
                setAuthError('');
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  au.tabSwitchText,
                  authMode === 'login' && au.tabSwitchTextActive,
                ]}
              >
                Masuk
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[au.tabSwitchBtn, authMode === 'signup' && au.tabSwitchBtnActive]}
              onPress={() => {
                setAuthMode('signup');
                setAuthError('');
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  au.tabSwitchText,
                  authMode === 'signup' && au.tabSwitchTextActive,
                ]}
              >
                Daftar Akun
              </Text>
            </TouchableOpacity>
          </View>
          )}

          {authMode === 'forgot' ? (
            <View>
              <Text style={au.fieldLabel}>Email atau ID Petugas</Text>
              <View style={au.inputRowBox}>
                <TextInput
                  style={au.inputFlex}
                  placeholder="amel@kampus.ac.id atau PTG-001"
                  placeholderTextColor="#9CA3AF"
                  value={forgotIdOrEmail}
                  onChangeText={val => {
                    setForgotIdOrEmail(val);
                    setAuthError('');
                  }}
                  autoCapitalize="none"
                />
              </View>

              <Text style={au.fieldLabel}>Kata Sandi Baru</Text>
              <View style={au.inputRowBox}>
                <TextInput
                  style={au.inputFlex}
                  placeholder="Minimal 3 karakter"
                  placeholderTextColor="#9CA3AF"
                  value={forgotNewPassword}
                  onChangeText={val => {
                    setForgotNewPassword(val);
                    setAuthError('');
                  }}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(prev => !prev)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <EyeIcon off={showPassword} />
                </TouchableOpacity>
              </View>

              {authError ? <Text style={au.errorText}>{authError}</Text> : null}

              <TouchableOpacity
                style={au.primaryAuthBtn}
                onPress={handleForgotSubmit}
                activeOpacity={0.85}
              >
                <Text style={au.primaryAuthBtnText}>Simpan Kata Sandi Baru</Text>
              </TouchableOpacity>

              <View style={au.switchFooterRow}>
                <Text style={au.switchFooterLabel}>Ingat kata sandi Anda? </Text>
                <TouchableOpacity
                  onPress={() => {
                    setAuthMode('login');
                    setAuthError('');
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={au.switchFooterLink}>Kembali Masuk</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : authMode === 'login' ? (
            <View>
              {/* Input 1: Email atau ID Petugas */}
              <Text style={au.fieldLabel}>Email atau ID Petugas</Text>
              <View style={au.inputRowBox}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Circle cx="12" cy="8" r="4" stroke="#6B7280" strokeWidth="1.8" />
                  <Path
                    d="M5 20C5 16.6863 8.13401 14 12 14C15.866 14 19 16.6863 19 20"
                    stroke="#6B7280"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </Svg>
                <TextInput
                  style={au.inputFlex}
                  placeholder="amel@kampus.ac.id atau PTG-001"
                  placeholderTextColor="#9CA3AF"
                  value={loginIdOrEmail}
                  onChangeText={val => {
                    setLoginIdOrEmail(val);
                    setAuthError('');
                  }}
                  autoCapitalize="none"
                />
              </View>

              {/* Input 2: Kata Sandi */}
              <Text style={au.fieldLabel}>Kata Sandi</Text>
              <View style={au.inputRowBox}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Rect
                    x="4"
                    y="11"
                    width="16"
                    height="10"
                    rx="2"
                    stroke="#6B7280"
                    strokeWidth="1.8"
                  />
                  <Path
                    d="M8 11V7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7V11"
                    stroke="#6B7280"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </Svg>
                <TextInput
                  style={au.inputFlex}
                  placeholder="Masukkan kata sandi"
                  placeholderTextColor="#9CA3AF"
                  value={loginPassword}
                  onChangeText={val => {
                    setLoginPassword(val);
                    setAuthError('');
                  }}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(prev => !prev)}
                  activeOpacity={0.7}
                >
                  <EyeIcon off={showPassword} />
                </TouchableOpacity>
              </View>

              {/* Baris Ingat Saya & Lupa Kata Sandi */}
              <View style={au.rememberRow}>
                <TouchableOpacity
                  style={au.rememberCheckRow}
                  onPress={() => setRememberMe(prev => !prev)}
                  activeOpacity={0.75}
                >
                  <View style={[au.smallCheckbox, rememberMe && au.smallCheckboxChecked]}>
                    {rememberMe && (
                      <Svg width={11} height={11} viewBox="0 0 24 24" fill="none">
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
                  <Text style={au.rememberText}>Ingat saya</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setForgotIdOrEmail(loginIdOrEmail);
                    setForgotNewPassword('');
                    setAuthError('');
                    setAuthMode('forgot');
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={au.forgotText}>Lupa kata sandi?</Text>
                </TouchableOpacity>
              </View>

              {authSuccess ? (
                <View
                  style={{
                    backgroundColor: '#ECFDF5',
                    borderWidth: 1,
                    borderColor: '#A7F3D0',
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 9,
                    marginBottom: 12,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#065F46' }}>
                    {authSuccess}
                  </Text>
                </View>
              ) : null}

              {authError ? <Text style={au.errorText}>{authError}</Text> : null}

              {/* Tombol Utama Masuk */}
              <TouchableOpacity
                style={au.primaryAuthBtn}
                onPress={handleLoginSubmit}
                activeOpacity={0.85}
              >
                <Text style={au.primaryAuthBtnText}>Masuk</Text>
              </TouchableOpacity>

              {/* Footer Switch ke Daftar Akun */}
              <View style={au.switchFooterRow}>
                <Text style={au.switchFooterLabel}>Belum punya akun petugas? </Text>
                <TouchableOpacity
                  onPress={() => {
                    setAuthMode('signup');
                    setAuthError('');
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={au.switchFooterLink}>Daftar Sekarang</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View>
              {/* Info ID Petugas Auto-Generate */}
              <View style={au.autoIdBanner}>
                <Text style={au.autoIdLabel}>ID Petugas Otomatis</Text>
                <Text style={au.autoIdValue}>{nextAutoOfficerId}</Text>
              </View>

              <Text style={au.fieldLabel}>Nama Lengkap</Text>
              <View style={au.inputRowBox}>
                <TextInput
                  style={au.inputFlex}
                  placeholder="Masukkan nama lengkap Anda"
                  placeholderTextColor="#9CA3AF"
                  value={signUpName}
                  onChangeText={val => {
                    setSignUpName(val);
                    setAuthError('');
                  }}
                />
              </View>

              <Text style={au.fieldLabel}>Email Kampus</Text>
              <View style={au.inputRowBox}>
                <TextInput
                  style={au.inputFlex}
                  placeholder="nama@kampus.ac.id"
                  placeholderTextColor="#9CA3AF"
                  value={signUpEmail}
                  onChangeText={val => {
                    setSignUpEmail(val);
                    setAuthError('');
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <Text style={au.fieldLabel}>Nomor Telepon / WhatsApp</Text>
              <View style={au.inputRowBox}>
                <TextInput
                  style={au.inputFlex}
                  placeholder="0812-xxxx-xxxx"
                  placeholderTextColor="#9CA3AF"
                  value={signUpPhone}
                  onChangeText={setSignUpPhone}
                  keyboardType="phone-pad"
                />
              </View>

              <Text style={au.fieldLabel}>Pilih Shift Kerja</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                {(
                  [
                    'Shift Pagi (07:00 - 15:00)',
                    'Shift Siang (13:00 - 21:00)',
                  ] as const
                ).map(sh => {
                  const active = signUpShift === sh;
                  return (
                    <TouchableOpacity
                      key={sh}
                      style={[au.shiftChoiceBtn, active && au.shiftChoiceBtnActive]}
                      onPress={() => setSignUpShift(sh)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          au.shiftChoiceText,
                          active && au.shiftChoiceTextActive,
                        ]}
                      >
                        {sh.split(' (')[0]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={au.fieldLabel}>Area Gedung</Text>
              <View style={au.inputRowBox}>
                <TextInput
                  style={au.inputFlex}
                  placeholder="Contoh: Gedung A & Perpustakaan"
                  placeholderTextColor="#9CA3AF"
                  value={signUpArea}
                  onChangeText={setSignUpArea}
                />
              </View>

              <Text style={au.fieldLabel}>Buat Kata Sandi</Text>
              <View style={au.inputRowBox}>
                <TextInput
                  style={au.inputFlex}
                  placeholder="Minimal 3 karakter"
                  placeholderTextColor="#9CA3AF"
                  value={signUpPassword}
                  onChangeText={val => {
                    setSignUpPassword(val);
                    setAuthError('');
                  }}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(prev => !prev)}
                  activeOpacity={0.7}
                >
                  <EyeIcon off={showPassword} />
                </TouchableOpacity>
              </View>

              {authError ? <Text style={au.errorText}>{authError}</Text> : null}

              <TouchableOpacity
                style={au.primaryAuthBtn}
                onPress={handleSignUpSubmit}
                activeOpacity={0.85}
              >
                <Text style={au.primaryAuthBtnText}>Daftar Akun</Text>
              </TouchableOpacity>

              <View style={au.switchFooterRow}>
                <Text style={au.switchFooterLabel}>Sudah punya akun petugas? </Text>
                <TouchableOpacity
                  onPress={() => {
                    setAuthMode('login');
                    setAuthError('');
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={au.switchFooterLink}>Masuk di sini</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    );
  }

  // ============================================================================
  // TAMPILAN PROFIL PETUGAS (Saat Sudah Login)
  // ============================================================================
  return (
    <ScrollView
      style={[st.scroll, { backgroundColor: '#FFFFFF' }]}
      contentContainerStyle={[st.detailScrollContent, { paddingBottom: 110 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header Row */}
      <View style={st.headerRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <TouchableOpacity
            style={st.backBtn}
            onPress={onBack}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path
                d="M15 18L9 12L15 6"
                stroke="#111827"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </TouchableOpacity>
          <Text style={st.headerTitle}>Profil Petugas</Text>
        </View>

        <TouchableOpacity
          style={
            profile.statusText === 'Aktif Bertugas'
              ? st.badgeSelesai
              : st.statusBadgeDalamProses
          }
          onPress={() =>
            onUpdateProfile({
              ...profile,
              statusText:
                profile.statusText === 'Aktif Bertugas' ? 'Istirahat' : 'Aktif Bertugas',
            })
          }
          activeOpacity={0.8}
        >
          <Text
            style={
              profile.statusText === 'Aktif Bertugas'
                ? st.badgeSelesaiText
                : st.statusBadgeDalamProsesText
            }
          >
            {profile.statusText}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Ringkasan Identitas Petugas */}
      <View style={st.taskHeaderCard}>
        <TouchableOpacity onPress={handleChangeAvatarPhoto} activeOpacity={0.85}>
          <Image
            source={{ uri: profile.avatarUri }}
            style={{
              width: 54,
              height: 54,
              borderRadius: 27,
              marginRight: 12,
              backgroundColor: '#EEF2F6',
              borderWidth: 1,
              borderColor: '#D1D5DB',
            }}
          />
        </TouchableOpacity>

        <View style={st.taskHeaderTexts}>
          <Text style={st.taskHeaderTitle}>{profile.name}</Text>
          <Text style={st.taskHeaderSubtitle}>{profile.role}</Text>
          <Text style={st.taskHeaderSchedule}>ID Petugas: {profile.id}</Text>
        </View>

        <TouchableOpacity onPress={handleChangeAvatarPhoto} activeOpacity={0.75}>
          <Text style={{ fontSize: 11.5, fontWeight: '600', color: '#1D70F7' }}>
            Ubah foto
          </Text>
        </TouchableOpacity>
      </View>

      {/* Section 1: Informasi Petugas */}
      <View style={st.sectionBlock}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 10,
          }}
        >
          <Text style={[st.sectionTitle, { marginBottom: 0 }]}>Informasi Petugas</Text>
          <TouchableOpacity
            onPress={() => setIsEditing(prev => !prev)}
            activeOpacity={0.75}
          >
            <Text style={{ fontSize: 11.5, fontWeight: '600', color: '#1D70F7' }}>
              {isEditing ? 'Batal' : 'Ubah data'}
            </Text>
          </TouchableOpacity>
        </View>

        {isEditing ? (
          <View style={{ gap: 2 }}>
            <Text style={st.formFieldLabel}>Nama Petugas</Text>
            <TextInput
              style={st.formOutlinedInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Nama lengkap..."
            />

            <Text style={st.formFieldLabel}>Bagian / Jabatan</Text>
            <TextInput
              style={st.formOutlinedInput}
              value={editRole}
              onChangeText={setEditRole}
              placeholder="Jabatan petugas..."
            />

            <Text style={st.formFieldLabel}>Shift Kerja</Text>
            <TextInput
              style={st.formOutlinedInput}
              value={editShift}
              onChangeText={setEditShift}
              placeholder="Shift kerja..."
            />

            <Text style={st.formFieldLabel}>Area Gedung</Text>
            <TextInput
              style={st.formOutlinedInput}
              value={editArea}
              onChangeText={setEditArea}
              placeholder="Area gedung..."
            />

            <Text style={st.formFieldLabel}>Nomor Telepon</Text>
            <TextInput
              style={st.formOutlinedInput}
              value={editPhone}
              onChangeText={setEditPhone}
              placeholder="Nomor telepon..."
            />

            <TouchableOpacity
              style={[st.btnGreenPrimary, { height: 42, marginTop: 4 }]}
              onPress={handleSaveProfile}
              activeOpacity={0.85}
            >
              <Text style={st.btnGreenPrimaryText}>Simpan Perubahan</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={st.infoRowsList}>
            <View style={st.infoRow}>
              <Text style={st.infoLabel}>Nama Lengkap</Text>
              <Text style={st.infoValue}>{profile.name}</Text>
            </View>
            <View style={st.infoRow}>
              <Text style={st.infoLabel}>ID Petugas</Text>
              <Text style={st.infoValue}>{profile.id}</Text>
            </View>
            <View style={st.infoRow}>
              <Text style={st.infoLabel}>Bagian</Text>
              <Text style={st.infoValue}>{profile.role}</Text>
            </View>
            <View style={st.infoRow}>
              <Text style={st.infoLabel}>Shift Kerja</Text>
              <Text style={st.infoValue}>{profile.shift}</Text>
            </View>
            <View style={st.infoRow}>
              <Text style={st.infoLabel}>Area Gedung</Text>
              <Text style={st.infoValue}>{profile.area}</Text>
            </View>
            <View style={st.infoRow}>
              <Text style={st.infoLabel}>No. Telepon</Text>
              <Text style={st.infoValue}>{profile.phone}</Text>
            </View>
          </View>
        )}
      </View>

      <View style={st.horizontalDivider} />

      {/* Section 2: Kinerja Petugas (100% Real-Time dari Microsoft SQL Server) */}
      <View style={st.sectionBlock}>
        <Text style={st.sectionTitle}>Kinerja Hari Ini</Text>

        <View style={st.aiResultCard}>
          <View style={st.aiResultHeader}>
            <Text style={st.aiResultTitle}>Capaian Tugas & Inspeksi</Text>
            <View style={[st.aiStatusBadge, st.aiBadgeClean]}>
              <Text style={[st.aiStatusBadgeText, st.textGreenDark]}>
                {countSelesai} dari {tasks.length} Selesai
              </Text>
            </View>
          </View>

          <View style={st.aiMetricsGrid}>
            <TouchableOpacity
              style={st.aiMetricBox}
              onPress={() => onNavigateToWorkOrders('Selesai')}
              activeOpacity={0.75}
            >
              <Text style={st.aiMetricValue}>{countSelesai}</Text>
              <Text style={st.aiMetricLabel}>Tugas Selesai</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={st.aiMetricBox}
              onPress={() => onNavigateToWorkOrders('Proses')}
              activeOpacity={0.75}
            >
              <Text style={[st.aiMetricValue, { color: '#2563EB' }]}>
                {countProses + countMenunggu}
              </Text>
              <Text style={st.aiMetricLabel}>Belum Selesai</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={st.aiMetricBox}
              onPress={() => onNavigateToWorkOrders('Semua')}
              activeOpacity={0.75}
            >
              <Text style={[st.aiMetricValue, { color: '#16A34A' }]}>
                {realCompletionRate}%
              </Text>
              <Text style={st.aiMetricLabel}>Penyelesaian</Text>
            </TouchableOpacity>
          </View>

          <View style={st.aiSummaryRow}>
            <Text style={st.aiSummaryText}>
              Rata-rata skor kebersihan verifikasi kamera:{' '}
              <Text style={{ fontWeight: '700', color: '#111827' }}>
                {avgAiCleanliness}%
              </Text>{' '}
              ({inspections.length} inspeksi tersimpan di database).
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[st.statsMonthBox, { marginTop: 10, marginBottom: 4 }]}
          onPress={onNavigateToReports}
          activeOpacity={0.8}
        >
          <Text style={st.statsMonthLabel}>Laporan Kerusakan Dikirim :</Text>
          <Text style={st.statsMonthValue}>{reports.length} Laporan</Text>
        </TouchableOpacity>
      </View>

      <View style={st.horizontalDivider} />

      {/* Section 3: Riwayat Tugas Petugas */}
      <View style={st.sectionBlock}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 10,
          }}
        >
          <Text style={[st.sectionTitle, { marginBottom: 0 }]}>
            Daftar Tugas ({completedTasksList.length} Selesai)
          </Text>
          <TouchableOpacity
            onPress={() => onNavigateToWorkOrders('Semua')}
            activeOpacity={0.75}
          >
            <Text style={{ fontSize: 11.5, fontWeight: '600', color: '#1D70F7' }}>
              Lihat semua
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ gap: 10 }}>
          {tasks.slice(0, 3).map(t => (
            <TouchableOpacity
              key={t.id}
              style={st.summaryCardBox}
              onPress={() => onOpenTaskDetail(t)}
              activeOpacity={0.82}
            >
              <View style={st.taskIconContainer}>
                <TaskFacilityIcon judul={t.judul} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 13.5,
                    fontWeight: '700',
                    color: '#111827',
                    marginBottom: 2,
                  }}
                  numberOfLines={1}
                >
                  {t.judul}
                </Text>
                <Text style={{ fontSize: 11.5, color: '#6B7280', marginBottom: 2 }}>
                  {t.id} • {t.lokasi}
                </Text>
                <Text style={{ fontSize: 11, color: '#9CA3AF' }}>
                  Status: {t.status} • {formatTaskDateReal(t.tenggat)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Tombol Keluar Akun (Logout) */}
      <TouchableOpacity
        style={[
          st.addCatatanBtn,
          {
            marginTop: 8,
            borderColor: '#FCA5A5',
            backgroundColor: '#FEF2F2',
          },
        ]}
        onPress={() => {
          setLoginIdOrEmail('');
          setLoginPassword('');
          setAuthError('');
          setLoggedIn(false);
        }}
        activeOpacity={0.8}
      >
        <Text style={[st.addCatatanBtnText, { color: '#DC2626', fontWeight: '700' }]}>
          Keluar Akun Petugas
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const au = StyleSheet.create({
  authScroll: {
    flex: 1,
    width: '100%',
    backgroundColor: '#EBECEF',
  },
  authScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 28,
    maxWidth: 460,
    width: '100%',
    alignSelf: 'center',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  brandTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
    textAlign: 'center',
  },
  brandSubtitle: {
    fontSize: 12.5,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  authCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  tabSwitchContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
    marginBottom: 18,
  },
  tabSwitchBtn: {
    flex: 1,
    height: 38,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabSwitchBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  tabSwitchText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabSwitchTextActive: {
    color: '#111827',
    fontWeight: '800',
  },
  fieldLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
  },
  inputRowBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: '#F9FAFB',
    marginBottom: 14,
    gap: 10,
    overflow: 'hidden',
  },
  inputFlex: {
    flex: 1,
    height: '100%',
    fontSize: 13,
    color: '#111827',
    paddingVertical: 0,
    paddingHorizontal: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none', outlineWidth: 0 } as any) : {}),
  },
  showHideText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  rememberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  rememberCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  smallCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallCheckboxChecked: {
    backgroundColor: '#1D4ED8',
    borderColor: '#1D4ED8',
  },
  rememberText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },
  forgotText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1D4ED8',
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
    marginBottom: 12,
  },
  primaryAuthBtn: {
    height: 46,
    borderRadius: 12,
    backgroundColor: '#1E7E34',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  primaryAuthBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  switchFooterRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  switchFooterLabel: {
    fontSize: 12.5,
    color: '#6B7280',
  },
  switchFooterLink: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  autoIdBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 14,
  },
  autoIdLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#1E40AF',
  },
  autoIdValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  shiftChoiceBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shiftChoiceBtnActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#1D4ED8',
  },
  shiftChoiceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  shiftChoiceTextActive: {
    color: '#1D4ED8',
    fontWeight: '800',
  },
});
