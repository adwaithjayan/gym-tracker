# Log It - The Bold Workout Tracker

> A premium, high-performance workout tracker built for consistency and speed.

**Log It** is an offline-first React Native application designed to make gym tracking effortless. With a bold aesthetic, smart daily rotation, and cloud sync capabilities, it helps you focus on what matters: the lift.

## ✨ Features

- **📅 Smart Daily Rotation**: Automatically presents your next workout day. No more searching through lists.
- **🎨 Premium UI**: A "Bold" design language with seamless Dark Mode support.
- **🖼️ Visual Tracking**: Automatic exercise image fetching via API or custom URLs, cached for offline use.
- **☁️ Cloud Sync**: One-tap backup and restore to easily switch devices without sign-ups.
- **🔥 Performance Optimized**: Built with `FlatList` virtualization and React Memoization for instant responsiveness.
- **📱 Native Feel**: Custom "Sheet" animations on Android to match the iOS standard.

## 📸 Screenshots

<p align="center">
  <img src="./assets/screenshot/sh1.jpg" width="45%" />
  <img src="./assets/screenshot/sh2.jpg" width="45%" />
</p>
<p align="center">
  <img src="./assets/screenshot/sh_d_1.jpg" width="45%" />
  <img src="./assets/screenshot/sh_d_2.jpg" width="45%" />
</p>

## 🛠️ Tech Stack

- **Framework**: React Native (Expo SDK 52)
- **Styling**: NativeWind (Tailwind CSS)
- **State/Storage**: React Hooks & Async Storage
- **Animations**: React Native Reanimated
- **Icons**: Lucide React Native

## 🚀 Getting Started

1.  **Clone the repo**

    ```bash
    git clone https://github.com/adwaithjayan/log-it.git
    cd log-it
    ```

2.  **Install dependencies**

    ```bash
    npm install
    # or
    bun install
    ```

3.  **Run the app**
    ```bash
    npx expo start
    ```

## 📦 Building for Production

This project is configured for **EAS Build**.

- **Generate APK**: `eas build -p android --profile apk`
- **Generate AAB**: `eas build -p android --profile production`

See [BUILD.md](./BUILD.md) for detailed instructions.
