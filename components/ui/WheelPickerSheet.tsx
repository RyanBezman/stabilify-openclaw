import { Modal, Text, TouchableOpacity, View } from "react-native";
import { Picker } from "@react-native-picker/picker";

export type WheelPickerOption = {
  label: string;
  value: number | string;
};

export type WheelPickerColumn = {
  key: string;
  label: string;
  value: number | string;
  options: WheelPickerOption[];
  onValueChange: (value: number | string) => void;
};

type WheelPickerSheetProps = {
  visible: boolean;
  title: string;
  columns: WheelPickerColumn[];
  onCancel: () => void;
  onDone: () => void;
};

export default function WheelPickerSheet({
  visible,
  title,
  columns,
  onCancel,
  onDone,
}: WheelPickerSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View className="flex-1 justify-end bg-black/60">
        <View className="rounded-t-3xl border border-neutral-800 bg-neutral-950 px-5 pb-8 pt-4">
          <View className="mb-4 flex-row items-center justify-between">
            <TouchableOpacity
              onPress={onCancel}
              className="rounded-full border border-neutral-800 bg-neutral-900 px-4 py-2"
            >
              <Text className="text-sm font-semibold text-neutral-200">Cancel</Text>
            </TouchableOpacity>
            <Text className="text-sm font-semibold text-neutral-400">{title}</Text>
            <TouchableOpacity
              onPress={onDone}
              className="rounded-full border border-neutral-800 bg-neutral-900 px-4 py-2"
            >
              <Text className="text-sm font-semibold text-white">Done</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row gap-3">
            {columns.map((column) => (
              <View key={column.key} className="flex-1">
                <Text className="mb-2 text-center text-xs font-semibold uppercase tracking-[1px] text-neutral-500">
                  {column.label}
                </Text>
                <View className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900">
                  <Picker
                    selectedValue={column.value}
                    onValueChange={(value) => column.onValueChange(value)}
                    itemStyle={{ color: "#ffffff" }}
                    style={{ color: "#ffffff", backgroundColor: "#171717" }}
                    dropdownIconColor="#a3a3a3"
                  >
                    {column.options.map((option) => (
                      <Picker.Item key={`${column.key}-${option.value}`} label={option.label} value={option.value} />
                    ))}
                  </Picker>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}
