import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Linking } from "react-native";
import * as Location from "expo-location";
import {
  fetchGymAddressSuggestions,
  fetchNearbyGyms,
  type GeocodedGymAddress,
} from "../../data/gyms";
import {
  fetchGymSettingsValues,
  saveGymSettingsValues,
} from "./data";
import { DEFAULT_GYM_RADIUS_METERS } from "./types";
import type { GymOption } from "./types";
import {
  isSessionRequired,
  requestForegroundLocationPermissionWithPrimer,
} from "../shared";

export function useGymSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gymProofEnabled, setGymProofEnabled] = useState(false);
  const [gymName, setGymName] = useState("");
  const [gymPlaceName, setGymPlaceName] = useState("");
  const [gymPlaceAddress, setGymPlaceAddress] = useState("");
  const [gymLat, setGymLat] = useState<number | null>(null);
  const [gymLng, setGymLng] = useState<number | null>(null);
  const [gymRadiusM, setGymRadiusM] = useState(
    String(DEFAULT_GYM_RADIUS_METERS),
  );
  const [gymOptions, setGymOptions] = useState<GymOption[]>([]);
  const [gymSearch, setGymSearch] = useState("");
  const [selectedGymId, setSelectedGymId] = useState("");
  const [manualAddress, setManualAddress] = useState("");
  const [selectedManualAddressId, setSelectedManualAddressId] = useState("");
  const [manualAddressOptions, setManualAddressOptions] = useState<GeocodedGymAddress[]>([]);
  const [loadingManualAddressOptions, setLoadingManualAddressOptions] = useState(false);
  const [manualAddressError, setManualAddressError] = useState<string | null>(null);
  const [showGymList, setShowGymList] = useState(false);
  const [gymError, setGymError] = useState<string | null>(null);
  const [loadingGyms, setLoadingGyms] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      const { data, error, code } = await fetchGymSettingsValues();

      if (!active) return;
      if (isSessionRequired({ code })) {
        setLoading(false);
        Alert.alert("Session error", "Please sign in again.");
        return;
      }
      if (error) {
        setLoading(false);
        Alert.alert("Load failed", error);
        return;
      }
      if (data) {
        setGymProofEnabled(data.gymProofEnabled);
        setGymName(data.gymName);
        setGymPlaceName(data.gymPlaceName);
        setGymPlaceAddress(data.gymPlaceAddress);
        setGymLat(data.gymLat);
        setGymLng(data.gymLng);
        setGymRadiusM(data.gymRadiusM);
        setManualAddress(data.gymPlaceAddress);
        if (data.gymPlaceAddress && data.gymLat !== null && data.gymLng !== null) {
          setSelectedManualAddressId("saved");
        }
      }
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const filteredGyms = useMemo(
    () =>
      gymOptions.filter((gym) =>
        gymSearch.trim().length === 0
          ? true
          : `${gym.name} ${gym.address ?? ""}`
              .toLowerCase()
              .includes(gymSearch.trim().toLowerCase()),
      ),
    [gymOptions, gymSearch],
  );

  const clearSelectedGym = useCallback(() => {
    setGymPlaceName("");
    setGymPlaceAddress("");
    setGymLat(null);
    setGymLng(null);
    setSelectedGymId("");
    setSelectedManualAddressId("");
  }, []);

  const selectGym = useCallback((gym: GymOption) => {
    if (selectedGymId === gym.id) {
      clearSelectedGym();
      return;
    }

    setGymPlaceName(gym.name);
    setGymPlaceAddress(gym.address ?? "");
    setGymLat(gym.lat);
    setGymLng(gym.lng);
    setSelectedGymId(gym.id);
    setManualAddress(gym.address ?? "");
    setSelectedManualAddressId("");
    setManualAddressError(null);
    setGymSearch("");
    setShowGymList(false);
  }, [clearSelectedGym, selectedGymId]);

  const handleManualAddressChange = useCallback((value: string) => {
    setManualAddress(value);
    setManualAddressError(null);
    setManualAddressOptions([]);

    if (selectedManualAddressId) {
      setSelectedManualAddressId("");
      setGymPlaceAddress("");
      setGymLat(null);
      setGymLng(null);
      setSelectedGymId("");
    }
  }, [selectedManualAddressId]);

  const selectManualAddress = useCallback((option: GeocodedGymAddress) => {
    const resolvedGymName = gymName.trim() || option.name;
    setSelectedManualAddressId(option.id);
    setManualAddress(option.address);
    setManualAddressOptions([]);
    setManualAddressError(null);
    setGymPlaceAddress(option.address);
    setGymLat(option.lat);
    setGymLng(option.lng);
    setGymPlaceName(resolvedGymName);
    setSelectedGymId("");
  }, [gymName]);

  useEffect(() => {
    if (!gymProofEnabled) {
      setManualAddressOptions([]);
      setLoadingManualAddressOptions(false);
      setManualAddressError(null);
      return;
    }

    if (selectedManualAddressId) {
      return;
    }

    const query = manualAddress.trim();
    if (query.length < 3) {
      setManualAddressOptions([]);
      setLoadingManualAddressOptions(false);
      setManualAddressError(null);
      return;
    }

    let active = true;
    setLoadingManualAddressOptions(true);

    const timeoutId = setTimeout(() => {
      void (async () => {
        const result = await fetchGymAddressSuggestions({ query });
        if (!active) {
          return;
        }

        if (result.error) {
          setManualAddressError(result.error);
          setManualAddressOptions([]);
          setLoadingManualAddressOptions(false);
          return;
        }

        setManualAddressError(null);
        setManualAddressOptions(result.data ?? []);
        setLoadingManualAddressOptions(false);
      })();
    }, 350);

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [gymProofEnabled, manualAddress, selectedManualAddressId]);

  const toggleGymList = useCallback(() => {
    setShowGymList((prev) => !prev);
  }, []);

  const handleFindGyms = useCallback(async () => {
    if (loadingGyms) return;

    setGymError(null);

    try {
      const permission = await requestForegroundLocationPermissionWithPrimer();
      if (permission === null) {
        return;
      }

      setLoadingGyms(true);
      if (permission.status !== "granted") {
        setGymError("Location permission is required to find nearby gyms.");
        setLoadingGyms(false);
        Alert.alert(
          "Location permission needed",
          "Enable location access in settings to find nearby gyms.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open settings", onPress: () => Linking.openSettings() },
          ],
        );
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 400));
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords =
        position?.coords ??
        (await Location.getLastKnownPositionAsync())?.coords;

      if (!coords) {
        setGymError("Couldn't read your location. Try again.");
        setLoadingGyms(false);
        return;
      }

      const { data, error } = await fetchNearbyGyms({
        latitude: coords.latitude,
        longitude: coords.longitude,
      });

      if (error) {
        setGymError(error);
        setLoadingGyms(false);
        return;
      }
      if (!data || data.length === 0) {
        setGymError("No gyms found nearby. Try again or move closer to a gym.");
        setLoadingGyms(false);
        return;
      }

      setGymOptions(data);
      setShowGymList(true);
      setLoadingGyms(false);
    } catch {
      setGymError("Couldn't load nearby gyms. Try again.");
      setLoadingGyms(false);
    }
  }, [loadingGyms]);

  const handleSave = useCallback(async (): Promise<boolean> => {
    if (saving) return false;
    if (gymProofEnabled && (!gymPlaceName || gymLat === null || gymLng === null)) {
      Alert.alert("Gym required", "Select a gym location to enable verification.");
      return false;
    }

    setSaving(true);
    const { error, code } = await saveGymSettingsValues({
      gymProofEnabled,
      gymName,
      gymPlaceName,
      gymPlaceAddress,
      gymLat,
      gymLng,
      gymRadiusM,
    });
    setSaving(false);

    if (isSessionRequired({ code })) {
      Alert.alert("Session error", "Please sign in again.");
      return false;
    }
    if (error) {
      Alert.alert("Save failed", error);
      return false;
    }

    return true;
  }, [
    gymLat,
    gymLng,
    gymName,
    gymPlaceAddress,
    gymPlaceName,
    gymProofEnabled,
    gymRadiusM,
    saving,
  ]);

  return {
    loading,
    saving,
    gymProofEnabled,
    setGymProofEnabled,
    gymName,
    setGymName,
    gymPlaceName,
    selectedGymId,
    showGymList,
    gymSearch,
    setGymSearch,
    manualAddress,
    setManualAddress: handleManualAddressChange,
    selectedManualAddressId,
    manualAddressOptions,
    loadingManualAddressOptions,
    manualAddressError,
    gymOptions,
    loadingGyms,
    gymError,
    filteredGyms,
    handleFindGyms,
    handleSave,
    selectGym,
    clearSelectedGym,
    selectManualAddress,
    toggleGymList,
  };
}
