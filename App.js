import "./global.css";
import { StatusBar } from "expo-status-bar";
import Home from "./src";

export default function App() {
  return (
    <>
      <Home />
      <StatusBar style="auto" />
    </>
  );
}
