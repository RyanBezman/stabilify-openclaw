import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import {
  fetchGymSessionDefaults,
  saveGymSession,
} from "../../data/gymSessions";
import type { GymSessionStatus, GymSessionStatusReason } from "../../data/types";

type SaveSessionResult = {
  saved: boolean;
  error?: string;
  sessionId?: string;
  status?: GymSessionStatus;
  statusReason?: GymSessionStatusReason | null;
  distanceMeters?: number | null;
};

export function useLogGymSession() {
  const cameraLaunchInFlightRef = useRef(false);
  const mountedRef = useRef(true);
  const [permission, requestPermission] = ImagePicker.useCameraPermissions();
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [timezone, setTimezone] = useState("Local time");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoMimeType, setPhotoMimeType] = useState<string | null>(null);
  const [photoFileName, setPhotoFileName] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [capturedAt, setCapturedAt] = useState<Date | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationGranted, setLocationGranted] = useState(false);
  const [coords, setCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationCapturedAt, setLocationCapturedAt] = useState<Date | null>(
    null,
  );

  const currentStep = useMemo(() => {
    if (!photoUri) return 1;
    if (!coords) return 2;
    return 3;
  }, [photoUri, coords]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadDefaults = async () => {
      const { data, error } = await fetchGymSessionDefaults();
      if (!active) return;

      if (error) {
        setLoadError(error);
        return;
      }
      if (data) {
        setLoadError(null);
        setTimezone(data.timezone);
      }
    };

    void loadDefaults();

    return () => {
      active = false;
    };
  }, []);

  const handleCapture = useCallback(async () => {
    if (cameraLaunchInFlightRef.current) {
      return;
    }

    cameraLaunchInFlightRef.current = true;

    try {
      if (!permission?.granted) {
        const permissionResult = await requestPermission();
        if (!permissionResult.granted) {
          return;
        }
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.7,
        allowsEditing: false,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        base64: true,
        exif: true,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const capturedAsset = result.assets[0];
      setPhotoUri(capturedAsset.uri);
      setPhotoMimeType(capturedAsset.mimeType ?? null);
      setPhotoFileName(capturedAsset.fileName ?? null);
      setPhotoBase64(capturedAsset.base64 ?? null);
      setCapturedAt(new Date());
    } catch {
      Alert.alert("Camera error", "Could not capture the photo. Please try again.");
    } finally {
      cameraLaunchInFlightRef.current = false;
    }
  }, [permission?.granted, requestPermission]);

  const handleCaptureLocation = useCallback(async () => {
    let granted = locationGranted;

    if (!granted) {
      const existingPermission = await Location.getForegroundPermissionsAsync();
      if (existingPermission.status === "granted") {
        granted = true;
      } else {
        const requestedPermission = await Location.requestForegroundPermissionsAsync();
        granted = requestedPermission.status === "granted";
      }
      setLocationGranted(granted);
    }

    if (!granted) {
      setLocationError("Location permission is required to verify sessions.");
      return;
    }

    try {
      setLocationError(null);
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setCoords({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      setLocationCapturedAt(new Date());
      setLocationError(null);
    } catch {
      setLocationError("Couldn't read your location. Try again.");
    }
  }, [locationGranted]);

  const handleReset = useCallback(() => {
    setPhotoUri(null);
    setPhotoMimeType(null);
    setPhotoFileName(null);
    setPhotoBase64(null);
    setCapturedAt(null);
    setLocationError(null);
    setLocationGranted(false);
    setCoords(null);
    setLocationCapturedAt(null);
  }, []);

  const saveSession = useCallback(async (): Promise<SaveSessionResult> => {
    if (!photoUri || !capturedAt || saving) {
      return { saved: false };
    }
    if (!locationGranted) {
      Alert.alert(
        "Location required",
        "We need your location to verify gym sessions.",
      );
      return { saved: false };
    }
    if (!coords) {
      Alert.alert(
        "Capture location",
        "Please capture your location to verify this session.",
      );
      return { saved: false };
    }

    if (mountedRef.current) {
      setSaving(true);
    }
    const { data, error } = await saveGymSession({
      recordedAt: capturedAt,
      timezone,
      status: "partial",
      photoUri,
      photoMimeType,
      photoFileName,
      photoBase64,
      location: coords,
    });
    if (mountedRef.current) {
      setSaving(false);
    }

    if (error || !data) {
      return { saved: false, error };
    }

    return {
      saved: true,
      sessionId: data.sessionId,
      status: data.status,
      statusReason: data.statusReason,
      distanceMeters: data.distanceMeters,
    };
  }, [
    capturedAt,
    coords,
    locationGranted,
    photoBase64,
    photoFileName,
    photoMimeType,
    photoUri,
    saving,
    timezone,
  ]);

  return {
    permission,
    requestPermission,
    saving,
    loadError,
    photoUri,
    locationError,
    locationCapturedAt,
    coords,
    currentStep,
    saveSession,
    handleCapture,
    handleCaptureLocation,
    handleReset,
  };
}
