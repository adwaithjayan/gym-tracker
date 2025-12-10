import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";

const WORKOUTS_KEY = "gym_tracker_workouts";
const INSTALL_DATE_KEY = "gym_tracker_install_date";
const COMPLETED_DAYS_KEY = "gym_tracker_completed_days"; // Array of ISO date strings (YYYY-MM-DD)
const CURRENT_ROTATION_DAY_KEY = "gym_tracker_current_day";
const LAST_ROTATION_COMPLETION_DATE_KEY = "gym_tracker_last_rotation_date";
const IMAGE_DIR = FileSystem.documentDirectory + "images/";

// Ensure image directory exists
const ensureDirExists = async () => {
  const dirInfo = await FileSystem.getInfoAsync(IMAGE_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(IMAGE_DIR, { intermediates: true });
  }
};

export const initInstallDate = async () => {
  const existing = await AsyncStorage.getItem(INSTALL_DATE_KEY);
  if (!existing) {
    await AsyncStorage.setItem(INSTALL_DATE_KEY, new Date().toISOString());
  }
};

export const getStats = async () => {
  try {
    const installDateStr = await AsyncStorage.getItem(INSTALL_DATE_KEY);
    const installDate = installDateStr ? new Date(installDateStr) : new Date();
    const now = new Date();
    const diffTime = Math.abs(now - installDate);
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1; // At least 1 day

    const completedJson = await AsyncStorage.getItem(COMPLETED_DAYS_KEY);
    const completedDays = completedJson ? JSON.parse(completedJson).length : 0;

    return { totalDays, completedDays };
  } catch (e) {
    return { totalDays: 1, completedDays: 0 };
  }
};

export const markTodayComplete = async () => {
  try {
    const today = new Date().toISOString().split("T")[0];

    // 1. Mark Rotation Completion Timestamp (for rotation logic)
    await AsyncStorage.setItem(LAST_ROTATION_COMPLETION_DATE_KEY, today);

    // 2. Mark Global Consistency Stats
    const completedJson = await AsyncStorage.getItem(COMPLETED_DAYS_KEY);
    let completed = completedJson ? JSON.parse(completedJson) : [];

    if (!completed.includes(today)) {
      completed.push(today);
      await AsyncStorage.setItem(COMPLETED_DAYS_KEY, JSON.stringify(completed));
      return true; // Marked as new
    }
    return false; // Already marked
  } catch (e) {
    console.error(e);
    return false;
  }
};

// Update the actual exercises state of the latest workout
// Update the exercises state of a specific workout day
export const updateWorkoutProgress = async (day, newExercises) => {
  try {
    const json = await AsyncStorage.getItem(WORKOUTS_KEY);
    if (!json) return;

    let workouts = JSON.parse(json);
    if (workouts.length === 0) return;

    // Find the workout by day
    const index = workouts.findIndex((w) => w.day === day);
    if (index !== -1) {
      workouts[index].exercises = newExercises;
      await AsyncStorage.setItem(WORKOUTS_KEY, JSON.stringify(workouts));
    }
  } catch (e) {
    console.error("Error updating workout progress", e);
  }
};

export const downloadAndSaveImage = async (uri, filename) => {
  try {
    await ensureDirExists();
    const fileUri = IMAGE_DIR + filename;
    const downloadRes = await FileSystem.downloadAsync(uri, fileUri);
    return downloadRes.uri;
  } catch (error) {
    console.error("Error downloading image:", error);
    return null; // Fallback to original URI or null if critical
  }
};

export const saveWorkout = async (workout) => {
  try {
    const existingWorkoutsJson = await AsyncStorage.getItem(WORKOUTS_KEY);
    let workouts = existingWorkoutsJson ? JSON.parse(existingWorkoutsJson) : [];

    // Check if workout for this day already exists
    const existingIndex = workouts.findIndex((w) => w.day === workout.day);
    if (existingIndex >= 0) {
      // Update existing
      workouts[existingIndex] = workout;
    } else {
      // Add new
      workouts.push(workout);
    }

    // Sort by day to keep rotation logical
    workouts.sort((a, b) => parseInt(a.day) - parseInt(b.day));

    await AsyncStorage.setItem(WORKOUTS_KEY, JSON.stringify(workouts));
    return true;
  } catch (error) {
    console.error("Error saving workout:", error);
    return false;
  }
};

export const getWorkoutByDay = async (day) => {
  const workouts = await getWorkouts();
  return workouts.find((w) => w.day === day);
};

export const getCurrentRotationWorkout = async () => {
  const workouts = await getWorkouts();
  if (workouts.length === 0) return null;

  let currentDay = await AsyncStorage.getItem(CURRENT_ROTATION_DAY_KEY);
  let activeWorkout = workouts.find((w) => w.day === currentDay);

  // Fallback if pointer is invalid
  if (!activeWorkout) {
    activeWorkout = workouts[0];
    currentDay = activeWorkout.day;
    await AsyncStorage.setItem(CURRENT_ROTATION_DAY_KEY, currentDay);
  }

  // --- AUTO ADVANCE LOGIC ---
  // If the current workout is fully completed, AND it was completed BEFORE today (e.g. yesterday),
  // then we must auto-advance to the next day.
  const isComplete =
    activeWorkout.exercises.every((e) => e.completed) &&
    activeWorkout.exercises.length > 0;
  if (isComplete) {
    const today = new Date().toISOString().split("T")[0];
    const lastCompletionDate = await AsyncStorage.getItem(
      LAST_ROTATION_COMPLETION_DATE_KEY
    );

    if (lastCompletionDate && lastCompletionDate < today) {
      return await advanceToNextDay(true); // pass true to indicate we should reset the next workout
    }
  }

  return activeWorkout;
};

// Helper: Reset all exercises in a workout to uncompleted
const resetWorkout = async (workout) => {
  workout.exercises = workout.exercises.map((e) => ({
    ...e,
    completed: false,
  }));
  // We must save this reset state to storage
  await saveWorkout(workout);
  return workout;
};

export const advanceToNextDay = async (shouldReset = false) => {
  const workouts = await getWorkouts();
  if (workouts.length === 0) return;

  const currentDay = await AsyncStorage.getItem(CURRENT_ROTATION_DAY_KEY);
  const currentIndex = workouts.findIndex((w) => w.day === currentDay);

  let nextIndex = 0;
  if (currentIndex !== -1) {
    nextIndex = (currentIndex + 1) % workouts.length;
  }

  const nextDay = workouts[nextIndex].day;
  await AsyncStorage.setItem(CURRENT_ROTATION_DAY_KEY, nextDay);

  let nextWorkout = workouts[nextIndex];

  // If we are rotating due to day completion, ensure the NEW day starts fresh
  if (shouldReset) {
    nextWorkout = await resetWorkout(nextWorkout);
  }

  return nextWorkout;
};

export const getWorkouts = async () => {
  try {
    const json = await AsyncStorage.getItem(WORKOUTS_KEY);
    return json != null ? JSON.parse(json) : [];
  } catch (e) {
    console.error("Error loading workouts", e);
    return [];
  }
};

// Check all workouts, if local image is missing but original URL exists, re-download it.
export const restoreImages = async () => {
  const workouts = await getWorkouts();
  let hasChanges = false;

  for (let w of workouts) {
    if (!w.exercises) continue;
    for (let ex of w.exercises) {
      // If we have an original image URL
      if (ex.originalImage) {
        // Check if local file exists
        let needsDownload = true;
        if (ex.image && ex.image.startsWith("file://")) {
          const info = await FileSystem.getInfoAsync(ex.image);
          if (info.exists) needsDownload = false;
        }

        if (needsDownload) {
          const filename = `${Date.now()}_${Math.random()
            .toString(36)
            .substr(7)}.jpg`;
          const newPath = await downloadAndSaveImage(
            ex.originalImage,
            filename
          );
          if (newPath) {
            ex.image = newPath;
            hasChanges = true;
          }
        }
      }
    }
  }

  if (hasChanges) {
    await AsyncStorage.setItem(WORKOUTS_KEY, JSON.stringify(workouts));
  }
};
