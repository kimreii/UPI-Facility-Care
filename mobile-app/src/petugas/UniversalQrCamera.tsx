import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { CameraView, CameraType } from 'expo-camera';

export const UniversalQrCamera = ({
  facing,
  onQrScanned,
  onOpenHardwareFallback,
  disabled,
}: {
  facing: CameraType;
  onQrScanned: (code: string) => void;
  onOpenHardwareFallback: () => void;
  disabled?: boolean;
}) => {
  const containerRef = useRef<any>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const onQrScannedRef = useRef(onQrScanned);
  onQrScannedRef.current = onQrScanned;

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    if (!(window as any).jsQR && !document.getElementById('jsqr-cdn-script')) {
      const script = document.createElement('script');
      script.id = 'jsqr-cdn-script';
      script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
      script.async = true;
      document.head.appendChild(script);
    }

    let activeStream: MediaStream | null = null;
    let videoEl: HTMLVideoElement | null = null;
    let scanTimer: any = null;
    let isCancelled = false;

    const startWebCamera = async () => {
      setCameraError(null);
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Browser memerlukan HTTPS atau ketuk tombol di bawah untuk membuka kamera HP.');
        return;
      }

      try {
        try {
          activeStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: facing === 'back' ? 'environment' : 'user' },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });
        } catch {
          activeStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }

        if (isCancelled) {
          activeStream.getTracks().forEach(t => t.stop());
          return;
        }

        const domNode = containerRef.current as unknown as HTMLElement;
        if (domNode) {
          videoEl = document.createElement('video');
          videoEl.setAttribute('autoplay', 'true');
          videoEl.setAttribute('playsinline', 'true');
          videoEl.setAttribute('muted', 'true');
          videoEl.muted = true;
          videoEl.style.width = '100%';
          videoEl.style.height = '100%';
          videoEl.style.objectFit = 'cover';
          videoEl.style.position = 'absolute';
          videoEl.style.top = '0';
          videoEl.style.left = '0';
          videoEl.srcObject = activeStream;
          domNode.innerHTML = '';
          domNode.appendChild(videoEl);
          await videoEl.play().catch(() => {});
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const WinBarcodeDetector = (window as any).BarcodeDetector;
        let nativeDetector: any = null;
        if (WinBarcodeDetector) {
          try {
            nativeDetector = new WinBarcodeDetector({ formats: ['qr_code'] });
          } catch {
            nativeDetector = null;
          }
        }

        scanTimer = setInterval(async () => {
          if (disabled || !videoEl || videoEl.readyState < 2) return;
          try {
            if (nativeDetector) {
              const codes = await nativeDetector.detect(videoEl);
              if (codes && codes.length > 0 && codes[0].rawValue) {
                onQrScannedRef.current(codes[0].rawValue);
                return;
              }
            }
            const jsQR = (window as any).jsQR;
            if (jsQR && ctx && videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
              const targetW = Math.min(420, videoEl.videoWidth);
              const scale = targetW / videoEl.videoWidth;
              const targetH = Math.round(videoEl.videoHeight * scale);
              canvas.width = targetW;
              canvas.height = targetH;
              ctx.drawImage(videoEl, 0, 0, targetW, targetH);
              const imageData = ctx.getImageData(0, 0, targetW, targetH);
              const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'dontInvert',
              });
              if (qrCode && qrCode.data) {
                onQrScannedRef.current(qrCode.data);
              }
            }
          } catch {
            // abaikan error per frame
          }
        }, 350);
      } catch (err: any) {
        console.warn('Gagal mengakses kamera web:', err);
        setCameraError('Izin kamera belum diberikan atau perangkat menggunakan koneksi HTTP.');
      }
    };

    startWebCamera();

    return () => {
      isCancelled = true;
      if (scanTimer) clearInterval(scanTimer);
      if (activeStream) {
        activeStream.getTracks().forEach(t => t.stop());
      }
      if (videoEl) {
        videoEl.srcObject = null;
        videoEl.remove();
      }
    };
  }, [facing, disabled]);

  if (Platform.OS === 'web') {
    return (
      <View style={StyleSheet.absoluteFill}>
        <View ref={containerRef} style={StyleSheet.absoluteFill} />
        {cameraError && (
          <View
            style={{
              ...StyleSheet.absoluteFillObject,
              backgroundColor: 'rgba(15, 23, 42, 0.85)',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
              zIndex: 20,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700', textAlign: 'center', marginBottom: 6 }}>
              Akses Kamera QR
            </Text>
            <Text style={{ color: '#CBD5E1', fontSize: 11.5, textAlign: 'center', marginBottom: 14, lineHeight: 16 }}>
              {cameraError}
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: '#0D6EFD',
                paddingHorizontal: 18,
                paddingVertical: 11,
                borderRadius: 8,
              }}
              onPress={onOpenHardwareFallback}
              activeOpacity={0.85}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '700' }}>
                Buka Kamera HP (Scan QR)
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  return (
    <CameraView
      style={StyleSheet.absoluteFill}
      facing={facing}
      barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      onBarcodeScanned={disabled ? undefined : ({ data }) => data && onQrScanned(data)}
    />
  );
};
