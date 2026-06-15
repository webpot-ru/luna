import fs from "node:fs";
import path from "node:path";

export const outroIconNames = [
  "custom-tempo",
  "matching-game",
  "smart-algorithm",
  "images-audio",
  "pomodoro-timer",
  "background-music",
  "study-chat",
  "personal-notes"
];

const iconDir = path.resolve("assets/video/outro-icons/split");

export function getOutroIconDataUris() {
  return Object.fromEntries(
    outroIconNames.map((name) => {
      const iconPath = path.join(iconDir, `${name}.png`);
      const base64 = fs.readFileSync(iconPath).toString("base64");
      return [name, `data:image/png;base64,${base64}`];
    })
  );
}
