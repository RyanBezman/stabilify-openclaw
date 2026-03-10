import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Slider from "@react-native-community/slider";
import type { WeightUnit } from "../../../lib/data/types";
import type {
  CoachCheckinReviewSection,
  CoachCheckinStepId,
} from "../../../lib/features/coaches/models/checkinFlow";
import type { WeeklyCheckinV2Form } from "../../../lib/features/coaches/models/checkinForm";
import type {
  WeeklyCheckinAdherenceSubjective,
  WeeklyCheckinDifficulty,
  WeeklyCheckinRating,
} from "../../../lib/features/coaches";
import Card from "../../ui/Card";
import OptionPill from "../../ui/OptionPill";

const SINGLE_LINE_INPUT_STYLE = {
  includeFontPadding: false,
  fontSize: 16,
  paddingTop: 0,
  paddingBottom: 0,
  height: 48,
};

function clampAdherence(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function optionButtonClass(selected: boolean) {
  return selected
    ? "border-violet-400 bg-violet-500/20"
    : "border-neutral-700 bg-neutral-900";
}

function SectionTitle({
  title,
  helper,
}: {
  title: string;
  helper?: string;
}) {
  return (
    <View>
      <Text className="text-sm font-semibold text-neutral-200">{title}</Text>
      {helper ? (
        <Text className="mt-1 text-xs text-neutral-500">{helper}</Text>
      ) : null}
    </View>
  );
}

function SecondaryChoiceButton({
  label,
  selected,
  onPress,
  disabled = false,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      disabled={disabled}
      activeOpacity={0.85}
      onPress={onPress}
      className={`flex-1 rounded-xl border px-3 py-3 ${
        optionButtonClass(selected)
      } ${disabled ? "opacity-60" : ""}`}
    >
      <Text
        className={`text-center text-sm font-semibold ${
          selected ? "text-violet-100" : "text-neutral-300"
        }`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function YesNoPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View className="mt-3 flex-row gap-2">
      <TouchableOpacity
        disabled={disabled}
        activeOpacity={0.85}
        onPress={() => onChange(true)}
        className={`flex-1 rounded-xl border px-3 py-3 ${
          optionButtonClass(value)
        } ${disabled ? "opacity-60" : ""}`}
      >
        <Text
          className={`text-center text-sm font-semibold ${
            value ? "text-violet-100" : "text-neutral-300"
          }`}
        >
          Yes
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        disabled={disabled}
        activeOpacity={0.85}
        onPress={() => onChange(false)}
        className={`flex-1 rounded-xl border px-3 py-3 ${
          optionButtonClass(!value)
        } ${disabled ? "opacity-60" : ""}`}
      >
        <Text
          className={`text-center text-sm font-semibold ${
            !value ? "text-violet-100" : "text-neutral-300"
          }`}
        >
          No
        </Text>
      </TouchableOpacity>
    </View>
  );
}

type Props = {
  currentStep: CoachCheckinStepId;
  currentWeightInputUnit: WeightUnit;
  energy: number;
  setEnergy: (value: number) => void;
  adherencePercent: string;
  setAdherencePercent: (value: string) => void;
  v2Form: WeeklyCheckinV2Form;
  updateV2Field: <K extends keyof WeeklyCheckinV2Form>(
    key: K,
    value: WeeklyCheckinV2Form[K],
  ) => void;
  saving: boolean;
  reviewSections: CoachCheckinReviewSection[];
  onEditStep: (stepId: CoachCheckinReviewSection["stepId"]) => void;
  onInputFocus?: (target: number) => void;
};

function MultilineInput({
  value,
  onChangeText,
  editable,
  placeholder,
  onFocusTarget,
}: {
  value: string;
  onChangeText: (value: string) => void;
  editable: boolean;
  placeholder: string;
  onFocusTarget?: (target: number) => void;
}) {
  return (
    <TextInput
      className="mt-3 min-h-[70px] rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-3 text-base text-white"
      value={value}
      onChangeText={onChangeText}
      onFocus={(event) => {
        onFocusTarget?.(event.nativeEvent.target);
      }}
      multiline
      editable={editable}
      placeholder={placeholder}
      placeholderTextColor="#525252"
      textAlignVertical="top"
    />
  );
}

function RatingScaleRow({
  title,
  value,
  onChange,
  lowLabel,
  highLabel,
  valueLabels,
  disabled = false,
  withSpacing = true,
}: {
  title: string;
  value: WeeklyCheckinRating;
  onChange: (next: WeeklyCheckinRating) => void;
  lowLabel: string;
  highLabel: string;
  valueLabels: [string, string, string, string, string];
  disabled?: boolean;
  withSpacing?: boolean;
}) {
  const values: WeeklyCheckinRating[] = [1, 2, 3, 4, 5];

  return (
    <View className={withSpacing ? "pt-7" : ""}>
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-sm font-semibold text-neutral-100">{title}</Text>
          <Text className="mt-1 text-xs text-neutral-500">{valueLabels[value - 1]}</Text>
        </View>
        <Text className="text-sm font-semibold text-violet-100">{value}/5</Text>
      </View>

      <View className="mt-5 flex-row gap-2">
        {values.map((entry) => {
          const selected = value === entry;
          return (
            <TouchableOpacity
              key={`${title}-${entry}`}
              activeOpacity={0.85}
              disabled={disabled}
              onPress={() => {
                if (disabled) return;
                onChange(entry);
              }}
              className={`h-11 flex-1 items-center justify-center rounded-xl border ${
                optionButtonClass(selected)
              } ${disabled ? "opacity-60" : ""}`}
            >
              <Text
                className={`text-sm font-semibold ${
                  selected ? "text-violet-100" : "text-neutral-300"
                }`}
              >
                {entry}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View className="mt-4 flex-row items-center justify-between gap-4">
        <Text className="flex-1 text-left text-[11px] font-semibold uppercase tracking-[1.2px] text-neutral-500">
          {lowLabel}
        </Text>
        <Text className="flex-1 text-right text-[11px] font-semibold uppercase tracking-[1.2px] text-neutral-500">
          {highLabel}
        </Text>
      </View>
    </View>
  );
}

function ReviewSummary({
  sections,
  onEditStep,
}: {
  sections: CoachCheckinReviewSection[];
  onEditStep: (stepId: CoachCheckinReviewSection["stepId"]) => void;
}) {
  return (
    <Card variant="subtle" className="overflow-hidden">
      {sections.map((section, sectionIndex) => (
        <View
          key={section.stepId}
          className={`px-4 py-4 ${sectionIndex === 0 ? "" : "border-t border-neutral-800"}`}
        >
          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-semibold uppercase tracking-[1.6px] text-neutral-400">
              {section.title}
            </Text>
            <TouchableOpacity onPress={() => onEditStep(section.stepId)}>
              <Text className="text-xs font-semibold uppercase tracking-[1.4px] text-violet-300">
                Edit
              </Text>
            </TouchableOpacity>
          </View>
          <View className="mt-3 gap-3">
            {section.rows.map((row, index) => (
              <View
                key={`${section.stepId}-${row.label}`}
                className={`gap-2 pt-3 ${
                  index === 0 ? "" : "border-t border-neutral-800"
                }`}
              >
                <Text className="text-xs font-semibold uppercase tracking-[1.4px] text-neutral-500">
                  {row.label}
                </Text>
                <Text className="text-sm leading-6 text-neutral-100">{row.value}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </Card>
  );
}

export default function CheckinWizardStepContent({
  currentStep,
  currentWeightInputUnit,
  energy,
  setEnergy,
  adherencePercent,
  setAdherencePercent,
  v2Form,
  updateV2Field,
  saving,
  reviewSections,
  onEditStep,
  onInputFocus,
}: Props) {
  const adherenceValue = clampAdherence(Number(adherencePercent));

  if (currentStep === "review") {
    return (
      <ReviewSummary
        sections={reviewSections}
        onEditStep={onEditStep}
      />
    );
  }

  if (currentStep === "body_metrics") {
    return (
      <View>
        <SectionTitle title={`Current weight (${currentWeightInputUnit})`} />
        <TextInput
          className="mt-3 h-12 rounded-xl border border-neutral-800 bg-neutral-900 px-3 text-white"
          value={v2Form.currentWeight}
          onChangeText={(value) => updateV2Field("currentWeight", value)}
          keyboardType="decimal-pad"
          underlineColorAndroid="transparent"
          textAlignVertical="center"
          style={SINGLE_LINE_INPUT_STYLE}
          editable={!saving}
          placeholder="e.g. 180.4"
          placeholderTextColor="#525252"
        />

        <View className="mt-5">
          <SectionTitle title="Waist (cm, optional)" />
          <TextInput
            className="mt-3 h-12 rounded-xl border border-neutral-800 bg-neutral-900 px-3 text-white"
            value={v2Form.waistCm}
            onChangeText={(value) => updateV2Field("waistCm", value)}
            keyboardType="decimal-pad"
            underlineColorAndroid="transparent"
            textAlignVertical="center"
            style={SINGLE_LINE_INPUT_STYLE}
            editable={!saving}
            placeholder="e.g. 84"
            placeholderTextColor="#525252"
          />
        </View>

        <View className="mt-5">
          <SectionTitle title="Body composition changes" />
          <MultilineInput
            value={v2Form.bodyCompChanges}
            onChangeText={(value) => updateV2Field("bodyCompChanges", value)}
            editable={!saving}
            onFocusTarget={onInputFocus}
            placeholder="e.g. Midsection looked tighter and shirts fit looser."
          />
        </View>
      </View>
    );
  }

  if (currentStep === "training_recap") {
    return (
      <View>
        <SectionTitle title="Progress photo prompted this week?" />
        <YesNoPicker
          value={v2Form.progressPhotoPrompted}
          onChange={(value) => updateV2Field("progressPhotoPrompted", value)}
          disabled={saving}
        />

        <View className="mt-5">
          <SectionTitle title="Training difficulty" />
          <View className="mt-3 flex-row gap-2">
            {([
              ["too_easy", "Too easy"],
              ["right", "Right"],
              ["too_hard", "Too hard"],
            ] as [WeeklyCheckinDifficulty, string][]).map(([value, label]) => (
              <SecondaryChoiceButton
                key={value}
                label={label}
                selected={v2Form.trainingDifficulty === value}
                onPress={() => {
                  if (!saving) updateV2Field("trainingDifficulty", value);
                }}
                disabled={saving}
              />
            ))}
          </View>
        </View>

        <View className="mt-5">
          <SectionTitle title="Goal progress / Strength PRs" />
          <MultilineInput
            value={v2Form.strengthPRs}
            onChangeText={(value) => updateV2Field("strengthPRs", value)}
            editable={!saving}
            onFocusTarget={onInputFocus}
            placeholder="e.g. Added 10 lb to bench and hit all planned sets."
          />
        </View>

        <View className="mt-4">
          <SectionTitle title="Consistency notes" />
          <MultilineInput
            value={v2Form.consistencyNotes}
            onChangeText={(value) => updateV2Field("consistencyNotes", value)}
            editable={!saving}
            onFocusTarget={onInputFocus}
            placeholder="e.g. Missed one lift on a travel day, otherwise stayed on plan."
          />
        </View>
      </View>
    );
  }

  if (currentStep === "nutrition_recap") {
    return (
      <View>
        <SectionTitle title="Nutrition adherence (%)" />
        <View className="mt-3 rounded-xl border border-neutral-800 bg-neutral-900 p-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-semibold text-neutral-100">
              Adherence
            </Text>
            <Text className="text-sm font-semibold text-neutral-100">
              {adherenceValue}%
            </Text>
          </View>
          <Slider
            style={{ marginTop: 8 }}
            value={adherenceValue}
            minimumValue={0}
            maximumValue={100}
            step={1}
            onValueChange={(value) =>
              setAdherencePercent(String(clampAdherence(value)))
            }
            minimumTrackTintColor="#a78bfa"
            maximumTrackTintColor="#404040"
            thumbTintColor="#c4b5fd"
            disabled={saving}
          />
        </View>

        <View className="mt-4">
          <SectionTitle title="How did adherence feel?" />
          <View className="mt-3 flex-row gap-2">
            {([
              ["low", "Low"],
              ["medium", "Medium"],
              ["high", "High"],
            ] as [WeeklyCheckinAdherenceSubjective, string][]).map(
              ([value, label]) => (
                <OptionPill
                  key={value}
                  label={label}
                  selected={v2Form.nutritionAdherenceSubjective === value}
                  onPress={() => {
                    if (!saving) {
                      updateV2Field("nutritionAdherenceSubjective", value);
                    }
                  }}
                  disabled={saving}
                />
              ),
            )}
          </View>
        </View>

        <View className="mt-5">
          <SectionTitle title="Appetite and cravings" />
          <MultilineInput
            value={v2Form.appetiteCravings}
            onChangeText={(value) => updateV2Field("appetiteCravings", value)}
            editable={!saving}
            onFocusTarget={onInputFocus}
            placeholder="e.g. Hunger was steady, but late-night sweets were tough."
          />
        </View>
      </View>
    );
  }

  if (currentStep === "recovery") {
    return (
      <View>
        <RatingScaleRow
          title="Energy"
          value={energy as WeeklyCheckinRating}
          onChange={(value) => setEnergy(value)}
          lowLabel="Drained"
          highLabel="Great"
          valueLabels={["Drained", "Low", "Steady", "Good", "Great"]}
          disabled={saving}
          withSpacing={false}
        />

        <RatingScaleRow
          title="Recovery"
          value={v2Form.recoveryRating}
          onChange={(value) => updateV2Field("recoveryRating", value)}
          lowLabel="Beat up"
          highLabel="Recovered"
          valueLabels={["Beat up", "Heavy", "Okay", "Solid", "Recovered"]}
          disabled={saving}
        />

        <View className="pt-7">
          <SectionTitle title="Sleep average hours" />
          <TextInput
            className="mt-3 h-12 rounded-xl border border-neutral-800 bg-neutral-900 px-3 text-white"
            value={v2Form.sleepAvgHours}
            onChangeText={(value) => updateV2Field("sleepAvgHours", value)}
            keyboardType="decimal-pad"
            underlineColorAndroid="transparent"
            textAlignVertical="center"
            style={SINGLE_LINE_INPUT_STYLE}
            editable={!saving}
            placeholder="e.g. 7.5"
            placeholderTextColor="#525252"
          />
        </View>

        <RatingScaleRow
          title="Sleep quality"
          value={v2Form.sleepQuality}
          onChange={(value) => updateV2Field("sleepQuality", value)}
          lowLabel="Poor"
          highLabel="Great"
          valueLabels={["Poor", "Light", "Okay", "Good", "Great"]}
          disabled={saving}
        />

        <RatingScaleRow
          title="Stress"
          value={v2Form.stressLevel}
          onChange={(value) => updateV2Field("stressLevel", value)}
          lowLabel="Low"
          highLabel="High"
          valueLabels={["Low", "Easy", "Moderate", "High", "Very high"]}
          disabled={saving}
        />
      </View>
    );
  }

  if (currentStep === "next_week") {
    return (
      <View>
        <SectionTitle title="Schedule constraints next week" />
        <MultilineInput
          value={v2Form.scheduleConstraintsNextWeek}
          onChangeText={(value) =>
            updateV2Field("scheduleConstraintsNextWeek", value)
          }
          editable={!saving}
          onFocusTarget={onInputFocus}
          placeholder="e.g. Traveling Thu-Sat and only have hotel gym access."
        />

        <View className="mt-5">
          <SectionTitle
            title="How has your stomach / digestion felt with this plan?"
            helper="Optional"
          />
          <MultilineInput
            value={v2Form.foodDigestionNotes}
            onChangeText={(value) => updateV2Field("foodDigestionNotes", value)}
            editable={!saving}
            onFocusTarget={onInputFocus}
            placeholder="e.g. Felt bloated after larger dinners, but breakfast sat fine."
          />
        </View>
      </View>
    );
  }

  return (
    <View>
      <SectionTitle title="Any pain or injury concerns?" />
      <YesNoPicker
        value={v2Form.injuryHasPain}
        onChange={(value) => updateV2Field("injuryHasPain", value)}
        disabled={saving}
      />

      {v2Form.injuryHasPain ? (
        <View className="mt-5">
          <SectionTitle title="Pain details" />
          <MultilineInput
            value={v2Form.injuryDetails}
            onChangeText={(value) => updateV2Field("injuryDetails", value)}
            editable={!saving}
            onFocusTarget={onInputFocus}
            placeholder="e.g. Mild right knee pain on deep squats."
          />
        </View>
      ) : null}

      <View className="mt-5">
        <SectionTitle
          title="Any red-flag pain symptoms?"
          helper="Sharp worsening pain, numbness, or other concerning symptoms."
        />
        <YesNoPicker
          value={v2Form.injuryRedFlags}
          onChange={(value) => updateV2Field("injuryRedFlags", value)}
          disabled={saving}
        />
      </View>
    </View>
  );
}
