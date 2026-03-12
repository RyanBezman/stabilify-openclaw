import {
  ActivityIndicator,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Card from "../ui/Card";
import FormLabel from "../ui/FormLabel";
import HelperText from "../ui/HelperText";
import Input from "../ui/Input";
import SectionTitle from "../ui/SectionTitle";
import type { GymOption } from "../../lib/features/gym-settings";
import { DEFAULT_GYM_RADIUS_METERS } from "../../lib/features/gym-settings";
import type { GeocodedGymAddress } from "../../lib/data/gyms";

type GymProofSettingsCardProps = {
  gymProofEnabled: boolean;
  setGymProofEnabled: (value: boolean) => void;
  handleFindGyms: () => void;
  loadingGyms: boolean;
  gymError: string | null;
  gymOptions: GymOption[];
  showGymList: boolean;
  toggleGymList: () => void;
  gymSearch: string;
  setGymSearch: (value: string) => void;
  manualAddress: string;
  setManualAddress: (value: string) => void;
  selectedManualAddressId: string;
  manualAddressOptions: GeocodedGymAddress[];
  loadingManualAddressOptions: boolean;
  manualAddressError: string | null;
  filteredGyms: GymOption[];
  selectedGymId: string;
  selectGym: (gym: GymOption) => void;
  selectManualAddress: (option: GeocodedGymAddress) => void;
  gymPlaceName: string;
  gymName: string;
  setGymName: (value: string) => void;
  onGymNameFocus?: () => void;
  onGymAddressFocus?: () => void;
};

const VERIFICATION_RADIUS_MILES = (
  DEFAULT_GYM_RADIUS_METERS * 0.000621371
).toFixed(1);

function GymRow({
  gym,
  selected,
  onSelect,
}: {
  gym: GymOption;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onSelect}
      className={`rounded-2xl border px-4 py-3.5 ${
        selected
          ? "border-violet-500/50 bg-violet-600/10"
          : "border-neutral-800 bg-neutral-900/50"
      }`}
      activeOpacity={0.7}
    >
      <View className="flex-row items-center">
        <View
          className={`h-5 w-5 items-center justify-center rounded-full border-2 ${
            selected ? "border-violet-400 bg-violet-500" : "border-neutral-600"
          }`}
        >
          {selected ? (
            <View className="h-2 w-2 rounded-full bg-white" />
          ) : null}
        </View>
        <View className="ml-3 flex-1">
          <Text
            className={`text-sm font-semibold ${
              selected ? "text-white" : "text-neutral-200"
            }`}
          >
            {gym.name}
          </Text>
          {gym.address ? (
            <Text className="mt-0.5 text-xs text-neutral-500">
              {gym.address}
            </Text>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function GymProofSettingsCard({
  gymProofEnabled,
  setGymProofEnabled,
  handleFindGyms,
  loadingGyms,
  gymError,
  gymOptions,
  showGymList,
  toggleGymList,
  gymSearch,
  setGymSearch,
  manualAddress,
  setManualAddress,
  selectedManualAddressId,
  manualAddressOptions,
  loadingManualAddressOptions,
  manualAddressError,
  filteredGyms,
  selectedGymId,
  selectGym,
  selectManualAddress,
  gymPlaceName,
  gymName,
  setGymName,
  onGymNameFocus,
  onGymAddressFocus,
}: GymProofSettingsCardProps) {
  return (
    <View className="gap-5">
      <Card className="p-5">
        <View className="flex-row items-center justify-between">
          <View className="mr-4 flex-1">
            <Text className="text-base font-semibold text-white">
              Location verification
            </Text>
            <Text className="mt-1.5 text-sm leading-5 text-neutral-400">
              Use photo + location check-ins to verify gym sessions. Location is only used while finding your gym or logging a check-in.
            </Text>
          </View>
          <Switch
            value={gymProofEnabled}
            onValueChange={setGymProofEnabled}
            trackColor={{ false: "#262626", true: "#7c3aed" }}
            thumbColor="#f5f3ff"
          />
        </View>
      </Card>

      {gymProofEnabled ? (
        <>
          {gymPlaceName ? (
            <View className="rounded-2xl border border-emerald-500/30 bg-emerald-950/40 p-4">
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-xs font-medium text-emerald-400">
                    Your gym
                  </Text>
                  <Text className="mt-1 text-base font-semibold text-white">
                    {gymPlaceName}
                  </Text>
                  <Text className="mt-1 text-xs text-neutral-400">
                    Verified within {VERIFICATION_RADIUS_MILES} mi
                  </Text>
                  <TouchableOpacity
                    onPress={handleFindGyms}
                    activeOpacity={0.7}
                    className="mt-2 self-start py-1"
                  >
                    <Text className="text-xs font-semibold text-neutral-300">
                      Change gym
                    </Text>
                  </TouchableOpacity>
                </View>
                <View className="ml-3 h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20">
                  <Text className="text-sm text-emerald-400">✓</Text>
                </View>
              </View>
            </View>
          ) : null}

          <View>
            <SectionTitle className="mb-4 ml-1">
              {gymPlaceName ? "Change gym" : "Select a gym"}
            </SectionTitle>

            <TouchableOpacity
              onPress={handleFindGyms}
              disabled={loadingGyms}
              className="flex-row items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-900 py-4"
              activeOpacity={0.7}
            >
              {loadingGyms ? (
                <ActivityIndicator
                  size="small"
                  color="#a78bfa"
                  style={{ marginRight: 10 }}
                />
              ) : null}
              <Text className="text-sm font-semibold text-neutral-200">
                {loadingGyms ? "Searching nearby…" : "Search nearby gyms"}
              </Text>
            </TouchableOpacity>

            {gymError ? (
              <View className="mt-3 rounded-2xl bg-rose-950/40 px-4 py-3">
                <Text className="text-sm text-rose-300">{gymError}</Text>
              </View>
            ) : null}

            {gymOptions.length > 0 ? (
              <View className="mt-4">
                <View className="mb-3 flex-row items-center justify-between px-1">
                  <Text className="text-xs text-neutral-500">
                    {gymOptions.length} location
                    {gymOptions.length !== 1 ? "s" : ""} found
                  </Text>
                  <TouchableOpacity
                    onPress={toggleGymList}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text className="text-xs font-semibold text-violet-400">
                      {showGymList ? "Hide" : "Show results"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {showGymList ? (
                  <>
                    {gymOptions.length > 3 ? (
                      <Input
                        value={gymSearch}
                        onChangeText={setGymSearch}
                        placeholder="Filter results…"
                        className="mb-3"
                      />
                    ) : null}

                    <HelperText className="mb-2 ml-1">
                      Tap to select · tap again to deselect
                    </HelperText>

                    <ScrollView
                      style={{ maxHeight: 280 }}
                      nestedScrollEnabled
                      showsVerticalScrollIndicator={false}
                    >
                      <View className="gap-2">
                        {filteredGyms.length === 0 ? (
                          <View className="rounded-2xl bg-neutral-900/40 px-4 py-3">
                            <Text className="text-sm text-neutral-400">
                              No gyms match your search.
                            </Text>
                          </View>
                        ) : null}

                        {filteredGyms.map((gym) => (
                          <GymRow
                            key={gym.id}
                            gym={gym}
                            selected={gym.id === selectedGymId}
                            onSelect={() => selectGym(gym)}
                          />
                        ))}
                      </View>
                    </ScrollView>
                  </>
                ) : null}
              </View>
            ) : null}
          </View>

          <View>
            <View className="flex-row items-center">
              <View className="h-px flex-1 bg-neutral-800" />
              <Text className="mx-3 text-xs text-neutral-500">
                or enter manually
              </Text>
              <View className="h-px flex-1 bg-neutral-800" />
            </View>
            <View className="mt-4">
              <FormLabel>Gym name</FormLabel>
              <Input
                value={gymName}
                onChangeText={setGymName}
                placeholder="e.g., Anytime Fitness"
                onFocus={onGymNameFocus}
              />
            </View>

            <View className="mt-4">
              <FormLabel>Gym address</FormLabel>
              <Input
                value={manualAddress}
                onChangeText={setManualAddress}
                placeholder="Type address to search..."
                onFocus={onGymAddressFocus}
              />
              <HelperText className="mt-2">
                Select a suggested address to set a verified map location.
              </HelperText>

              {loadingManualAddressOptions ? (
                <Text className="mt-2 text-xs text-neutral-500">
                  Searching addresses...
                </Text>
              ) : null}

              {manualAddressError ? (
                <Text className="mt-2 text-xs text-rose-300">
                  {manualAddressError}
                </Text>
              ) : null}

              {manualAddress.trim().length >= 3 && manualAddressOptions.length > 0 ? (
                <View className="mt-2 gap-2 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-2">
                  {manualAddressOptions.map((option) => {
                    const selected = selectedManualAddressId === option.id;

                    return (
                      <TouchableOpacity
                        key={option.id}
                        onPress={() => selectManualAddress(option)}
                        className={`rounded-xl border px-3 py-2.5 ${
                          selected
                            ? "border-violet-500/60 bg-violet-600/10"
                            : "border-neutral-800 bg-neutral-900/40"
                        }`}
                        activeOpacity={0.7}
                      >
                        <Text
                          className={`text-sm font-semibold ${
                            selected ? "text-white" : "text-neutral-200"
                          }`}
                        >
                          {option.name}
                        </Text>
                        <Text className="mt-0.5 text-xs text-neutral-500">
                          {option.address}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}

              {manualAddress.trim().length >= 3 &&
              !loadingManualAddressOptions &&
              !manualAddressError &&
              manualAddressOptions.length === 0 ? (
                <Text className="mt-2 text-xs text-neutral-500">
                  No address matches found.
                </Text>
              ) : null}
            </View>
          </View>
        </>
      ) : null}
    </View>
  );
}
