import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { getServerUrl, setServerUrl, checkServerHealth, DEFAULT_SERVER_URL } from './api';
import { colors, radius, spacing } from './theme';

interface ServerConfigModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved?: (newUrl: string) => void;
}

export const ServerConfigModal: React.FC<ServerConfigModalProps> = ({
  visible,
  onClose,
  onSaved,
}) => {
  const [url, setUrl] = useState(DEFAULT_SERVER_URL);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    if (visible) {
      getServerUrl().then(setUrl);
      setTestResult(null);
    }
  }, [visible]);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      await setServerUrl(url);
      const res = await checkServerHealth();
      setTestResult(res);
    } catch (e: any) {
      setTestResult({ ok: false, message: e.message || 'Gagal tersambung' });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!url.trim()) {
      Alert.alert('Error', 'Server URL tidak boleh kosong.');
      return;
    }
    const ok = await setServerUrl(url);
    if (ok) {
      Alert.alert('Berhasil', 'Pengaturan Server API disimpan.');
      onSaved?.(url.trim());
      onClose();
    }
  };

  const setPreset = (presetUrl: string) => {
    setUrl(presetUrl);
    setTestResult(null);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose}>
        <View style={s.sheet} onStartShouldSetResponder={() => true}>
          <View style={s.dragHandle} />
          <Text style={s.title}>Pengaturan Server API</Text>
          <Text style={s.subtitle}>
            Hubungkan aplikasi mobile dengan server Python FastAPI Computer Vision di komputer Anda.
          </Text>

          <View style={s.inputContainer}>
            <Text style={s.label}>Alamat Server (Host & Port)</Text>
            <TextInput
              style={s.input}
              value={url}
              onChangeText={setUrl}
              placeholder="http://192.168.1.xxx:8000"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </View>

          {/* Preset Buttons */}
          <View style={s.presetRow}>
            <TouchableOpacity style={s.presetBtn} onPress={() => setPreset('http://192.168.1.108:8000')}>
              <Text style={s.presetText}>Wi-Fi Laptop (192.168.1.108)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.presetBtn} onPress={() => setPreset('http://10.0.2.2:8000')}>
              <Text style={s.presetText}>Emulator Android (10.0.2.2)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.presetBtn} onPress={() => setPreset('http://localhost:8000')}>
              <Text style={s.presetText}>Localhost (Web)</Text>
            </TouchableOpacity>
          </View>

          {/* Test Status Banner */}
          {testResult && (
            <View style={[s.statusBox, testResult.ok ? s.statusSuccess : s.statusError]}>
              <Text style={[s.statusText, testResult.ok ? s.statusTextSuccess : s.statusTextError]}>
                {testResult.ok ? '✓ ' : '✕ '} {testResult.message}
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={s.actionRow}>
            <TouchableOpacity style={s.btnTest} onPress={handleTest} disabled={testing}>
              {testing ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <Text style={s.btnTestText}>Uji Koneksi</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={s.btnSave} onPress={handleSave}>
              <Text style={s.btnSaveText}>Simpan</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#d1d5db',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 18,
    marginBottom: 6,
  },
  inputContainer: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  input: {
    height: 46,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    fontSize: 14,
    backgroundColor: '#f9fafb',
    color: colors.text,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 4,
  },
  presetBtn: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  presetText: {
    fontSize: 11,
    color: '#4b5563',
    fontWeight: '600',
  },
  statusBox: {
    borderRadius: radius.sm,
    padding: 10,
    marginTop: 4,
  },
  statusSuccess: {
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#86efac',
  },
  statusError: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextSuccess: {
    color: '#15803d',
  },
  statusTextError: {
    color: '#b91c1c',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  btnTest: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#edf2ff',
  },
  btnTestText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  btnSave: {
    flex: 1,
    height: 44,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSaveText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
});
