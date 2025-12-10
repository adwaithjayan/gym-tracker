import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import {
  Plus,
  RefreshCw,
  Check,
  Sun,
  Moon,
  Monitor,
} from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import { SyncOptionsModal, LoadingModal } from "./components/SyncModals";
import { AddWorkoutModal } from "./components/AddWorkoutModal";
import {
  getWorkouts,
  initInstallDate,
  getStats,
  updateWorkoutProgress,
  markTodayComplete,
  getCurrentRotationWorkout,
  advanceToNextDay,
  restoreImages,
} from "./services/storage";
import {
  uploadDataToCloud,
  downloadDataFromCloud,
  getLocalSyncId,
} from "./services/cloud";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const ExerciseItem = ({ item, onToggle }) => {
  const swipeableRef = useRef(null);

  const ExerciseContent = () => (
    <View
      className={cn(
        "bg-white dark:bg-[#18181b] flex-row items-center justify-between p-3 h-24 w-full rounded-2xl shadow-sm mb-3 border border-gray-100 dark:border-zinc-800",
        item.completed && "opacity-40"
      )}
    >
      {/* Left Square Placeholder */}
      <View className="w-20 h-20 bg-gray-50 dark:bg-zinc-800 overflow-hidden rounded-xl">
        {item.image ? (
          <Image
            source={{ uri: item.image }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <View className="items-center justify-center flex-1">
            <Text className="text-gray-300 dark:text-zinc-600 text-xs">
              No Image
            </Text>
          </View>
        )}
      </View>

      {/* Exercise Name */}
      <Text
        className="text-gray-900 dark:text-white text-lg font-bold tracking-tight flex-1 mx-4"
        numberOfLines={2}
      >
        {item.name}
      </Text>

      {/* Right Circle Button */}
      <TouchableOpacity
        onPress={() => onToggle(item.id)}
        disabled={item.completed}
        activeOpacity={0.7}
        className={cn(
          "w-12 h-12 rounded-full items-center justify-center shadow-sm",
          item.completed ? "bg-green-500" : "bg-gray-100 dark:bg-zinc-700"
        )}
      >
        {item.completed ? (
          <Check size={24} color="white" />
        ) : (
          <View className="w-4 h-4 rounded-full bg-gray-300 dark:bg-zinc-500" />
        )}
      </TouchableOpacity>
    </View>
  );

  if (item.completed) {
    return <ExerciseContent />;
  }

  return (
    <Swipeable
      ref={swipeableRef}
      overshootLeft={false}
      overshootRight={true}
      onSwipeableOpen={(direction) => {
        if (direction === "left") {
          onToggle(item.id);
          swipeableRef.current?.close();
        }
      }}
    >
      <ExerciseContent />
    </Swipeable>
  );
};
const MemoizedExerciseItem = React.memo(ExerciseItem);

export default function WorkoutScreen() {
  const { colorScheme, setColorScheme } = useColorScheme();

  const toggleTheme = () => {
    setColorScheme(colorScheme === "dark" ? "light" : "dark");
  };

  const getThemeIcon = () => {
    return colorScheme === "dark" ? (
      <Moon size={22} color="#DC2626" />
    ) : (
      <Sun size={22} color="#DC2626" />
    );
  };

  const [exercises, setExercises] = useState([]);
  const [workoutTitle, setWorkoutTitle] = useState("Workout");
  const [currentDay, setCurrentDay] = useState("1");
  const [stats, setStats] = useState({ totalDays: 1, completedDays: 0 });
  const [currentSyncId, setCurrentSyncId] = useState(null);

  const loadData = useCallback(async () => {
    await initInstallDate();
    const s = await getStats();
    setStats(s);

    const id = await getLocalSyncId();
    setCurrentSyncId(id);

    const activeWorkout = await getCurrentRotationWorkout();
    if (activeWorkout) {
      setWorkoutTitle(activeWorkout.title || `Day ${activeWorkout.day}`);
      setExercises(activeWorkout.exercises || []);
      setCurrentDay(activeWorkout.day);
    } else {
      setExercises([]);
      setWorkoutTitle("No Workouts");
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleComplete = useCallback(
    async (id) => {
      let updatedExercises = [];
      setExercises((prev) => {
        updatedExercises = prev.map((ex) =>
          ex.id === id && !ex.completed ? { ...ex, completed: true } : ex
        );
        return updatedExercises;
      });

      // Valid check logic needs updatedExercises.
      // Since setState is async/functional, valid "updatedExercises" for logic is tricky inside the setter.
      // Actually we can reconstruct it. But for storage/async logic, we need the value.
      // Pattern: Calculate new state first, then set it.
      // BUT to keep useCallback stable, we can't depend on "exercises" state.
      // So we use functional update. But we need the result for API.
      // Workaround: We can't easily perform "async" logic inside setStats without refs or reloading.
      // However, if we just use functional update for UI update, and then - wait.
      // To make toggleComplete dependency-free, we need to NOT read 'exercises'.
      // Correct approach:
      // setExercises(prev => {
      //    const next = ...
      //    // Side effects here? No.
      //    return next;
      // })
      // We'll leave it as is but remove 'exercises' from dependency array by using functional update inside.
      // Ah, but we need the NEW list for `updateWorkoutProgress`.
      // We can chain the logic.

      // Simpler efficient way:
      setExercises((currentExercises) => {
        const updated = currentExercises.map((ex) =>
          ex.id === id && !ex.completed ? { ...ex, completed: true } : ex
        );

        // Fire and forget side effects (using the calculated 'updated', not state)
        updateWorkoutProgress(currentDay, updated);

        if (updated.every((e) => e.completed) && updated.length > 0) {
          markTodayComplete().then(() => getStats().then(setStats));
        }
        return updated;
      });
    },
    [currentDay]
  ); // Only depends on currentDay now.

  const [isSyncModalVisible, setSyncModalVisible] = useState(false);
  const [isAddModalVisible, setAddModalVisible] = useState(false);
  const [isLoadingVisible, setLoadingVisible] = useState(false);
  const [loadingText, setLoadingText] = useState("");

  const handleSyncPress = () => setSyncModalVisible(true);

  const handleOptionSelect = async (type, manualId = null) => {
    setLoadingText(
      type === "upload" ? "Uploading Data..." : "Downloading Data..."
    );
    setLoadingVisible(true);

    try {
      if (type === "upload") {
        // Mark sync timestamp as requested
        await AsyncStorage.setItem(
          "gym_tracker_last_sync",
          new Date().toISOString()
        );

        // Gather all data
        const allKeys = await AsyncStorage.getAllKeys();
        const allData = await AsyncStorage.multiGet(allKeys);
        const dataObj = Object.fromEntries(allData);

        const result = await uploadDataToCloud(dataObj);

        if (result.success) {
          setCurrentSyncId(result.syncId);
          Alert.alert("Success", "Data synced to cloud!");
        } else {
          Alert.alert("Error", "Upload failed.");
        }
      } else {
        // Download
        const result = await downloadDataFromCloud(manualId);

        if (result.success && result.data) {
          // Wipe current and restore
          const keys = Object.keys(result.data);
          const pairs = keys.map((k) => [k, result.data[k]]);

          await AsyncStorage.clear();
          await AsyncStorage.multiSet(pairs);

          await loadData(); // Reload app state

          // Trigger background image restoration
          setLoadingText("Restoring images...");
          await restoreImages();
          await loadData(); // Reload again to show images

          setSyncModalVisible(false);
          Alert.alert("Success", "Data restored from cloud!");
        } else {
          Alert.alert("Error", result.error || "Download failed.");
        }
      }
    } catch (e) {
      Alert.alert("Error", "An unexpected error occurred.");
      console.error(e);
    } finally {
      setLoadingVisible(false);
    }
  };

  return (
    <>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View className="flex-1 bg-[#F2F2F7] dark:bg-[#09090b] relative">
          <View className="flex-row justify-between items-center px-6 pt-16 pb-6 bg-white dark:bg-[#18181b] rounded-b-[40px] shadow-sm z-10 border-b border-gray-100 dark:border-zinc-800">
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-full"
                onPress={handleSyncPress}
              >
                <RefreshCw size={22} color="#DC2626" />
              </TouchableOpacity>
              <TouchableOpacity
                className="p-3 bg-gray-50 dark:bg-zinc-800 rounded-full"
                onPress={toggleTheme}
              >
                {getThemeIcon()}
              </TouchableOpacity>
            </View>
            <View className="items-center">
              <Text className="text-gray-400 dark:text-zinc-500 text-xs font-bold tracking-widest uppercase mb-1">
                Consistency
              </Text>
              <Text className="text-3xl font-black text-gray-900 dark:text-white">
                {stats.completedDays}
                <Text className="text-gray-300 dark:text-zinc-700 text-xl font-medium">
                  /{stats.totalDays}
                </Text>
              </Text>
            </View>
          </View>
          {/* Title Section */}
          {/* Header Component for FlatList */}
          <FlatList
            className="flex-1 px-5 mx-2 mb-6 rounded-[40px] overflow-hidden"
            data={exercises}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <MemoizedExerciseItem item={item} onToggle={toggleComplete} />
            )}
            contentContainerStyle={{ gap: 24, paddingBottom: 128 }}
            ListHeaderComponent={
              <View className="pt-10 pb-7 px-3">
                <Text className="text-zinc-500 dark:text-zinc-400 text-lg font-medium mb-1 uppercase tracking-widest">
                  Today's Focus
                </Text>
                <Text className="text-5xl font-black text-gray-900 dark:text-white italic tracking-tighter">
                  {workoutTitle}
                </Text>
              </View>
            }
            ListEmptyComponent={
              <View className="items-center justify-center pt-20">
                <Text className="text-gray-300 dark:text-zinc-700 text-2xl font-bold">
                  Rest Day?
                </Text>
                <Text className="text-gray-400 dark:text-zinc-600 text-sm mt-2">
                  No exercises added yet.
                </Text>
              </View>
            }
          />
          {/* Floating Action Button */}
          <View className="absolute bottom-10 right-8">
            <TouchableOpacity
              className="w-18 h-18 bg-[#DC2626] rounded-3xl items-center justify-center shadow-lg shadow-red-500/40 transform rotate-3"
              style={{ width: 72, height: 72 }}
              activeOpacity={0.9}
              onPress={() => setAddModalVisible(true)}
            >
              <Plus color="white" size={36} strokeWidth={3} />
            </TouchableOpacity>
          </View>
        </View>
      </GestureHandlerRootView>
      <SyncOptionsModal
        visible={isSyncModalVisible}
        onClose={() => setSyncModalVisible(false)}
        onUpload={() => handleOptionSelect("upload")}
        onDownload={(manualId) => handleOptionSelect("download", manualId)}
        currentSyncId={currentSyncId}
      />
      <LoadingModal visible={isLoadingVisible} text={loadingText} />
      <AddWorkoutModal
        visible={isAddModalVisible}
        onClose={() => setAddModalVisible(false)}
        onSuccess={() => {
          loadData();
        }}
      />
    </>
  );
}
