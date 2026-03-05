import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import Input from "../components/ui/Input";
import ProfileAvatar from "../components/profile/ProfileAvatar";
import Card from "../components/ui/Card";
import type { AuthedTabParamList, RootStackParamList } from "../lib/navigation/types";
import { searchUsersByUsernamePrefix, type UserDirectoryRow } from "../lib/data/userDirectory";
import { sanitizeUsername } from "../lib/utils/username";
import { getProfilePhotoSignedUrl } from "../lib/features/profile";
import { fetchCurrentUserId } from "../lib/features/auth";

type SearchUsersProps = CompositeScreenProps<
  BottomTabScreenProps<AuthedTabParamList, "Search">,
  NativeStackScreenProps<RootStackParamList>
>;

export default function SearchUsers({ navigation }: SearchUsersProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<UserDirectoryRow[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string | null>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadCurrentUser = async () => {
      const authResult = await fetchCurrentUserId();
      if (!active || authResult.error) {
        return;
      }
      setCurrentUserId(authResult.data?.userId ?? null);
    };

    void loadCurrentUser();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const normalized = sanitizeUsername(query);

    if (!normalized) {
      setResults([]);
      setPhotoUrls({});
      setError(null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    const timeoutId = setTimeout(() => {
      const run = async () => {
        const result = await searchUsersByUsernamePrefix(normalized, { limit: 25, cursor: 0 });

        if (!active) {
          return;
        }

        if (result.error) {
          setError(result.error);
          setResults([]);
          setLoading(false);
          return;
        }

        const nextResults = (result.data?.items ?? []).filter(
          (entry) => entry.userId !== currentUserId,
        );
        setResults(nextResults);
        setError(null);

        const nextPhotoUrls: Record<string, string | null> = {};
        await Promise.all(
          nextResults.map(async (entry) => {
            if (!entry.avatarPath) {
              nextPhotoUrls[entry.userId] = null;
              return;
            }

            const signedUrlResult = await getProfilePhotoSignedUrl(entry.avatarPath);
            nextPhotoUrls[entry.userId] = signedUrlResult.data?.signedUrl ?? null;
          }),
        );

        if (!active) {
          return;
        }

        setPhotoUrls(nextPhotoUrls);
        setLoading(false);
      };

      void run();
    }, 220);

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [currentUserId, query]);

  return (
    <SafeAreaView className="flex-1 bg-neutral-950">
      <StatusBar style="light" />
      <View className="px-4 pb-2 pt-4">
        <Text className="text-3xl font-bold tracking-tight text-white">Search</Text>
        <Text className="mt-1 text-sm text-neutral-400">Find people by username.</Text>
      </View>

      <View className="px-4 pb-3 pt-1">
        <Input
          value={query}
          onChangeText={(value) => setQuery(sanitizeUsername(value))}
          placeholder="Search username"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <ScrollView className="flex-1" contentContainerClassName="px-4 pb-36 pt-2">
        {loading ? (
          <View className="mt-8 items-center">
            <ActivityIndicator size="small" color="#a3a3a3" />
          </View>
        ) : null}

        {!loading && error ? (
          <Card className="border-rose-500/40 bg-rose-500/10 px-4 py-3">
            <Text className="text-sm text-rose-200">Couldn&apos;t search users: {error}</Text>
          </Card>
        ) : null}

        {!loading && !error && query && results.length === 0 ? (
          <Text className="mt-6 text-center text-sm text-neutral-400">No users found.</Text>
        ) : null}

        {!loading && results.length > 0 ? (
          <View className="overflow-hidden rounded-2xl border border-neutral-800">
            {results.map((entry, index) => (
              <TouchableOpacity
                key={entry.userId}
                onPress={() => {
                  if (entry.userId === currentUserId) {
                    navigation.navigate("Profile");
                    return;
                  }
                  navigation.navigate("UserProfile", { userId: entry.userId });
                }}
                activeOpacity={0.82}
                className={`flex-row items-center bg-neutral-900/70 px-4 py-3.5 ${
                  index < results.length - 1 ? "border-b border-neutral-800" : ""
                }`}
              >
                <ProfileAvatar
                  displayName={entry.displayName}
                  photoUrl={photoUrls[entry.userId] ?? null}
                  size={44}
                  className="mr-3"
                />
                <View className="min-w-0 flex-1">
                  <Text className="text-sm font-semibold text-white" numberOfLines={1}>
                    {entry.displayName}
                  </Text>
                  <Text className="mt-0.5 text-xs text-neutral-400" numberOfLines={1}>
                    @{entry.username}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
