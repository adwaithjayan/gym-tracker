import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Plus, RefreshCw, Check } from "lucide-react-native";
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
        "bg-white flex-row items-center justify-between p-3 h-24 w-full rounded-2xl shadow-sm mb-3 border border-gray-100",
        item.completed && "opacity-40"
      )}
    >
      {/* Left Square Placeholder */}
      <View className="w-20 h-20 bg-gray-50 overflow-hidden rounded-xl">
        {item.image ? (
          <Image
            source={{ uri: item.image }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <View className="items-center justify-center flex-1">
            <Text className="text-gray-300 text-xs">No Image</Text>
          </View>
        )}
      </View>

      {/* Exercise Name */}
      <Text
        className="text-gray-900 text-lg font-bold tracking-tight flex-1 mx-4"
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
          item.completed ? "bg-green-500" : "bg-gray-100"
        )}
      >
        {item.completed ? (
          <Check size={24} color="white" />
        ) : (
          <View className="w-4 h-4 rounded-full bg-gray-300" />
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

export default function WorkoutScreen() {
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

  const toggleComplete = async (id) => {
    const updatedExercises = exercises.map((ex) =>
      ex.id === id && !ex.completed ? { ...ex, completed: true } : ex
    );
    setExercises(updatedExercises);
    // Update the pending state in storage (so if they close app, it's saved)
    await updateWorkoutProgress(currentDay, updatedExercises);

    // Check if ALL exercises are now completed
    if (
      updatedExercises.every((e) => e.completed) &&
      updatedExercises.length > 0
    ) {
      // 1. Mark the day as consistent (stat++)
      const marked = await markTodayComplete();

      // 2. Just refresh logic (don't advance day yet)
      const s = await getStats();
      setStats(s);
    }
  };

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
      <GestureHandlerRootView className="flex-1 bg-[#F2F2F7] relative">
        <View className="flex-row justify-between items-center px-6 pt-16 pb-6 bg-white rounded-b-[40px] shadow-sm z-10">
          <TouchableOpacity
            className="p-3 bg-gray-50 rounded-full"
            onPress={handleSyncPress}
          >
            <RefreshCw size={22} color="#DC2626" />
          </TouchableOpacity>
          <View className="items-center">
            <Text className="text-gray-400 text-xs font-bold tracking-widest uppercase mb-1">
              Consistency
            </Text>
            <Text className="text-3xl font-black text-gray-900">
              {stats.completedDays}
              <Text className="text-gray-300 text-xl font-medium">
                /{stats.totalDays}
              </Text>
            </Text>
          </View>
        </View>
        {/* Title Section */}
        <View className="pt-10 pb-7 px-8">
          <Text className="text-zinc-500 text-lg font-medium mb-1 uppercase tracking-widest">
            Today's Focus
          </Text>
          <Text className="text-5xl font-black text-gray-900 italic tracking-tighter">
            {workoutTitle}
          </Text>
        </View>
        {/* Exercises List */}
        <ScrollView className="flex-1 px-5 mx-2 mb-6 rounded-[40px] overflow-hidden">
          <View className="gap-6 pb-32">
            {exercises.length === 0 ? (
              <View className="items-center justify-center pt-20">
                <Text className="text-gray-300 text-2xl font-bold">
                  Rest Day?
                </Text>
                <Text className="text-gray-400 text-sm mt-2">
                  No exercises added yet.
                </Text>
              </View>
            ) : (
              exercises.map((item) => (
                <ExerciseItem
                  key={item.id}
                  item={item}
                  onToggle={toggleComplete}
                />
              ))
            )}
          </View>
        </ScrollView>
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
          console.log("Workout Saved!");
          loadData();
        }}
      />
    </>
  );
}
