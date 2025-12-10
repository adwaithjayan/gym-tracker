import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from "react-native";
import { X, ChevronDown } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { ExerciseInputItem } from "./ExerciseInputItem";
import { LoadingModal } from "./SyncModals";
import {
  saveWorkout,
  downloadAndSaveImage,
  getWorkoutByDay,
} from "../services/storage";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const MAX_ITEMS = 7;

export const AddWorkoutModal = ({ visible, onClose, onSuccess }) => {
  const { colorScheme } = useColorScheme();
  const isAndroid = Platform.OS === "android";
  const [title, setTitle] = useState("");
  const [selectedDay, setSelectedDay] = useState("1");
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [items, setItems] = useState([
    { id: Date.now(), name: "", image: null },
  ]);

  // Load existing data when day changes
  React.useEffect(() => {
    if (!visible) return; // Only load when open

    const loadDayData = async () => {
      const existing = await getWorkoutByDay(selectedDay);
      if (existing) {
        setTitle(existing.title);
        // Ensure distinct IDs to avoid key conflicts if needed, or keep existing
        setItems(
          existing.exercises.map((e) => ({
            ...e,
            id: e.id || Date.now() + Math.random(),
          }))
        );
      } else {
        // Only reset if we are switching to a day that has NO data.
        // If the user just typed stuff for Day 1 and switched to Day 2 (empty), we clear.
        setTitle("");
        setItems([{ id: Date.now(), name: "", image: null }]);
      }
    };
    loadDayData();
  }, [selectedDay, visible]);

  // Loading State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // 'success' | 'error' | null

  const handleAddItem = useCallback(() => {
    setItems((prev) => {
      if (prev.length >= MAX_ITEMS) {
        Alert.alert("Limit Reached", "You can only add up to 7 exercises.");
        return prev;
      }
      return [...prev, { id: Date.now(), name: "", image: null }];
    });
  }, []);

  const handleRemoveItem = useCallback((id) => {
    setItems((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  const handleUpdateItem = useCallback((id, updates) => {
    setItems((prev) => prev.map((i) => (i.id === id ? updates : i)));
  }, []);

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert("Missing Title", "Please enter a workout title.");
      return;
    }
    if (items.some((i) => !i.name.trim())) {
      Alert.alert("Incomplete", "Please name all exercises.");
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      // Process Items: Download images
      const processedItems = await Promise.all(
        items.map(async (item) => {
          let localImageUri = item.image;
          // Check if user provided a NEW remote URL (starts with http/https)
          const isNewRemote =
            item.image &&
            (item.image.startsWith("http") || item.image.startsWith("https"));

          // Determine the 'original' (remote) URL for sync
          // If isNewRemote is true, that's our new original.
          // Otherwise, fall back to the existing originalImage (if valid).
          const remoteUrl = isNewRemote ? item.image : item.originalImage;

          if (isNewRemote) {
            const filename = `${Date.now()}_${Math.random()
              .toString(36)
              .substr(7)}.jpg`;
            const saved = await downloadAndSaveImage(item.image, filename);
            if (saved) localImageUri = saved;
          }

          return {
            id: item.id,
            name: item.name,
            originalImage: remoteUrl, // Persist remote URL
            image: localImageUri, // Local path (or remote if download failed)
            completed: item.completed || false,
          };
        })
      );

      const workoutData = {
        id: Date.now(),
        title: title,
        day: selectedDay,
        exercises: processedItems,
        createdAt: new Date().toISOString(),
      };

      const saved = await saveWorkout(workoutData);

      if (saved) {
        setSubmitStatus("success");
        setTimeout(() => {
          handleClose();
          onSuccess?.();
        }, 1500);
      } else {
        setSubmitStatus("error");
      }
    } catch (e) {
      console.error(e);
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    // Reset state
    setTitle("");
    setSelectedDay("1");
    setItems([{ id: Date.now(), name: "", image: null }]);
    setSubmitStatus(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={isAndroid ? "overFullScreen" : "pageSheet"}
      transparent={isAndroid}
      statusBarTranslucent={isAndroid}
    >
      <View
        className={
          isAndroid
            ? "flex-1 bg-black/40 justify-end"
            : "flex-1 bg-[#F2F2F7] dark:bg-[#09090b]"
        }
      >
        <View
          className={
            isAndroid
              ? "h-[95%] w-full bg-[#F2F2F7] dark:bg-[#09090b] rounded-t-[20px] overflow-hidden"
              : "flex-1"
          }
        >
          {/* Header */}
          <View className="flex-row justify-between items-center p-5 bg-white dark:bg-[#18181b] border-b border-gray-100 dark:border-zinc-800 shadow-sm">
            <Text className="text-3xl font-black text-gray-900 dark:text-white italic uppercase">
              New Workout
            </Text>
            <TouchableOpacity
              onPress={handleClose}
              className="p-2 bg-gray-100 dark:bg-zinc-800 rounded-full"
            >
              <X size={20} color={colorScheme === "dark" ? "white" : "black"} />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 p-5">
            {/* Top Controls: Title & Day */}
            <View className="flex-row gap-4 mb-8">
              {/* Title Input */}
              <View className="flex-1 bg-white dark:bg-[#18181b] rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-zinc-800">
                <Text className="text-xs text-gray-400 dark:text-zinc-500 font-bold uppercase mb-1">
                  Workout Title
                </Text>
                <TextInput
                  className="text-lg font-bold text-gray-900 dark:text-white"
                  placeholder="e.g. Leg Day"
                  placeholderTextColor="#9CA3AF"
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              {/* Day Dropdown Trigger */}
              <TouchableOpacity
                onPress={() => setShowDayPicker(true)}
                className="bg-white dark:bg-[#18181b] rounded-2xl p-4 w-28 justify-between shadow-sm border border-gray-100 dark:border-zinc-800"
              >
                <Text className="text-xs text-gray-400 dark:text-zinc-500 font-bold uppercase mb-1">
                  Day
                </Text>
                <View className="flex-row items-center justify-between">
                  <Text className="text-xl font-black text-gray-900 dark:text-white">
                    {selectedDay}
                  </Text>
                  <ChevronDown size={20} color="#9CA3AF" />
                </View>
              </TouchableOpacity>
            </View>

            {/* Exercises List */}
            <View className="gap-2 mb-20">
              {items.map((item, index) => (
                <ExerciseInputItem
                  key={item.id}
                  item={item}
                  index={index}
                  canRemove={items.length > 1}
                  onUpdate={handleUpdateItem}
                  onAdd={handleAddItem}
                  onRemove={handleRemoveItem}
                />
              ))}
            </View>
          </ScrollView>

          {/* Footer Submit */}
          <View className="p-5 border-t border-l border-r border-gray-100 dark:border-zinc-800 absolute bottom-0 w-full bg-white dark:bg-[#18181b] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] elevation-5 rounded-t-3xl">
            <TouchableOpacity
              onPress={handleSubmit}
              className="bg-[#DC2626] rounded-2xl p-4 items-center shadow-lg shadow-red-500/30"
            >
              <Text className="text-white font-black text-lg uppercase tracking-wider">
                Save Workout
              </Text>
            </TouchableOpacity>
          </View>

          {/* Day Picker Modal */}
          {showDayPicker && (
            <Modal transparent visible={showDayPicker} animationType="fade">
              <TouchableOpacity
                className="flex-1 bg-black/50 justify-center items-center"
                activeOpacity={1}
                onPress={() => setShowDayPicker(false)}
              >
                <View className="bg-white dark:bg-[#18181b] rounded-3xl w-[80%] p-6 gap-3 shadow-2xl">
                  <Text className="text-center font-black text-xl mb-4 text-gray-900 dark:text-white uppercase">
                    Select Day
                  </Text>
                  <View className="flex-row flex-wrap gap-3 justify-center">
                    {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                      <TouchableOpacity
                        key={d}
                        onPress={() => {
                          setSelectedDay(d.toString());
                          setShowDayPicker(false);
                        }}
                        className={cn(
                          "w-12 h-12 rounded-full items-center justify-center shadow-sm",
                          selectedDay === d.toString()
                            ? "bg-[#DC2626]"
                            : "bg-gray-100 dark:bg-zinc-800"
                        )}
                      >
                        <Text
                          className={cn(
                            "font-bold text-lg",
                            selectedDay === d.toString()
                              ? "text-white"
                              : "text-gray-900 dark:text-white"
                          )}
                        >
                          {d}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </TouchableOpacity>
            </Modal>
          )}

          {/* Submitting Loading Modal */}
          <LoadingModal
            visible={isSubmitting || submitStatus === "success"}
            text={
              submitStatus === "success"
                ? "Saved Successfully!"
                : "Saving Workout..."
            }
          />
        </View>
      </View>
    </Modal>
  );
};
