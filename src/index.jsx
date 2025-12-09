import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Plus, RefreshCw, Check } from "lucide-react-native";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function WorkoutScreen() {
  const exercises = [
    { id: 1, name: "Situp" },
    { id: 2, name: "Squat" },
    { id: 3, name: "Leg Press" },
  ];

  return (
    <View className="flex-1 bg-white relative">
      <View className="bg-gray-100 flex-row justify-between items-center px-6 pt-12 py-4 border-b border-gray-200">
        <TouchableOpacity className="p-2 bg-white rounded-full shadow-sm">
          <RefreshCw size={20} color="#000" />
        </TouchableOpacity>
        <View className="bg-white px-4 py-2 rounded-lg shadow-sm w-20 items-center">
          <Text className="text-xl font-bold">0.0</Text>
        </View>
      </View>

      {/* Title Section */}
      <View className="pt-8 pb-8 items-center justify-center">
        <Text className="text-4xl font-bold text-black tracking-widest">
          Leg
        </Text>
      </View>

      {/* Exercises List */}
      <ScrollView className="flex-1 px-5">
        <View className="gap-6 pb-32">
          {exercises.map((item) => (
            <View
              key={item.id}
              className="bg-[#2a0e0e] flex-row items-center justify-between p-4 h-28 w-full"
            >
              {/* Left Square Placeholder */}
              <View className="w-16 h-16 bg-[#d9d9d9]" />

              {/* Exercise Name */}
              <Text className="text-white text-xl font-normal tracking-wide">
                {item.name}
              </Text>

              {/* Right Circle Button */}
              <TouchableOpacity
                activeOpacity={0.7}
                className="w-12 h-12 rounded-full items-center justify-center bg-[#d9d9d9]"
              ></TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <View className="absolute bottom-12 right-8">
        <TouchableOpacity
          className="w-20 h-20 bg-[#3a1111] rounded-full items-center justify-center shadow-lg"
          activeOpacity={0.8}
        >
          <Plus color="#8a7a7a" size={40} strokeWidth={2} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
