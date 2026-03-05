import { Modal, Pressable, Text, TouchableOpacity, View } from "react-native";
import Input from "../ui/Input";

type GymValidationNoteModalProps = {
  visible: boolean;
  note: string;
  requesting: boolean;
  onClose: () => void;
  onChangeNote: (next: string) => void;
  onSubmit: () => Promise<void> | void;
};

export default function GymValidationNoteModal({
  visible,
  note,
  requesting,
  onClose,
  onChangeNote,
  onSubmit,
}: GymValidationNoteModalProps) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable className="flex-1 items-center justify-center bg-black/70 px-5" onPress={onClose}>
        <Pressable
          onPress={(event) => event.stopPropagation()}
          className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 p-5"
        >
          <Text className="text-lg font-semibold text-white">Request close-friend validation</Text>
          <Text className="mt-2 text-sm text-neutral-400">
            Add an optional note so your close friends understand your context.
          </Text>

          <Input
            value={note}
            onChangeText={(value) => onChangeNote(value.slice(0, 180))}
            placeholder="Optional note (180 chars max)"
            multiline
            numberOfLines={4}
            className="mt-4 min-h-[104px]"
          />
          <Text className="mt-2 text-right text-xs text-neutral-500">{note.length}/180</Text>

          <View className="mt-4 flex-row gap-2">
            <TouchableOpacity
              onPress={onClose}
              className="flex-1 items-center justify-center rounded-2xl border border-neutral-700 px-4 py-2.5"
              disabled={requesting}
            >
              <Text className="text-sm font-semibold text-neutral-200">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                void onSubmit();
              }}
              className="flex-1 items-center justify-center rounded-2xl bg-violet-600 px-4 py-2.5"
              disabled={requesting}
            >
              <Text className="text-sm font-semibold text-white">
                {requesting ? "Requesting..." : "Send request"}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
