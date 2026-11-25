import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { CameraView, CameraType } from 'expo-camera';
import { st } from './petugasStyles';

interface EvidenceCameraScreenProps {
  onClose: () => void;
  cameraFacing: CameraType;
  onFlipCamera: () => void;
  evidenceVideoRef: React.RefObject<any>;
  webEvidenceStreamReady: boolean;
  cameraPermissionGranted: boolean;
  cameraRef: React.RefObject<any>;
  onOpenHardwareCamera: (useCaptureEnv: boolean) => void;
  isCapturing: boolean;
  onCaptureFromCamera: () => void;
}

export const EvidenceCameraScreen: React.FC<EvidenceCameraScreenProps> = ({
  onClose,
  cameraFacing,
  onFlipCamera,
  evidenceVideoRef,
  webEvidenceStreamReady,
  cameraPermissionGranted,
  cameraRef,
  onOpenHardwareCamera,
  isCapturing,
  onCaptureFromCamera,
}) => {
  return (
    <View style={st.cameraContainer}>
      {/* Camera Header */}
      <View style={st.cameraTopBar}>
        <TouchableOpacity style={st.cameraBackBtn} onPress={onClose} activeOpacity={0.7}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path
              d="M15 18L9 12L15 6"
              stroke="#FFFFFF"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <Text style={st.cameraBackText}>Kembali</Text>
        </TouchableOpacity>

        <Text style={st.cameraTitle}>Kamera Bukti Fasilitas</Text>

        <TouchableOpacity style={st.cameraFlipBtn} onPress={onFlipCamera} activeOpacity={0.7}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>Balik</Text>
        </TouchableOpacity>
      </View>

      {/* Viewfinder Area */}
      <View style={st.cameraViewfinder}>
        {Platform.OS === 'web' ? (
          <View style={StyleSheet.absoluteFill}>
            <video
              ref={evidenceVideoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                backgroundColor: '#000000',
              }}
            />
            {!webEvidenceStreamReady && (
              <View style={[st.cameraPermissionContainer, StyleSheet.absoluteFill]}>
                
                <Text style={st.cameraPermissionTitle}>Kamera Bukti Fasilitas</Text>
                <Text style={st.cameraPermissionSubtitle}>
                  Mengaktifkan kamera... Atau ambil foto langsung dari kamera perangkat kamu:
                </Text>
                <TouchableOpacity
                  style={st.btnGrantPermission}
                  onPress={() => onOpenHardwareCamera(true)}
                  activeOpacity={0.8}
                >
                  <Text style={st.btnGrantPermissionText}>Buka Kamera / Pilih Foto</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : cameraPermissionGranted ? (
          <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={cameraFacing} />
        ) : (
          <View style={st.cameraPermissionContainer}>
            
            <Text style={st.cameraPermissionTitle}>Kamera Fasilitas</Text>
            <Text style={st.cameraPermissionSubtitle}>
              Tekan tombol di bawah untuk langsung membuka kamera fisik HP kamu.
            </Text>
            <TouchableOpacity
              style={st.btnGrantPermission}
              onPress={() => onOpenHardwareCamera(true)}
              activeOpacity={0.8}
            >
              <Text style={st.btnGrantPermissionText}>Buka Kamera HP Sekarang</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* AI HUD Scanner Box */}
        <View style={st.cameraReticleContainer} pointerEvents="none">
          <View style={st.reticleCornerTL} />
          <View style={st.reticleCornerTR} />
          <View style={st.reticleCornerBL} />
          <View style={st.reticleCornerBR} />
          <View style={st.reticleBadge}>
            <Text style={st.reticleBadgeText}>AI FACILITY SCANNER</Text>
          </View>
        </View>
      </View>

      {/* Shutter Bar */}
      <View style={st.cameraBottomBar}>
        <Text style={st.cameraHintText}>
          Arahkan ke fasilitas lalu tekan tombol rana untuk memindai noda & kondisi kebersihan
        </Text>

        <View style={st.shutterRow}>
          <TouchableOpacity
            style={st.shutterOuterRing}
            onPress={onCaptureFromCamera}
            disabled={isCapturing}
            activeOpacity={0.8}
          >
            <View style={st.shutterInnerCircle}>
              {isCapturing ? (
                <ActivityIndicator color="#0066FF" size="small" />
              ) : (
                <View style={st.shutterDot} />
              )}
            </View>
          </TouchableOpacity>
        </View>

        <View style={st.cameraQuickButtonsRow}>
          <TouchableOpacity
            style={[st.cameraQuickBtn, { backgroundColor: '#DBEAFE' }]}
            onPress={() => onOpenHardwareCamera(false)}
            activeOpacity={0.7}
          >
            <Text style={[st.cameraQuickBtnText, { color: '#1E40AF' }]}>
              Pilih Foto dari Galeri
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};
