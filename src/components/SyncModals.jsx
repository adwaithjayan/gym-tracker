import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { Copy } from "lucide-react-native";
import { Upload, Download } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const SyncOptionsModal = ({
  visible,
  onClose,
  onUpload,
  onDownload,
  currentSyncId, // new prop to display ID
}) => {
  const { colorScheme } = useColorScheme();
  const [manualId, setManualId] = useState("");

  const copyToClipboard = async () => {
    if (currentSyncId) {
      await Clipboard.setStringAsync(currentSyncId);
      Alert.alert("Copied", "Sync ID copied to clipboard!");
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        className="flex-1 bg-black/40 justify-center items-center"
      >
        <TouchableOpacity
          activeOpacity={1}
          className="bg-white dark:bg-[#18181b] w-[85%] max-w-sm rounded-3xl p-6 items-center shadow-2xl"
        >
          <Text className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Sync Data
          </Text>

          {/* Display Current ID if exists */}
          {currentSyncId ? (
            <View className="mb-6 w-full">
              <Text className="text-xs text-center text-gray-400 mb-1">
                Your Sync ID (Save this!)
              </Text>
              <TouchableOpacity
                onPress={copyToClipboard}
                className="bg-gray-100 p-3 rounded-xl flex-row justify-between items-center mb-2"
              >
                <Text
                  className="text-gray-800 font-mono text-xs flex-1 mr-2"
                  numberOfLines={1}
                >
                  {currentSyncId}
                </Text>
                <Copy size={16} color="gray" />
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Manual Input for Download */}
          <View className="w-full mb-6">
            <Text className="text-xs text-gray-400 dark:text-zinc-500 mb-1 ml-1">
              Restore from Sync ID
            </Text>
            <TextInput
              className="bg-gray-100 dark:bg-zinc-800 p-3 rounded-xl text-gray-800 dark:text-white font-mono text-sm"
              placeholder="Paste Sync ID here..."
              placeholderTextColor="#9CA3AF"
              value={manualId}
              onChangeText={setManualId}
              autoCapitalize="none"
            />
          </View>

          <View className="flex-row gap-4 w-full justify-center">
            <TouchableOpacity
              onPress={onUpload}
              className="bg-gray-50 dark:bg-zinc-800 p-4 rounded-2xl items-center flex-1 border border-gray-100 dark:border-zinc-700 shadow-sm active:scale-95 transform transition-all"
            >
              <View className="bg-[#3a1111] p-3.5 rounded-full mb-3 shadow-md">
                <Upload color="white" size={24} strokeWidth={2.5} />
              </View>
              <Text className="font-semibold text-gray-700 dark:text-gray-300">
                Upload
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => onDownload(manualId)}
              className="bg-gray-50 dark:bg-zinc-800 p-4 rounded-2xl items-center flex-1 border border-gray-100 dark:border-zinc-700 shadow-sm active:scale-95 transform transition-all"
            >
              <View className="bg-[#3a1111] p-3.5 rounded-full mb-3 shadow-md">
                <Download color="white" size={24} strokeWidth={2.5} />
              </View>
              <Text className="font-semibold text-gray-700 dark:text-gray-300">
                Download
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

export const LoadingModal = ({ visible, text = "Loading..." }) => {
  // Animation for the loading bar
  const progress = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      progress.value = 0;
      progress.value = withRepeat(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        -1,
        false
      );
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View className="flex-1 bg-black/40 justify-center items-center">
        <View className="bg-white dark:bg-[#18181b] w-[80%] max-w-xs rounded-2xl p-8 items-center shadow-2xl">
          <Text className="text-lg font-bold text-gray-800 dark:text-white mb-6">
            {text}
          </Text>

          {/* Custom Loading Bar Container */}
          <View className="w-full h-2 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden mb-2">
            <Animated.View
              style={[
                { height: "100%", backgroundColor: "#3a1111" },
                animatedStyle,
              ]}
            />
          </View>
          <Text className="text-xs text-gray-400 dark:text-zinc-500 mt-2">
            Please wait...
          </Text>
        </View>
      </View>
    </Modal>
  );
};
