import React, { useState, useEffect } from "react";
import {
  View,
  TextInput,
  Image,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { fetchExerciseImage } from "../services/api";
import { X, Plus, Minus } from "lucide-react-native";

export const ExerciseInputItem = React.memo(
  ({ item, index, onUpdate, onAdd, onRemove, canRemove }) => {
    const [loading, setLoading] = useState(false);

    // Debounce or Blur fetch
    const handleBlur = async () => {
      if (!item.name || item.image) return; // Don't fetch if empty or already has image (unless name changed? for now simple)
      if (item.name.length < 3) return;

      setLoading(true);
      const imageUrl = await fetchExerciseImage(item.name);
      setLoading(false);

      if (imageUrl) {
        onUpdate(item.id, { ...item, image: imageUrl });
      }
    };

    return (
      <View className="mb-4">
        {/* Light/Dark Container */}
        <View className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-zinc-800 p-3 rounded-2xl flex-row items-center h-24 shadow-sm">
          {/* Image Container */}
          <View className="bg-gray-50 dark:bg-zinc-800 w-20 h-20 rounded-xl mr-4 justify-center items-center overflow-hidden border border-gray-100 dark:border-zinc-800">
            {loading ? (
              <ActivityIndicator color="#DC2626" />
            ) : item.image ? (
              <Image
                source={{ uri: item.image }}
                className="w-full h-full"
                resizeMode="cover"
              />
            ) : (
              <View className="w-full h-full bg-gray-50 dark:bg-zinc-800" />
            )}
          </View>

          {/* Text Input */}
          <TextInput
            className="flex-1 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-zinc-800 text-gray-900 dark:text-white font-bold text-lg p-3 rounded-xl shadow-sm"
            placeholder="Exercise Name"
            placeholderTextColor="#9CA3AF"
            value={item.name}
            onChangeText={(text) =>
              onUpdate(item.id, { ...item, name: text, image: null })
            } // Reset image on name change
            onBlur={handleBlur}
            onSubmitEditing={handleBlur}
            returnKeyType="search"
          />
        </View>

        {/* Action Buttons (Under the container as requested) */}
        <View className="flex-row justify-center mt-2 gap-4">
          {/* Add Button */}
          <TouchableOpacity
            onPress={onAdd}
            className="bg-green-500 p-1 rounded-full"
          >
            <Plus size={20} color="white" />
          </TouchableOpacity>

          {/* Remove Button (Only if can remove) */}
          {canRemove && (
            <TouchableOpacity
              onPress={() => onRemove(item.id)}
              className="bg-red-500 p-1 rounded-full"
            >
              <Minus size={20} color="white" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }
);
