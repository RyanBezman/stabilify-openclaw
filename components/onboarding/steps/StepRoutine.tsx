import { Alert, Linking, Text, TouchableOpacity, View } from "react-native";
import { Switch } from "react-native";
import type { WeighInCadence } from "../../../lib/data/types";
import type { GymOption } from "../../../lib/features/onboarding";
import Input from "../../ui/Input";
import FormLabel from "../../ui/FormLabel";
import HelperText from "../../ui/HelperText";
import OptionPill from "../../ui/OptionPill";
import Card from "../../ui/Card";
import * as Location from "expo-location";
import { fetchNearbyGyms } from "../../../lib/data/gyms";

type StepRoutineProps = {
  cadence: WeighInCadence | "";
  cadenceMessage: string;
  customCadence: string;
  gymSessionsTarget: string;
  gymOptions: GymOption[];
  loadingGyms: boolean;
  gymError: string | null;
  selectedGymName: string;
  selectedGymId: string;
  gymSearch: string;
  showGymList: boolean;
  reminderDisplay: string;
  timezone: string;
  gymProofEnabled: boolean;
  gymName: string;
  onCadenceChange: (value: WeighInCadence) => void;
  onCustomCadenceChange: (value: string) => void;
  onGymSessionsTargetChange: (value: string) => void;
  onFindGyms: () => void;
  onGymsLoaded: (options: GymOption[]) => void;
  onGymError: (message: string) => void;
  onGymSelect: (gym: GymOption) => void;
  onGymSearchChange: (value: string) => void;
  onToggleGymList: () => void;
  onOpenTimePicker: () => void;
  onClearTime: () => void;
  onGymProofToggle: (value: boolean) => void;
  onGymNameChange: (value: string) => void;
};

const cadenceOptions: { label: string; value: WeighInCadence }[] = [
  { label: "Daily", value: "daily" },
  { label: "3x / week", value: "three_per_week" },
  { label: "Custom", value: "custom" },
];

export default function StepRoutine({
  cadence,
  cadenceMessage,
  customCadence,
  gymSessionsTarget,
  gymOptions,
  loadingGyms,
  gymError,
  selectedGymName,
  selectedGymId,
  gymSearch,
  showGymList,
  reminderDisplay,
  timezone,
  gymProofEnabled,
  gymName,
  onCadenceChange,
  onCustomCadenceChange,
  onGymSessionsTargetChange,
  onFindGyms,
  onGymsLoaded,
  onGymError,
  onGymSelect,
  onGymSearchChange,
  onToggleGymList,
  onOpenTimePicker,
  onClearTime,
  onGymProofToggle,
  onGymNameChange,
}: StepRoutineProps) {
  const handleFindGyms = async () => {
    if (loadingGyms) return;
    onFindGyms();
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        onGymError("Location permission is required to find nearby gyms.");
        Alert.alert(
          "Location permission needed",
          "Enable location access in settings to find nearby gyms.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open settings", onPress: () => Linking.openSettings() },
          ]
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
        onGymError("Couldn't read your location. Try again.");
        return;
      }
      const { data, error } = await fetchNearbyGyms({
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
      if (error) {
        onGymError(error);
        return;
      }
      if (!data || data.length === 0) {
        onGymError("No gyms found nearby. Try again or move closer to a gym.");
        return;
      }
      onGymsLoaded(data ?? []);
    } catch {
      onGymError("Couldn't load nearby gyms. Try again.");
    }
  };


  return (
    <View className="gap-5">
      <View>
        <FormLabel className="mb-3">Weigh-in cadence</FormLabel>
        <View className="flex-row gap-3">
          {cadenceOptions.map((option) => (
            <OptionPill
              key={option.value}
              label={option.label}
              selected={cadence === option.value}
              onPress={() => onCadenceChange(option.value)}
            />
          ))}
        </View>
        <HelperText className="mt-2">{cadenceMessage}</HelperText>
      </View>

      {cadence === "custom" ? (
        <View>
          <FormLabel>Times per week</FormLabel>
          <Input
            value={customCadence}
            onChangeText={onCustomCadenceChange}
            placeholder="4"
            keyboardType="number-pad"
          />
        </View>
      ) : null}

      <View>
        <FormLabel>Gym sessions per week</FormLabel>
        <Input
          value={gymSessionsTarget}
          onChangeText={onGymSessionsTargetChange}
          placeholder="4"
          keyboardType="number-pad"
        />
        <HelperText className="mt-2">
          Week starts Monday. One verified session per day. Max 7 sessions.
        </HelperText>
      </View>

      <View>
        <FormLabel>Reminder time (optional)</FormLabel>
        <TouchableOpacity
          onPress={onOpenTimePicker}
          className="flex-row items-center justify-between rounded-2xl border border-neutral-800 bg-neutral-900 px-5 py-4"
          activeOpacity={0.8}
        >
          <Text className="text-base text-white">{reminderDisplay}</Text>
          <Text className="text-base text-neutral-500">⌄</Text>
        </TouchableOpacity>
        {reminderDisplay !== "Select time" ? (
          <TouchableOpacity
            onPress={onClearTime}
            className="mt-2 self-start rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1"
          >
            <Text className="text-xs text-neutral-400">Clear time</Text>
          </TouchableOpacity>
        ) : null}
        <HelperText className="mt-2">
          We’ll use your local time zone: {timezone}.
        </HelperText>
      </View>

      <Card className="p-5">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-sm font-semibold text-white">
              Gym proof boosts streaks
            </Text>
            <HelperText className="mt-1">
              Optional photo + location check-in.
            </HelperText>
          </View>
          <Switch
            value={gymProofEnabled}
            onValueChange={onGymProofToggle}
            trackColor={{ false: "#262626", true: "#7c3aed" }}
            thumbColor="#f5f3ff"
          />
        </View>
        {gymProofEnabled ? (
          <View className="mt-4">
            <FormLabel>Gym name (manual fallback)</FormLabel>
            <Input
              value={gymName}
              onChangeText={onGymNameChange}
              placeholder="Anytime Fitness"
              className="bg-neutral-950/60"
            />
            <HelperText className="mt-2">
              Use this if your gym isn’t in the nearby list.
            </HelperText>
            <Text className="mt-4 text-sm font-semibold text-white">
              Set your gym location
            </Text>
            <HelperText className="mt-1">
              We'll use this to verify sessions by distance. Powered by OpenStreetMap.
            </HelperText>
          <TouchableOpacity
            onPress={handleFindGyms}
            className="mt-3 rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3"
            activeOpacity={0.8}
            disabled={loadingGyms}
          >
            <Text className="text-sm font-semibold text-white">
              {loadingGyms ? "Searching nearby gyms..." : "Find nearby gyms"}
            </Text>
          </TouchableOpacity>
            {gymError ? (
              <HelperText className="mt-2 text-rose-400">{gymError}</HelperText>
            ) : null}
            {gymOptions.length > 0 ? (
              <View className="mt-3">
                <TouchableOpacity
                  onPress={onToggleGymList}
                  className="flex-row items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3"
                  activeOpacity={0.8}
                >
                  <Text className="text-sm font-semibold text-white">Nearby gyms</Text>
                  <Text className="text-sm text-neutral-400">
                    {showGymList ? "⌃" : "⌄"}
                  </Text>
                </TouchableOpacity>
                {showGymList ? (
                  <View className="mt-3 gap-2">
                    <View className="mb-1">
                      <FormLabel>Search results</FormLabel>
                      <Input
                        value={gymSearch}
                        onChangeText={onGymSearchChange}
                        placeholder="Search gyms"
                      />
                    </View>
                    {gymOptions
                      .filter((gym) =>
                        gymSearch.trim().length === 0
                          ? true
                          : `${gym.name} ${gym.address ?? ""}`
                              .toLowerCase()
                              .includes(gymSearch.trim().toLowerCase())
                      )
                      .map((gym) => {
                      const selected = gym.id === selectedGymId;
                      return (
                        <TouchableOpacity
                          key={gym.id}
                          onPress={() => onGymSelect(gym)}
                          className={`rounded-xl border px-4 py-3 ${
                            selected
                              ? "border-violet-500 bg-violet-600/20"
                              : "border-neutral-800 bg-neutral-900"
                          }`}
                        >
                          <Text
                            className={`text-sm font-semibold ${
                              selected ? "text-white" : "text-neutral-200"
                            }`}
                          >
                            {gym.name}
                          </Text>
                          {gym.address ? (
                            <Text className="mt-1 text-xs text-neutral-500">
                              {gym.address}
                            </Text>
                          ) : null}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            ) : null}
            {selectedGymName ? (
              <HelperText className="mt-4">
                Verification radius is set to 150 meters.
              </HelperText>
            ) : null}
          </View>
        ) : null}
      </Card>

      <HelperText>You can update reminders and proof settings anytime.</HelperText>
    </View>
  );
}
